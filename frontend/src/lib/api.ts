import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })

  const json = await res.json() as ApiResponse<T>
 
  if (!res.ok) {
    const message = json.error?.message ?? `HTTP ${res.status}`
    const error = new Error(message) as Error & { status: number; code: string }
    error.status = res.status
    error.code = json.error?.code ?? 'UNKNOWN'
    throw error
  }
 
  return json.data as T
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)               => request<T>(path, { method: 'DELETE' }),
}