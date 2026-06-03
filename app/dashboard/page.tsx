'use client'

import { useCallback, useEffect, useState } from 'react'
import LogoutButton from '@/app/components/LogoutButton'
import { supabase } from '@/lib/supabase'

type Clinic = {
  id: string
  name: string
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

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clinic, setClinic] = useState<Clinic | null>(null)

  const loadAppointments = useCallback(async (clinicId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('token_number')

    if (error) {
      console.error(error)
      return
    }

    setAppointments((data as Appointment[]) || [])
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initializeDashboard() {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user || !isMounted) {
        return
      }

      const { data, error } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('user_id', user.id)
        .single()

      if (error || !data || !isMounted) {
        if (error) {
          console.error(error)
        }

        return
      }

      const currentClinic = data as Clinic

      setClinic(currentClinic)
      await loadAppointments(currentClinic.id)
    }

    initializeDashboard()

    return () => {
      isMounted = false
    }
  }, [loadAppointments])

  useEffect(() => {
    if (!clinic) {
      return
    }

    const channel = supabase
      .channel(`dashboard-appointments-${clinic.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinic.id}`
        },
        () => {
          loadAppointments(clinic.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinic, loadAppointments])

  const currentPatient =
    appointments.find(
      (appointment) =>
        appointment.status === 'In Consultation'
    ) || null

  const waitingCount = appointments.filter(
    (appointment) => appointment.status === 'Waiting'
  ).length

  const completedCount = appointments.filter(
    (appointment) => appointment.status === 'Completed'
  ).length

  return (
    <main className="p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">
            Vita-C Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            {clinic?.name || ''}
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
            {appointments.length}
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
