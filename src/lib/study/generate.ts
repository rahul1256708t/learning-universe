import { streamCompletion, type ChatMessage } from "@/lib/research/llm"

/**
 * Server-side structured generation for the study tools (flashcards, quizzes).
 *
 * Runs a normal completion through the existing model fallback chain, then
 * extracts and parses the first JSON array/object in the reply. Models often
 * wrap JSON in prose or code fences, so extraction is lenient.
 */
export async function generateStructured<T>(
  model: string,
  messages: ChatMessage[],
  validate: (parsed: unknown) => T | null
): Promise<{ data: T; modelUsed: string; tokensUsed: number }> {
  let text = ""
  const result = await streamCompletion(model, messages, (t) => (text += t), {
    temperature: 0.5,
    maxTokens: 2000,
  })

  const parsed = extractJSON(text)
  const data = parsed === undefined ? null : validate(parsed)
  if (data === null) {
    throw new Error("The model did not return valid structured data. Please try again.")
  }

  return { data, modelUsed: result.modelUsed, tokensUsed: result.tokensUsed }
}

/** Pull the first JSON array or object out of a possibly-noisy reply. */
function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates = [fenced?.[1], text]

  for (const candidate of candidates) {
    if (!candidate) continue
    const start = candidate.search(/[[{]/)
    if (start === -1) continue
    // Walk back from the end until the slice parses.
    for (let end = candidate.length; end > start; end--) {
      const ch = candidate[end - 1]
      if (ch !== "]" && ch !== "}") continue
      try {
        return JSON.parse(candidate.slice(start, end))
      } catch {
        // Keep shrinking.
      }
    }
  }

  return undefined
}
