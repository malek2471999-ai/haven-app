'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { RotateCcw, ZoomIn, ZoomOut, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CropEditorProps {
  imageUrl: string
  onConfirm: (croppedFile: File) => void
  onCancel: () => void
}

export function CropEditor({ imageUrl, onConfirm, onCancel }: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' })
        onConfirm(file)
      }
    }, 'image/jpeg', 0.95)
  }

  const reset = () => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-950 flex flex-col">
      <div className="flex items-center justify-between p-4 safe-top">
        <button onClick={onCancel} className="btn-ghost p-2">
          <X size={24} />
        </button>
        <h2 className="text-white font-semibold">Crop Image</h2>
        <button onClick={handleConfirm} className="btn-ghost p-2">
          <Check size={24} className="text-bab-400" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        <div
          className="relative"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)` }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            className="max-w-full max-h-full"
          />
          <img
            src={imageUrl}
            alt="Crop"
            className="max-w-full max-h-full object-contain"
            onLoad={() => {
              const canvas = canvasRef.current
              if (canvas) {
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  const img = new Image()
                  img.onload = () => {
                    canvas.width = img.width
                    canvas.height = img.height
                    ctx.drawImage(img, 0, 0)
                  }
                  img.src = imageUrl
                }
              }
            }}
          />
        </div>
      </div>

      <div className="p-6 space-y-4 safe-bottom">
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="glass p-3 rounded-full">
            <ZoomOut size={20} className="text-white" />
          </button>
          <span className="text-white/60 text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="glass p-3 rounded-full">
            <ZoomIn size={20} className="text-white" />
          </button>
          <button onClick={() => setRotation(r => r - 90)} className="glass p-3 rounded-full">
            <RotateCcw size={20} className="text-white" />
          </button>
        </div>
        <div className="flex gap-3">
          <Button onClick={reset} variant="secondary" fullWidth>Reset</Button>
          <Button onClick={handleConfirm} fullWidth>Apply Crop</Button>
        </div>
      </div>
    </div>
  )
}