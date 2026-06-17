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
import { Separator } from "@/components/ui/separator"
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
        <aside className="flex flex-col gap-4 rounded-lg border border-white/10 bg-black/30 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <Link href="/dashboard/chat" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
              <RocketIcon />
            </span>
            <span>
              <span className="block text-lg font-semibold">Learning Universe</span>
              <span className="block text-xs text-muted-foreground">AI study command</span>
            </span>
          </Link>

          <Separator />

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </nav>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile?.full_name ?? "Student"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>

          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOutIcon data-icon="inline-start" />
              Logout
            </Button>
          </form>

          <Separator />

          <section className="min-h-0 flex-1">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <HistoryIcon />
              Chat history
            </div>
            <div className="flex flex-col gap-2">
              {chats?.length ? (
                chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/dashboard/chat?chatId=${chat.id}`}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
                  >
                    <p className="line-clamp-1 text-sm font-medium">{chat.title}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary">{getModeName(chat.mode)}</Badge>
                      <Badge variant="secondary">{getModelName(chat.model)}</Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 p-3 text-sm text-muted-foreground">
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
