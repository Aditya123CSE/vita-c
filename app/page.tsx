import Link from 'next/link'

export default function Home() {
  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold mb-8">
        Vita-C
      </h1>

      <div className="space-y-4">

        <Link
          href="/login"
          className="block border p-4 rounded"
        >
          Login
        </Link>

        <Link
          href="/signup"
          className="block border p-4 rounded"
        >
          Signup
        </Link>

        <Link
          href="/dashboard"
          className="block border p-4 rounded"
        >
          Dashboard
        </Link>

        <Link
          href="/doctors"
          className="block border p-4 rounded"
        >
          Doctors
        </Link>

        <Link
          href="/appointments"
          className="block border p-4 rounded"
        >
          Appointments
        </Link>

        <Link
          href="/track"
          className="block border p-4 rounded"
        >
          Track Appointment
        </Link>

      </div>
    </main>
  )
}