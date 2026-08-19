'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStream(mediaStream)
      setError(null)
    } catch (err: any) {
      setError('Camera access denied. Please enable camera permissions.')
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setCaptured(dataUrl)
  }

  const confirmCapture = () => {
    if (!captured) return
    fetch(captured)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
      })
  }

  const retake = () => {
    setCaptured(null)
    startCamera()
  }

  const toggleCamera = () => {
    stream?.getTracks().forEach(t => t.stop())
    setFacingMode(f => f === 'user' ? 'environment' : 'user')
  }

  useEffect(() => {
    if (!captured) startCamera()
  }, [facingMode])

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-950 flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="text-red-400" size={48} />
        <p className="text-white/70 text-center">{error}</p>
        <Button onClick={onClose} variant="secondary">Close</Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-950">
      <canvas ref={canvasRef} className="hidden" />

      {captured ? (
        <div className="relative h-full">
          <img src={captured} alt="Captured" className="w-full h-full object-cover" />
          <div className="absolute bottom-8 inset-x-0 flex items-center justify-center gap-4 safe-bottom">
            <Button onClick={retake} variant="secondary" size="lg" className="rounded-full w-16 h-16 p-0">
              <RotateCcw size={24} />
            </Button>
            <Button onClick={confirmCapture} size="lg" className="rounded-full w-20 h-20 p-0">
              <Check size={32} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          <div className="absolute top-4 right-4 safe-top">
            <button onClick={onClose} className="glass p-3 rounded-full">
              <X size={24} className="text-white" />
            </button>
          </div>

          <div className="absolute top-4 left-4 safe-top">
            <button onClick={toggleCamera} className="glass p-3 rounded-full">
              <RotateCcw size={24} className="text-white" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full border-2 border-white/20" />
            <div className="scanning-line" />
          </div>

          <div className="absolute bottom-8 inset-x-0 flex items-center justify-center safe-bottom">
            <button
              onClick={capture}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/10 active:bg-white/30 transition-colors flex items-center justify-center"
            >
              <Camera size={32} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}