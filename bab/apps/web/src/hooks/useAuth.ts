'use client'

import { create } from 'zustand'
import { api } from '@/lib/api'

interface AuthState {
  user: { id: string; email: string; full_name: string; role: string } | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api.login(email, password)
    api.setToken(res.token)
    set({ user: { id: res.user_id, email: res.email, full_name: '', role: res.role }, isAuthenticated: true })
  },

  signup: async (email, password, fullName) => {
    const res = await api.signup(email, password, fullName)
    api.setToken(res.token)
    set({ user: { id: res.user_id, email: res.email, full_name: fullName || '', role: res.role }, isAuthenticated: true })
  },

  logout: () => {
    api.setToken(null)
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    try {
      const token = api.getToken()
      if (!token) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }
      const user = await api.getMe()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      api.setToken(null)
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
