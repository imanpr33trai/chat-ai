import type { ModelInfo, ModelsResponse } from './types'

const API_BASE = typeof window !== 'undefined' ? '' : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081'

export type { ModelInfo, ModelsResponse }

export async function fetchModels(limit?: number): Promise<ModelsResponse> {
  const params = limit ? `?limit=${limit}` : ''
  const res = await fetch(`${API_BASE}/api/models${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    return res.ok
  } catch {
    return false
  }
}
