import { z } from 'zod'

// --- Environment (server-side only) ---
// const PROXY_URL = process.env.NVIDIA_BASE_URL?.trim()
const PROXY_URL = process.env.EXPO_PUBLIC_API_URL
// const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY?.trim() || process.env.NVDIDIA_API_KEY?.trim()

// --- Debug helper ---
const DEBUG = process.env.DEBUG_NVIDIA === 'true'
function debug(label: string, data: unknown) {
  if (DEBUG) {
    console.error(`[NVIDIA DEBUG ${label}]`, JSON.stringify(data, null, 2))
  }
}

// --- Zod Schemas ---
const ModelObject = z.object({
  id: z.string(),
  object: z.string().optional(),
  created: z.number().optional(),
  owned_by: z.string().optional(),
  root: z.string().optional(),
})

const ModelsRawResponse = z.object({
  object: z.string(),
  data: z.array(ModelObject),
})

export async function GET(request: Request) {
  // Parse query params
  const url = new URL(request.url)
  const limit = url.searchParams.get('limit')
  const limitNum = limit ? Number(limit) : undefined

  // Validate env
  if (!PROXY_URL ) {
    return Response.json(
      { error: 'PROXY_URL must be set in .env file' },
      { status: 500 },
    )
  }

  // Build target URL
  const target = new URL(`${PROXY_URL}/v1/models`)
  if (limitNum && !isNaN(limitNum)) {
    target.searchParams.set('limit', String(limitNum))
  }

  debug('REQUEST', { url: target.toString() })

  // Fetch from NVIDIA
  const res = await fetch(target.toString(), {
    headers: {

      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    debug('RESPONSE_ERROR', { status: res.status, body })
    return Response.json(
      { error: `NVIDIA API error (${res.status})`, detail: body },
      { status: res.status },
    )
  }

  // Parse and validate response
  const raw = await res.json()
  debug('RESPONSE_OK', { modelCount: raw.data?.length ?? 0 })
  const parsed = ModelsRawResponse.safeParse(raw)

  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid response from NVIDIA API', detail: parsed.error.issues },
      { status: 502 },
    )
  }

  return Response.json(parsed.data)
}
