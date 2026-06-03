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
  const [specialization, setSpecialization] = useState('')
  const [clinicId, setClinicId] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadDoctors() {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user || !isMounted) {
        alert('Please login first')
        return
      }

      const { data: clinic, error: clinicError } =
        await supabase
          .from('clinics')
          .select('id')
          .eq('user_id', user.id)
          .single()

      if (clinicError || !clinic || !isMounted) {
        alert('Clinic not found')
        return
      }

      const currentClinicId = clinic.id as string

      setClinicId(currentClinicId)

      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', currentClinicId)
        .order('name')

      if (error) {
        console.error(error)
        return
      }

      if (isMounted) {
        setDoctors((data as Doctor[]) || [])
      }
    }

    loadDoctors()

    return () => {
      isMounted = false
    }
  }, [])

  async function addDoctor() {
    if (!name || !specialization || !clinicId) {
      alert('Fill all fields')
      return
    }

    const { error } = await supabase
      .from('doctors')
      .insert([
        {
          name,
          specialization,
          clinic_id: clinicId
        }
      ])

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    setName('')
    setSpecialization('')

    const { data, error: loadError } = await supabase
      .from('doctors')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name')

    if (loadError) {
      console.error(loadError)
      return
    }

    setDoctors((data as Doctor[]) || [])
  }

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
