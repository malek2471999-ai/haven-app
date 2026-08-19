'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Key, Search, AlertTriangle, Activity, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNav = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/providers', icon: Key, label: 'Providers' },
  { href: '/admin/searches', icon: Search, label: 'Searches' },
  { href: '/admin/logs', icon: AlertTriangle, label: 'Logs' },
  { href: '/admin/health', icon: Activity, label: 'Health' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-dvh bg-dark-950">
      <div className="sticky top-0 z-40 glass-strong border-b border-white/10 px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2">
            <ArrowLeft size={20} className="text-white/60" />
          </Link>
          <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
        </div>
      </div>

      <div className="flex">
        <aside className="hidden lg:block w-56 min-h-[calc(100vh-60px)] glass border-r border-white/10 p-3">
          <nav className="space-y-1">
            {adminNav.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                    isActive
                      ? 'bg-bab-600/20 text-bab-400 font-medium'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 p-4 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  )
}
