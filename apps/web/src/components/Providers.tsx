'use client'

import { CallProvider } from '@/components/calls/CallProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <CallProvider>{children}</CallProvider>
}
