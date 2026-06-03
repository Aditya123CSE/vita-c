'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function signup() {
    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Account created')
    router.push('/login')
  }

  return (
    <main className="max-w-md mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">
        Clinic Signup
      </h1>

      <input
        className="border p-2 w-full mb-4"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        className="border p-2 w-full mb-4"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={signup}
        className="bg-black text-white px-4 py-2 rounded w-full"
      >
        Create Account
      </button>
    </main>
  )
}