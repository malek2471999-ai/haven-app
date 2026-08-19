'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { HavenLogo } from '@/components/ui/haven-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const recoverySchema = z.object({
  code: z.string().min(9, 'الكود غير صحيح (الشكل: XXXX-XXXX)'),
})

type RecoveryForm = z.infer<typeof recoverySchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const router = useRouter()
  const { setUser } = useAuth()

  const recoveryForm = useForm<RecoveryForm>({ resolver: zodResolver(recoverySchema) })

  const onRecoverySubmit = async (data: RecoveryForm) => {
    setError('')
    try {
      const res = await fetch('/api/recovery-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.code }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else if (json.success && json.token) {
        // Set cookie
        document.cookie = `haven_token=${json.token}; path=/; max-age=${7 * 24 * 60 * 60}`
        // Set user
        setUser(json.user)
        // Redirect to messages
        router.push('/messages')
      }
    } catch {
      setError('حدث خطأ')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <HavenLogo size={64} />
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-dark-100">استرجاع الحساب</h1>
          <p className="text-sm text-dark-400">أدخل كود الاسترداد للدخول مباشرة</p>
        </div>
      </div>

      <form onSubmit={recoveryForm.handleSubmit(onRecoverySubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>
        )}

        <Input
          label="كود الاسترداد"
          placeholder="XXXX-XXXX"
          dir="ltr"
          className="font-mono tracking-wider text-lg text-center"
          error={recoveryForm.formState.errors.code?.message}
          {...recoveryForm.register('code')}
        />

        <Button type="submit" className="w-full" size="lg" loading={recoveryForm.formState.isSubmitting}>
          الدخول بالكود
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-dark-400">
          تذكرت كلمة المرور؟{' '}
          <Link href="/login" className="text-haven-400 hover:text-haven-300 font-medium transition-colors">
            سجل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
