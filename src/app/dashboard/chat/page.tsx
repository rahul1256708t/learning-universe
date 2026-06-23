import { ResearchAgent } from "@/components/research-agent"
import type { Chat, Message } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { hasTavily } from "@/lib/research/tavily"

type SearchParams = Promise<{ chatId?: string }>

export default async function ResearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  let chat: Chat | null = null
  let messages: Message[] = []

  if (supabase && params.chatId) {
    const { data: selectedChat } = await supabase
      .from("chats")
      .select("*")
      .eq("id", params.chatId)
      .maybeSingle()

    chat = selectedChat

    if (chat) {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true })

      messages = data ?? []
    }
  }

  return (
    <ResearchAgent
      chat={chat}
      messages={messages}
      hasOpenRouter={Boolean(process.env.OPENROUTER_API_KEY)}
      hasTavily={hasTavily()}
    />
  )
}
