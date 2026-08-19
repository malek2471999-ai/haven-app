'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { HavenLogo } from '@/components/ui/haven-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .max(20, 'اسم المستخدم يجب أن يكون 20 حرف كحد أقصى')
    .regex(/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يحتوي على أحرف غير مسموحة'),
  password: z
    .string()
    .min(1, 'كلمة المرور مطلوبة'),
})

const twoFactorSchema = z.object({
  code: z.string().length(6, 'كود من 6 أرقام'),
})

type LoginForm = z.infer<typeof loginSchema>
type TwoFactorForm = z.infer<typeof twoFactorSchema>

export default function LoginPage() {
  const [error, setError] = useState<string>('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [success2FA, setSuccess2FA] = useState('')
  const { signIn, setUser } = useAuth()
  const router = useRouter()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const twoFactorForm = useForm<TwoFactorForm>({ resolver: zodResolver(twoFactorSchema) })

  const onLoginSubmit = async (data: LoginForm) => {
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (json.error) {
        setError(json.error)
      } else if (json.requires2FA) {
        setRequires2FA(true)
        setTempToken(json.tempToken)
        setSuccess2FA('')
      } else if (json.token) {
        document.cookie = `haven_token=${json.token}; path=/; max-age=${7 * 24 * 60 * 60}`
        setUser(json.user)
        router.push('/messages')
      }
    } catch {
      setError('حدث خطأ')
    }
  }

  const onTwoFactorSubmit = async (data: TwoFactorForm) => {
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.getValues('username'),
          password: loginForm.getValues('password'),
          twoFactorCode: data.code,
        }),
      })
      const json = await res.json()

      if (json.error) {
        setError(json.error)
      } else if (json.token) {
        document.cookie = `haven_token=${json.token}; path=/; max-age=${7 * 24 * 60 * 60}`
        setUser(json.user)
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
          <h1 className="text-2xl font-bold text-dark-100">مرحباً بعودتك</h1>
          <p className="text-sm text-dark-400">
            {!requires2FA ? 'سجل الدخول إلى حسابك' : 'أدخل كود التحقق من تطبيق المصادقة'}
          </p>
        </div>
      </div>

      {/* Login Form */}
      {!requires2FA && (
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <Input
            label="اسم المستخدم"
            placeholder="username"
            autoComplete="username"
            autoCapitalize="none"
            dir="ltr"
            error={loginForm.formState.errors.username?.message}
            {...loginForm.register('username')}
          />

          <Input
            type="password"
            label="كلمة المرور"
            placeholder="••••••••"
            autoComplete="current-password"
            error={loginForm.formState.errors.password?.message}
            {...loginForm.register('password')}
          />

          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm text-haven-400 hover:text-haven-300 transition-colors">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loginForm.formState.isSubmitting}>
            تسجيل الدخول
          </Button>
        </form>
      )}

      {/* 2FA Form */}
      {requires2FA && (
        <form onSubmit={twoFactorForm.handleSubmit(onTwoFactorSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="p-4 rounded-xl bg-haven-500/10 border border-haven-500/20 text-center space-y-2">
            <svg className="w-10 h-10 mx-auto text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm text-dark-300">التحقق بخطوتين مفعّل</p>
            <p className="text-xs text-dark-500">أدخل الكود من تطبيق المصادقة</p>
          </div>

          <Input
            label="كود التحقق"
            placeholder="000000"
            dir="ltr"
            className="font-mono tracking-wider text-lg text-center"
            error={twoFactorForm.formState.errors.code?.message}
            {...twoFactorForm.register('code')}
          />

          <Button type="submit" className="w-full" size="lg" loading={twoFactorForm.formState.isSubmitting}>
            تحقق ودخول
          </Button>

          <button
            type="button"
            onClick={() => { setRequires2FA(false); setError(''); setSuccess2FA('') }}
            className="w-full text-center text-sm text-dark-400 hover:text-dark-200"
          >
            رجوع
          </button>
        </form>
      )}

      <div className="text-center">
        <p className="text-sm text-dark-400">
          ليس لديك حساب؟{' '}
          <Link href="/signup" className="text-haven-400 hover:text-haven-300 font-medium transition-colors">
            أنشئ حساباً
          </Link>
        </p>
      </div>
    </div>
  )
}
