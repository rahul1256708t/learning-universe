import { QuizArena } from "@/components/quiz-arena"
import { createClient } from "@/lib/supabase/server"
import type { QuizAttempt } from "@/lib/database.types"

export const dynamic = "force-dynamic"

/**
 * Quiz Arena — interactive AI-generated MCQ quizzes with instant feedback,
 * scoring, and saved attempts for progress tracking.
 */
export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  let attempts: QuizAttempt[] = []
  if (supabase) {
    const { data } = await supabase
      .from("quiz_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
    attempts = data ?? []
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="overflow-hidden">
        <h1
          className="hero-heading font-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 8vw, 96px)" }}
        >
          Quiz Arena
        </h1>
        <p className="mt-2 font-heading text-sm font-medium uppercase tracking-widest text-[#D7E2EA]/50">
          AI-generated quizzes with instant feedback and scoring
        </p>
      </div>

      <QuizArena initialAttempts={attempts} initialTopic={params.topic ?? ""} />
    </main>
  )
}
