import { PageHeader } from "@/components/page-header"
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
      <PageHeader
        title="Quiz Arena"
        subtitle="AI-generated quizzes with instant feedback and scoring."
      />

      <QuizArena initialAttempts={attempts} initialTopic={params.topic ?? ""} />
    </main>
  )
}
