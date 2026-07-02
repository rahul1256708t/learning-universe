import { CalendarIcon, FlameIcon, LayersIcon, MessageSquareIcon, TargetIcon, TrendingUpIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { LEARNING_MODES } from "@/lib/learning"
import { createClient } from "@/lib/supabase/server"

/* ── Streak calculation ──────────────────────────────────────── */
function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const days = [...new Set(dates.map((d) => d.slice(0, 10)))].sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let expected = today
  for (const day of days) {
    if (day === expected) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else if (day < expected) {
      break
    }
  }
  return streak
}

/* ── Last 30 days activity grid ──────────────────────────────── */
function ActivityGrid({ dates }: { dates: string[] }) {
  const daySet = new Set(dates.map((d) => d.slice(0, 10)))
  const today = new Date()
  const cells: { date: string; active: boolean }[] = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    cells.push({ date: iso, active: daySet.has(iso) })
  }

  return (
    <div>
      <p className="mb-3 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/40">
        Last 30 Days
      </p>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
        {cells.map(({ date, active }) => (
          <div
            key={date}
            title={date}
            className={`aspect-square rounded-sm transition ${
              active
                ? "bg-purple-500/80"
                : "bg-white/[0.06]"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="size-2.5 rounded-sm bg-white/[0.06]" />
        <span className="text-xs text-[#D7E2EA]/30">No study</span>
        <div className="ml-3 size-2.5 rounded-sm bg-purple-500/80" />
        <span className="text-xs text-[#D7E2EA]/30">Studied</span>
      </div>
    </div>
  )
}

/* ── Mode usage bar ──────────────────────────────────────────── */
function ModeBar({ label, count, max, icon }: { label: string; count: number; max: number; icon: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-heading text-xs font-medium uppercase tracking-wide text-[#D7E2EA]/70">
          {icon} {label}
        </span>
        <span className="font-heading text-xs text-[#D7E2EA]/40">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-purple-500/70 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────── */
export default async function ProgressPage() {
  const supabase = await createClient()

  let chatCount = 0
  let messageCount = 0
  let chatDates: string[] = []
  const modeCounts: Record<string, number> = {}
  let totalTokens = 0
  let flashcardCount = 0
  let flashcardsDue = 0
  let quizCount = 0
  let quizAccuracy: number | null = null

  if (supabase) {
    const [
      { count: cc },
      { count: mc },
      { data: chatRows },
      { data: usageLogs },
      { count: fc },
      { count: fdc },
      { data: quizRows },
    ] = await Promise.all([
      supabase.from("chats").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("chats").select("created_at, mode").order("created_at", { ascending: false }).limit(200),
      supabase.from("usage_logs").select("tokens_used"),
      supabase.from("flashcards").select("*", { count: "exact", head: true }),
      supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .lte("due_at", new Date().toISOString()),
      supabase
        .from("quiz_attempts")
        .select("total_questions, correct_count")
        .order("created_at", { ascending: false })
        .limit(100),
    ])

    chatCount = cc ?? 0
    messageCount = mc ?? 0
    chatDates = (chatRows ?? []).map((r) => r.created_at)

    for (const row of chatRows ?? []) {
      modeCounts[row.mode] = (modeCounts[row.mode] ?? 0) + 1
    }

    totalTokens = (usageLogs ?? []).reduce((sum, r) => sum + (r.tokens_used ?? 0), 0)

    flashcardCount = fc ?? 0
    flashcardsDue = fdc ?? 0
    quizCount = (quizRows ?? []).length
    const totalAnswered = (quizRows ?? []).reduce((sum, r) => sum + r.total_questions, 0)
    const totalCorrect = (quizRows ?? []).reduce((sum, r) => sum + r.correct_count, 0)
    quizAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null
  }

  const streak = calcStreak(chatDates)
  const estStudyMinutes = Math.round((messageCount / 2) * 2.5)
  const maxModeCount = Math.max(...Object.values(modeCounts), 1)

  const MODE_ICONS: Record<string, string> = {
    tutor: "🎓",
    homework: "📝",
    notes: "📋",
    quiz: "❓",
    "exam-prep": "🏆",
    eli5: "🧸",
    formula: "🔬",
    ncert: "📚",
  }

  const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Progress" subtitle="Your learning journey at a glance." />

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          icon={<FlameIcon className="size-4 text-orange-400" />}
          label="Study Streak"
          value={`${streak} day${streak !== 1 ? "s" : ""}`}
          sub={streak >= 7 ? "🔥 One week strong!" : streak > 0 ? "Keep going!" : "Start today"}
        />
        <StatCard
          icon={<MessageSquareIcon className="size-4 text-purple-400" />}
          label="Total Chats"
          value={chatCount.toLocaleString()}
          sub={`${messageCount.toLocaleString()} messages`}
        />
        <StatCard
          icon={<CalendarIcon className="size-4 text-blue-400" />}
          label="Study Time"
          value={
            estStudyMinutes >= 60
              ? `${Math.floor(estStudyMinutes / 60)}h ${estStudyMinutes % 60}m`
              : `${estStudyMinutes}m`
          }
          sub="Estimated from messages"
        />
        <StatCard
          icon={<TrendingUpIcon className="size-4 text-green-400" />}
          label="Tokens Used"
          value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens.toString()}
          sub={topMode ? `Favorite: ${MODE_ICONS[topMode[0]]} ${topMode[0]}` : "No data yet"}
        />
      </div>

      {/* Study tools stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={<LayersIcon className="size-4 text-fuchsia-400" />}
          label="Flashcards"
          value={flashcardCount.toLocaleString()}
          sub={
            flashcardCount === 0
              ? "Generate a deck to start"
              : flashcardsDue > 0
                ? `${flashcardsDue} due for review now`
                : "All caught up — nothing due"
          }
        />
        <StatCard
          icon={<TargetIcon className="size-4 text-cyan-400" />}
          label="Quiz Accuracy"
          value={quizAccuracy !== null ? `${quizAccuracy}%` : "—"}
          sub={
            quizCount > 0
              ? `Across ${quizCount} quiz${quizCount === 1 ? "" : "zes"}`
              : "Take a quiz to see your accuracy"
          }
        />
      </div>

      {/* Activity grid */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-sm font-semibold tracking-tight text-white">
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityGrid dates={chatDates} />
        </CardContent>
      </Card>

      {/* Mode breakdown */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-sm font-semibold tracking-tight text-white">
            Topics Covered
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chatCount === 0 ? (
            <p className="text-xs text-[#D7E2EA]/30">Start chatting to see your topic breakdown.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {LEARNING_MODES.map((m) => (
                <ModeBar
                  key={m.id}
                  label={m.name}
                  icon={MODE_ICONS[m.id] ?? "📖"}
                  count={modeCounts[m.id] ?? 0}
                  max={maxModeCount}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-heading text-xs font-medium uppercase tracking-[0.15em] text-[#D7E2EA]/45">
          {label}
        </span>
      </div>
      <p
        className="font-heading font-black leading-none text-[#D7E2EA]"
        style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
      >
        {value}
      </p>
      <p className="text-xs text-[#D7E2EA]/35">{sub}</p>
    </div>
  )
}
