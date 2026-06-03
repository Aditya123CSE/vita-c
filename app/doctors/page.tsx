'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Doctor = {
  id: string
  name: string
  specialization: string
  clinic_id: string
}

export default function DoctorsPage() {
  const [name, setName] = useState('')
  const [specialization, setSpecialization] =
    useState('')

  const [clinicId, setClinicId] = useState('')
  const [doctors, setDoctors] = useState<
    Doctor[]
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

  async function addDoctor() {
    if (!name || !specialization) {
      alert('Fill all fields')
      return
    }

    const id =
      clinicId || (await getClinicId())

    if (!id) return

    const { error } = await supabase
      .from('doctors')
      .insert([
        {
          name,
          specialization,
          clinic_id: id
        }
      ])

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    setName('')
    setSpecialization('')

    loadDoctors()
  }

  useEffect(() => {
    loadDoctors()
  }, [])

  return (
    <main className="max-w-4xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">
        Doctors
      </h1>

      <div className="border p-5 rounded mb-6 space-y-4">

        <input
          className="border p-2 w-full"
          placeholder="Doctor Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <input
          className="border p-2 w-full"
          placeholder="Specialization"
          value={specialization}
          onChange={(e) =>
            setSpecialization(e.target.value)
          }
        />

        <button
          onClick={addDoctor}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add Doctor
        </button>

      </div>

      <div className="space-y-4">

        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="border p-4 rounded"
          >
            <h2 className="font-bold">
              {doctor.name}
            </h2>

            <p>
              {doctor.specialization}
            </p>
          </div>
        ))}

      </div>
    </main>
  )
}