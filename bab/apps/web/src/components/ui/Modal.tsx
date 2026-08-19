'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={cn(
        'relative w-full max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl p-6 safe-bottom max-h-[85vh] overflow-y-auto',
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
          <button onClick={onClose} className="btn-ghost p-2 ml-auto">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}