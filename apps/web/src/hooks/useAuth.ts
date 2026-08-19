'use client'

import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  signUp: (data: {
    username: string
    displayName: string
    password: string
  }) => Promise<{ error?: string; recoveryCodes?: string[] }>
  signIn: (data: {
    username: string
    password: string
  }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  checkUsername: (username: string) => Promise<{ available: boolean }>
  fetchUser: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  signUp: async (data) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          displayName: data.displayName,
          password: data.password,
        }),
      })

      const json = await res.json()
      if (!res.ok) return { error: json.error }

      set({ user: json.user, isAuthenticated: true })
      return { recoveryCodes: json.recoveryCodes }
    } catch {
      return { error: 'حدث خطأ أثناء التسجيل' }
    }
  },

  signIn: async (data) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!res.ok) return { error: json.error }

      set({ user: json.user, isAuthenticated: true })
      return {}
    } catch {
      return { error: 'حدث خطأ أثناء تسجيل الدخول' }
    }
  },

  signOut: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      set({ user: null, isAuthenticated: false })
    }
  },

  checkUsername: async (username) => {
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
      const json = await res.json()
      return { available: json.available }
    } catch {
      return { available: false }
    }
  },

  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }
      const json = await res.json()
      set({ user: json.user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
