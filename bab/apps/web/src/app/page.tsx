'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, Search, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { CameraCapture } from '@/components/camera/CameraCapture'
import { ImageUploader } from '@/components/camera/ImageUploader'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [showCamera, setShowCamera] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const router = useRouter()

  const handleCapture = (file: File) => {
    const url = URL.createObjectURL(file)
    sessionStorage.setItem('bab_pending_image', url)
    router.push('/search')
  }

  const handleUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    sessionStorage.setItem('bab_pending_image', url)
    router.push('/search')
  }

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="min-h-dvh flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-bab-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-bab-400/5 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 text-center space-y-8"
          >
            <div className="space-y-2">
              <h1 className="text-6xl font-bold tracking-tight">
                <span className="text-gradient">BAB</span>
              </h1>
              <p className="text-2xl font-light text-white/80" style={{ fontFamily: 'system-ui' }}>
                باب
              </p>
            </div>

            <p className="text-white/40 text-lg max-w-xs mx-auto leading-relaxed">
              اكتشف أين تظهر صورتك على الإنترنت
            </p>

            <div className="space-y-4 max-w-xs mx-auto">
              <Button onClick={() => setShowCamera(true)} fullWidth size="lg" className="group">
                <Camera size={20} />
                Open Camera
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>

              <Button onClick={() => setShowUploader(true)} variant="secondary" fullWidth size="lg" className="group">
                <Upload size={20} />
                Choose Photo
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>

              <Button onClick={() => router.push('/search')} variant="ghost" fullWidth size="lg">
                <Search size={18} />
                Search by Image
              </Button>
            </div>

            <p className="text-white/20 text-xs max-w-xs mx-auto">
              Search publicly accessible sources only. Results are based on visual similarity.
            </p>
          </motion.div>
        </div>
      </div>

      {showUploader && (
        <div className="fixed inset-0 z-50 bg-dark-950 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Upload Image</h2>
            <button onClick={() => setShowUploader(false)} className="btn-ghost p-2">
              ✕
            </button>
          </div>
          <div className="flex-1">
            <ImageUploader onUpload={handleUpload} />
          </div>
        </div>
      )}
    </>
  )
}