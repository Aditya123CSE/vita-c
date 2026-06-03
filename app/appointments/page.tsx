'use client'

import { useCallback, useEffect, useState } from 'react'
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

type BookingConfirmation = {
  appointment_id: string
  token_number: number
  status: string
}

export default function AppointmentsPage() {
  const [patientName, setPatientName] = useState('')
  const [phone, setPhone] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [clinicId, setClinicId] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [creating, setCreating] = useState(false)

  const loadAppointments = useCallback(async (currentClinicId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', currentClinicId)
      .order('token_number')

    if (error) {
      console.error(error)
      return
    }

    setAppointments((data as Appointment[]) || [])
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initializeAppointmentsPage() {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user || !isMounted) {
        return
      }

      const { data: clinic, error: clinicError } =
        await supabase
          .from('clinics')
          .select('id')
          .eq('user_id', user.id)
          .single()

      if (clinicError || !clinic || !isMounted) {
        if (clinicError) {
          console.error(clinicError)
        }

        alert('Clinic not found')
        return
      }

      const currentClinicId = clinic.id as string

      setClinicId(currentClinicId)

      const { data: doctorRows, error: doctorsError } =
        await supabase
          .from('doctors')
          .select('*')
          .eq('clinic_id', currentClinicId)
          .order('name')

      if (doctorsError) {
        console.error(doctorsError)
      } else if (isMounted) {
        setDoctors((doctorRows as Doctor[]) || [])
      }

      if (isMounted) {
        await loadAppointments(currentClinicId)
      }
    }

    initializeAppointmentsPage()

    return () => {
      isMounted = false
    }
  }, [loadAppointments])

  useEffect(() => {
    if (!clinicId) {
      return
    }

    const channel = supabase
      .channel(`appointments-queue-${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinicId}`
        },
        () => {
          loadAppointments(clinicId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinicId, loadAppointments])

  async function createAppointment() {
    if (!patientName.trim() || !doctorId || !clinicId) {
      alert('Please fill all required fields')
      return
    }

    setCreating(true)

    const { data, error } = await supabase.rpc(
      'create_vita_appointment',
      {
        p_clinic_id: clinicId,
        p_clinic_slug: null,
        p_doctor_id: doctorId,
        p_patient_name: patientName,
        p_phone: phone
      }
    )

    setCreating(false)

    if (error || !data) {
      console.error(error)
      alert(
        error?.message ||
          'Unable to create appointment'
      )
      return
    }

    const confirmation = data as BookingConfirmation

    setPatientName('')
    setPhone('')
    setDoctorId('')

    await loadAppointments(clinicId)

    alert(
      `Appointment created. Token #${confirmation.token_number}`
    )
  }

  async function updateStatus(
    appointmentId: string,
    status: string
  ) {
    if (!clinicId) {
      return
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)

    if (error) {
      console.error(error)
    }
  }

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
          onChange={(event) =>
            setPatientName(event.target.value)
          }
        />

        <input
          className="border p-2 w-full"
          placeholder="Phone Number"
          value={phone}
          onChange={(event) =>
            setPhone(event.target.value)
          }
        />

        <select
          className="border p-2 w-full"
          value={doctorId}
          onChange={(event) =>
            setDoctorId(event.target.value)
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
          disabled={creating}
          className="bg-black text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {creating
            ? 'Creating...'
            : 'Create Appointment'}
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
