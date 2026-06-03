'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Appointment = {
  id: string
  patient_name: string
  phone: string
  doctor_id: string
  token_number: number
  status: string
  clinic_id: string
}

type DoctorQueueSettings = {
  average_consultation_minutes: number | null
}

export default function TrackPage() {
  const [phone, setPhone] = useState('')
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [patientsAhead, setPatientsAhead] = useState(0)
  const [currentToken, setCurrentToken] = useState<number | null>(null)
  const [estimatedWait, setEstimatedWait] = useState(0)

  const loadQueueState = useCallback(
    async (trackedAppointment: Appointment) => {
      const { data: refreshedAppointment, error: appointmentError } =
        await supabase
          .from('appointments')
          .select('*')
          .eq('id', trackedAppointment.id)
          .eq('clinic_id', trackedAppointment.clinic_id)
          .single()

      if (appointmentError || !refreshedAppointment) {
        if (appointmentError) {
          console.error(appointmentError)
        }

        return
      }

      const currentAppointment =
        refreshedAppointment as Appointment

      setAppointment(currentAppointment)

      const { data: active, error: activeError } =
        await supabase
          .from('appointments')
          .select('token_number')
          .eq('clinic_id', currentAppointment.clinic_id)
          .eq('status', 'In Consultation')
          .order('token_number')
          .limit(1)

      if (activeError) {
        console.error(activeError)
        return
      }

      setCurrentToken(
        active && active.length > 0
          ? active[0].token_number
          : null
      )

      const { data: waiting, error: waitingError } =
        await supabase
          .from('appointments')
          .select('token_number')
          .eq('clinic_id', currentAppointment.clinic_id)
          .eq('status', 'Waiting')
          .lt(
            'token_number',
            currentAppointment.token_number
          )

      if (waitingError) {
        console.error(waitingError)
        return
      }

      const ahead = waiting?.length || 0

      setPatientsAhead(ahead)

      const { data: doctor, error: doctorError } =
        await supabase
          .from('doctors')
          .select('average_consultation_minutes')
          .eq('id', currentAppointment.doctor_id)
          .eq('clinic_id', currentAppointment.clinic_id)
          .single()

      if (doctorError) {
        console.error(doctorError)
      }

      const queueSettings =
        doctor as DoctorQueueSettings | null

      setEstimatedWait(
        ahead *
          (queueSettings?.average_consultation_minutes || 10)
      )
    },
    []
  )

  async function trackAppointment() {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    if (!data || data.length === 0) {
      alert('Appointment not found')
      return
    }

    const trackedAppointment = data[0] as Appointment

    await loadQueueState(trackedAppointment)
  }

  useEffect(() => {
    if (!appointment) {
      return
    }

    const channel = supabase
      .channel(`track-appointment-${appointment.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${appointment.clinic_id}`
        },
        () => {
          loadQueueState(appointment)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [appointment, loadQueueState])

  return (
    <main className="max-w-2xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">
        Track Appointment
      </h1>

      <input
        className="border p-2 w-full"
        placeholder="Enter Phone Number"
        value={phone}
        onChange={(e) =>
          setPhone(e.target.value)
        }
      />

      <button
        onClick={trackAppointment}
        className="bg-black text-white px-4 py-2 mt-4 rounded"
      >
        Track
      </button>

      {appointment && (
        <div className="border p-6 mt-8 rounded">
          <h2 className="text-xl font-bold">
            {appointment.patient_name}
          </h2>

          <p className="mt-2">
            Token: #{appointment.token_number}
          </p>

          <p>
            Status: {appointment.status}
          </p>

          <p>
            Current Active Token:{' '}
            {currentToken ?? 'None'}
          </p>

          <p>
            Patients Ahead: {patientsAhead}
          </p>

          <p className="font-bold text-lg mt-3">
            Estimated Wait: {estimatedWait} minutes
          </p>
        </div>
      )}
    </main>
  )
}
