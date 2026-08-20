'use client'

import { IncomingCallOverlay } from '@/components/calls/IncomingCallOverlay'

export function CallProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IncomingCallOverlay />
      {children}
    </>
  )
}
