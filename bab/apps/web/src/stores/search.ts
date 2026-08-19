import { create } from 'zustand'
import { api, SearchResult } from '@/lib/api'

interface SearchState {
  currentSearchId: string | null
  status: string
  results: SearchResult[]
  providersUsed: string[]
  bestSimilarity: number | null
  totalResults: number
  isSearching: boolean
  error: string | null

  startSearch: (file: File, consent: boolean, isPrivate?: boolean) => Promise<string>
  pollStatus: (searchId: string) => Promise<void>
  fetchResults: (searchId: string) => Promise<void>
  reset: () => void
}

export const useSearch = create<SearchState>((set, get) => ({
  currentSearchId: null,
  status: 'idle',
  results: [],
  providersUsed: [],
  bestSimilarity: null,
  totalResults: 0,
  isSearching: false,
  error: null,

  startSearch: async (file, consent, isPrivate = false) => {
    set({ isSearching: true, error: null, status: 'uploading' })
    try {
      const res = await api.createSearch(file, consent, isPrivate)
      set({ currentSearchId: res.search_id, status: 'queued' })
      return res.search_id
    } catch (err: any) {
      set({ isSearching: false, error: err.message, status: 'failed' })
      throw err
    }
  },

  pollStatus: async (searchId) => {
    try {
      const status = await api.getSearchStatus(searchId)
      set({ status: status.status, totalResults: status.total_results || 0 })
      if (status.error_message) {
        set({ error: status.error_message })
      }
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  fetchResults: async (searchId) => {
    try {
      const data = await api.getSearchResults(searchId)
      set({
        results: data.results,
        providersUsed: data.providers_used,
        bestSimilarity: data.best_similarity,
        totalResults: data.total_results,
        status: data.status,
        isSearching: false,
      })
    } catch (err: any) {
      set({ error: err.message, isSearching: false })
    }
  },

  reset: () => {
    set({
      currentSearchId: null,
      status: 'idle',
      results: [],
      providersUsed: [],
      bestSimilarity: null,
      totalResults: 0,
      isSearching: false,
      error: null,
    })
  },
}))
