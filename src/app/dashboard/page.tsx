import Link from "next/link"
import { ArrowRightIcon, MessageSquareIcon, SettingsIcon, UserRoundIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { count: chatCount } = supabase
    ? await supabase.from("chats").select("*", { count: "exact", head: true })
    : { count: 0 }
  const { count: messageCount } = supabase
    ? await supabase.from("messages").select("*", { count: "exact", head: true })
    : { count: 0 }

  return (
    <main className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Chats" value={chatCount ?? 0} />
        <StatCard label="Messages" value={messageCount ?? 0} />
        <StatCard label="Modes" value={8} />
      </div>

      {/* Heading */}
      <div className="overflow-hidden">
        <h1
          className="hero-heading font-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 8vw, 96px)" }}
        >
          Dashboard
        </h1>
        <p className="mt-2 font-heading text-sm font-medium uppercase tracking-widest text-[#D7E2EA]/50">
          Your Learning Universe command center
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/dashboard/chat",
            Icon: MessageSquareIcon,
            title: "Open Chat",
            text: "Ask, stream, save, and review AI answers.",
          },
          {
            href: "/dashboard/profile",
            Icon: UserRoundIcon,
            title: "Profile",
            text: "Manage your student profile.",
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
              <CardTitle className="font-heading text-base uppercase tracking-wider text-[#D7E2EA]">
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
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
      <p className="font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
        {label}
      </p>
      <p
        className="hero-heading font-heading font-black leading-none"
        style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
      >
        {value}
      </p>
    </div>
  )
}
