import { ChatWorkspace } from "@/components/chat-workspace"
import type { Chat, Message } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

type SearchParams = Promise<{ chatId?: string }>

export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
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
    <ChatWorkspace
      chat={chat}
      messages={messages}
      hasOpenRouter={Boolean(process.env.OPENROUTER_API_KEY)}
    />
  )
}
