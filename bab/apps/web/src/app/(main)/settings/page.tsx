'use client'

import { useState } from 'react'
import { User, Shield, Palette, Info, LogOut, ChevronRight, Moon, Eye, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const sections = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Profile', href: '#' },
      { icon: Shield, label: 'Privacy Center', href: '/settings/privacy' },
    ]
  },
  {
    title: 'Search',
    items: [
      { icon: Eye, label: 'Result Threshold', value: '50%' },
    ]
  },
  {
    title: 'Appearance',
    items: [
      { icon: Moon, label: 'Dark Mode', value: 'On' },
    ]
  },
  {
    title: 'About',
    items: [
      { icon: Info, label: 'Privacy Policy', href: '#' },
      { icon: Info, label: 'Terms of Service', href: '#' },
      { icon: Info, label: 'App Version', value: '0.1.0' },
    ]
  },
]

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-40 glass-strong border-b border-white/10 px-4 py-3 safe-top">
        <h1 className="text-lg font-bold text-white">Settings</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {user && (
          <div className="glass-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-bab-600/20 flex items-center justify-center">
              <span className="text-bab-400 font-bold text-lg">
                {(user.full_name || user.email)[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{user.full_name || 'User'}</p>
              <p className="text-white/40 text-xs">{user.email}</p>
            </div>
            {user.role === 'admin' && (
              <Link href="/admin">
                <span className="text-xs bg-bab-600/20 text-bab-400 px-2 py-1 rounded-lg">Admin</span>
              </Link>
            )}
          </div>
        )}

        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h2>
            <div className="glass divide-y divide-white/5">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href || '#'}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <item.icon size={18} className="text-white/40" />
                  <span className="text-white text-sm flex-1">{item.label}</span>
                  {item.value && (
                    <span className="text-white/30 text-sm">{item.value}</span>
                  )}
                  <ChevronRight size={16} className="text-white/20" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        <Button onClick={handleLogout} variant="danger" fullWidth>
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </div>
  )
}