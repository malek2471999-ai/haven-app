'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Search, ArrowLeft, AlertCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { CameraCapture } from '@/components/camera/CameraCapture'
import { ImageUploader } from '@/components/camera/ImageUploader'
import { CropEditor } from '@/components/camera/CropEditor'
import { AnalyzingScreen } from '@/components/search/AnalyzingScreen'
import { SearchFilters } from '@/components/search/SearchFilters'
import { ResultCard } from '@/components/search/ResultCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSearch } from '@/stores/search'
import { useAuth } from '@/hooks/useAuth'
import { SearchResult } from '@/lib/api'
import Link from 'next/link'

export default function SearchPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const { status, results, totalResults, bestSimilarity, providersUsed, isSearching, error, startSearch, pollStatus, fetchResults, reset } = useSearch()

  const [step, setStep] = useState<'select' | 'preview' | 'crop' | 'consent' | 'analyzing' | 'results'>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeSort, setActiveSort] = useState('highest')

  useEffect(() => {
    const pending = sessionStorage.getItem('bab_pending_image')
    if (pending) {
      setPreviewUrl(pending)
      setStep('preview')
      sessionStorage.removeItem('bab_pending_image')
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'processing' || status === 'queued' || status === 'uploading') {
      interval = setInterval(() => {
        const searchId = useSearch.getState().currentSearchId
        if (searchId) pollStatus(searchId)
      }, 2000)
    }
    if (status === 'completed') {
      const searchId = useSearch.getState().currentSearchId
      if (searchId) {
        fetchResults(searchId)
        setStep('results')
      }
    }
    return () => clearInterval(interval)
  }, [status])

  const handleCapture = (file: File) => {
    setShowCamera(false)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setStep('preview')
  }

  const handleUpload = (file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setStep('preview')
  }

  const handleCrop = (croppedFile: File) => {
    setSelectedFile(croppedFile)
    setPreviewUrl(URL.createObjectURL(croppedFile))
    setStep('preview')
  }

  const handleConsentConfirm = async () => {
    if (!selectedFile) return
    setStep('analyzing')
    try {
      await startSearch(selectedFile, true, isPrivate)
    } catch (err) {
      setStep('preview')
    }
  }

  const handleStartSearch = async () => {
    if (!selectedFile) return
    setStep('analyzing')
    try {
      await startSearch(selectedFile, true, isPrivate)
    } catch (err) {
      setStep('preview')
    }
  }

  const filteredResults = results
    .filter(r => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'websites') return r.source_type === 'website'
      if (activeFilter === 'social') return r.source_type === 'social'
      if (activeFilter === 'images') return r.source_type === 'image'
      return r.result_category === activeFilter
    })
    .sort((a, b) => {
      if (activeSort === 'highest') return (b.final_score || 0) - (a.final_score || 0)
      if (activeSort === 'newest') return new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
      return (a.domain || '').localeCompare(b.domain || '')
    })

  return (
    <>
      {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
      {step === 'crop' && previewUrl && <CropEditor imageUrl={previewUrl} onConfirm={handleCrop} onCancel={() => setStep('preview')} />}
      {step === 'analyzing' && <AnalyzingScreen status={status} />}

      <div className="min-h-dvh">
        <div className="sticky top-0 z-40 glass-strong border-b border-white/10 px-4 py-3 safe-top">
          <div className="flex items-center gap-3">
            {step !== 'select' && step !== 'results' ? (
              <button onClick={() => setStep('select')} className="p-2 -ml-2">
                <ArrowLeft size={20} className="text-white/60" />
              </button>
            ) : step === 'results' ? (
              <button onClick={() => { reset(); setStep('select') }} className="p-2 -ml-2">
                <ArrowLeft size={20} className="text-white/60" />
              </button>
            ) : null}
            <h1 className="text-lg font-bold text-white">Search</h1>
          </div>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <Button onClick={() => setShowCamera(true)} fullWidth size="lg" className="group">
                    <Camera size={20} />
                    Open Camera
                  </Button>
                  <Button onClick={() => setStep('upload')} variant="secondary" fullWidth size="lg">
                    <Upload size={20} />
                    Choose Photo
                  </Button>
                </div>

                <div className="glass-card">
                  <div className="flex items-start gap-3">
                    <Info size={16} className="text-bab-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-white/40 space-y-1">
                      <p>BAB searches publicly accessible sources only.</p>
                      <p>Results are based on visual similarity and do not confirm identity.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ImageUploader onUpload={handleUpload} />
              </motion.div>
            )}

            {step === 'preview' && previewUrl && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="glass-card p-2">
                  <img src={previewUrl} alt="Selected" className="w-full max-h-80 object-contain rounded-2xl" />
                </div>

                <label className="flex items-center gap-3 glass-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-white/10 border-white/20"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">This is my image or I have permission to search it</p>
                    <p className="text-white/40 text-xs">BAB searches publicly accessible sources only</p>
                  </div>
                </label>

                <div className="flex gap-2">
                  <Button onClick={() => setStep('crop')} variant="secondary" fullWidth size="sm">Crop</Button>
                  <Button onClick={handleStartSearch} disabled={!consentGiven} fullWidth size="sm">
                    <Search size={16} />
                    Start Search
                  </Button>
                </div>

                <label className="flex items-center gap-3 glass-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-white/10 border-white/20"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">Private Search</p>
                    <p className="text-white/40 text-xs">Don&apos;t save history or images</p>
                  </div>
                </label>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {error && (
                  <div className="glass-card border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={16} className="text-red-400" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <div className="glass-card">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">{totalResults}</p>
                      <p className="text-white/40 text-xs">Results</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-bab-400">{bestSimilarity ? `${Math.round(bestSimilarity * 100)}%` : '—'}</p>
                      <p className="text-white/40 text-xs">Best Match</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{providersUsed.length}</p>
                      <p className="text-white/40 text-xs">Providers</p>
                    </div>
                  </div>
                </div>

                {providersUsed.length > 0 && (
                  <p className="text-white/30 text-xs text-center">
                    Results retrieved from {providersUsed.length} search provider{providersUsed.length > 1 ? 's' : ''}
                  </p>
                )}

                <SearchFilters
                  activeFilter={activeFilter}
                  activeSort={activeSort}
                  onFilterChange={setActiveFilter}
                  onSortChange={setActiveSort}
                />

                {filteredResults.length > 0 ? (
                  <div className="space-y-3">
                    {filteredResults.map(result => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        onSave={() => {}}
                        onOpen={() => window.open(result.source_url, '_blank')}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Search size={48} />}
                    title="No public visual matches were found"
                    description="Try adjusting the search region or using a different image"
                  />
                )}

                <div className="glass-card">
                  <p className="text-white/30 text-xs text-center leading-relaxed">
                    BAB compares publicly available images using visual similarity. A high similarity score does not by itself establish a person&apos;s identity.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}