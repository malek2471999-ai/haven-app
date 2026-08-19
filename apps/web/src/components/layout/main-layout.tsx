'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-dark-950">
      <div className="hidden lg:flex">
        <Sidebar />
        <main className="flex-1 mr-[280px] min-h-screen">
          {children}
        </main>
      </div>
      <div className="lg:hidden">
        <main className="pb-16 min-h-screen">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
