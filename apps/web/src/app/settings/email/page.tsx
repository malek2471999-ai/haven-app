'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'

export default function EmailSettingsPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login') }, [isAuthenticated, isLoading, router])
  if (isLoading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">البريد الإلكتروني</h1>
        </div>
        <div className="glass-card p-4 space-y-3">
          <p className="text-sm text-dark-400">البريد الإلكتروني الحالي:</p>
          <p className="text-dark-100 font-medium">{user.email}</p>
        </div>
        <p className="text-sm text-dark-500">لتغيير البريد الإلكتروني، يرجى التواصل مع الدعم.</p>
      </div>
    </MainLayout>
  )
}
