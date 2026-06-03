'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({
  children
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <main className="p-10">
        Checking authentication...
      </main>
    )
  }

  return <>{children}</>
}