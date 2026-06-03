'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function TrackPage() {
  const [phone, setPhone] = useState('')
  const [appointment, setAppointment] = useState<any>(null)
  const [patientsAhead, setPatientsAhead] = useState(0)
  const [currentToken, setCurrentToken] = useState<number | null>(null)
  const [estimatedWait, setEstimatedWait] = useState(0)

  async function trackAppointment() {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!data || data.length === 0) {
      alert('Appointment not found')
      return
    }

    const appt = data[0]

    setAppointment(appt)

    const { data: active } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'In Consultation')
      .limit(1)

    if (active && active.length > 0) {
      setCurrentToken(active[0].token_number)
    } else {
      setCurrentToken(null)
    }

    const { data: waiting } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'Waiting')

    const ahead =
      waiting?.filter(
        (a) =>
          a.token_number < appt.token_number
      ).length || 0

    setPatientsAhead(ahead)

    const { data: doctor } = await supabase
      .from('doctors')
      .select('average_consultation_minutes')
      .eq('id', appt.doctor_id)
      .single()

    const avgTime =
      doctor?.average_consultation_minutes || 10

    setEstimatedWait(ahead * avgTime)
  }

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
            Patients Ahead:{' '}
            {patientsAhead}
          </p>

          <p className="font-bold text-lg mt-3">
            Estimated Wait:{' '}
            {estimatedWait} minutes
          </p>
        </div>
      )}
    </main>
  )
}