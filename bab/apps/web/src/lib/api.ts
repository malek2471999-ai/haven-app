const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('bab_token', token)
    } else {
      localStorage.removeItem('bab_token')
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('bab_token')
    }
    return this.token
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(error.detail || `HTTP ${res.status}`)
    }

    return res.json()
  }

  // Auth
  async signup(email: string, password: string, fullName?: string) {
    return this.request<{ token: string; user_id: string; email: string; role: string }>(
      '/api/auth/signup',
      { method: 'POST', body: JSON.stringify({ email, password, full_name: fullName }) }
    )
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user_id: string; email: string; role: string }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    )
  }

  async getMe() {
    return this.request<{ id: string; email: string; full_name: string; role: string }>('/api/auth/me')
  }

  // Search
  async createSearch(file: File, consentConfirmed: boolean, isPrivate: boolean = false) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('consent_confirmed', String(consentConfirmed))
    formData.append('is_private', String(isPrivate))

    return this.request<{ search_id: string; status: string; message: string }>(
      '/api/search',
      { method: 'POST', body: formData }
    )
  }

  async getSearchStatus(searchId: string) {
    return this.request<{
      search_id: string
      status: string
      total_results: number
      error_message: string | null
      created_at: string
      completed_at: string | null
    }>(`/api/search/${searchId}/status`)
  }

  async getSearchResults(searchId: string) {
    return this.request<{
      search_id: string
      status: string
      total_results: number
      results: SearchResult[]
      providers_used: string[]
      best_similarity: number | null
    }>(`/api/search/${searchId}/results`)
  }

  async deleteSearch(searchId: string) {
    return this.request<{ message: string }>(`/api/search/${searchId}`, { method: 'DELETE' })
  }

  // History
  async getHistory(limit = 20, offset = 0) {
    return this.request<HistoryItem[]>(`/api/history?limit=${limit}&offset=${offset}`)
  }

  async deleteHistoryItem(id: string) {
    return this.request<{ message: string }>(`/api/history/${id}`, { method: 'DELETE' })
  }

  async clearHistory() {
    return this.request<{ message: string }>('/api/history', { method: 'DELETE' })
  }

  // Saved
  async saveResult(data: { search_id?: string; result_id?: string; collection_id?: string; notes?: string }) {
    return this.request<any>('/api/saved', { method: 'POST', body: JSON.stringify(data) })
  }

  async removeSaved(id: string) {
    return this.request<{ message: string }>(`/api/saved/${id}`, { method: 'DELETE' })
  }

  // Collections
  async getCollections() {
    return this.request<any[]>('/api/collections')
  }

  async createCollection(data: { name: string; description?: string; icon?: string }) {
    return this.request<any>('/api/collections', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateCollection(id: string, data: { name?: string; description?: string }) {
    return this.request<any>(`/api/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteCollection(id: string) {
    return this.request<{ message: string }>(`/api/collections/${id}`, { method: 'DELETE' })
  }

  // Admin
  async getProviders() {
    return this.request<any[]>('/api/admin/providers')
  }

  async createProvider(data: any) {
    return this.request<any>('/api/admin/providers', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateProvider(id: string, data: any) {
    return this.request<any>(`/api/admin/providers/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  async testProvider(id: string) {
    return this.request<any>(`/api/admin/providers/${id}/test`, { method: 'POST' })
  }

  async getSystemHealth() {
    return this.request<any>('/api/admin/system-health')
  }

  async getAdminSearches(limit = 50) {
    return this.request<any[]>(`/api/admin/searches?limit=${limit}`)
  }

  async getAdminLogs() {
    return this.request<any>('/api/admin/logs/errors')
  }

  async getProviderLogs() {
    return this.request<any>('/api/admin/logs/providers')
  }
}

export const api = new ApiClient()

export interface SearchResult {
  id: string
  source_url: string
  image_url: string | null
  thumbnail_url: string | null
  page_title: string | null
  page_description: string | null
  domain: string | null
  source_type: string | null
  visual_similarity: number | null
  image_hash_similarity: number | null
  face_region_similarity: number | null
  final_score: number | null
  result_category: string | null
  discovered_at: string
}

export interface HistoryItem {
  id: string
  thumbnail_url: string | null
  created_at: string
  total_results: number
  best_similarity: number | null
  status: string
}
