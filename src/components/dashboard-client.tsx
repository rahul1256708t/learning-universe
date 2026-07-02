"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, FlameIcon, MessageSquareIcon, SettingsIcon, TrendingUpIcon, UserRoundIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { getModeName, getModelName } from "@/lib/learning"

type RecentChat = {
  id: string
  title: string
  model: string
  mode: string
  created_at: string
}

type Props = {
  chatCount: number
  messageCount: number
  recentChats: RecentChat[]
  chatDates: string[]
}

/* ── Count-up hook ──────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  const nodeRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (started.current || target === 0) return
    started.current = true
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.floor(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return { value, nodeRef }
}

/* ── Streak calculator ──────────────────────────────────────── */
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

/* ── Animated stat card ─────────────────────────────────────── */
function AnimatedStat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const { value: count } = useCountUp(value)
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
      <p className="font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
        {label}
      </p>
      <p className="font-heading text-4xl font-semibold leading-none tracking-tight text-white md:text-5xl">
        {count}
        {suffix}
      </p>
    </div>
  )
}

/* ── Streak widget ──────────────────────────────────────────── */
function StreakWidget({ streak }: { streak: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <FlameIcon className="size-4 text-orange-400" />
        <p className="font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
          Study Streak
        </p>
      </div>
      <div className="flex items-end gap-3">
        <p className="font-heading text-4xl font-semibold leading-none tracking-tight text-white md:text-5xl">
          {streak}
        </p>
        <p className="mb-1 text-sm text-[#D7E2EA]/40">{streak === 1 ? "day" : "days"}</p>
      </div>
      {streak === 0 ? (
        <p className="text-xs text-[#D7E2EA]/30">Start a chat today to begin your streak.</p>
      ) : streak >= 7 ? (
        <p className="text-xs text-orange-400/70">🔥 Week-long streak! Keep it up.</p>
      ) : (
        <p className="text-xs text-[#D7E2EA]/30">Keep chatting daily to maintain your streak.</p>
      )}
    </div>
  )
}

/* ── Main dashboard client ──────────────────────────────────── */
export function DashboardClient({ chatCount, messageCount, recentChats, chatDates }: Props) {
  const streak = calcStreak(chatDates)

  return (
    <main className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedStat label="Chats" value={chatCount} />
        <AnimatedStat label="Messages" value={messageCount} />
        <AnimatedStat label="Modes" value={8} />
        <StreakWidget streak={streak} />
      </div>

      {/* Heading */}
      <PageHeader title="Dashboard" subtitle="Your Learning Universe command center." />

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/dashboard/chat",
            Icon: MessageSquareIcon,
            title: "Open Research Agent",
            text: "Ask a question — it searches, verifies, and cites sources.",
          },
          {
            href: "/dashboard/profile",
            Icon: UserRoundIcon,
            title: "Profile",
            text: "Manage your student profile.",
          },
          {
            href: "/dashboard/progress",
            Icon: TrendingUpIcon,
            title: "Progress",
            text: "Track your streak, topics, and study time.",
          },
          {
            href: "/dashboard/settings",
            Icon: SettingsIcon,
            title: "Settings",
            text: "Check deployment and environment readiness.",
          },
        ].map(({ href, Icon, title, text }) => (
          <Card
            key={href}
            className="border-white/10 bg-black/30 backdrop-blur-xl transition hover:bg-black/40"
          >
            <CardHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-xl border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 text-[#D7E2EA]">
                <Icon className="size-4" />
              </div>
              <CardTitle className="font-heading text-base font-semibold tracking-tight text-white">
                {title}
              </CardTitle>
              <CardDescription className="text-[#D7E2EA]/45">{text}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={href}
                className={buttonVariants({
                  className:
                    "rounded-xl border-white/15 font-heading text-xs uppercase tracking-widest",
                  variant: "outline",
                })}
              >
                Open
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent chats */}
      {recentChats.length > 0 && (
        <div>
          <p className="mb-3 font-heading text-xs font-medium uppercase tracking-[0.25em] text-[#D7E2EA]/40">
            Recent Chats
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentChats.map((chat) => (
              <Link
                key={chat.id}
                href={`/dashboard/chat?chatId=${chat.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl transition hover:bg-black/40 hover:border-white/20"
              >
                <p className="line-clamp-2 font-heading text-sm font-medium uppercase tracking-wide text-[#D7E2EA]/80 group-hover:text-[#D7E2EA]">
                  {chat.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {getModeName(chat.mode)}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {getModelName(chat.model)}
                  </Badge>
                </div>
                <p className="text-xs text-[#D7E2EA]/25">
                  {new Date(chat.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
