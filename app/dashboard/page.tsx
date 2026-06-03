'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LogoutButton from '@/app/components/LogoutButton'

export default function DashboardPage() {
  const [appointments, setAppointments] =
    useState<any[]>([])

  const [currentPatient, setCurrentPatient] =
    useState<any>(null)

  const [clinicName, setClinicName] =
    useState('')

  async function loadData() {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!clinic) {
      return
    }

    setClinicName(clinic.name)

    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('token_number')

    setAppointments(data || [])

    const active = data?.find(
      (a) => a.status === 'In Consultation'
    )

    setCurrentPatient(active || null)
  }

  useEffect(() => {
    loadData()

    const interval = setInterval(() => {
      loadData()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const waitingCount = appointments.filter(
    (a) => a.status === 'Waiting'
  ).length

  const completedCount = appointments.filter(
    (a) => a.status === 'Completed'
  ).length

  const totalAppointments =
    appointments.length

  return (
    <main className="p-10 max-w-6xl mx-auto">

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">
            Vita-C Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            {clinicName}
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">

        <div className="border rounded p-4">
          <h2 className="font-bold">
            Total
          </h2>

          <p className="text-3xl">
            {totalAppointments}
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-bold">
            Waiting
          </h2>

          <p className="text-3xl">
            {waitingCount}
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-bold">
            Completed
          </h2>

          <p className="text-3xl">
            {completedCount}
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-bold">
            Current Token
          </h2>

          <p className="text-3xl">
            {currentPatient
              ? currentPatient.token_number
              : '-'}
          </p>
        </div>

      </div>

      <div className="border rounded p-5">

        <h2 className="text-2xl font-bold mb-4">
          Live Queue
        </h2>

        {appointments.length === 0 ? (
          <p>
            No appointments found.
          </p>
        ) : (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex justify-between border-b py-3"
            >
              <span>
                #{appointment.token_number}
              </span>

              <span>
                {appointment.patient_name}
              </span>

              <span>
                {appointment.status}
              </span>
            </div>
          ))
        )}

      </div>

    </main>
  )
}