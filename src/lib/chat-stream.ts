/**
 * SSE streaming client for /api/chat (OpenAI-compatible chunk parsing).
 */

interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinkingToken?: (token: string) => void;
  onDone: (fullContent: string, thinkingContent?: string) => void;
  onError: (err: Error) => void;
}

interface StreamOptions {
  model: string;
  messages: { role: string; content: string | null }[];
  signal?: AbortSignal;
  temperature?: number;
  max_tokens?: number;
}

const API_BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.EXPO_PUBLIC_API_URL || "http://localhost:8081";

/**
 * POST to /api/chat with stream:true, parse SSE chunks, and call callbacks.
 * Returns the AbortController so the caller can cancel mid-stream.
 */
export function startStream(
  opts: StreamOptions,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();
  const signal = opts.signal ?? controller.signal;

  let fullContent = "";

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            callbacks.onDone(fullContent, fullThinking || undefined);
            return;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;

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
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Stream ended without [DONE] (some providers omit it)
      callbacks.onDone(fullContent, fullThinking || undefined);
    } catch (err: any) {
      if (err.name === "AbortError") return; // cancelled, not an error
      callbacks.onError(err);
    }
  })();

  return controller;
}
