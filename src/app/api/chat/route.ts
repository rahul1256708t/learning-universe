import { NextResponse } from "next/server"

import {
  DEFAULT_MODE,
  DEFAULT_MODEL,
  getModePrompt,
  isAllowedMode,
  isAllowedModel,
  type LearningModeId,
} from "@/lib/learning"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ChatRequest = {
  message?: string
  model?: string
  mode?: string
  chatId?: string | null
}

type OpenRouterChunk = {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
  usage?: {
    total_tokens?: number
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function titleFromMessage(message: string) {
  return message.replace(/\s+/g, " ").slice(0, 72) || "Untitled chat"
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return jsonError("OPENROUTER_API_KEY is not configured on the server.", 500)
  }

  const supabase = await createClient()

  if (!supabase) {
    return jsonError("Supabase is not configured.", 500)
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonError("You must be logged in to chat.", 401)
  }

  const body = (await request.json()) as ChatRequest
  const message = body.message?.trim()
  const model = body.model?.trim() || DEFAULT_MODEL
  const mode = (body.mode?.trim() || DEFAULT_MODE) as LearningModeId
  let chatId = body.chatId?.trim() || null

  if (!message) {
    return jsonError("Message is required.", 400)
  }

  if (!isAllowedModel(model)) {
    return jsonError("Selected model is not allowed.", 400)
  }

  if (!isAllowedMode(mode)) {
    return jsonError("Selected learning mode is not allowed.", 400)
  }

  if (chatId) {
    const { data: existingChat } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!existingChat) {
      return jsonError("Chat was not found for this user.", 404)
    }

    await supabase.from("chats").update({ model, mode }).eq("id", chatId)
  } else {
    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({
        user_id: user.id,
        title: titleFromMessage(message),
        model,
        mode,
      })
      .select("id")
      .single()

    if (error || !newChat) {
      return jsonError(error?.message ?? "Could not create chat.", 500)
    }

    chatId = newChat.id
  }

  if (!chatId) {
    return jsonError("Could not create or resolve chat.", 500)
  }

  const activeChatId = chatId

  const { error: userMessageError } = await supabase.from("messages").insert({
    chat_id: activeChatId,
    user_id: user.id,
    role: "user",
    content: message,
  })

  if (userMessageError) {
    return jsonError(userMessageError.message, 500)
  }

  const previousMessages = await supabase
    .from("messages")
    .select("role, content")
    .eq("chat_id", activeChatId)
    .order("created_at", { ascending: true })
    .limit(16)

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Learning Universe",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        {
          role: "system",
          content: `${getModePrompt(mode)} You are Learning Universe. Keep answers study-focused, accurate, and formatted in Markdown when helpful.`,
        },
        ...(previousMessages.data ?? []).map((item) => ({
          role: item.role,
          content: item.content,
        })),
      ],
      temperature: 0.45,
      max_tokens: 1100,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text()
    return jsonError(errorText || "OpenRouter could not complete the request.", upstream.status)
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = upstream.body.getReader()
  let buffer = ""
  let assistantAnswer = ""
  let tokensUsed = 0

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line.startsWith("data:")) continue

            const payload = line.slice(5).trim()
            if (payload === "[DONE]") continue

            try {
              const chunk = JSON.parse(payload) as OpenRouterChunk
              const text = chunk.choices?.[0]?.delta?.content ?? ""
              tokensUsed = chunk.usage?.total_tokens ?? tokensUsed

              if (text) {
                assistantAnswer += text
                controller.enqueue(encoder.encode(text))
              }
            } catch {
              // Ignore malformed SSE keepalive chunks.
            }
          }
        }

        if (assistantAnswer) {
          await supabase.from("messages").insert({
            chat_id: activeChatId,
            user_id: user.id,
            role: "assistant",
            content: assistantAnswer,
          })
        }

        await supabase.from("usage_logs").insert({
          user_id: user.id,
          model,
          tokens_used: tokensUsed,
        })

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-chat-id": activeChatId,
    },
  })
}
