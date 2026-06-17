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
    <main className="flex flex-col gap-4">
      <Card className="border-white/10 bg-card/75 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Your protected Learning Universe command center.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Stat title="Chats" value={chatCount ?? 0} />
          <Stat title="Messages" value={messageCount ?? 0} />
          <Stat title="Modes" value={8} />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["/dashboard/chat", MessageSquareIcon, "Open chat", "Ask, stream, save, and review AI answers."],
          ["/dashboard/profile", UserRoundIcon, "Profile", "Manage your student profile."],
          ["/dashboard/settings", SettingsIcon, "Settings", "Check deployment and environment readiness."],
        ].map(([href, Icon, title, text]) => (
          <Card key={String(href)} className="border-white/10 bg-card/65 backdrop-blur-xl">
            <CardHeader>
              <Icon />
              <CardTitle>{String(title)}</CardTitle>
              <CardDescription>{String(text)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={String(href)} className={buttonVariants()}>
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

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}
