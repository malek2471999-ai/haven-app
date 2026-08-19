'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ImageUploaderProps {
  onUpload: (file: File) => void
  accept?: string
}

export function ImageUploader({ onUpload, accept = 'image/*' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onUpload(file)
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-200 ${
        dragOver ? 'border-bab-500 bg-bab-500/10' : 'border-white/10 hover:border-white/20'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-2xl" />
          <button
            onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = '' }}
            className="absolute top-2 right-2 glass p-2 rounded-full"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Upload className="text-white/30" size={32} />
          </div>
          <div>
            <p className="text-white/60 font-medium">Drop your image here</p>
            <p className="text-white/30 text-sm mt-1">or tap to browse</p>
          </div>
          <Button onClick={() => inputRef.current?.click()} variant="secondary" size="sm">
            <ImageIcon size={16} />
            Choose Photo
          </Button>
        </div>
      )}
    </div>
  )
}