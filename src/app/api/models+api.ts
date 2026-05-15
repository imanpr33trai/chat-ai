import { z } from 'zod'

// --- Environment (server-side only) ---
const PROXY_URL = process.env.EXPO_PUBLIC_API_URL

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

// ─── In-memory model availability cache ────────────────────────────
// Persists across requests within the same process.
// Resets on server restart / cold start.

const availabilityCache = new Map<string, boolean | 'pending'>()
const VALIDATE_BATCH = 3   // models validated per request
const CACHE_TTL_MS = 300_000  // 5 min before re-check

function isCacheFresh(modelId: string): boolean {
  const entry = availabilityCache.get(modelId)
  if (entry === undefined) return false
  if (entry === 'pending') return false
  // entry is a timestamp number stored as the "true" value
  // We encode freshness as: value=true means available, value=Date.now() means checked
  return true
}

function markChecked(modelId: string, available: boolean) {
  availabilityCache.set(modelId, available)
}

function needsCheck(modelId: string): boolean {
  return !availabilityCache.has(modelId)
}

// ─── Validate a single model ──────────────────────────────────────
// Makes a minimal streaming request; if the upstream returns
// a "Not Found" error, the model is considered unavailable.

const NOT_FOUND_SIGNALS = ['Not Found', 'not_found', 'model_not_found', 'resp_error']

async function checkModel(modelId: string): Promise<boolean> {
  try {
    const upstream = await fetch(`${PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: '.' }],
        max_tokens: 1,
        stream: true,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      return !NOT_FOUND_SIGNALS.some((s) => detail.includes(s))
    }

    const reader = upstream.body?.getReader()
    if (!reader) return false

    const { done, value } = await reader.read()
    reader.cancel()

    if (done) return false
    const raw = new TextDecoder().decode(value)
    const bodyText = raw.replace(/^data: /, '').trim()

    return !NOT_FOUND_SIGNALS.some((s) => bodyText.includes(s))
  } catch {
    return false
  }
}

// ─── GET /api/models ──────────────────────────────────────────────

export async function GET(request: Request) {
  // Parse query params
  const url = new URL(request.url)
  const limit = url.searchParams.get('limit')
  const limitNum = limit ? Number(limit) : undefined
  const forceCheck = url.searchParams.get('check') === 'true'

  // Validate env
  if (!PROXY_URL) {
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

  // Fetch from proxy
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

  const rawModels = parsed.data.data

  // --- Deduplicate by model ID (first occurrence wins) ---
  const seen = new Map<string, z.infer<typeof ModelObject>>()
  for (const model of rawModels) {
    if (!seen.has(model.id)) {
      seen.set(model.id, model)
    }
  }
  const uniqueModels = Array.from(seen.values())

  // --- Incremental validation ---
  // Validate a small batch of unchecked models per request.
  // Results are cached in-memory so all models get checked over time.
  if (forceCheck) {
    // Validate ALL models (triggered by ?check=true)
    await Promise.allSettled(
      uniqueModels.map(async (m) => {
        if (!isCacheFresh(m.id)) {
          const ok = await checkModel(m.id)
          markChecked(m.id, ok)
        }
      }),
    )
  } else {
    // Validate batch of unchecked models
    const toCheck = uniqueModels.filter((m) => needsCheck(m.id)).slice(0, VALIDATE_BATCH)
    if (toCheck.length > 0) {
      debug('VALIDATING', { batch: toCheck.map((m) => m.id) })
      await Promise.allSettled(
        toCheck.map(async (m) => {
          const ok = await checkModel(m.id)
          markChecked(m.id, ok)
        }),
      )
    }
  }

  // --- Build response with availability ---
  const data = uniqueModels.map((model) => ({
    id: model.id,
    available: availabilityCache.get(model.id) ?? null,
  }))

  return Response.json({
    object: 'list',
    data,
  })
}
