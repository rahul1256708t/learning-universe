import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { DEFAULT_AGENT_MODEL, isAgentModel } from "@/lib/research/models"
import { rateLimit, sweepRateLimiter } from "@/lib/research/rate-limit"
import { generateStructured } from "@/lib/study/generate"

/**
 * Quiz API — interactive multiple-choice quizzes.
 *
 *   POST { action: "generate", topic, model?, count?, difficulty? }
 *     → returns MCQs as structured JSON for the interactive player.
 *   POST { action: "submit", topic, difficulty, questions, answers }
 *     → scores are computed server-side from the submitted questions and
 *       the attempt is saved to quiz_attempts for progress tracking.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export type QuizQuestion = {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

type QuizRequest = {
  action?: string
  topic?: string
  model?: string
  count?: number
  difficulty?: string
  questions?: QuizQuestion[]
  answers?: number[]
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const

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

  let body: QuizRequest
  try {
    body = (await request.json()) as QuizRequest
  } catch {
    return jsonError("Invalid request body.", 400)
  }

  if (body.action === "generate") return generateQuiz(user.id, body)
  if (body.action === "submit") return submitQuiz(supabase, user.id, body)
  return jsonError("Unknown action.", 400)
}

/* ── Generate MCQs ────────────────────────────────────────────── */
async function generateQuiz(userId: string, body: QuizRequest) {
  sweepRateLimiter()
  const limit = rateLimit(`quiz:${userId}`, 6, 60_000)
  if (!limit.allowed) {
    return jsonError(`Too many requests. Try again in ${limit.retryAfterSeconds}s.`, 429)
  }

  const topic = body.topic?.trim() ?? ""
  if (!topic) return jsonError("A topic is required.", 400)
  if (topic.length > 500) return jsonError("Topic is too long.", 400)

  const model = body.model && isAgentModel(body.model) ? body.model : DEFAULT_AGENT_MODEL
  const count = Math.min(Math.max(body.count ?? 5, 3), 10)
  const difficulty = DIFFICULTIES.includes(body.difficulty as (typeof DIFFICULTIES)[number])
    ? (body.difficulty as (typeof DIFFICULTIES)[number])
    : "medium"

  try {
    const { data: questions } = await generateStructured<QuizQuestion[]>(
      model,
      [
        {
          role: "system",
          content:
            "You create multiple-choice quizzes for students. Reply with ONLY a JSON array — no prose, no markdown fences. " +
            'Each element: {"question": "...", "options": ["...","...","...","..."], "answerIndex": 0-3, "explanation": "..."}. ' +
            "Exactly 4 options per question, one clearly correct. Explanations are one short sentence saying why the answer is right. " +
            "Vary which option index holds the correct answer.",
        },
        {
          role: "user",
          content: `Create exactly ${count} ${difficulty}-difficulty MCQs on: ${topic}`,
        },
      ],
      (parsed) => {
        if (!Array.isArray(parsed)) return null
        const valid = parsed.filter(
          (q): q is QuizQuestion =>
            typeof q === "object" &&
            q !== null &&
            typeof (q as QuizQuestion).question === "string" &&
            Array.isArray((q as QuizQuestion).options) &&
            (q as QuizQuestion).options.length === 4 &&
            (q as QuizQuestion).options.every((o) => typeof o === "string") &&
            Number.isInteger((q as QuizQuestion).answerIndex) &&
            (q as QuizQuestion).answerIndex >= 0 &&
            (q as QuizQuestion).answerIndex <= 3 &&
            typeof (q as QuizQuestion).explanation === "string"
        )
        return valid.length >= 3 ? valid.slice(0, count) : null
      }
    )
    return NextResponse.json({ questions, difficulty })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz generation failed."
    return jsonError(message, 502)
  }
}

/* ── Save a finished attempt ──────────────────────────────────── */
async function submitQuiz(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  body: QuizRequest
) {
  const topic = body.topic?.trim() ?? ""
  const questions = body.questions
  const answers = body.answers

  if (!topic) return jsonError("A topic is required.", 400)
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > 20) {
    return jsonError("Questions are missing.", 400)
  }
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    return jsonError("Answers do not match the questions.", 400)
  }

  const correctCount = questions.reduce(
    (sum, q, i) => sum + (Number.isInteger(q?.answerIndex) && answers[i] === q.answerIndex ? 1 : 0),
    0
  )

  const difficulty = DIFFICULTIES.includes(body.difficulty as (typeof DIFFICULTIES)[number])
    ? (body.difficulty as string)
    : "medium"

  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      topic: topic.slice(0, 200),
      difficulty,
      total_questions: questions.length,
      correct_count: correctCount,
      questions: questions.map((q, i) => ({ ...q, chosenIndex: answers[i] })),
    })
    .select("*")
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ attempt, correctCount })
}
