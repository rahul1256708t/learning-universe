import { DashboardClient } from "@/components/dashboard-client"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  if (!supabase) {
    return <DashboardClient chatCount={0} messageCount={0} recentChats={[]} chatDates={[]} />
  }

  const [
    { count: chatCount },
    { count: messageCount },
    { data: recentChats },
    { data: chatDateRows },
  ] = await Promise.all([
    supabase.from("chats").select("*", { count: "exact", head: true }),
    supabase.from("messages").select("*", { count: "exact", head: true }),
    supabase
      .from("chats")
      .select("id, title, model, mode, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("chats")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(120),
  ])

  return (
    <DashboardClient
      chatCount={chatCount ?? 0}
      messageCount={messageCount ?? 0}
      recentChats={recentChats ?? []}
      chatDates={(chatDateRows ?? []).map((r) => r.created_at)}
    />
  )
}
