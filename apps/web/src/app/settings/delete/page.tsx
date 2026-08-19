'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { LoadingPage } from '@/components/ui/loading'

export default function DeleteAccountPage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login') }, [isAuthenticated, isLoading, router])
  if (isLoading) return <LoadingPage />
  if (!isAuthenticated) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">حذف الحساب</h1>
        </div>
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-semibold text-red-400">حذف الحساب</h3>
          </div>
          <p className="text-sm text-dark-400">بمجرد حذف حسابك، لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك نهائياً.</p>
          <button className="w-full py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-colors">
            حذف الحساب نهائياً
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
