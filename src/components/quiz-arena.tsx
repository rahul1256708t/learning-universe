"use client"

import { useState, useTransition } from "react"
import {
  CheckCircle2Icon,
  CircleHelpIcon,
  Loader2Icon,
  RotateCcwIcon,
  TrophyIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import type { QuizAttempt } from "@/lib/database.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type QuizQuestion = {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

type Difficulty = "easy" | "medium" | "hard"

type Props = {
  initialAttempts: QuizAttempt[]
  initialTopic: string
}

/**
 * Quiz Arena — the agent generates MCQs as structured data, the student
 * answers interactively with instant feedback, and finished attempts are
 * saved so progress shows up on the Progress page.
 */
export function QuizArena({ initialAttempts, initialTopic }: Props) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>(initialAttempts)
  const [topic, setTopic] = useState(initialTopic)
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [isGenerating, startGenerate] = useTransition()

  // The running quiz.
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [quizTopic, setQuizTopic] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [chosen, setChosen] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [isSaving, startSave] = useTransition()

  const current = questions[currentIndex]
  const correctSoFar = answers.reduce(
    (sum, a, i) => sum + (a === questions[i]?.answerIndex ? 1 : 0),
    0
  )

  function generate() {
    const trimmed = topic.trim()
    if (!trimmed) {
      toast.error("Enter a topic first.")
      return
    }
    startGenerate(async () => {
      try {
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate", topic: trimmed, difficulty, count: 5 }),
        })
        const payload = (await response.json()) as { questions?: QuizQuestion[]; error?: string }
        if (!response.ok || !payload.questions) throw new Error(payload.error ?? "Generation failed.")
        setQuestions(payload.questions)
        setQuizTopic(trimmed)
        setCurrentIndex(0)
        setAnswers([])
        setChosen(null)
        setFinished(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Generation failed.")
      }
    })
  }

  function choose(index: number) {
    if (chosen !== null) return
    setChosen(index)
    setAnswers((prev) => [...prev, index])
  }

  function nextQuestion() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1)
      setChosen(null)
    } else {
      finishQuiz()
    }
  }

  function finishQuiz() {
    setFinished(true)
    startSave(async () => {
      try {
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            topic: quizTopic,
            difficulty,
            questions,
            answers: [...answers],
          }),
        })
        const payload = (await response.json()) as { attempt?: QuizAttempt; error?: string }
        if (!response.ok || !payload.attempt) throw new Error(payload.error ?? "Could not save the attempt.")
        setAttempts((prev) => [payload.attempt!, ...prev].slice(0, 10))
        toast.success("Attempt saved to your progress.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save the attempt.")
      }
    })
  }

  function resetQuiz() {
    setQuestions([])
    setQuizTopic("")
    setCurrentIndex(0)
    setAnswers([])
    setChosen(null)
    setFinished(false)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── Quiz player ─────────────────────────────────── */}
      <Card className="relative min-h-[520px] overflow-hidden border-white/10 bg-black/40 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-32 left-1/2 size-72 -translate-x-1/2 rounded-full bg-cyan-600/15 blur-3xl" />

        <CardHeader className="relative border-b border-white/8">
          <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-white">
            <CircleHelpIcon className="size-4 text-cyan-300" />
            {questions.length ? quizTopic : "Interactive Quiz"}
          </CardTitle>
          <CardDescription className="text-[#D7E2EA]/40">
            {questions.length && !finished
              ? `Question ${currentIndex + 1} of ${questions.length} · ${correctSoFar} correct so far`
              : "Pick a topic, answer MCQs, get instant explanations, and track your score."}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative flex flex-1 flex-col gap-5 p-6">
          {/* Setup state */}
          {questions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <span className="text-4xl">🎯</span>
              <div className="flex w-full max-w-md flex-col gap-3">
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                  placeholder="Quiz topic — e.g. Chemical bonding, class 11"
                  className="rounded-xl border-white/10 bg-black/20 text-[#D7E2EA] placeholder:text-[#D7E2EA]/25"
                />
                <div className="flex justify-center gap-2">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`rounded-full border px-4 py-1.5 font-heading text-[10px] font-medium uppercase tracking-widest transition ${
                        difficulty === d
                          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 bg-white/[0.03] text-[#D7E2EA]/40 hover:bg-white/[0.06]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={generate}
                  disabled={isGenerating}
                  className="mx-auto flex items-center gap-2 rounded-full bg-white px-8 py-3 font-heading text-sm font-medium uppercase tracking-widest text-[#05070D] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? <Loader2Icon className="size-4 animate-spin" /> : <TrophyIcon className="size-4" />}
                  {isGenerating ? "Building quiz…" : "Start quiz"}
                </button>
              </div>
            </div>
          ) : finished ? (
            /* Results state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <span className="text-5xl">{scoreEmoji(correctSoFar, questions.length)}</span>
              <p
                className="font-heading font-black leading-none text-[#D7E2EA]"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
              >
                {correctSoFar} / {questions.length}
              </p>
              <p className="max-w-sm text-xs leading-5 text-[#D7E2EA]/40">
                {isSaving
                  ? "Saving your attempt…"
                  : scoreMessage(correctSoFar, questions.length)}
              </p>
              <div className="mt-2 flex w-full max-w-md flex-col gap-2 text-left">
                {questions.map((q, i) => {
                  const right = answers[i] === q.answerIndex
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-3 text-xs leading-5 ${
                        right
                          ? "border-emerald-400/20 bg-emerald-400/5 text-[#D7E2EA]/70"
                          : "border-rose-400/20 bg-rose-400/5 text-[#D7E2EA]/70"
                      }`}
                    >
                      <p className="mb-1 flex items-start gap-1.5 font-medium text-[#D7E2EA]/85">
                        {right ? (
                          <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
                        ) : (
                          <XCircleIcon className="mt-0.5 size-3.5 shrink-0 text-rose-300" />
                        )}
                        {q.question}
                      </p>
                      {!right ? (
                        <p className="pl-5">
                          Correct answer: <span className="text-emerald-200">{q.options[q.answerIndex]}</span>
                        </p>
                      ) : null}
                      <p className="pl-5 text-[#D7E2EA]/45">{q.explanation}</p>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={resetQuiz}
                className="mt-2 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 font-heading text-xs font-medium uppercase tracking-widest text-[#D7E2EA]/70 transition hover:bg-white/10"
              >
                <RotateCcwIcon className="size-3.5" />
                New quiz
              </button>
            </div>
          ) : (
            /* Question state */
            <div className="flex flex-1 flex-col gap-4">
              {/* Progress bar */}
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-cyan-400/70 transition-all duration-500"
                  style={{ width: `${((currentIndex + (chosen !== null ? 1 : 0)) / questions.length) * 100}%` }}
                />
              </div>

              <p className="text-base font-medium leading-relaxed text-[#D7E2EA]/90">
                {current.question}
              </p>

              <div className="flex flex-col gap-2">
                {current.options.map((option, i) => {
                  const isCorrect = i === current.answerIndex
                  const isChosen = i === chosen
                  let styles = "border-white/10 bg-white/[0.03] text-[#D7E2EA]/75 hover:border-cyan-400/40 hover:bg-cyan-400/10"
                  if (chosen !== null) {
                    if (isCorrect) styles = "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                    else if (isChosen) styles = "border-rose-400/50 bg-rose-400/15 text-rose-100"
                    else styles = "border-white/8 bg-white/[0.02] text-[#D7E2EA]/35"
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => choose(i)}
                      disabled={chosen !== null}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm leading-6 transition ${styles} ${chosen !== null ? "cursor-default" : ""}`}
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-current text-[10px] font-bold opacity-70">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Feedback + next */}
              {chosen !== null ? (
                <div className="flex flex-col gap-3">
                  <div
                    className={`rounded-xl border p-3.5 text-sm leading-6 ${
                      chosen === current.answerIndex
                        ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-100/90"
                        : "border-rose-400/25 bg-rose-400/8 text-rose-100/90"
                    }`}
                  >
                    <span className="font-heading text-[10px] font-bold uppercase tracking-widest">
                      {chosen === current.answerIndex ? "✓ Correct" : "✗ Not quite"}
                    </span>
                    <p className="mt-1 text-[#D7E2EA]/75">{current.explanation}</p>
                  </div>
                  <button
                    type="button"
                    onClick={nextQuestion}
                    className="ml-auto rounded-full border border-cyan-400/30 bg-cyan-400/10 px-6 py-2 font-heading text-xs font-medium uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    {currentIndex + 1 < questions.length ? "Next question →" : "See results"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Right rail: recent attempts ─────────────────── */}
      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
          <p className="mb-3 flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            <TrophyIcon className="size-3.5" />
            Recent Attempts
          </p>
          <div className="flex flex-col gap-2">
            {attempts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-[#D7E2EA]/30">
                Finished quizzes will appear here with your scores.
              </p>
            ) : (
              attempts.map((attempt) => {
                const pct = attempt.total_questions
                  ? Math.round((attempt.correct_count / attempt.total_questions) * 100)
                  : 0
                return (
                  <div key={attempt.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 font-heading text-xs font-medium uppercase tracking-wide text-[#D7E2EA]/80">
                        {attempt.topic}
                      </p>
                      <span
                        className={`shrink-0 font-heading text-xs font-bold ${
                          pct >= 80 ? "text-emerald-300" : pct >= 50 ? "text-cyan-300" : "text-rose-300"
                        }`}
                      >
                        {attempt.correct_count}/{attempt.total_questions}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 80 ? "bg-emerald-400/70" : pct >= 50 ? "bg-cyan-400/70" : "bg-rose-400/70"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] uppercase tracking-wider text-[#D7E2EA]/30">
                      {attempt.difficulty} · {new Date(attempt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-xs leading-6 text-[#D7E2EA]/45 backdrop-blur-xl">
          <p className="mb-2 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            How it works
          </p>
          The agent writes fresh MCQs on your topic at the difficulty you pick. Answer each question to see
          instantly whether you were right and why. Your score is saved to your Progress page.
        </div>
      </aside>
    </div>
  )
}

function scoreEmoji(correct: number, total: number): string {
  const pct = total ? correct / total : 0
  if (pct >= 0.8) return "🏆"
  if (pct >= 0.5) return "💪"
  return "📖"
}

function scoreMessage(correct: number, total: number): string {
  const pct = total ? correct / total : 0
  if (pct >= 0.8) return "Excellent! You've mastered this topic — try a harder difficulty next."
  if (pct >= 0.5) return "Good work! Review the explanations below, then try again to beat your score."
  return "Keep going — read the explanations below, make flashcards on this topic, and retry."
}
