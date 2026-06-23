import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import type { Confidence, ResearchModeId, Source } from "@/lib/research/types"

type Client = SupabaseClient<Database>
type MemoryRow = { topic: string; summary: string }

/**
 * Supabase persistence for the Research Agent: research logs + learning memory.
 *
 * Two things are saved per researched answer:
 *   1. research_logs  — full audit trail (question, answer, sources, model,
 *      mode, confidence). Satisfies the "log everything" requirement.
 *   2. research_memory — a short, reusable "useful learning" the agent can
 *      recall later (lightweight RAG). Stored as text + an optional pgvector
 *      embedding. The embedding is OPTIONAL: if no embedding key is set we
 *      still store the text and recall via keyword search, so the feature
 *      degrades gracefully.
 *
 * See supabase/migrations for the table + pgvector setup.
 */

type LogInput = {
  userId: string
  chatId: string
  question: string
  answer: string
  sources: Source[]
  model: string
  mode: ResearchModeId
  confidence: Confidence
  researchUsed: boolean
  questionType: string
}

/**
 * Persist the full research log. Never throws — logging must not break the
 * user's answer. Returns false on failure so the caller can note it.
 */
export async function logResearch(
  supabase: Client,
  input: LogInput
): Promise<boolean> {
  try {
    const { error } = await supabase.from("research_logs").insert({
      user_id: input.userId,
      chat_id: input.chatId,
      question: input.question.slice(0, 4000),
      answer: input.answer.slice(0, 20000),
      sources: input.sources,
      model: input.model,
      mode: input.mode,
      question_type: input.questionType,
      research_used: input.researchUsed,
      confidence: input.confidence.level,
    })
    if (error) {
      console.error("[research] logResearch failed:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("[research] logResearch threw:", error)
    return false
  }
}

/**
 * Save a useful learning memory. We keep memories short and self-contained so
 * they're cheap to recall and re-inject. Only worth saving when the answer was
 * actually researched and reasonably confident.
 */
export async function saveMemory(
  supabase: Client,
  params: {
    userId: string
    topic: string
    summary: string
    sources: Source[]
    mode: ResearchModeId
  }
): Promise<boolean> {
  try {
    const embedding = await maybeEmbed(`${params.topic}\n${params.summary}`)
    const { error } = await supabase.from("research_memory").insert({
      user_id: params.userId,
      topic: params.topic.slice(0, 300),
      summary: params.summary.slice(0, 2000),
      source_urls: params.sources.map((s) => s.url),
      mode: params.mode,
      // `embedding` column is nullable; we store null when no embedding key.
      embedding,
    })
    if (error) {
      console.error("[research] saveMemory failed:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("[research] saveMemory threw:", error)
    return false
  }
}

/**
 * Recall up to `limit` relevant memories for a user. Uses pgvector similarity
 * when an embedding is available (via the `match_research_memory` RPC), else
 * falls back to a recent + keyword text search. Returns short strings ready to
 * inject into the system prompt.
 */
export async function recallMemories(
  supabase: Client,
  userId: string,
  query: string,
  limit = 3
): Promise<string[]> {
  try {
    const embedding = await maybeEmbed(query)

    if (embedding) {
      const { data, error } = await supabase.rpc("match_research_memory", {
        query_embedding: embedding,
        match_count: limit,
        match_user: userId,
      })
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: MemoryRow) => `${row.topic}: ${row.summary}`)
      }
    }

    // Fallback: simple keyword/recency search on text columns.
    const firstWords = query.split(/\s+/).slice(0, 4).join(" ")
    const { data } = await supabase
      .from("research_memory")
      .select("topic, summary")
      .eq("user_id", userId)
      .ilike("topic", `%${firstWords}%`)
      .order("created_at", { ascending: false })
      .limit(limit)

    return (data ?? []).map((row) => `${row.topic}: ${row.summary}`)
  } catch (error) {
    console.error("[research] recallMemories threw:", error)
    return []
  }
}

/**
 * Optionally compute an OpenAI embedding for pgvector storage/recall.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  API KEY (optional): EMBEDDING_API_KEY enables vector memory/RAG.     │
 * │  Uses OpenAI's text-embedding-3-small (1536 dims). If unset, memory   │
 * │  still works via keyword recall — embeddings just make it smarter.    │
 * └─────────────────────────────────────────────────────────────────────┘
 */
async function maybeEmbed(text: string): Promise<number[] | null> {
  const apiKey = process.env.EMBEDDING_API_KEY
  if (!apiKey) return null
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    const data = (await response.json()) as { data?: Array<{ embedding: number[] }> }
    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}
