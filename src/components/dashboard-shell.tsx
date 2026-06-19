import Link from "next/link"
import { redirect } from "next/navigation"
import {
  BookOpenIcon,
  BrainCircuitIcon,
  HistoryIcon,
  InfoIcon,
  LogOutIcon,
  MessageSquareIcon,
  RocketIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react"

import { signOut } from "@/app/auth/actions"
import { AppBackground } from "@/components/app-background"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getModeName, getModelName } from "@/lib/learning"
import { createClient } from "@/lib/supabase/server"

type DashboardShellProps = {
  children: React.ReactNode
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BookOpenIcon },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquareIcon },
  { href: "/dashboard/models", label: "Models", icon: BrainCircuitIcon },
  { href: "/dashboard/profile", label: "Profile", icon: UserRoundIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  { href: "/admin-info", label: "Admin info", icon: InfoIcon },
]

export async function DashboardShell({ children }: DashboardShellProps) {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/login?error=Supabase%20is%20not%20configured")
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const [{ data: profile }, { data: chats }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("chats")
      .select("id, title, model, mode, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const initials =
    profile?.full_name?.slice(0, 2).toUpperCase() ??
    user.email?.slice(0, 2).toUpperCase() ??
    "LU"

  return (
    <AppBackground>
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-4 py-4 md:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">

          {/* Logo */}
          <Link href="/dashboard/chat" className="flex items-center gap-3 pb-1">
            <span className="grid size-10 place-items-center rounded-xl border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 text-[#D7E2EA]">
              <RocketIcon className="size-4" />
            </span>
            <span>
              <span className="block font-heading text-base font-black uppercase tracking-widest text-[#D7E2EA]">
                Learning
              </span>
              <span className="block font-heading text-[0.6rem] font-medium uppercase tracking-[0.25em] text-[#D7E2EA]/50">
                Universe
              </span>
            </span>
          </Link>

          <div className="h-px bg-white/8" />

          {/* Nav */}
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-heading text-sm font-medium uppercase tracking-wider text-[#D7E2EA]/50 transition-all duration-150 hover:bg-white/8 hover:text-[#D7E2EA]"
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="h-px bg-white/8" />

          {/* User */}
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-white/15">
              <AvatarFallback className="bg-[#D7E2EA]/10 font-heading text-xs font-bold uppercase text-[#D7E2EA]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-medium uppercase tracking-wide text-[#D7E2EA]">
                {profile?.full_name ?? "Student"}
              </p>
              <p className="truncate text-xs text-[#D7E2EA]/40">{user.email}</p>
            </div>
          </div>

          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="w-full rounded-xl border-white/15 font-heading text-xs font-medium uppercase tracking-widest text-[#D7E2EA]/60 hover:border-white/25 hover:text-[#D7E2EA]"
            >
              <LogOutIcon className="size-3.5" data-icon="inline-start" />
              Logout
            </Button>
          </form>

          <div className="h-px bg-white/8" />

          {/* Chat history */}
          <section className="min-h-0 flex-1 overflow-hidden">
            <div className="mb-3 flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/40">
              <HistoryIcon className="size-3.5" />
              Chat History
            </div>
            <div className="flex flex-col gap-1.5">
              {chats?.length ? (
                chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/dashboard/chat?chatId=${chat.id}`}
                    className="rounded-xl border border-white/8 bg-white/[0.03] p-3 transition hover:bg-white/[0.07]"
                  >
                    <p className="line-clamp-1 font-heading text-xs font-medium uppercase tracking-wide text-[#D7E2EA]/80">
                      {chat.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {getModeName(chat.mode)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {getModelName(chat.model)}
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-[#D7E2EA]/30">
                  Your previous chats will appear here.
                </p>
              )}
            </div>
          </section>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </AppBackground>
  )
}
