import { useState, useEffect, useRef } from 'react'
import { readModelCache } from '@/lib/model-cache'

export type RemoteModel = {
  id: string
  name: string
  provider: string
  description: string
  available: boolean | null
}

export function useModels() {
  const [models, setModels] = useState<RemoteModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Use proxy directly when available (native), otherwise Expo API route (dev SSR)
        const modelsEndpoint = process.env.EXPO_PUBLIC_API_URL 
          ? `${process.env.EXPO_PUBLIC_API_URL}/v1/models` 
          : '/api/models';
        const res = await fetch(modelsEndpoint)
        const data = await res.json()

        if (data.error) {
          if (cancelled) return
          setError(data.error)
          setLoading(false)
          return
        }

        const rawModels = (data.data ?? []) as { id: string }[]

        // Apply cached availability for previously verified models
        const cache = readModelCache()
        const cacheMap = cache?.models ?? {}

        const formattedModels: RemoteModel[] = rawModels.map((m) => ({
          id: m.id,
          name: formatModelName(extractShortName(m.id)),
          provider: detectProvider(m.id),
          description: getModelDescription(m.id),
          available: cacheMap[m.id] ?? null,
        }))

        if (!cancelled) {
          setModels(formattedModels)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch models')
          setLoading(false)
        }
      }
    }

    load()
  }, [])

  // Available models only (verified available — for selectors)
  const availableModels = models.filter((m) => m.available === true)

  return {
    models: availableModels,
    allModels: models,
    loading,
    error,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function extractShortName(id: string): string {
  const parts = id.split('/')
  return parts[parts.length - 1]
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectProvider(id: string): string {
  if (id.includes('nvidia')) return 'NVIDIA'
  if (id.includes('meta')) return 'Meta'
  if (id.includes('mistralai') || id.includes('mistral')) return 'Mistral'
  if (id.includes('google')) return 'Google'
  if (id.includes('anthropic')) return 'Anthropic'
  if (id.includes('openai')) return 'OpenAI'
  if (id.includes('deepseek')) return 'DeepSeek'
  if (id.includes('microsoft')) return 'Microsoft'
  if (id.includes('databricks')) return 'Databricks'
  if (id.includes('aavoid')) return 'Aavoid'
  if (id.includes('softtek')) return 'Softtek'
  return 'NVIDIA'
}

function formatModelName(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getModelDescription(modelId: string): string {
  const id = modelId.toLowerCase()
  if (id.includes('70b') || id.includes('65b')) return 'High performance, best quality'
  if (id.includes('8b') || id.includes('7b')) return 'Fast, efficient, good for most tasks'
  if (id.includes('12b') || id.includes('13b')) return 'Balanced speed and capability'
  if (id.includes('nemotron')) return 'NVIDIA optimized for instruction following'
  if (id.includes('deepseek-r1') || id.includes('r1')) return 'Strong reasoning with chain-of-thought'
  if (id.includes('chat')) return 'Optimized for conversation'
  if (id.includes('instruct')) return 'Fine-tuned for following instructions'
  if (id.includes('code') || id.includes('coder')) return 'Specialized for code generation'
  if (id.includes('vision') || id.includes('vl') || id.includes('visual')) return 'Supports image understanding 🖼️'
  if (id.includes('embed')) return 'Text embeddings model'
  return 'General purpose AI model'
}
