'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type PublicClinic = {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  address: string | null
  phone: string | null
}

export type PublicDoctor = {
  id: string
  name: string
  specialization: string
  clinic_id: string
}

export type PublicQueue = {
  current_token: number | null
  waiting_patients: number
}

export type ClinicPortalData = {
  clinic: PublicClinic
  doctors: PublicDoctor[]
  queue: PublicQueue
}

type BookingConfirmation = {
  appointment_id: string
  patient_name: string
  phone: string
  token_number: number
  status: string
  clinic: {
    id: string
    name: string
    slug: string
  }
  doctor: {
    id: string
    name: string
    specialization: string
  }
}

type ClinicBookingClientProps = {
  initialData: ClinicPortalData
}

export default function ClinicBookingClient({
  initialData
}: ClinicBookingClientProps) {
  const [portalData, setPortalData] =
    useState<ClinicPortalData>(initialData)
  const [patientName, setPatientName] = useState('')
  const [phone, setPhone] = useState('')
  const [doctorId, setDoctorId] = useState(
    initialData.doctors[0]?.id || ''
  )
  const [confirmation, setConfirmation] =
    useState<BookingConfirmation | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedDoctor = useMemo(
    () =>
      portalData.doctors.find(
        (doctor) => doctor.id === doctorId
      ) || null,
    [doctorId, portalData.doctors]
  )

  const loadPortalData = useCallback(async () => {
    const { data, error } = await supabase.rpc(
      'get_public_clinic_portal',
      {
        p_clinic_slug: initialData.clinic.slug
      }
    )

    if (error || !data) {
      if (error) {
        console.error(error)
      }

      return
    }

    const nextPortalData = data as ClinicPortalData

    setPortalData(nextPortalData)

    if (
      !doctorId &&
      nextPortalData.doctors.length > 0
    ) {
      setDoctorId(nextPortalData.doctors[0].id)
    }
  }, [doctorId, initialData.clinic.slug])

  useEffect(() => {
    const channel = supabase
      .channel(
        `public-clinic-appointments-${initialData.clinic.id}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${initialData.clinic.id}`
        },
        () => {
          loadPortalData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialData.clinic.id, loadPortalData])

  async function bookAppointment() {
    setErrorMessage('')
    setConfirmation(null)

    if (!patientName.trim() || !phone.trim() || !doctorId) {
      setErrorMessage(
        'Enter your name, phone number, and doctor.'
      )
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase.rpc(
      'create_vita_appointment',
      {
        p_clinic_id: null,
        p_clinic_slug: portalData.clinic.slug,
        p_doctor_id: doctorId,
        p_patient_name: patientName,
        p_phone: phone
      }
    )

    setSubmitting(false)

    if (error || !data) {
      console.error(error)
      setErrorMessage(
        error?.message ||
          'Unable to book appointment. Please try again.'
      )
      return
    }

    setConfirmation(data as BookingConfirmation)
    setPatientName('')
    setPhone('')
    await loadPortalData()
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
          <div>
            <div className="mb-6 flex items-center gap-4">
              {portalData.clinic.logo ? (
                <div
                  aria-label={portalData.clinic.name}
                  className="h-16 w-16 rounded border bg-cover bg-center"
                  role="img"
                  style={{
                    backgroundImage: `url(${portalData.clinic.logo})`
                  }}
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded border bg-zinc-100 text-xl font-semibold">
                  {portalData.clinic.name.slice(0, 1)}
                </div>
              )}

              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                  Vita-C Clinic
                </p>

                <h1 className="text-4xl font-bold tracking-tight">
                  {portalData.clinic.name}
                </h1>
              </div>
            </div>

            <p className="max-w-2xl text-lg leading-8 text-zinc-600">
              {portalData.clinic.description ||
                'Book your appointment online and follow the live queue before you arrive.'}
            </p>

            <div className="mt-8 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
              <div className="rounded border bg-zinc-50 p-4">
                <p className="font-semibold text-zinc-950">
                  Address
                </p>
                <p className="mt-1">
                  {portalData.clinic.address ||
                    'Address not available'}
                </p>
              </div>

              <div className="rounded border bg-zinc-50 p-4">
                <p className="font-semibold text-zinc-950">
                  Phone
                </p>
                <p className="mt-1">
                  {portalData.clinic.phone ||
                    'Phone not available'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded border bg-zinc-950 p-6 text-white">
            <div>
              <p className="text-sm text-zinc-400">
                Current Token
              </p>
              <p className="mt-2 text-5xl font-bold">
                {portalData.queue.current_token ?? '-'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-white/10 p-4">
                <p className="text-sm text-zinc-300">
                  Waiting
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {portalData.queue.waiting_patients}
                </p>
              </div>

              <div className="rounded bg-white/10 p-4">
                <p className="text-sm text-zinc-300">
                  Doctors
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {portalData.doctors.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div>
          <h2 className="text-2xl font-bold">
            Doctors
          </h2>

          <div className="mt-4 grid gap-3">
            {portalData.doctors.length === 0 ? (
              <div className="rounded border bg-white p-5 text-zinc-600">
                No doctors are available for online booking yet.
              </div>
            ) : (
              portalData.doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="rounded border bg-white p-5"
                >
                  <p className="text-lg font-semibold">
                    {doctor.name}
                  </p>
                  <p className="mt-1 text-zinc-600">
                    {doctor.specialization}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded border bg-white p-6">
          {confirmation ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                Appointment Confirmed
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Token #{confirmation.token_number}
              </h2>

              <div className="mt-6 grid gap-3 text-sm">
                <div className="rounded bg-zinc-50 p-4">
                  <p className="font-semibold">
                    Clinic
                  </p>
                  <p className="mt-1">
                    {confirmation.clinic.name}
                  </p>
                </div>

                <div className="rounded bg-zinc-50 p-4">
                  <p className="font-semibold">
                    Doctor
                  </p>
                  <p className="mt-1">
                    {confirmation.doctor.name}
                  </p>
                </div>

                <div className="rounded bg-zinc-50 p-4">
                  <p className="font-semibold">
                    Patient
                  </p>
                  <p className="mt-1">
                    {confirmation.patient_name}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/track"
                  className="rounded bg-zinc-950 px-4 py-2 text-white"
                >
                  Track Queue
                </Link>

                <button
                  onClick={() => setConfirmation(null)}
                  className="rounded border px-4 py-2"
                >
                  Book Another
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold">
                Book Appointment
              </h2>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-medium">
                  Patient Name
                  <input
                    className="rounded border px-3 py-2 font-normal"
                    value={patientName}
                    onChange={(event) =>
                      setPatientName(event.target.value)
                    }
                    placeholder="Enter patient name"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Phone Number
                  <input
                    className="rounded border px-3 py-2 font-normal"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="Enter phone number"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Doctor
                  <select
                    className="rounded border px-3 py-2 font-normal"
                    value={doctorId}
                    onChange={(event) =>
                      setDoctorId(event.target.value)
                    }
                  >
                    <option value="">
                      Select doctor
                    </option>

                    {portalData.doctors.map((doctor) => (
                      <option
                        key={doctor.id}
                        value={doctor.id}
                      >
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedDoctor && (
                  <div className="rounded bg-zinc-50 p-4 text-sm text-zinc-600">
                    Booking with{' '}
                    <span className="font-semibold text-zinc-950">
                      {selectedDoctor.name}
                    </span>{' '}
                    for {selectedDoctor.specialization}.
                  </div>
                )}

                {errorMessage && (
                  <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errorMessage}
                  </p>
                )}

                <button
                  onClick={bookAppointment}
                  disabled={
                    submitting || portalData.doctors.length === 0
                  }
                  className="rounded bg-zinc-950 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {submitting
                    ? 'Booking...'
                    : 'Book Appointment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
