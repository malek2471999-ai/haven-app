'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Clock, Bookmark, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/saved', icon: Bookmark, label: 'Saved' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-bottom">
      <div className="glass-strong border-t border-white/10 px-2 pt-2 pb-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'nav-item min-w-[48px] py-1',
                  isActive && 'nav-item-active'
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className={cn(isActive && 'text-bab-400')}
                />
                <span className={cn('text-[10px]', isActive && 'text-bab-400 font-medium')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}