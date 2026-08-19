'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'

export default function PrivacySettingsPage() {
  const { isAuthenticated, isLoading, fetchUser } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState({
    last_seen_visibility: 'followers',
    online_status_visibility: 'followers',
    dm_privacy: 'followers',
    story_privacy: 'followers',
    group_invite_privacy: 'friends',
    allow_search_discovery: true,
    allow_mention: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/settings/privacy')
        .then(r => r.json())
        .then(data => {
          if (data.settings) {
            setSettings({
              last_seen_visibility: data.settings.last_seen_visibility || 'followers',
              online_status_visibility: data.settings.online_status_visibility || 'followers',
              dm_privacy: data.settings.dm_privacy || 'followers',
              story_privacy: data.settings.story_privacy || 'followers',
              group_invite_privacy: data.settings.group_invite_privacy || 'friends',
              allow_search_discovery: data.settings.allow_search_discovery ?? true,
              allow_mention: data.settings.allow_mention ?? true,
            })
          }
        })
        .catch(() => {})
    }
  }, [isAuthenticated])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings/privacy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
  }

  if (isLoading) return <LoadingPage />
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
          <h1 className="text-2xl font-bold text-dark-100">مركز الخصوصية</h1>
        </div>

        <div className="space-y-6">
          <Section title="الظهور">
            <SelectSetting label="آخر ظهور" value={settings.last_seen_visibility} onChange={(v) => setSettings({ ...settings, last_seen_visibility: v })} options={[{ value: 'everyone', label: 'الجميع' }, { value: 'followers', label: 'المتابعون فقط' }, { value: 'friends', label: 'الأصدقاء فقط' }, { value: 'nobody', label: 'لا أحد' }]} />
            <SelectSetting label="الحالة الافتراضية" value={settings.online_status_visibility} onChange={(v) => setSettings({ ...settings, online_status_visibility: v })} options={[{ value: 'everyone', label: 'الجميع' }, { value: 'followers', label: 'المتابعون فقط' }, { value: 'friends', label: 'الأصدقاء فقط' }, { value: 'nobody', label: 'لا أحد' }]} />
          </Section>

          <Section title="التواصل">
            <SelectSetting label="الرسائل الخاصة" value={settings.dm_privacy} onChange={(v) => setSettings({ ...settings, dm_privacy: v })} options={[{ value: 'everyone', label: 'الجميع' }, { value: 'followers', label: 'المتابعون فقط' }, { value: 'friends', label: 'الأصدقاء فقط' }, { value: 'nobody', label: 'لا أحد' }]} />
            <SelectSetting label="دعوة المجموعات" value={settings.group_invite_privacy} onChange={(v) => setSettings({ ...settings, group_invite_privacy: v })} options={[{ value: 'everyone', label: 'الجميع' }, { value: 'followers', label: 'المتابعون فقط' }, { value: 'friends', label: 'الأصدقاء فقط' }, { value: 'nobody', label: 'لا أحد' }]} />
          </Section>

          <Section title="الاستكشاف">
            <ToggleSetting label="السماح بالعثور على حسابي" description="السماح للآخرين بالبحث عن حسابك" checked={settings.allow_search_discovery} onChange={(v) => setSettings({ ...settings, allow_search_discovery: v })} />
            <ToggleSetting label="السماح بالإشارة" description="السماح للآخرين بالإشارة إليك في المنشورات" checked={settings.allow_mention} onChange={(v) => setSettings({ ...settings, allow_mention: v })} />
          </Section>
        </div>

        <Button onClick={handleSave} loading={saving} className="w-full">حفظ التغييرات</Button>
      </div>
    </MainLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-dark-400 px-2">{title}</h2>
      <div className="glass-card divide-y divide-dark-800/50">{children}</div>
    </div>
  )
}

function SelectSetting({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-dark-100">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-haven-500/50">
        {options.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
      </select>
    </div>
  )
}

function ToggleSetting({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <span className="text-dark-100">{label}</span>
        {description && <p className="text-xs text-dark-500 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-haven-500' : 'bg-dark-700'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'right-0.5' : 'right-[22px]'}`} />
      </button>
    </div>
  )
}
