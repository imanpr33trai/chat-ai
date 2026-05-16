# Project Analysis — Remaining Work & State

## Current State

- **25 source files**, 5,863 lines of TypeScript/TSX
- **4 API routes**: chat, models, models/check, generate/video
- **3 branches** with active work: `improvements-v2`, `image-generation`, `long_chat`
- **12 of 33 audit items implemented** (36%)

---

## 21 Remaining Items — Categorized

### 🔴 Critical (data loss, blocked, 3 items)

| # | Item | Effort | Dependencies |
|---|---|---|---|
| 1 | **Conversation persistence** — store state in AsyncStorage, hydrate on mount | 2–3 days | Install `@react-native-async-storage/async-storage` |
| 2 | **Authorization header** — add Bearer token forwarding from client or validate proxy config | 1 day | None |
| 3 | **`/api/health` endpoint** — create health check that pings proxy | 0.5 day | None |

### 🟡 Must-Have (core gaps, 4 items)

| # | Item | Effort | Notes |
|---|---|---|---|
| 4 | **Input sanitization** — content-length limits, strip dangerous HTML | 1 day | Zod already integrated; add `.max()` constraints |
| 5 | **Rate limiting** — per-IP sliding window on API routes | 1 day | In-memory Map with cleanup interval |
| 6 | **Proxy-down fallback** — cache model list server-side, serve stale on failure | 1 day | Models already cache in-memory; extend to persistence |
| 8 | **System prompt** — per-conversation system prompt editor | 2 days | New UI component, store field, prepend to apiMessages |
| 10 | **Conversation search** — wire existing component or delete | 0.5 day | Component was deleted in commit 799d8ed — already resolved |

### 🟢 Should Add (expected features, 7 items)

| # | Item | Effort | Notes |
|---|---|---|---|
| 11 | **Title editing** — add UPDATE_CONVERSATION action, long-press to rename | 1 day | Store action + UI |
| 12 | **Message search** — find-in-page overlay in chat view | 1.5 days | Filter messages by text content |
| 14 | **Conversation branching** — fork at any message | 3 days | Complex; needs new action, UI, state |
| 15 | **Export/import** — JSON/Markdown backup in settings | 1.5 days | File save + file picker |
| 16 | **Tool calling UI** — display tool_calls in chat bubble | 2 days | New component, API data already flows |
| 17 | **Multi-provider** — provider abstraction layer | 4 days | Major refactor; separate from this batch |
| 32 | **Draft auto-save for new chats** — wire saveDraft into new.tsx | 0.5 day | Simple |

### 🔵 New Features (capability adds, 6 items)

| # | Item | Effort | Branch |
|---|---|---|---|
| 27 | **Image generation frontend** — wire `/imagine` to SDXL/FLUX endpoint, display results | 3 days | `image-generation` |
| 28 | **Vision prompt default** — `"Analyze this image"` when text is empty but image attached | 0.5 day | `long_chat` |
| 29 | **Client-side image resize** — limit to 1024×1024 before base64 encode | 1 day | None |
| 30 | **Image gen model catalog** — separate API route for NIM image models | 1 day | `image-generation` |
| 31 | **Video gen progress** — polling UI with progress bar | 2 days | `image-generation` |
| 33 | **Model fallback** — validate model before stream, suggest alternative | 1 day | None |

---

## Architecture Strengths

- **Clean API route pattern** — each route self-contained with validation, error handling, env config
- **Zod adoption** — standardized validation across all API routes
- **LocalStorage model cache** — survives page refreshes, 24h TTL
- **Streaming abstraction** — `startStreamFromMessages` eliminates duplicated SSE logic
- **Multimodal ready** — content arrays, image picker, vision model detection all in place

## Architecture Weaknesses

- **No persistence layer** — whole app state lives in `useReducer`, lost on reload
- **Proxy-dependent** — chat/models routes (the core chat feature) rely entirely on `PROXY_URL` with no auth, no fallback
- **No rate limiting** — any client can hammer the proxy unlimitedly
- **No input validation limits** — message content length unbounded, no sanitization
- **Monolithic store** — `use-chat-store.tsx` at 630+ lines handles messages, streaming, conversations, and settings
- **Duplicate SSE parsing** — frontend's `chat-stream.ts` and old `parseStreamChunk` in backend had overlapping logic (dead code removed)
- **Manual Zod ContentPartSchema** — the content part schema is typed as `z.ZodType<unknown>` due to recursive type complexity

## Immediately Actionable (small effort, high value)

| # | Item | Est. time |
|---|---|---|
| 3 | `/api/health` endpoint | 30 min |
| 28 | Vision default prompt | 15 min |
| 29 | Client-side image resize | 1 hour |
| 32 | Draft save for new chats | 30 min |
| 33 | Model fallback validation | 1 hour |

Total quick wins: ~3 hours, 5 items

## Larger Efforts (multi-day)

| # | Item | Est. time | Priority |
|---|---|---|---|
| 1 | Conversation persistence | 2–3 days | 🔴 Highest — data loss on reload |
| 27 | Image generation frontend | 3 days | Desired |
| 17 | Multi-provider support | 4 days | Nice-to-have |
| 14 | Conversation branching | 3 days | Nice-to-have |
