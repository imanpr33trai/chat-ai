/**
 * SSE streaming client for the chat API.
 *
 * In production (native APK), the app has no local server — all API requests
 * go to the remote EXPO_PUBLIC_API_URL which hosts both the Expo API routes
 * (/api/chat, /api/models, /api/models/check) and proxies to NVIDIA.
 *
 * In dev mode (Expo web SSR), empty string means same-origin works.
 */

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinkingToken?: (token: string) => void;
  onDone: (fullContent: string, thinkingContent?: string, toolCalls?: ToolCall[], usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) => void;
  onError: (err: Error) => void;
}

interface StreamOptions {
  model: string;
  messages: { role: string; content: string | null | { type: string; text?: string; image_url?: { url: string } }[] }[];
  signal?: AbortSignal;
  temperature?: number;
  max_tokens?: number;
}

import { getApiKey } from './api-key';

// Base URL for API requests.
// When EXPO_PUBLIC_API_URL is set (production APK), requests go to the remote server.
// When empty (dev web SSR), same-origin requests hit the local Expo API routes.
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "";

/**
 * POST to the chat API with SSE streaming, parse chunks, call callbacks.
 * Returns the AbortController so the caller can cancel mid-stream.
 */
export function startStream(
  opts: StreamOptions,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();
  const signal = opts.signal ?? controller.signal;

  let fullContent = "";
  let lastUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

  // Accumulator for tool calls keyed by index
  const toolCallAccumulator: Record<
    number,
    { id?: string; type?: string; function: { name?: string; arguments: string } }
  > = {};

  (async () => {
    try {
      const apiKey = getApiKey();
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          model: opts.model,
          messages: opts.messages,
          stream: true,
          temperature: opts.temperature,
          max_tokens: opts.max_tokens,
        }),
        signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        callbacks.onError(
          new Error(`API error (${res.status}): ${text}`),
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError(
          new Error("Response body is not readable"),
        );
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      // Track thinking state
      let inThinking = false;
      let thinkingBuffer = "";
      let fullThinking = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            // Convert accumulator to final tool calls array
            const finalToolCalls = buildToolCalls(toolCallAccumulator);
            callbacks.onDone(fullContent, fullThinking || undefined, finalToolCalls, lastUsage);
            return;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;

            // Capture usage if present (sent in final chunk)
            if (chunk.usage) {
              lastUsage = chunk.usage;
            }

            // Handle reasoning/thinking content (DeepSeek R1 and similar)
            const reasoningToken = delta?.reasoning_content ?? "";
            if (reasoningToken) {
              thinkingBuffer += reasoningToken;

              // Check for thinking tags to detect when thinking starts/ends
              if (reasoningToken === "<") {
                inThinking = true;
              } else if (inThinking && reasoningToken === ">") {
                inThinking = false;
                fullThinking += thinkingBuffer + ">";
                thinkingBuffer = "";
                callbacks.onThinkingToken?.(">" as any);
              } else if (inThinking) {
                thinkingBuffer += reasoningToken;
                callbacks.onThinkingToken?.(reasoningToken);
              } else {
                // Outside of tags - might be thinking content without tags
                fullThinking += reasoningToken;
                callbacks.onThinkingToken?.(reasoningToken);
              }
            }

            // Handle regular content
            const token = delta?.content ?? "";
            if (token) {
              fullContent += token;
              callbacks.onToken(token);
            }

            // Handle tool calls (incremental accumulation per index)
            if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index;
                if (!toolCallAccumulator[idx]) {
                  toolCallAccumulator[idx] = { function: { arguments: "" } };
                }
                const entry = toolCallAccumulator[idx];
                if (tc.id) entry.id = tc.id;
                if (tc.type) entry.type = tc.type;
                if (tc.function) {
                  if (tc.function.name) entry.function.name = tc.function.name;
                  if (tc.function.arguments) {
                    entry.function.arguments += tc.function.arguments;
                  }
                }
              }
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Stream ended without [DONE] (some providers omit it)
      const finalToolCalls = buildToolCalls(toolCallAccumulator);
      callbacks.onDone(fullContent, fullThinking || undefined, finalToolCalls, lastUsage);
    } catch (err: any) {
      if (err.name === "AbortError") return; // cancelled, not an error
      callbacks.onError(err);
    }
  })();

  return controller;
}

/**
 * Convert the per-index accumulator into a proper ToolCall[] array,
 * dropping any entries that are incomplete (missing required fields).
 */
function buildToolCalls(
  acc: Record<number, { id?: string; type?: string; function: { name?: string; arguments: string } }>,
): ToolCall[] | undefined {
  const indices = Object.keys(acc)
    .map(Number)
    .toSorted((a, b) => a - b);
  if (indices.length === 0) return undefined;

  const calls: ToolCall[] = [];
  for (const idx of indices) {
    const entry = acc[idx];
    if (entry.id && entry.type && entry.function.name) {
      calls.push({
        id: entry.id,
        type: entry.type,
        function: {
          name: entry.function.name,
          arguments: entry.function.arguments,
        },
      });
    }
  }
  return calls.length > 0 ? calls : undefined;
}