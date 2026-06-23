import { buildAttemptChain, getAgentModelName } from "@/lib/research/models"

/**
 * LLM caller for the Research Agent.
 *
 * Routes a chat-completion request to the right provider and STREAMS tokens:
 *   - ids starting with "anthropic-direct/"  → direct Anthropic API (Claude
 *     Opus 4.8) when ANTHROPIC_API_KEY is set.
 *   - everything else                        → OpenRouter.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  API KEYS (server-side only — never sent to the browser):            │
 * │    OPENROUTER_API_KEY   → required, runs most models                 │
 * │    ANTHROPIC_API_KEY    → optional, enables Claude Opus 4.8 direct    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * If the chosen model fails, the caller automatically falls back down a chain
 * of reliable models so the student still receives an answer.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string | Array<Record<string, unknown>>
}

export type StreamResult = {
  /** The model that actually produced the answer (may differ after fallback). */
  modelUsed: string
  /** Whether a fallback model was used. */
  usedFallback: boolean
  tokensUsed: number
}

type OpenRouterChunk = {
  choices?: Array<{ delta?: { content?: string } }>
  usage?: { total_tokens?: number }
}

type AnthropicChunk = {
  type?: string
  delta?: { text?: string }
  usage?: { output_tokens?: number; input_tokens?: number }
  message?: { usage?: { input_tokens?: number } }
}

const ANTHROPIC_DIRECT_PREFIX = "anthropic-direct/"

/**
 * Stream a completion, trying the primary model then its fallbacks. Each token
 * is handed to `onToken`. Returns which model actually answered.
 *
 * @throws if every model in the chain fails.
 */
export async function streamCompletion(
  primaryModel: string,
  messages: ChatMessage[],
  onToken: (text: string) => void,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<StreamResult> {
  const chain = buildAttemptChain(primaryModel)
  const errors: string[] = []

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]
    try {
      const tokensUsed = await streamOnce(model, messages, onToken, options)
      return { modelUsed: model, usedFallback: i > 0, tokensUsed }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      errors.push(`${getAgentModelName(model)}: ${message}`)
      // Try the next model in the chain.
    }
  }

  throw new Error(`All models failed. ${errors.join(" | ")}`)
}

async function streamOnce(
  model: string,
  messages: ChatMessage[],
  onToken: (text: string) => void,
  options: { temperature?: number; maxTokens?: number }
): Promise<number> {
  if (model.startsWith(ANTHROPIC_DIRECT_PREFIX)) {
    return streamAnthropic(model.slice(ANTHROPIC_DIRECT_PREFIX.length), messages, onToken, options)
  }
  return streamOpenRouter(model, messages, onToken, options)
}

/* ── OpenRouter (default provider for most models) ──────────────── */
async function streamOpenRouter(
  model: string,
  messages: ChatMessage[],
  onToken: (text: string) => void,
  options: { temperature?: number; maxTokens?: number }
): Promise<number> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Learning Universe",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 1400,
    }),
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "")
    throw new Error(text.slice(0, 200) || `OpenRouter returned ${response.status}`)
  }

  return pumpSSE(response.body, (payload) => {
    const chunk = JSON.parse(payload) as OpenRouterChunk
    const text = chunk.choices?.[0]?.delta?.content ?? ""
    if (text) onToken(text)
    return chunk.usage?.total_tokens ?? 0
  })
}

/* ── Direct Anthropic API (optional Claude Opus 4.8) ────────────── */
async function streamAnthropic(
  model: string,
  messages: ChatMessage[],
  onToken: (text: string) => void,
  options: { temperature?: number; maxTokens?: number }
): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.")

  // Anthropic takes the system prompt as a top-level field, not a message.
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n\n")

  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : m.content,
    }))

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system,
      messages: anthropicMessages,
      stream: true,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 1400,
    }),
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "")
    throw new Error(text.slice(0, 200) || `Anthropic returned ${response.status}`)
  }

  let inputTokens = 0
  let outputTokens = 0
  await pumpSSE(response.body, (payload) => {
    const chunk = JSON.parse(payload) as AnthropicChunk
    if (chunk.type === "content_block_delta" && chunk.delta?.text) {
      onToken(chunk.delta.text)
    }
    if (chunk.message?.usage?.input_tokens) inputTokens = chunk.message.usage.input_tokens
    if (chunk.usage?.output_tokens) outputTokens = chunk.usage.output_tokens
    return 0
  })
  return inputTokens + outputTokens
}

/**
 * Pump a Server-Sent Events body, calling `onData` for each `data:` payload.
 * `onData` returns a running token count; the max seen is returned.
 */
async function pumpSSE(
  body: ReadableStream<Uint8Array>,
  onData: (payload: string) => number
): Promise<number> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let tokensUsed = 0

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith("data:")) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === "[DONE]") continue
      try {
        const count = onData(payload)
        if (count) tokensUsed = count
      } catch {
        // Ignore malformed keepalive chunks.
      }
    }
  }

  return tokensUsed
}
