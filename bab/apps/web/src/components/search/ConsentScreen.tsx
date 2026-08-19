'use client'

import { useState } from 'react'
import { Shield, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ConsentScreenProps {
  onConfirm: () => void
  onCancel: () => void
}

export function ConsentScreen({ onConfirm, onCancel }: ConsentScreenProps) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-50 bg-dark-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bab-600/20 flex items-center justify-center">
            <Shield className="text-bab-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Search Consent</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            By proceeding, you confirm that this is your image or that you have explicit permission from the person shown to perform this search.
          </p>
        </div>

        <div className="glass-card space-y-4">
          <p className="text-white/70 text-sm">
            BAB will search publicly accessible sources only. No private accounts or restricted content will be accessed.
          </p>
          <p className="text-white/70 text-sm">
            Results are based on visual similarity and do not confirm identity.
          </p>
        </div>

        <button
          onClick={() => setChecked(!checked)}
          className={cn(
            'flex items-center gap-3 w-full p-4 rounded-2xl border transition-all',
            checked
              ? 'border-bab-500/50 bg-bab-500/10'
              : 'border-white/10 bg-white/5'
          )}
        >
          <div className={cn(
            'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
            checked ? 'border-bab-500 bg-bab-500' : 'border-white/20'
          )}>
            {checked && <CheckCircle size={16} className="text-white" />}
          </div>
          <span className="text-white/80 text-sm font-medium">
            I confirm this is my image or I have explicit permission from the person shown
          </span>
        </button>

        <div className="flex gap-3">
          <Button onClick={onCancel} variant="secondary" fullWidth>Cancel</Button>
          <Button onClick={onConfirm} disabled={!checked} fullWidth>Start Search</Button>
        </div>
      </div>
    </div>
  )
}
