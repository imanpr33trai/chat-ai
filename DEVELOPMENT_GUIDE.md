# Chat App — Development Guide & Change Log

## Overview

Expo Router chat application using NVIDIA's OpenAI-compatible API backend. Supports text chat, image attachment (vision/multimodal), model availability validation, and image/video generation via NVIDIA NIM endpoints.

---

## 1. What Has Been Done

### 1.1 Critical Bug Fixes

#### Stale Closure State in regenerate/retry
- **Files:** `src/hooks/use-chat-store.tsx`
- **Problem:** `regenerateLastAssistant` and `retryMessage` dispatched `DELETE_MESSAGE` then called `sendMessage` which read stale `state.conversations` — the API received messages that should have been deleted.
- **Fix:** Extracted `startStreamFromMessages` helper that takes a pre-built messages array + model name, eliminating closure dependency on `state.conversations`. Refactored `sendMessage`, `editMessage`, `retryMessage`, `regenerateLastAssistant` to use it — removed ~120 lines of duplicated streaming setup/teardown.

#### Failed Messages Polluting API Context
- **Files:** `src/hooks/use-chat-store.tsx`
- **Problem:** Error text like `"Error: API error (502): Fetch failed..."` was stored as an assistant message and included in the NEXT API request, corrupting conversation context.
- **Fix:** All 4 `apiMessages` builders now filter out `status === 'failed'` messages. Failed messages still show in the UI but never reach the API again.

#### Empty String `message.thinking` Rendered as View Child
- **Files:** `src/components/chat-message.tsx`
- **Problem:** `{message.thinking && <ThinkingBubble />}` evaluated to `""` when thinking was empty, triggering `"Unexpected text node: ."` error in react-native-web.
- **Fix:** Changed to ternary `message.thinking ? (...) : null`. Applied same fix to Copy button condition with `!!message.content`.

### 1.2 Model Validation System

#### Model Availability Check Endpoint
- **File:** `src/app/api/models/check+api.ts` (new)
- `POST /api/models/check` validates a single model `{ model, timeout? }` or batch `{ models: [...] }`
- Makes a 1-token streaming request to the proxy; returns `{ available: true/false }`
- Batch mode validates 10 models in parallel per batch
- Supports configurable timeout (default 10s, up to 180s for slow models)

#### Incremental Model Validation
- **File:** `src/app/api/models+api.ts` (modified)
- After fetching the deduplicated model list from the proxy, validates 3 unchecked models per request in parallel
- Results cached in-memory across requests
- Each response includes `available: true / false / null` per model

#### Model Cache Persistence
- **File:** `src/lib/model-cache.ts` (new)
- `localStorage`-based cache with 24-hour TTL
- Functions: `readModelCache()`, `writeModelCache()`, `mergeIntoCache()`, `clearModelCache()`, `isCacheStale()`
- On first app open: models load instantly from proxy (no validation)
- Settings page has per-model "Verify" button with 3-minute timeout
- Once verified, status persists across sessions

### 1.3 Multimodal / Vision Support

#### Message Type Updates
- **File:** `src/hooks/use-chat-store.tsx`
- Added `images?: string[]` to `Message` interface (base64 data URIs)
- Added `images` parameter to `sendMessage()`
- Added `formatContent()` helper that builds OpenAI-compatible content arrays:
  ```ts
  // Text only:
  content: "Hello"
  // With images:
  content: [
    { type: "text", text: "What's in this?" },
    { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }
  ]
  ```
- Updated `ChatContextValue` interface

#### Chat Input — Image Picker
- **File:** `src/components/chat-input.tsx`
- Installed `expo-image-picker` for device gallery access
- Added 📷 button that opens the image picker
- Image preview thumbnails (40×40) shown above text input with ✕ remove button
- Images passed alongside text in `onSend(text, replyTo, images)`
- Images cleared after send

#### Chat Bubble — Image Display
- **File:** `src/components/chat-message.tsx`
- Added `Image` component from react-native
- Images rendered as 120×120 rounded thumbnails
- Positioned between thinking bubble and text tokens
- Supports multiple images with flexWrap layout

#### API Route — Content Array Handling
- **File:** `src/app/api/chat+api.ts`
- `Message.content` type updated to accept content arrays
- `isMessageArray` validation now accepts arrays
- Content arrays pass through to NVIDIA API (OpenAI-compatible format)

#### Streaming Client — Type Updates
- **File:** `src/lib/chat-stream.ts`
- `StreamOptions.messages` content type updated for multimodal format

#### Vision Model Detection
- **File:** `src/hooks/use-models.ts`
- Model description detection expanded: `vision`, `vl`, `visual`
- Vision models show 🖼️ icon in their description

### 1.4 UI Changes

#### Settings Page
- **File:** `src/app/(settings)/settings.tsx` (rewritten)
- Per-model "Verify" button with live elapsed timer (seconds count up)
- Green dot + "Available" (tap to reset to unchecked)
- Red dot + "Unavailable" / "Timeout" (tap to retry verify)
- Grey dot + "Verify" button (not yet checked)
- Amber dot + spinner + elapsed seconds (currently verifying)
- Section header shows counts: "Models (45 ok, 3 bad, 74 unchecked)"
- "Validate All Unchecked" button — iterates sequentially
- "Clear Validation Cache" button

#### Model Selectors
- **Files:** `src/app/(chats)/index.tsx`, `src/app/(chats)/new.tsx`, `src/app/(settings)/settings.tsx`
- Only show verified-available models (`available === true`)
- Simplified rendering — no availability badges in selectors
- Default model picker only shows working models

### 1.5 Image & Video Generation

#### Stable Video Diffusion Endpoint
- **File:** `src/app/api/generate/video+api.ts` (new, on `image-generation` branch)
- `POST /api/generate/video` — proxies to NVIDIA's Stable Video Diffusion NIM
  - Endpoint: `https://ai.api.nvidia.com/v1/genai/stabilityai/stable-video-diffusion`
  - Accepts: `image` (base64, required), `seed`, `cfg_scale` (1–3), `motion_bucket_id` (1–255), `frames_per_second` (5–30)
  - Returns async response with `requestId`, `taskId`, `status`, `resultUrl`
  - 2-minute timeout for video generation
- `GET /api/generate/video/status?requestId=xxx` — polls for completion
- Uses `NVIDIA_API_KEY` / `NVDIDIA_API_KEY` from env (sent as Bearer token)
- Follows same validation pattern as `chat+api.ts`:
  - Manual validation function with `{ ok: true/false, data/error }` return
  - Range checks on all numeric parameters
  - Same error handling: fetch catch → 502, upstream error passthrough

### 1.6 Files Created vs Modified

| Status | File | Purpose |
|---|---|---|
| **NEW** | `src/app/api/models/check+api.ts` | Model availability check endpoint |
| **NEW** | `src/app/api/generate/video+api.ts` | Video generation endpoint |
| **NEW** | `src/lib/model-cache.ts` | localStorage model cache |
| MODIFIED | `src/hooks/use-chat-store.tsx` | Message type, sendMessage, streaming helper |
| MODIFIED | `src/hooks/use-models.ts` | Vision detection, available filter, cache |
| MODIFIED | `src/app/api/chat+api.ts` | Content array support |
| MODIFIED | `src/app/api/models+api.ts` | Incremental validation |
| MODIFIED | `src/components/chat-input.tsx` | Image picker |
| MODIFIED | `src/components/chat-message.tsx` | Image display, empty string fix |
| MODIFIED | `src/components/chat-view.tsx` | Image passthrough |
| MODIFIED | `src/app/(settings)/settings.tsx` | Per-model verification UI |
| MODIFIED | `src/app/(chats)/index.tsx` | Simplified selector |
| MODIFIED | `src/lib/chat-stream.ts` | Content array types |

---

## 2. What Still Needs to Be Done

### 2.1 Image Generation Frontend

- [ ] **Image generation UI in chat input:** Add a `/imagine` slash command or a separate "Generate Image" button that opens a prompt input and sends to a text-to-image endpoint
- [ ] **Image display for generated images:** Create a component to display generated images (larger than thumbnails) with download/save options
- [ ] **Image generation API route:** Create `src/app/api/generate/image+api.ts` for text-to-image models like SDXL, FLUX, Sana (follow same pattern as video+api.ts)
  - `POST /api/generate/image` → `https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo` or similar
  - Accept: `prompt`, `negative_prompt`, `width`, `height`, `seed`, `cfg_scale`, `steps`
  - Return: base64 image or image URL

### 2.2 Model List Improvements

- [ ] **Image gen models in model list:** Add image generation models from NVIDIA NIM catalog to the model list:
  - `stabilityai/stable-diffusion-xl-base-1.0`
  - `black-forest-labs/FLUX.1-dev`
  - `nvidia/sana-0.6b`
  - `stabilityai/stable-video-diffusion`
- [ ] **Model category filters:** Add tabs or dropdown to filter between "Chat", "Vision", "Image Gen", "Video Gen"
- [ ] **Model search:** Add search bar in model selector for filtering by name/provider

### 2.3 Backend / API

- [ ] **Authorization header for chat endpoint:** The `chat+api.ts` route doesn't send any auth header to the proxy. If `PROXY_URL` is the raw NVIDIA endpoint, requests will fail. Consider adding auth forwarding or documenting proxy setup.
- [ ] **Non-streaming chat support:** The `POST /api/chat` route supports non-streaming (`stream: false`) but the frontend never uses it. The non-streaming response from the proxy returned empty `{}` during testing — investigate.
- [ ] **General image generation endpoint:** Follow the `video+api.ts` pattern:
  ```ts
  // POST /api/generate/image
  const UPSTREAM = "https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo"
  // Body: { prompt, negative_prompt?, width?, height?, seed?, cfg_scale?, steps? }
  // Response: { image: base64_string }
  ```
- [ ] **Model endpoint for NIM models:** Add a separate `/api/models/nim` endpoint that fetches from NVIDIA's NIM catalog for image/video gen models, separate from the chat model list.

### 2.4 Bug / Polish

- [ ] **TS2307 lint error for `@/lib/model-cache`:** The LSP can't resolve the module path even though the file exists and tsconfig is configured correctly. This is cosmetic but should be fixed (might be Metro resolver vs tsc).
- [ ] **Settings page re-render optimization:** The per-model Verify buttons use `setInterval` timers. When many models are verifying simultaneously, there could be performance issues. Consider batching elapsed time updates.
- [ ] **Image size limit:** The `formatContent` function sends full-resolution base64 images to the API. Add client-side image resizing before encoding to base64 (max 1024×1024) to reduce payload size.
- [ ] **Default model fallback:** If the user's `defaultModel` becomes unavailable (removed from catalog), the app should gracefully fall back to the first available model.

### 2.5 Architecture / Future

- [ ] **Switch to Zod for API route validation:** The manual validation pattern works but is verbose. Consider using Zod schemas (`z.object({...})`) in API routes for cleaner validation with better TypeScript inference.
- [ ] **Unified streaming helper:** The `chat-stream.ts` SSE parsing and the `startStreamFromMessages` helper in the store could be extracted into a shared library for reuse in image/video generation polling.
- [ ] **Add cancel support for video generation:** The `GET /api/generate/video/status` endpoint polls indefinitely. Add a cancel mechanism (DELETE or abort signal).
- [ ] **Offline support:** Model cache currently works via localStorage. Extend to cache recent conversations for offline viewing.
- [ ] **Image generation history:** Store generated images/videos as messages in the conversation history so they appear in the chat timeline.

---

## 3. Architecture Reference

### API Route Flow

```
Frontend → Expo API Route → Proxy / Direct NVIDIA API → Response
```

| Route | Forwards To | Auth Method | Timeout |
|---|---|---|---|
| `POST /api/chat` | `{PROXY_URL}/v1/chat/completions` | Proxy handles it | 300s |
| `GET /api/models` | `{PROXY_URL}/v1/models` | Proxy handles it | 30s |
| `POST /api/models/check` | `{PROXY_URL}/v1/chat/completions` (1 token) | Proxy handles it | 10–180s |
| `POST /api/generate/video` | `https://ai.api.nvidia.com/v1/genai/...` | `Authorization: Bearer {API_KEY}` | 120s |
| `GET /api/generate/video/status` | `https://api.nvcf.nvidia.com/v2/nvcf/...` | `Authorization: Bearer {API_KEY}` | 30s |

### Environment Variables

| Variable | Used By | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | All API routes | Proxy URL (e.g. `http://localhost:3000`) |
| `NVIDIA_API_KEY` | `generate/video+api.ts` | NVIDIA NIM API key |
| `NVDIDIA_API_KEY` | `generate/video+api.ts` | Fallback if NVIDIA_API_KEY has typo |
| `NVIDIA_BASE_URL` | `generate/video+api.ts` | Override for NIM base URL |
| `DEBUG_NVIDIA` | `chat+api.ts`, `models+api.ts` | Enable request/response debug logs |

### Branch Structure

```
long_chat       ← main development branch (current work)
image-generation ← image/video gen endpoints
```

---

## 4. Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your EXPO_PUBLIC_API_URL and NVIDIA_API_KEY

# Start development server
bun start

# Test API routes
curl http://localhost:8081/api/models
curl -X POST http://localhost:8081/api/models/check \
  -H "Content-Type: application/json" \
  -d '{"model":"meta/llama-3.1-8b-instruct"}'

# Test video generation (requires NVIDIA_API_KEY)
curl -X POST http://localhost:8081/api/generate/video \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  -d '{"image":"<base64>","seed":42}'
```
