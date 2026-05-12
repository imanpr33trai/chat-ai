import { useState, useEffect } from 'react'

export type RemoteModel = {
  id: string
  name: string
  provider: string
  description: string
}

export function useModels() {
  const [models, setModels] = useState<RemoteModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/models')
        const data = await res.json()
        
        if (data.error) {
          setError(data.error)
          setLoading(false)
          return
        }

        // Format all models from the API
        const formattedModels: RemoteModel[] = data.data.map((model: any) => {
          const id = model.id
          // Extract a friendly name from the model ID
          const parts = id.split('/')
          const shortName = parts[parts.length - 1]
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

          // Determine provider from ID
          let provider = 'NVIDIA'
          if (id.includes('nvidia')) provider = 'NVIDIA'
          else if (id.includes('meta')) provider = 'Meta'
          else if (id.includes('mistralai')) provider = 'Mistral'
          else if (id.includes('google')) provider = 'Google'
          else if (id.includes('anthropic')) provider = 'Anthropic'
          else if (id.includes('openai')) provider = 'OpenAI'
          else if (id.includes('deepseek')) provider = 'DeepSeek'
          else if (id.includes('microsoft')) provider = 'Microsoft'
          else if (id.includes('databricks')) provider = 'Databricks'
          else if (id.includes('aavoid')) provider = 'Aavoid'
          else if (id.includes('softtek')) provider = 'Softtek'
          else if (id.includes('mistral')) provider = 'Mistral'

          return {
            id,
            name: formatModelName(shortName),
            provider,
            description: getModelDescription(id),
          }
        })

        // Deduplicate by model ID (first occurrence wins)
        const seen = new Map<string, RemoteModel>()
        for (const model of formattedModels) {
          if (!seen.has(model.id)) {
            seen.set(model.id, model)
          }
        }
        const uniqueModels = Array.from(seen.values())

        setModels(uniqueModels)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch models')
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  return { models, loading, error }
}

function formatModelName(name: string): string {
  // Capitalize each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
  if (id.includes('code')) return 'Specialized for code generation'
  if (id.includes('vision')) return 'Supports image understanding'
  if (id.includes('embed')) return 'Text embeddings model'
  
  return 'General purpose AI model'
}
