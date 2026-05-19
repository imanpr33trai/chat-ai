import { z } from 'zod'

// ─── Zod schemas ────────────────────────────────────────────────

const ContentPartSchema: z.ZodType = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('image_url'), image_url: z.object({ url: z.string() }) }),
])

const MessageSchema = z.object({
  role: z.enum(['system', 'context', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.null(), z.array(ContentPartSchema)]),
  tool_call_id: z.string().optional().nullable(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
          description: z.string(),
        }),
      }),
    )
    .optional(),
})

const ChatRequestSchema = z.object({
  model: z.string().min(1, 'model is required and must be a non-empty string'),
  messages: z
    .array(MessageSchema)
    .min(1, 'messages is required and must be a non-empty array'),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_tokens: z.number().optional(),
  tools: z.array(z.unknown()).optional(),
  seed: z.number().optional(),
  stream: z.boolean().optional(),
})

// ─── Env ─────────────────────────────────────────────────────────

const PROXY_URL = process.env.EXPO_PUBLIC_API_URL

// ─── Debug helper ─────────────────────────────────────────────────

const DEBUG = typeof process !== 'undefined' && process.env.DEBUG_NVIDIA === 'true'

function debug(label: string, data: unknown) {
  if (DEBUG) {
    console.error(`[NVIDIA DEBUG ${label}]`, JSON.stringify(data, null, 2))
  }
}

// ─── POST /api/chat ──────────────────────────────────────────────

export async function POST(request: Request) {
  if (!PROXY_URL) {
    return Response.json({ error: 'Proxy url must be set in .env' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid request'
    return Response.json({ error: firstError }, { status: 400 })
  }

  const { model, messages, temperature, top_p, max_tokens, tools, seed, stream } = parsed.data

  // Forward API key from client if provided
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')

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
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
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
