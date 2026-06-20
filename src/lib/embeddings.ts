// Embeddings for the document knowledge base (RAG).
//
// Defaults to OpenAI's text-embedding-3-small (1536 dims, matching the
// vector(1536) column in the migration), but any OpenAI-compatible
// embeddings endpoint works by overriding the env vars below.

const DEFAULT_BASE_URL = "https://api.openai.com/v1"
const DEFAULT_MODEL = "text-embedding-3-small"

export const EMBEDDING_DIMENSIONS = 1536

function getEmbeddingsKey() {
  return process.env.EMBEDDINGS_API_KEY ?? process.env.OPENAI_API_KEY ?? null
}

export function embeddingsConfigured() {
  return Boolean(getEmbeddingsKey())
}

type EmbeddingResponse = {
  data?: Array<{ index: number; embedding: number[] }>
  error?: { message?: string }
}

/**
 * Embed one or more strings. Returns vectors in the same order as the input.
 * Throws when embeddings are not configured or the upstream call fails.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = getEmbeddingsKey()
  if (!key) {
    throw new Error("Embeddings are not configured. Set EMBEDDINGS_API_KEY (or OPENAI_API_KEY).")
  }
  if (texts.length === 0) return []

  const baseUrl = process.env.EMBEDDINGS_BASE_URL ?? DEFAULT_BASE_URL
  const model = process.env.EMBEDDINGS_MODEL ?? DEFAULT_MODEL

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: texts }),
  })

  const payload = (await response.json().catch(() => null)) as EmbeddingResponse | null

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error?.message ?? "Embeddings request failed.")
  }

  return payload.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding)
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text])
  return embedding
}
