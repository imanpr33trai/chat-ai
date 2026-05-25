const PROXY_URL = process.env.EXPO_PUBLIC_API_URL

const NOT_FOUND_SIGNALS = ['Not Found', 'not_found', 'model_not_found', 'resp_error']
const CONCURRENCY = 10

async function checkSingle(model: string, timeoutMs = 10_000, bearerToken?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`

    const upstream = await fetch(`${PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '.' }],
        max_tokens: 1,
        stream: true,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      return !NOT_FOUND_SIGNALS.some((s) => detail.includes(s))
    }

    const reader = upstream.body?.getReader()
    if (!reader) return false

    const { done, value } = await reader.read()
    await reader.cancel()

    if (done) return false
    const raw = new TextDecoder().decode(value)
    const bodyText = raw.replace(/^data: /, '').trim()

    return !NOT_FOUND_SIGNALS.some((s) => bodyText.includes(s))
  } catch {
    return false
  }
}

function extractBearerToken(request: Request): string | undefined {
  return (
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  ) || undefined
}

export async function POST(request: Request) {
  if (!PROXY_URL) {
    return Response.json({ error: 'PROXY_URL must be set in .env file' }, { status: 500 })
  }

  const bearerToken = extractBearerToken(request)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.model === 'string') {
    const timeoutMs = typeof body.timeout === 'number' ? body.timeout : 10_000
    const available = await checkSingle(body.model, timeoutMs, bearerToken)
    return Response.json({ available })
  }

  if (Array.isArray(body.models) && body.models.length > 0) {
    const allModels = body.models.filter((m): m is string => typeof m === 'string')
    const results: Record<string, boolean> = {}

    for (let i = 0; i < allModels.length; i += CONCURRENCY) {
      const batch = allModels.slice(i, i + CONCURRENCY)
      const outcomes = await Promise.allSettled(
        batch.map((m) => checkSingle(m, 10_000, bearerToken))
      )
      for (let j = 0; j < batch.length; j++) {
        const outcome = outcomes[j]
        results[batch[j]] = outcome.status === 'fulfilled' ? outcome.value : false
      }
    }

    return Response.json({ results })
  }

  return Response.json({ error: 'Provide "model" (string) or "models" (string[])' }, { status: 400 })
}
