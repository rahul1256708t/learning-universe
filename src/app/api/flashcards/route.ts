import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { DEFAULT_AGENT_MODEL, isAgentModel } from "@/lib/research/models"
import { rateLimit, sweepRateLimiter } from "@/lib/research/rate-limit"
import { generateStructured } from "@/lib/study/generate"

/**
 * Flashcards API — persistent decks with spaced repetition.
 *
 *   POST { action: "generate", topic, model?, count? }
 *     → generates cards with the LLM and saves them to the user's deck.
 *   POST { action: "review", cardId, rating: "again" | "good" | "easy" }
 *     → applies simplified SM-2 scheduling and returns the updated card.
 *   POST { action: "delete", cardId } | { action: "delete", topic }
 *     → removes one card or a whole topic deck.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type FlashcardRequest = {
  action?: string
  topic?: string
  model?: string
  count?: number
  cardId?: string
  rating?: string
}

type GeneratedCard = { question: string; answer: string }

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return jsonError("Supabase is not configured.", 500)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError("You must be logged in.", 401)

  let body: FlashcardRequest
  try {
    body = (await request.json()) as FlashcardRequest
  } catch {
    return jsonError("Invalid request body.", 400)
  }

  switch (body.action) {
    case "generate":
      return generateDeck(supabase, user.id, body)
    case "review":
      return reviewCard(supabase, user.id, body)
    case "delete":
      return deleteCards(supabase, user.id, body)
    default:
      return jsonError("Unknown action.", 400)
  }
}

/* ── Generate a deck from a topic ─────────────────────────────── */
async function generateDeck(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  body: FlashcardRequest
) {
  sweepRateLimiter()
  const limit = rateLimit(`flashcards:${userId}`, 6, 60_000)
  if (!limit.allowed) {
    return jsonError(`Too many requests. Try again in ${limit.retryAfterSeconds}s.`, 429)
  }

  const topic = body.topic?.trim() ?? ""
  if (!topic) return jsonError("A topic is required.", 400)
  if (topic.length > 500) return jsonError("Topic is too long.", 400)

  const model = body.model && isAgentModel(body.model) ? body.model : DEFAULT_AGENT_MODEL
  const count = Math.min(Math.max(body.count ?? 8, 4), 12)

  let cards: GeneratedCard[]
  try {
    const generated = await generateStructured<GeneratedCard[]>(
      model,
      [
        {
          role: "system",
          content:
            "You create study flashcards for students. Reply with ONLY a JSON array — no prose, no markdown fences. " +
            'Each element: {"question": "...", "answer": "..."}. Questions must test one clear fact or concept; ' +
            "answers must be short (1–2 sentences), accurate, and student-friendly.",
        },
        {
          role: "user",
          content: `Create exactly ${count} flashcards on: ${topic}`,
        },
      ],
      (parsed) => {
        if (!Array.isArray(parsed)) return null
        const valid = parsed.filter(
          (c): c is GeneratedCard =>
            typeof c === "object" &&
            c !== null &&
            typeof (c as GeneratedCard).question === "string" &&
            typeof (c as GeneratedCard).answer === "string" &&
            (c as GeneratedCard).question.trim().length > 0 &&
            (c as GeneratedCard).answer.trim().length > 0
        )
        return valid.length >= 3 ? valid.slice(0, count) : null
      }
    )
    cards = generated.data
  } catch (error) {
    const message = error instanceof Error ? error.message : "Flashcard generation failed."
    return jsonError(message, 502)
  }

  const { data: inserted, error } = await supabase
    .from("flashcards")
    .insert(
      cards.map((c) => ({
        user_id: userId,
        topic: topic.slice(0, 200),
        question: c.question.trim().slice(0, 1000),
        answer: c.answer.trim().slice(0, 2000),
      }))
    )
    .select("*")

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ cards: inserted ?? [] })
}

/* ── Spaced-repetition review (simplified SM-2) ───────────────── */
async function reviewCard(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  body: FlashcardRequest
) {
  const cardId = body.cardId?.trim()
  const rating = body.rating
  if (!cardId) return jsonError("cardId is required.", 400)
  if (rating !== "again" && rating !== "good" && rating !== "easy") {
    return jsonError("rating must be 'again', 'good', or 'easy'.", 400)
  }

  const { data: card } = await supabase
    .from("flashcards")
    .select("*")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!card) return jsonError("Card not found.", 404)

  let ease = card.ease
  let intervalDays = card.interval_days
  let repetitions = card.repetitions

  if (rating === "again") {
    // Forgot it: reset progress, show again in ~10 minutes.
    ease = Math.max(1.3, ease - 0.2)
    repetitions = 0
    intervalDays = 10 / (60 * 24)
  } else {
    if (rating === "easy") ease = Math.min(3.0, ease + 0.15)
    repetitions += 1
    if (repetitions === 1) intervalDays = rating === "easy" ? 2 : 1
    else if (repetitions === 2) intervalDays = rating === "easy" ? 6 : 3
    else intervalDays = Math.min(365, intervalDays * ease * (rating === "easy" ? 1.3 : 1))
  }

  const now = new Date()
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  const { data: updated, error } = await supabase
    .from("flashcards")
    .update({
      ease,
      interval_days: intervalDays,
      repetitions,
      due_at: dueAt.toISOString(),
      last_reviewed_at: now.toISOString(),
    })
    .eq("id", cardId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ card: updated })
}

/* ── Delete a card or a whole topic deck ──────────────────────── */
async function deleteCards(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  body: FlashcardRequest
) {
  const cardId = body.cardId?.trim()
  const topic = body.topic?.trim()

  if (cardId) {
    const { error } = await supabase.from("flashcards").delete().eq("id", cardId).eq("user_id", userId)
    if (error) return jsonError(error.message, 500)
    return NextResponse.json({ ok: true })
  }
  if (topic) {
    const { error } = await supabase.from("flashcards").delete().eq("topic", topic).eq("user_id", userId)
    if (error) return jsonError(error.message, 500)
    return NextResponse.json({ ok: true })
  }
  return jsonError("cardId or topic is required.", 400)
}
