'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function login() {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      })

    console.log('LOGIN DATA:', data)
    console.log('LOGIN ERROR:', error)

    if (error) {
      alert(error.message)
      return
    }

    alert('Login successful')

    router.push('/dashboard')
  }

  return (
    <main className="max-w-md mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">
        Clinic Login
      </h1>

      <input
        className="border p-2 w-full mb-4"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <input
        type="password"
        className="border p-2 w-full mb-4"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <button
        onClick={login}
        className="bg-black text-white px-4 py-2 rounded w-full"
      >
        Login
      </button>
    </main>
  )
}