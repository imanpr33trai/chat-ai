import { z } from 'zod'

// --- Environment (server-side only) ---
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL?.trim()
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY?.trim() || process.env.NVDIDIA_API_KEY?.trim()

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
  if (!NVIDIA_BASE_URL || !NVIDIA_API_KEY) {
    return Response.json(
      { error: 'NVIDIA_BASE_URL and NVIDIA_API_KEY must be set in .env file' },
      { status: 500 },
    )
  }

  // Build target URL
  const target = new URL(`${NVIDIA_BASE_URL}/models`)
  if (limitNum && !isNaN(limitNum)) {
    target.searchParams.set('limit', String(limitNum))
  }

  // Fetch from NVIDIA
  const res = await fetch(target.toString(), {
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return Response.json(
      { error: `NVIDIA API error (${res.status})`, detail: body },
      { status: res.status },
    )
  }

  // Parse and validate response
  const raw = await res.json()
  const parsed = ModelsRawResponse.safeParse(raw)

  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid response from NVIDIA API', detail: parsed.error.issues },
      { status: 502 },
    )
  }

  return Response.json(parsed.data)
}
