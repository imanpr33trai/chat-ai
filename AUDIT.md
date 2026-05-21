# Project Audit — Improvements & Missing Features

> Audited: `long_chat` + `image-generation` branches
> Focus: code quality, missing functionality, architecture gaps — not UI/UX

---

## 🔴 Critical (blocks functionality or loses data)

### 1. No Conversation Persistence
- **Status:** ⬜ Not implemented
- **File:** `src/hooks/use-chat-store.tsx`
- **Issue:** Conversations live only in React state (`useReducer`). A page refresh or tab close destroys every conversation, draft, model preference, and pin/star/reaction.
- **Fix:** Persist `state` to `AsyncStorage` (expo-secure-store or @react-native-async-storage/async-storage) on every dispatch. Hydrate store on mount.
- **Priority:** HIGH — users lose all data on reload.

### 2. No Authorization Header on Chat/Models API Routes
- **Status:** ⬜ Not implemented
- **File:** `src/app/api/chat+api.ts` (line 200), `src/app/api/models+api.ts` (line 53)
- **Issue:** Both routes forward to `PROXY_URL` with no `Authorization` header. If `PROXY_URL` points to the raw NVIDIA endpoint, requests fail with 401. The proxy is expected to add auth, but there's no validation or fallback.
- **Fix:** Either add auth forwarding from the client request, or validate that the proxy is configured in dev mode with a health check.
- **Priority:** HIGH — silent failures with some proxy configurations.

### 3. Missing `/api/health` Endpoint
- **Status:** ⬜ Not implemented
- **File:** `src/lib/api.ts` (line 19)
- **Issue:** `checkServerHealth()` calls `/api/health` which returns 404 — the route doesn't exist. Dead code that always returns `false`.
- **Fix:** Create `src/app/api/health+api.ts` that checks proxy connectivity.
- **Priority:** HIGH — blocks any startup health-check logic.

---

## 🟡 Must-Have (gaps in core functionality)

### 4. No Input Sanitization or Validation on API Route Content
- **Status:** ⬜ Not implemented
- **File:** `src/app/api/chat+api.ts`
- **Issue:** Message content is passed straight to the upstream NVIDIA API without sanitization. HTML tags, script injection, or excessively long content (no max_length check) pass through.
- **Fix:** Add content-length validation, strip dangerous HTML, validate against message schema limits.

### 5. No Rate Limiting on API Routes
- **Status:** ⬜ Not implemented
- **Files:** All routes in `src/app/api/`
- **Issue:** Any client can hammer the proxy/NVIDIA with unlimited requests. No throttling, no request queuing, no cooldown.
- **Fix:** Add in-memory rate limiting (e.g., `Map<string, number[]>` with sliding window) per IP or session.

### 6. No Fallback If Proxy Is Down
- **Status:** ⬜ Not implemented
- **File:** `src/hooks/use-models.ts`, `src/app/api/models+api.ts`
- **Issue:** If `PROXY_URL` is unreachable, the model list returns an error and the app shows "Failed to load models" with no fallback. No cached model list from a prior successful fetch.
- **Fix:** Cache the model list in the API route (in-memory) and serve stale data when the proxy is unavailable. Show a "offline" indicator instead of a hard error.

### 7. Temperature, Max Tokens, Top_P Hardcoded
- **Status:** ✅ Implemented
- **File:** `src/hooks/use-chat-store.tsx` (lines 313, 402)
- **Issue:** `temperature: 0.7` is hardcoded in both `sendMessage` and `editMessage`. No `max_tokens` or `top_p` is ever sent. Users have no control over generation parameters.
- **Fix:** Add optional parameters to chat creation / model configuration. Pass through to `startStream`.

### 8. No System Prompt Support
- **Status:** ⬜ Not implemented
- **Files:** `src/hooks/use-chat-store.tsx`, `src/components/chat-view.tsx`
- **Issue:** The chat has no way to set a system prompt. The API route supports `role: 'system'` but the frontend never sends one.
- **Fix:** Add system prompt editor per conversation (or per chat). Include it as the first message in `apiMessages`.

### 9. `parseStreamChunk` Dead Code
- **Status:** ✅ Implemented
- **File:** `src/app/api/chat+api.ts` (lines 121–146)
- **Issue:** `parseStreamChunk()` is exported but never imported or used anywhere. The streaming path just passes through the raw upstream body. Meanwhile, the frontend's `chat-stream.ts` duplicates similar parsing logic.
- **Fix:** Either delete the function or use it in the API route to transform the SSE stream (e.g., add error handling, inject metadata).

### 10. Conversation Search Component Exists But Is Unused
- **Status:** ⬜ Not implemented
- **File:** `src/components/conversation-search.tsx`
- **Issue:** Fully implemented conversation search component that filters conversations by title/message content, but nothing imports it.
- **Fix:** Either wire it into the chat list screen or delete it.

---

## 🟢 Should Add (features expected in a chat app)

### 11. Conversation Title Editing
- **Status:** ✅ Implemented
- **Issue:** Titles are auto-generated from the first message and cannot be changed.
- **Fix:** Add `UPDATE_CONVERSATION` action to the reducer. Add title edit in settings or long-press on conversation list.

### 12. No Message Search Within a Conversation
- **Status:** ✅ Implemented
- **Issue:** `conversation-search.tsx` searches conversation titles, but there's no way to search within a single conversation's messages.
- **Fix:** Add a find-in-page/search overlay to the chat view.

### 13. No Token Count / Usage Display
- **Status:** ✅ Implemented
- **Issue:** Users can't see how many tokens they're using per message or conversation total.
- **Fix:** Parse usage data from API responses (NVIDIA returns `usage.prompt_tokens`, `usage.completion_tokens`). Display near the message or in conversation info.

### 14. No Conversation Branching / Forking
- **Status:** ⬜ Not implemented
- **Issue:** Editing a message replaces the history. There's no way to fork at a message and explore alternate responses.
- **Fix:** Add a "branch from here" action that creates a new conversation with the history up to that point.

### 15. No Chat Export / Import
- **Status:** ⬜ Not implemented
- **Issue:** No way to backup conversations as JSON or Markdown.
- **Fix:** Add export (JSON/MD) and import functionality in settings.

### 16. No Tool/Function Calling UI
- **Status:** ✅ Implemented
- **Files:** `src/app/api/chat+api.ts` supports `tool_calls` in the schema
- **Issue:** The frontend never sends or displays tool calls / function results. The API route has full support, but the UI doesn't expose it.
- **Fix:** If the model returns `tool_calls`, display them in the chat bubble (with call status, arguments, results).

### 17. No Multi-Provider Support
- **Status:** ⬜ Not implemented
- **Issue:** Only one `PROXY_URL` / NVIDIA endpoint is supported. No way to configure multiple providers (OpenAI, Anthropic, local models).
- **Fix:** Add a provider abstraction layer. Store provider config per conversation.

---

## 🟣 Code Quality & Technical Debt

### 18. Old `create-expo-app` Boilerplate Still Present
- **Status:** ✅ Implemented
- **Files:** `src/app/old_routes/explore.tsx`, `src/app/old_routes/index.tsx`, `src/components/ui/collapsible.tsx`, `src/components/external-link.tsx`, `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/components/web-badge.tsx`, `src/components/hint-row.tsx`
- **Issue:** These files are never imported by the app. They exist from the initial `create-expo-app` template.
- **Fix:** Delete all unused files from `old_routes/`, `components/ui/`, and individual unused components.

### 19. `use-color-scheme` Hook Duplicated
- **Status:** ✅ Implemented
- **Files:** `src/hooks/use-color-scheme.ts`, `src/hooks/use-color-scheme.web.ts`
- **Issue:** Custom hook files exist but `useColorScheme` from `react-native` is used directly in most places. These custom hooks are never imported.
- **Fix:** Delete if unused, or consolidate.

### 20. Web/Native Platform Split Patterns Incomplete
- **Status:** ✅ Implemented
- **Files:** `src/components/animated-icon.tsx`, `src/components/animated-icon.web.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`
- **Issue:** Some components have `.web.tsx` variants but the app doesn't properly leverage web-specific behavior. The `.web.tsx` files may be stale.
- **Fix:** Audit whether the web split is needed. If not, consolidate to single files.

### 21. Manual Validation Inconsistency — Zod Used in One Route Only
- **Status:** ✅ Implemented
- **Files:** `src/app/api/models+api.ts` uses Zod; `src/app/api/chat+api.ts` and `src/app/api/generate/video+api.ts` use manual validation.
- **Issue:** Different validation patterns across routes. Manual validation is error-prone and verbose.
- **Fix:** Standardize on Zod (already a dependency) for all API route validation.

### 22. `.env.example` Outdated
- **Status:** ✅ Implemented
- **File:** `.env.example`
- **Issue:** Shows `NVIDIA_BASE_URL` and `NVIDIA_API_KEY` but the code actually uses `EXPO_PUBLIC_API_URL` and the typo-fallback `NVDIDIA_API_KEY`.
- **Fix:** Update `.env.example` to reflect actual env vars used.

### 23. No `max_tokens`, `temperature`, or `stream` Override from Client
- **Status:** ✅ Implemented
- **File:** `src/hooks/use-chat-store.tsx` → `startStreamFromMessages`
- **Issue:** Temperature is always 0.7. Max tokens is never sent. Stream is always true. These should be configurable.
- **Fix:** Expose as parameters to `sendMessage` / `startStream`.

### 24. Hardcoded Debug Flag (DEBUG_NVIDIA)
- **Status:** ✅ Implemented
- **Files:** `src/app/api/chat+api.ts`, `src/app/api/models+api.ts`
- **Issue:** `DEBUG_NVIDIA` env var gates verbose logging. This is a per-request string check that should use a module-level constant instead.
- **Fix:** Read once at module init, not per request.

### 25. No Request Timeout on Models Fetch
- **Status:** ✅ Implemented
- **File:** `src/app/api/models+api.ts`
- **Issue:** The upstream fetch to `{PROXY_URL}/v1/models` has no timeout. If the proxy hangs, the API route hangs indefinitely (Expo/CF Workers have a 30s limit, but still).
- **Fix:** Add `AbortSignal.timeout(30_000)` to the upstream fetch.

### 26. `generateId()` Uses Math.random
- **Status:** ✅ Implemented
- **File:** `src/hooks/use-chat-store.tsx` (line 66)
- **Issue:** `Math.random().toString(36).substring(2, 10)` produces weak IDs with collision risk at scale.
- **Fix:** Use `crypto.randomUUID()` or a proper ULID library.

---

## 🔵 New Features (adds capability)

### 27. Image Generation Frontend Integration
- **Status:** ⬜ Not implemented
- **Branch:** `image-generation`
- **File:** `src/app/api/generate/video+api.ts` exists (Stable Video Diffusion).
- **Missing:** No frontend to use it. No text-to-image endpoint (SDXL, FLUX, Sana). The `/imagine` slash command exists in the chat input but isn't wired to anything.
- **Fix:** Create `src/app/api/generate/image+api.ts` for text-to-image. Wire `/imagine` to call it. Display results in chat.

### 28. Vision Model Prompt Enhancement
- **Status:** ⬜ Not implemented
- **Issue:** When an image is attached, the `formatContent` helper adds `{ type: "text", text: content }` but there's no automatic prompt enhancement (e.g., "Describe this image" if no text is provided).
- **Fix:** If text is empty but images are attached, add a default prompt: `"Analyze this image"`.

### 29. Client-Side Image Resize Before Upload
- **Status:** ⬜ Not implemented
- **Issue:** `base64: true` in `expo-image-picker` can produce multi-megabyte base64 strings for full-resolution photos.
- **Fix:** Add `allowsEditing: true` or use `expo-image-manipulator` to resize to max 1024×1024 before encoding.

### 30. Image Generation Model Catalog
- **Status:** ⬜ Not implemented
- **Issue:** The model list from `/api/models` only contains chat/completion models. Image gen models (SDXL, FLUX, Sana, Stable Video Diffusion) are on NVIDIA's NIM platform with different endpoints.
- **Fix:** Create a separate `/api/models/image` endpoint that fetches from NVIDIA's NIM catalog. Show image gen models in a separate section.

### 31. Video Generation Progress in Chat
- **Status:** ⬜ Not implemented
- **Issue:** The video gen endpoint is async (returns 202 with `requestId`). There's no UI to show generation progress.
- **Fix:** Use `GET /api/generate/video/status` to poll. Show a progress bar with estimated time in the chat bubble.

### 32. Conversation Draft Auto-Save for New Conversations
- **Status:** ⬜ Not implemented
- **File:** `src/components/chat-input.tsx`
- **Issue:** Draft auto-save only works for existing conversations (`onSaveDraft`). The "new chat" screen (`new.tsx`) doesn't save draft messages.
- **Fix:** Wire `saveDraft` / `clearDraft` into the new chat screen.

### 33. Model Fallback on Selection
- **Status:** ⬜ Not implemented
- **Issue:** If a user selects a model that later becomes unavailable (removed from proxy catalog), the chat fails with "Not Found".
- **Fix:** Add a model validation check before starting a stream. If the model is unavailable, show a dialog suggesting the next available model.

---

## ⚪ Removals (dead code to clean up)

| File | Status | Reason |
|---|---|---|
| `src/app/old_routes/explore.tsx` | Expo boilerplate, not used |
| `src/app/old_routes/index.tsx` | Expo boilerplate, not used |
| `src/components/ui/collapsible.tsx` | Not used anywhere |
| `src/components/external-link.tsx` | Not used anywhere |
| `src/components/themed-text.tsx` | Not used anywhere, theme via hook |
| `src/components/themed-view.tsx` | Not used anywhere |
| `src/components/web-badge.tsx` | Not used anywhere |
| `src/components/hint-row.tsx` | Not used anywhere |
| `src/components/conversation-search.tsx` | Implemented but not wired in |
| `src/components/animated-icon.tsx` | Possibly unused |
| `src/components/animated-icon.web.tsx` | Possibly unused |
| `src/hooks/use-color-scheme.ts` | Unused, `useColorScheme` from react-native used instead |
| `src/hooks/use-color-scheme.web.ts` | Unused |
| `src/app/api/chat+api.ts:parseStreamChunk` | Exported but never imported |
| `src/lib/api.ts` | Mostly dead (`checkServerHealth` calls non-existent endpoint) |
| `src/lib/types.ts` | Only used by `api.ts` which is mostly dead |
