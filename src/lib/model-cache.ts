const STORAGE_KEY = 'hermes_model_availability'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface ModelAvailabilityCache {
  timestamp: number
  models: Record<string, boolean> // modelId → available
}

export function readModelCache(): ModelAvailabilityCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.models) return null
    return parsed as ModelAvailabilityCache
  } catch {
    return null
  }
}

export function writeModelCache(models: Record<string, boolean>) {
  try {
    const cache: ModelAvailabilityCache = { timestamp: Date.now(), models }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage might be full or unavailable
  }
}

export function isCacheStale(): boolean {
  const cache = readModelCache()
  if (!cache) return true
  return Date.now() - cache.timestamp > CACHE_TTL_MS
}

export function mergeIntoCache(updates: Record<string, boolean>) {
  const cache = readModelCache()
  const existing = cache?.models ?? {}
  const merged = { ...existing, ...updates }
  writeModelCache(merged)
}

export function clearModelCache() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
