'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'

export default function RecoveryCodesPage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [codes, setCodes] = useState<{ code: string; is_used: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showUsed, setShowUsed] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/recovery-codes')
        .then(r => r.json())
        .then(data => {
          setCodes(data.codes || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [isAuthenticated, user])

  const copyAllCodes = async () => {
    const activeCodes = codes.filter(c => !c.is_used).map(c => c.code).join('\n')
    if (!activeCodes) return

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(activeCodes)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback: use textarea
        const textarea = document.createElement('textarea')
        textarea.value = activeCodes
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const downloadCodes = () => {
    const activeCodes = codes.filter(c => !c.is_used).map(c => c.code).join('\n')
    const blob = new Blob([
      `HAVEN Recovery Codes\n`,
      `====================\n\n`,
      `Save these codes in a safe place.\n`,
      `Each code can only be used once.\n\n`,
      activeCodes
    ], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'haven-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading || loading) return <LoadingPage />
  if (!isAuthenticated || !user) return null

  const activeCodes = codes.filter(c => !c.is_used)
  const usedCodes = codes.filter(c => c.is_used)

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-dark-800/50">
            <svg className="w-5 h-5 text-dark-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-dark-100">أكواد الاسترداد</h1>
        </div>

        {/* Warning */}
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-yellow-400 font-medium">احفظ هذه الأكواد في مكان آمن!</p>
              <p className="text-sm text-dark-400 mt-1">
                يمكنك استخدام أحد هذه الأكواد لاسترجاع حسابك إذا نسيت كلمة المرور.
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

        {/* Active codes */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-dark-300">الأكواد المتاحة ({activeCodes.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {activeCodes.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-dark-800/80 border border-dark-700/50 font-mono"
              >
                <span className="text-dark-100 tracking-wider">{item.code}</span>
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Used codes */}
        {usedCodes.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowUsed(!showUsed)}
              className="flex items-center gap-2 text-sm text-dark-500 hover:text-dark-300"
            >
              <svg className={`w-4 h-4 transition-transform ${showUsed ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              الأكواد المستخدمة ({usedCodes.length})
            </button>
            {showUsed && (
              <div className="grid grid-cols-2 gap-2">
                {usedCodes.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-800/30 border border-dark-700/20 font-mono opacity-50"
                  >
                    <span className="text-dark-500 line-through">{item.code}</span>
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30 space-y-2">
          <p className="text-xs text-dark-400">
            <strong className="text-dark-300">كيف تستخدم:</strong> عند نسيان كلمة المرور، اذهب إلى
            "نسيت كلمة المرور" واختر "استخدام كود استرداد" وأدخل أحد الأكواد.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
