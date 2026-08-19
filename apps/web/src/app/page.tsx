'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoadingPage } from '@/components/ui/loading'

export default function HomePage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/messages')
      } else {
        router.replace('/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  return <LoadingPage />
}
