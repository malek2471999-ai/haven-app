'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HavenLogo } from '@/components/ui/haven-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingPage } from '@/components/ui/loading'

const resetSchema = z.object({
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
})

type ResetForm = z.infer<typeof resetSchema>

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  if (!token) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4">
          <HavenLogo size={64} />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-dark-100">رابط غير صالح</h1>
            <p className="text-sm text-dark-400">رابط استرجاع كلمة المرور غير صالح أو منتهي</p>
          </div>
        </div>
        <Link href="/forgot-password" className="block text-center text-sm text-haven-400 hover:text-haven-300">
          طلب رابط جديد
        </Link>
      </div>
    )
  }

  const onSubmit = async (data: ResetForm) => {
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('حدث خطأ')
    }
  }

  if (success) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4">
          <HavenLogo size={64} />
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-haven-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-dark-100">تم التغيير بنجاح</h1>
            <p className="text-sm text-dark-400">جاري التحويل لصفحة تسجيل الدخول...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <HavenLogo size={64} />
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-dark-100">كلمة مرور جديدة</h1>
          <p className="text-sm text-dark-400">أدخل كلمة المرور الجديدة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <Input
          type="password"
          label="كلمة المرور الجديدة"
          placeholder="8 أحرف على الأقل"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          type="password"
          label="تأكيد كلمة المرور"
          placeholder="أعد إدخال كلمة المرور"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isSubmitting}
        >
          تغيير كلمة المرور
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
