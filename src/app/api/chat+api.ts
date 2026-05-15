// ─── Types (no external deps) ───────────────────────────────────

type Role = 'system' | 'context' | 'user' | 'assistant' | 'tool'

interface Message {
  role: Role
  content: string | null
  tool_call_id?: string | null
  tool_calls?: {
    id: string
    type: 'function'
    function: { name: string; arguments: string; description: string }
  }[]
}

interface ChatRequest {
  model: string
  messages: Message[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  tools?: unknown[]
  seed?: number
  stream?: boolean
}

interface ParsedChunk {
  id: string
  model: string
  content: string
  isDone: boolean
  role?: string
  finish_reason?: string | null
}

// ─── Env ─────────────────────────────────────────────────────────

// const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL ?? '').trim()
const PROXY_URL = process.env.EXPO_PUBLIC_API_URL
// const NVIDIA_API_KEY = (process.env.NVIDIA_API_KEY ?? process.env.NVDIDIA_API_KEY ?? '').trim()

// ─── Debug helper ─────────────────────────────────────────────────

const DEBUG = process.env.DEBUG_NVIDIA === 'true'

function debug(label: string, data: unknown) {
  if (DEBUG) {
    console.error(`[NVIDIA DEBUG ${label}]`, JSON.stringify(data, null, 2))
  }
}

// ─── Validation helpers ──────────────────────────────────────────

const VALID_ROLES: Role[] = ['system', 'context', 'user', 'assistant', 'tool']

function isRole(v: unknown): v is Role {
  return typeof v === 'string' && VALID_ROLES.includes(v as Role)
}

function isMessageArray(v: unknown): v is Message[] {
  return (
    Array.isArray(v) &&
    v.every(
      (m) =>
        typeof m === 'object' &&
        m !== null &&
        isRole((m as Message).role) &&
        (typeof (m as Message).content === 'string' || (m as Message).content === null),
    )
  )
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function validateRequest(body: unknown): { ok: true; data: ChatRequest } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a non-null object' }
  }
  const b = body as Record<string, unknown>

  if (!isNonEmptyString(b.model)) return { ok: false, error: 'model is required and must be a non-empty string' }
  if (!isMessageArray(b.messages)) return { ok: false, error: 'messages is required and must be an array of message objects' }
  if (b.temperature !== undefined && typeof b.temperature !== 'number') {
    return { ok: false, error: 'temperature must be a number' }
  }
  if (b.top_p !== undefined && typeof b.top_p !== 'number') {
    return { ok: false, error: 'top_p must be a number' }
  }
  if (b.max_tokens !== undefined && typeof b.max_tokens !== 'number') {
    return { ok: false, error: 'max_tokens must be a number' }
  }
  if (b.tools !== undefined && !Array.isArray(b.tools)) {
    return { ok: false, error: 'tools must be an array' }
  }
  if (b.seed !== undefined && typeof b.seed !== 'number') {
    return { ok: false, error: 'seed must be a number' }
  }
  if (b.stream !== undefined && typeof b.stream !== 'boolean') {
    return { ok: false, error: 'stream must be a boolean' }
  }

  return {
    ok: true,
    data: {
      model: b.model,
      messages: b.messages,
      temperature: b.temperature,
      top_p: b.top_p,
      max_tokens: b.max_tokens,
      tools: b.tools as unknown[] | undefined,
      seed: b.seed,
      stream: b.stream,
    },
  }
}

// ─── SSE chunk parsing ───────────────────────────────────────────

export function parseStreamChunk(raw: string): ParsedChunk | null {
  if (!raw || raw === '[DONE]') {
    return { id: '', model: '', content: '', isDone: true }
  }
  try {
    const json = JSON.parse(raw) as {
      id: string
      model: string
      choices: {
        delta: { role?: string; content?: string; reasoning_content?: string }
        finish_reason: string | null
      }[]
    }
    const choice = json.choices[0]
    return {
      id: json.id,
      model: json.model,
      content: choice.delta.content ?? choice.delta.reasoning_content ?? '',
      isDone: choice.finish_reason !== null,
      role: choice.delta.role,
      finish_reason: choice.finish_reason,
    }
  } catch {
    return null
  }
}

// ─── POST /api/chat ──────────────────────────────────────────────

export async function POST(request: Request) {
  if (!PROXY_URL ) {
    return Response.json(
      { error: 'Proxy url must be set in .env' },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const valid = validateRequest(body)
  if (!valid.ok) {
    const err = (valid as { ok: false; error: string }).error
    return Response.json({ error: err }, { status: 400 })
  }

  const { model, messages, temperature, top_p, max_tokens, tools, seed, stream } = valid.data

  const payload: Record<string, unknown> = {
    model,
    messages: messages.map((m) => {
      const msg: Record<string, unknown> = { role: m.role, content: m.content }
      if (m.tool_calls?.length) msg.tool_calls = m.tool_calls
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
      return msg
    }),
  }
  if (temperature !== undefined) payload.temperature = temperature
  if (top_p !== undefined) payload.top_p = top_p
  if (max_tokens !== undefined) payload.max_tokens = max_tokens
  if (tools?.length) payload.tools = tools
  if (seed !== undefined) payload.seed = seed
  if (stream !== undefined) payload.stream = stream

  debug('REQUEST', {
    upstreamUrl: `${PROXY_URL}/v1/chat/completions`,
    model,
    messageCount: messages.length,
    payload,
  })

  let upstream: Response
  try {
    upstream = await fetch(`${PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {

        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Fetch failed: ${msg}` }, { status: 502 })
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    debug('RESPONSE_ERROR', {
      status: upstream.status,
      statusText: upstream.statusText,
      detail,
    })
    return Response.json(
      { error: `NVIDIA API error (${upstream.status})`, detail },
      { status: upstream.status },
    )
  }

  if (stream) {
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  const data = await upstream.json()
  return Response.json(data)
}