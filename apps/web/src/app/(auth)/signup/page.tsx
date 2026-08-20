'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { HavenLogo } from '@/components/ui/haven-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isValidUsername, isReservedUsername } from '@/lib/utils'

const signupSchema = z.object({
  username: z
    .string()
    .min(2, 'اسم المستخدم يجب أن يكون حرفين على الأقل')
    .max(16, 'اسم المستخدم يجب أن يكون 16 حرف كحد أقصى')
    .regex(/^[a-zA-Z0-9_]+$/, 'فقط الأحرف الإنجليزية والأرقام والشرطة السفلية')
    .refine((val) => !isReservedUsername(val), 'هذا الاسم محجوز'),
  displayName: z
    .string()
    .min(2, 'الاسم المعروض يجب أن يكون حرفين على الأقل')
    .max(50, 'الاسم المعروض طويل جداً'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function SignupPage() {
  const [error, setError] = useState<string>('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [copied, setCopied] = useState(false)
  const { signUp, checkUsername } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      displayName: '',
      password: '',
      confirmPassword: '',
    },
  })

  const watchedUsername = watch('username')

  useEffect(() => {
    if (!watchedUsername || watchedUsername.length < 3) {
      setUsernameStatus('idle')
      return
    }

    if (!isValidUsername(watchedUsername) || isReservedUsername(watchedUsername)) {
      setUsernameStatus('invalid')
      return
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking')
      const { available } = await checkUsername(watchedUsername)
      setUsernameStatus(available ? 'available' : 'taken')
    }, 500)

    return () => clearTimeout(timer)
  }, [watchedUsername, checkUsername])

  const usernameStatusConfig: Record<UsernameStatus, { text: string; color: string } | null> = {
    idle: null,
    checking: { text: 'جاري التحقق...', color: 'text-dark-400' },
    available: { text: '✓ اسم المستخدم متاح', color: 'text-haven-400' },
    taken: { text: 'اسم المستخدم مستخدم بالفعل', color: 'text-red-400' },
    invalid: { text: 'اسم المستخدم غير مسموح', color: 'text-red-400' },
  }

  const usernameStatusInfo = usernameStatusConfig[usernameStatus]

  const onSubmit = async (data: SignupForm) => {
    setError('')
    if (usernameStatus !== 'available') {
      setError('تحقق من اسم المستخدم أولاً')
      return
    }

    const result = await signUp({
      username: data.username,
      displayName: data.displayName,
      password: data.password,
    })

    if (result.error) {
      setError(result.error)
    } else {
      // Show recovery codes
      if (result.recoveryCodes && result.recoveryCodes.length > 0) {
        setRecoveryCodes(result.recoveryCodes)
        setShowRecoveryCodes(true)
      } else {
        router.push('/feed')
      }
    }
  }

  const copyAllCodes = async () => {
    if (!recoveryCodes.length) return
    const text = recoveryCodes.join('\n')
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const downloadCodes = () => {
    const blob = new Blob([
      `HAVEN Recovery Codes\n`,
      `====================\n\n`,
      `Save these codes in a safe place.\n`,
      `Each code can only be used once.\n\n`,
      recoveryCodes.join('\n')
    ], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'haven-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const watchedPassword = watch('password') || ''
  const getPasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++
    if (score <= 1) return { score, label: 'ضعيفة', color: 'bg-red-500' }
    if (score <= 2) return { score, label: 'متوسطة', color: 'bg-amber-500' }
    if (score <= 3) return { score, label: 'جيد', color: 'bg-haven-500' }
    return { score, label: 'قوية', color: 'bg-haven-400' }
  }

  const passwordStrength = getPasswordStrength(watchedPassword)

  // Show recovery codes screen
  if (showRecoveryCodes) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <HavenLogo size={64} />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-dark-100">أكواد الاسترداد</h1>
            <p className="text-sm text-dark-400">احفظ هذه الأكواد في مكان آمن</p>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-yellow-400 font-medium">احفظ هذه الأكواد!</p>
              <p className="text-sm text-dark-400 mt-1">
                استخدم أحد هذه الأكواد لاسترجاع حسابك إذا نسيت كلمة المرور.
                <br />كل كود يُستخدم مرة واحدة فقط.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={copyAllCodes} variant="outline" className="flex-1">
            {copied ? (
              <>
                <svg className="w-4 h-4 ml-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                تم النسخ!
              </>
            ) : (
              <>
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                نسخ الأكواد
              </>
            )}
          </Button>
          <Button onClick={downloadCodes} variant="outline" className="flex-1">
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            تحميل ملف
          </Button>
        </div>

        {/* Codes grid */}
        <div className="grid grid-cols-2 gap-2">
          {recoveryCodes.map((code, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center p-3 rounded-xl bg-dark-800/80 border border-dark-700/50 font-mono text-dark-100 tracking-wider"
            >
              {code}
            </div>
          ))}
        </div>

        <Button onClick={() => router.push('/feed')} className="w-full" size="lg">
          الدخول إلى HAVEN
        </Button>

        <p className="text-center text-xs text-dark-500">
          يمكنك العثور على الأكواد لاحقاً في الإعدادات → الأمان → أكواد الاسترداد
        </p>
      </div>
    )
  }

  // Normal signup form
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <HavenLogo size={64} />
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-dark-100">أنشئ حسابك</h1>
          <p className="text-sm text-dark-400">انضم إلى HAVEN</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Input
            label="اسم المستخدم"
            placeholder="username"
            autoComplete="username"
            autoCapitalize="none"
            dir="ltr"
            error={errors.username?.message}
            {...register('username')}
          />
          {usernameStatusInfo && (
            <p className={`text-xs ${usernameStatusInfo.color}`}>
              {usernameStatusInfo.text}
            </p>
          )}
        </div>

        <Input
          label="الاسم المعروض"
          placeholder="اسمك"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <div className="space-y-1.5">
          <Input
            type="password"
            label="كلمة المرور"
            placeholder="8 أحرف على الأقل"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {watchedPassword.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= passwordStrength.score ? passwordStrength.color : 'bg-dark-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-dark-400">{passwordStrength.label}</p>
            </div>
          )}
        </div>

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
          disabled={usernameStatus !== 'available'}
        >
          إنشاء الحساب
        </Button>
      </form>

      <div className="text-center space-y-4">
        <p className="text-xs text-dark-500">
          بالتسجيل، أنت توافق على{' '}
          <Link href="/terms" className="text-haven-400 hover:underline">شروط الخدمة</Link>
          {' '}و{' '}
          <Link href="/privacy-policy" className="text-haven-400 hover:underline">سياسة الخصوصية</Link>
        </p>
        <p className="text-sm text-dark-400">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-haven-400 hover:text-haven-300 font-medium transition-colors">
            سجل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
