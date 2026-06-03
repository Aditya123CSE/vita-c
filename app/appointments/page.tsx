'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Doctor = {
  id: string
  name: string
  specialization: string
  clinic_id: string
}

type Appointment = {
  id: string
  patient_name: string
  phone: string
  doctor_id: string
  token_number: number
  status: string
  clinic_id: string
}

export default function AppointmentsPage() {
  const [patientName, setPatientName] = useState('')
  const [phone, setPhone] = useState('')
  const [doctorId, setDoctorId] = useState('')

  const [clinicId, setClinicId] = useState('')

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<
    Appointment[]
  >([])

  async function getClinicId() {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      alert('Please login first')
      return null
    }

    const { data: clinic, error } =
      await supabase
        .from('clinics')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (error || !clinic) {
      alert('Clinic not found')
      return null
    }

    setClinicId(clinic.id)

    return clinic.id
  }

  async function loadDoctors() {
    const id = await getClinicId()

    if (!id) return

    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('clinic_id', id)
      .order('name')

    if (error) {
      console.error(error)
      return
    }

    setDoctors((data as Doctor[]) || [])
  }

  async function loadAppointments() {
    const id = await getClinicId()

    if (!id) return

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', id)
      .order('token_number')

    if (error) {
      console.error(error)
      return
    }

    setAppointments(
      (data as Appointment[]) || []
    )
  }

  async function createAppointment() {
    if (!patientName || !doctorId) {
      alert('Please fill all required fields')
      return
    }

    const id =
      clinicId || (await getClinicId())

    if (!id) return

    const nextToken =
      appointments.length + 1

    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          patient_name: patientName,
          phone,
          doctor_id: doctorId,
          token_number: nextToken,
          status: 'Waiting',
          clinic_id: id
        }
      ])

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    setPatientName('')
    setPhone('')
    setDoctorId('')

    loadAppointments()
  }

  async function updateStatus(
    id: string,
    status: string
  ) {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error(error)
      return
    }

    loadAppointments()
  }

  useEffect(() => {
    loadDoctors()
    loadAppointments()
  }, [])

  return (
    <main className="p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Appointment Management
      </h1>

      <div className="border p-5 rounded mb-8 space-y-4">

        <input
          className="border p-2 w-full"
          placeholder="Patient Name"
          value={patientName}
          onChange={(e) =>
            setPatientName(e.target.value)
          }
        />

        <input
          className="border p-2 w-full"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
        />

        <select
          className="border p-2 w-full"
          value={doctorId}
          onChange={(e) =>
            setDoctorId(e.target.value)
          }
        >
          <option value="">
            Select Doctor
          </option>

          {doctors.map((doctor) => (
            <option
              key={doctor.id}
              value={doctor.id}
            >
              {doctor.name}
            </option>
          ))}
        </select>

        <button
          onClick={createAppointment}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Create Appointment
        </button>

      </div>

      <div className="space-y-4">

        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border p-4 rounded"
          >
            <h2 className="font-bold text-lg">
              {appointment.patient_name}
            </h2>

            <p>
              Phone: {appointment.phone}
            </p>

            <p>
              Token #{appointment.token_number}
            </p>

            <p className="font-semibold mt-2">
              Status: {appointment.status}
            </p>

            <div className="flex gap-2 mt-3">

              <button
                onClick={() =>
                  updateStatus(
                    appointment.id,
                    'In Consultation'
                  )
                }
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Start
              </button>

              <button
                onClick={() =>
                  updateStatus(
                    appointment.id,
                    'Completed'
                  )
                }
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Complete
              </button>

            </div>
          </div>
        ))}

      </div>
    </main>
  )
}