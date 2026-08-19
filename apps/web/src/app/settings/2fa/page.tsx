'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingPage } from '@/components/ui/loading'

export default function TwoFactorPage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()

  const [enabled, setEnabled] = useState(false)
  const [loading2FA, setLoading2FA] = useState(true)
  const [secret, setSecret] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'done'>('intro')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [showDisable, setShowDisable] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login') }, [isAuthenticated, isLoading, router])

  // Fetch 2FA status
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/settings/2fa')
        .then(r => r.json())
        .then(data => {
          setEnabled(data.enabled || false)
          setLoading2FA(false)
          if (data.enabled) setStep('done')
        })
        .catch(() => setLoading2FA(false))
    }
  }, [isAuthenticated])

  // Setup 2FA
  const handleSetup = async () => {
    setError('')
    try {
      const res = await fetch('/api/settings/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      })
      const data = await res.json()
      if (data.secret) {
        setSecret(data.secret)
        setQrUrl(data.qrUrl)
        setStep('setup')
      }
    } catch {
      setError('حدث خطأ')
    }
  }

  // Verify and enable
  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('أدخل كود من 6 أرقام')
      return
    }
    setError('')
    setVerifying(true)
    try {
      const res = await fetch('/api/settings/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: verifyCode }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.success) {
        setEnabled(true)
        setStep('done')
        setSuccess('تم تفعيل التحقق بخطوتين بنجاح!')
      }
    } catch {
      setError('حدث خطأ')
    }
    setVerifying(false)
  }

  // Disable 2FA
  const handleDisable = async () => {
    if (!disableCode || disableCode.length !== 6) {
      setError('أدخل كود من 6 أرقام من تطبيق المصادقة')
      return
    }
    setError('')
    try {
      const res = await fetch('/api/settings/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', code: disableCode }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.success) {
        setEnabled(false)
        setShowDisable(false)
        setStep('intro')
        setSuccess('تم تعطيل التحقق بخطوتين')
        setDisableCode('')
      }
    } catch {
      setError('حدث خطأ')
    }
  }

  if (isLoading || loading2FA) return <LoadingPage />
  if (!isAuthenticated) return null

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">التحقق بخطوتين</h1>
        </div>

        {/* Success message */}
        {success && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Step: Intro - 2FA not enabled */}
        {step === 'intro' && !enabled && (
          <div className="glass-card p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-haven-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-haven-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-dark-100">أضف حماية لحسابك</h3>
            <p className="text-sm text-dark-400">
              التحقق بخطوتين يضيف طبقة أمان إضافية.
              <br />عند تسجيل الدخول، ستحتاج كود من تطبيق المصادقة.
            </p>
            <div className="p-3 rounded-xl bg-dark-800/50 text-right space-y-2">
              <p className="text-xs text-dark-400">تطبيقات مقترحة:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded bg-dark-700/50 text-xs text-dark-300">Google Authenticator</span>
                <span className="px-2 py-1 rounded bg-dark-700/50 text-xs text-dark-300">Authy</span>
                <span className="px-2 py-1 rounded bg-dark-700/50 text-xs text-dark-300">Microsoft Authenticator</span>
              </div>
            </div>
            <Button onClick={handleSetup} className="w-full" size="lg">تفعيل التحقق بخطوتين</Button>
          </div>
        )}

        {/* Step: Setup - Show secret and QR */}
        {step === 'setup' && (
          <div className="space-y-4">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-dark-100 text-center">الخطوة 1: أضف الحساب</h3>

              {/* QR Code via Google Charts API */}
              <div className="p-4 rounded-xl bg-white mx-auto w-fit">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    const parent = (e.target as HTMLImageElement).parentElement
                    if (parent && !parent.querySelector('.qr-fallback')) {
                      const div = document.createElement('div')
                      div.className = 'qr-fallback w-[180px] h-[180px] flex items-center justify-center text-dark-800 text-xs text-center p-4'
                      div.textContent = qrUrl
                      parent.appendChild(div)
                    }
                  }}
                />
              </div>

              {/* Manual entry */}
              <div className="space-y-2">
                <p className="text-xs text-dark-400 text-center">أو أدخل هذا المفتاح يدوياً:</p>
                <div className="p-3 rounded-xl bg-dark-800 font-mono text-center text-haven-400 tracking-wider break-all select-all">
                  {secret}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(secret) }}
                  className="w-full text-xs text-haven-400 hover:text-haven-300"
                >
                  نسخ المفتاح
                </button>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-dark-100 text-center">الخطوة 2: تأكّد الكود</h3>
              <p className="text-sm text-dark-400 text-center">أدخل الكود الظاهر في تطبيق المصادقة</p>
              <Input
                label="كود التحقق"
                placeholder="000000"
                dir="ltr"
                className="font-mono tracking-wider text-lg text-center"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button onClick={handleVerify} className="w-full" loading={verifying} disabled={verifyCode.length !== 6}>
                تفعيل
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done - 2FA enabled */}
        {step === 'done' && enabled && (
          <div className="space-y-4">
            <div className="glass-card p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-400">مفعّل ✓</h3>
              <p className="text-sm text-dark-400">
                التحقق بخطوتين مفعّل لحسابك.
                <br />ستحتاج كود من تطبيق المصادقة عند تسجيل الدخول.
              </p>
            </div>

            {/* Disable section */}
            {!showDisable ? (
              <Button onClick={() => setShowDisable(true)} variant="outline" className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10">
                تعطيل التحقق بخطوتين
              </Button>
            ) : (
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-dark-100 text-center">تعطيل التحقق بخطوتين</h3>
                <p className="text-sm text-dark-400 text-center">أدخل الكود من تطبيق المصادقة للتعطيل</p>
                <Input
                  label="كود التحقق"
                  placeholder="000000"
                  dir="ltr"
                  className="font-mono tracking-wider text-lg text-center"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <div className="flex gap-2">
                  <Button onClick={() => { setShowDisable(false); setDisableCode(''); setError('') }} variant="outline" className="flex-1">
                    إلغاء
                  </Button>
                  <Button onClick={handleDisable} className="flex-1 bg-red-500 hover:bg-red-600" disabled={disableCode.length !== 6}>
                    تعطيل
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
