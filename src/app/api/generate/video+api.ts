// ─── Stable Video Diffusion — Image-to-Video Generation ──────────
// Proxies to NVIDIA NIM endpoint:
//   POST https://ai.api.nvidia.com/v1/genai/stabilityai/stable-video-diffusion
//
// Request body:
//   {
//     image: string           // base64-encoded input image (required)
//     seed?: number           // random seed (0=random)
//     cfg_scale?: number      // classifier-free guidance scale (1.0-3.0, default 2.5)
//     motion_bucket_id?: number  // motion amount (1-255, default 127)
//     frames_per_second?: number  // output frame rate (5-30, default 7)
//   }
//
// Response (202 Accepted — async):
//   {
//     requestId: string
//     taskId: string
//     status: "pending" | "processing" | "completed" | "failed"
//     resultUrl?: string  // URL to download the MP4 when status=completed
//   }

const PROXY_URL = process.env.NVIDIA_BASE_URL?.trim() || process.env.EXPO_PUBLIC_API_URL

// ─── Zod schemas for validation ──────────────────────────────────

function validateGenerateVideo(body: unknown): { ok: true; data: GenerateVideoRequest } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a non-null object' }
  }
  const b = body as Record<string, unknown>

  if (typeof b.image !== 'string' || b.image.length === 0) {
    return { ok: false, error: 'image is required and must be a non-empty base64 string' }
  }

  if (b.seed !== undefined && (typeof b.seed !== 'number' || !Number.isInteger(b.seed) || b.seed < 0)) {
    return { ok: false, error: 'seed must be a non-negative integer' }
  }
  if (b.cfg_scale !== undefined && (typeof b.cfg_scale !== 'number' || b.cfg_scale < 1 || b.cfg_scale > 3)) {
    return { ok: false, error: 'cfg_scale must be a number between 1.0 and 3.0' }
  }
  if (b.motion_bucket_id !== undefined && (typeof b.motion_bucket_id !== 'number' || b.motion_bucket_id < 1 || b.motion_bucket_id > 255)) {
    return { ok: false, error: 'motion_bucket_id must be a number between 1 and 255' }
  }
  if (b.frames_per_second !== undefined && (typeof b.frames_per_second !== 'number' || b.frames_per_second < 5 || b.frames_per_second > 30)) {
    return { ok: false, error: 'frames_per_second must be a number between 5 and 30' }
  }

  return {
    ok: true,
      data: {
        image: b.image as string,
        seed: b.seed as number | undefined,
        cfg_scale: b.cfg_scale as number | undefined,
        motion_bucket_id: b.motion_bucket_id as number | undefined,
        frames_per_second: b.frames_per_second as number | undefined,
      },
  }
}

// ─── Types ───────────────────────────────────────────────────────

interface GenerateVideoRequest {
  image: string
  seed?: number
  cfg_scale?: number
  motion_bucket_id?: number
  frames_per_second?: number
}

interface NvidiaVideoResponse {
  requestId?: string
  taskId?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  resultUrl?: string
  error?: string
}

// ─── POST /api/generate/video ────────────────────────────────────

export async function POST(request: Request) {
  if (!PROXY_URL) {
    return Response.json(
      { error: 'NVIDIA_BASE_URL or EXPO_PUBLIC_API_URL must be set in .env' },
      { status: 500 },
    )
  }

  // Parse and validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const valid = validateGenerateVideo(body)
  if (!valid.ok) {
    return Response.json({ error: (valid as { ok: false; error: string }).error }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    image: valid.data.image,
  }
  if (valid.data.seed !== undefined) payload.seed = valid.data.seed
  if (valid.data.cfg_scale !== undefined) payload.cfg_scale = valid.data.cfg_scale
  if (valid.data.motion_bucket_id !== undefined) payload.motion_bucket_id = valid.data.motion_bucket_id
  if (valid.data.frames_per_second !== undefined) payload.frames_per_second = valid.data.frames_per_second

  // The video generation endpoint is at a different base than chat
  // Use the NVIDIA NIM API directly if NVIDIA_BASE_URL is set,
  // otherwise proxy through the EXPO_PUBLIC_API_URL
  const upstreamUrl = `https://ai.api.nvidia.com/v1/genai/stabilityai/stable-video-diffusion`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY || process.env.NVDIDIA_API_KEY || ''}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000), // 2 min for video generation
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return Response.json(
        {
          error: `NVIDIA API error (${upstream.status})`,
          detail: data,
        },
        { status: upstream.status },
      )
    }

    return Response.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Fetch failed: ${msg}` }, { status: 502 })
  }
}

// ─── GET /api/generate/video/status — poll for result ────────────
// Query params: ?requestId=xxx

export async function GET(request: Request) {
  const url = new URL(request.url)
  const requestId = url.searchParams.get('requestId')

  if (!requestId) {
    return Response.json({ error: 'requestId query parameter is required' }, { status: 400 })
  }

  try {
    const upstream = await fetch(
      `https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/${requestId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY || process.env.NVDIDIA_API_KEY || ''}`,
        },
        signal: AbortSignal.timeout(30_000),
      },
    )

    const data = await upstream.json()

    if (!upstream.ok) {
      return Response.json(
        {
          error: `NVIDIA API error (${upstream.status})`,
          detail: data,
        },
        { status: upstream.status },
      )
    }

    return Response.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Fetch failed: ${msg}` }, { status: 502 })
  }
}
