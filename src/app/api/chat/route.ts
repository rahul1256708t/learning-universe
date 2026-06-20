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
import { AGENT_TOOLS, executeTool } from "@/lib/agent-tools"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Attachment = {
  name?: string
  type?: string
  kind?: "text" | "image"
  content?: string
}

type ChatRequest = {
  message?: string
  model?: string
  mode?: string
  chatId?: string | null
  attachment?: Attachment | null
}

// Keep payloads sane: cap embedded text and base64 image size.
const MAX_TEXT_CHARS = 120_000
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000 // ~6MB of base64

function sanitizeAttachment(attachment: Attachment | null | undefined): Attachment | null {
  if (!attachment || typeof attachment.content !== "string" || !attachment.content) {
    return null
  }

  const name = (attachment.name ?? "attachment").toString().slice(0, 200)
  const kind = attachment.kind === "image" ? "image" : "text"

  if (kind === "image") {
    if (!attachment.content.startsWith("data:image/")) return null
    if (attachment.content.length > MAX_IMAGE_DATA_URL_LENGTH) return null
    return { name, type: attachment.type, kind, content: attachment.content }
  }

  return { name, type: attachment.type, kind, content: attachment.content.slice(0, MAX_TEXT_CHARS) }
}

function buildUserContent(message: string, attachment: Attachment | null) {
  if (!attachment) return message

  if (attachment.kind === "image") {
    return message
      ? `${message}\n\n[Attached image: ${attachment.name}]`
      : `[Attached image: ${attachment.name}]`
  }

  const fileBlock = `----- Attached file: ${attachment.name} -----\n\`\`\`\n${attachment.content}\n\`\`\``
  return message ? `${message}\n\n${fileBlock}` : fileBlock
}

type ToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

type AssistantMessage = {
  role: "assistant"
  content: string | null
  tool_calls?: ToolCall[]
}

type OpenRouterResponse = {
  choices?: Array<{ message?: AssistantMessage }>
  usage?: { total_tokens?: number }
  error?: { message?: string }
}

// Cap the agent loop so a misbehaving model can't call tools forever.
const MAX_AGENT_STEPS = 5

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
  const message = body.message?.trim() ?? ""
  const model = body.model?.trim() || DEFAULT_MODEL
  const mode = (body.mode?.trim() || DEFAULT_MODE) as LearningModeId
  let chatId = body.chatId?.trim() || null
  const attachment = sanitizeAttachment(body.attachment)

  if (!message && !attachment) {
    return jsonError("Message or an attached file is required.", 400)
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
    const chatTitle = message
      ? titleFromMessage(message)
      : titleFromMessage(attachment ? `File: ${attachment.name}` : "")
    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({
        user_id: user.id,
        title: chatTitle,
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

  const storedUserContent = buildUserContent(message, attachment)

  const { error: userMessageError } = await supabase.from("messages").insert({
    chat_id: activeChatId,
    user_id: user.id,
    role: "user",
    content: storedUserContent,
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

  type ChatContent = string | Array<Record<string, unknown>>
  type ConversationMessage = {
    role: string
    content: ChatContent | null
    tool_calls?: ToolCall[]
    tool_call_id?: string
  }

  const conversation: ConversationMessage[] = [
    {
      role: "system",
      content: `${getModePrompt(mode)} You are Learning Universe, an autonomous study agent. You have tools: use "search_materials" to look inside the student's uploaded notes, textbooks, and documents whenever a question might be answered by their own materials, and cite the document names you used. Use "calculator" for any non-trivial arithmetic so results are exact. Plan briefly, call tools as needed, then give a clear, study-focused answer formatted in Markdown. When the student attaches a file, read it carefully and ground your answer in its contents.`,
    },
    ...(previousMessages.data ?? []).map((item) => ({
      role: item.role,
      content: item.content as ChatContent,
    })),
  ]

  // For image attachments, send the current turn as multimodal content so
  // vision-capable models can actually see the picture.
  if (attachment?.kind === "image" && attachment.content) {
    const lastIndex = conversation.length - 1
    const lastMessage = conversation[lastIndex]
    if (lastMessage && lastMessage.role === "user") {
      conversation[lastIndex] = {
        role: "user",
        content: [
          { type: "text", text: typeof lastMessage.content === "string" ? lastMessage.content : message },
          { type: "image_url", image_url: { url: attachment.content } },
        ],
      }
    }
  }

  async function callModel(messages: ConversationMessage[], withTools: boolean) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Learning Universe",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 1100,
        ...(withTools ? { tools: AGENT_TOOLS, tool_choice: "auto" } : {}),
      }),
    })

    const payload = (await response.json().catch(() => null)) as OpenRouterResponse | null
    if (!response.ok || !payload) {
      throw new Error(payload?.error?.message ?? "OpenRouter could not complete the request.")
    }
    return payload
  }

  // Agent loop: let the model call tools (search the student's materials, do
  // exact math), feed each result back, and continue until it produces a final
  // answer. Tool calls are resolved server-side and never persisted to history.
  let finalAnswer = ""
  let tokensUsed = 0
  const toolsUsed = new Set<string>()

  try {
    for (let step = 0; step < MAX_AGENT_STEPS; step += 1) {
      const isLastStep = step === MAX_AGENT_STEPS - 1
      const payload = await callModel(conversation, !isLastStep)
      tokensUsed += payload.usage?.total_tokens ?? 0

      const message = payload.choices?.[0]?.message
      const toolCalls = message?.tool_calls ?? []

      if (toolCalls.length === 0 || isLastStep) {
        finalAnswer = message?.content ?? ""
        break
      }

      conversation.push({ role: "assistant", content: message?.content ?? "", tool_calls: toolCalls })

      for (const call of toolCalls) {
        toolsUsed.add(call.function.name)
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments || "{}")
        } catch {
          args = {}
        }
        const result = await executeTool(call.function.name, args, { supabase, userId: user.id })
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.slice(0, 8000),
        })
      }
    }
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The agent could not complete the request.", 502)
  }

  if (!finalAnswer.trim()) {
    finalAnswer = "I could not produce an answer for that. Please try rephrasing your question."
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // The answer is already complete (tool loops can't be streamed token by
        // token), so emit it in small chunks to keep the typing-style UI.
        const chunkSize = 24
        for (let index = 0; index < finalAnswer.length; index += chunkSize) {
          controller.enqueue(encoder.encode(finalAnswer.slice(index, index + chunkSize)))
        }

        await supabase.from("messages").insert({
          chat_id: activeChatId,
          user_id: user.id,
          role: "assistant",
          content: finalAnswer,
        })

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
      "x-agent-tools": Array.from(toolsUsed).join(","),
    },
  })
}
