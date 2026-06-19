"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ClipboardIcon,
  Loader2Icon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import type { Chat, Message } from "@/lib/database.types"
import {
  DEFAULT_MODE,
  DEFAULT_MODEL,
  LEARNING_MODES,
  OPENROUTER_MODELS,
  getModeName,
  getModelName,
} from "@/lib/learning"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ChatWorkspaceProps = {
  chat: Chat | null
  messages: Message[]
  hasOpenRouter: boolean
}

export function ChatWorkspace({ chat, messages: initialMessages, hasOpenRouter }: ChatWorkspaceProps) {
  const [chatId, setChatId] = useState(chat?.id ?? null)
  const [model, setModel] = useState(chat?.model ?? DEFAULT_MODEL)
  const [mode, setMode] = useState(chat?.mode ?? DEFAULT_MODE)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [streamingAnswer, setStreamingAnswer] = useState("")
  const [isPending, startTransition] = useTransition()

  const modelItems = useMemo(
    () => OPENROUTER_MODELS.map((item) => ({ label: item.name, value: item.id })),
    []
  )
  const modeItems = useMemo(
    () => LEARNING_MODES.map((item) => ({ label: item.name, value: item.id })),
    []
  )

  async function submitMessage() {
    const message = input.trim()

    if (!message) {
      toast.error("Type a question before launch.")
      return
    }

    if (!hasOpenRouter) {
      toast.error("OPENROUTER_API_KEY is missing on the server.")
      return
    }

    const pendingUserMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: chatId ?? "pending",
      user_id: "current-user",
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    }

    setMessages((current) => [...current, pendingUserMessage])
    setInput("")
    setStreamingAnswer("")

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, model, mode, chatId }),
        })

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "The AI route could not complete the request.")
        }

        const nextChatId = response.headers.get("x-chat-id")
        if (nextChatId) {
          setChatId(nextChatId)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let answer = ""

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          answer += chunk
          setStreamingAnswer(answer)
        }

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            chat_id: nextChatId ?? chatId ?? "pending",
            user_id: "current-user",
            role: "assistant",
            content: answer,
            created_at: new Date().toISOString(),
          },
        ])
        setStreamingAnswer("")
        toast.success("Chat saved automatically.")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong."
        toast.error(message)
      }
    })
  }

  async function deleteCurrentChat() {
    if (!chatId) return
    const response = await fetch(`/api/chats/${chatId}`, { method: "DELETE" })
    if (!response.ok) {
      toast.error("Could not delete this chat.")
      return
    }
    toast.success("Chat deleted.")
    window.location.href = "/dashboard/chat"
  }

  return (
    <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ── Main chat card ─────────────────────────── */}
      <Card className="min-h-[720px] border-white/10 bg-black/40 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <CardHeader className="border-b border-white/8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-heading text-base font-black uppercase tracking-wider text-[#D7E2EA]">
                {chat?.title ?? "New learning mission"}
              </CardTitle>
              <CardDescription className="text-[#D7E2EA]/40">
                Streaming AI tutor chat with automatic Supabase saving.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/chat"
                className={buttonVariants({
                  variant: "outline",
                  className: "rounded-xl border-white/15 font-heading text-xs uppercase tracking-widest text-[#D7E2EA]/70",
                })}
              >
                <PlusIcon data-icon="inline-start" />
                New chat
              </Link>
              {chatId ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={deleteCurrentChat}
                  className="rounded-xl font-heading text-xs uppercase tracking-widest"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
          {!hasOpenRouter ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/8 px-3.5 py-3 text-sm text-amber-200/90">
              <span>⚠</span>
              Add <code className="font-mono">OPENROUTER_API_KEY</code> to enable live AI responses.
            </div>
          ) : null}

          {/* Model + mode selectors */}
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={model} onValueChange={(value) => value && setModel(value)} items={modelItems}>
              <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-white/5 font-heading text-xs uppercase tracking-wider">
                <SelectValue placeholder="Choose a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {OPENROUTER_MODELS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={mode} onValueChange={(value) => value && setMode(value as typeof mode)} items={modeItems}>
              <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-white/5 font-heading text-xs uppercase tracking-wider">
                <SelectValue placeholder="Choose a mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {LEARNING_MODES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Message area */}
          <ScrollArea className="min-h-[380px] flex-1 rounded-xl border border-white/8 bg-black/25">
            <div className="flex flex-col gap-4 p-4">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <p className="font-heading text-xs font-medium uppercase tracking-widest text-[#D7E2EA]/30">
                    Ask a study question to begin
                  </p>
                </div>
              ) : null}
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {streamingAnswer ? (
                <MessageBubble
                  message={{
                    id: "streaming",
                    chat_id: chatId ?? "pending",
                    user_id: "current-user",
                    role: "assistant",
                    content: streamingAnswer,
                    created_at: new Date().toISOString(),
                  }}
                />
              ) : null}
              {isPending && !streamingAnswer ? (
                <div className="flex max-w-[280px] items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-[#D7E2EA]/50">
                  <Loader2Icon className="size-4 animate-spin" />
                  <span className="font-heading text-xs uppercase tracking-wider">AI is thinking…</span>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a study question, paste homework, request notes, or generate a quiz..."
              className="min-h-28 resize-none rounded-lg border-white/8 bg-black/20 text-[#D7E2EA] placeholder:text-[#D7E2EA]/25"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="font-heading text-[10px] uppercase tracking-wider">
                  {getModelName(model)}
                </Badge>
                <Badge variant="secondary" className="font-heading text-[10px] uppercase tracking-wider">
                  {getModeName(mode)}
                </Badge>
              </div>
              <button
                type="button"
                onClick={submitMessage}
                disabled={isPending}
                style={{
                  background:
                    "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
                  boxShadow:
                    "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
                  outline: "2px solid #ffffff",
                  outlineOffset: "-3px",
                }}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 font-heading text-xs font-medium uppercase tracking-widest text-white transition-transform duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 sm:px-8 sm:py-3 sm:text-sm"
              >
                <SendIcon className="size-3.5" />
                Launch question
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Mode selector sidebar ───────────────────── */}
      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
          <p className="mb-4 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            Mode Selector
          </p>
          <p className="mb-4 text-xs text-[#D7E2EA]/35">
            Each mode sends a different system prompt.
          </p>
          <div className="flex flex-col gap-2">
            {LEARNING_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`rounded-xl border p-3 text-left text-sm transition-all duration-150 ${
                  mode === item.id
                    ? "border-[#D7E2EA]/25 bg-[#D7E2EA]/8"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <span className="block font-heading text-xs font-medium uppercase tracking-wider text-[#D7E2EA]/80">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#D7E2EA]/40">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  async function copy() {
    await navigator.clipboard.writeText(message.content)
    toast.success("Copied answer.")
  }

  return (
    <article
      className={
        isUser
          ? "ml-auto max-w-[88%] rounded-2xl border border-[#D7E2EA]/15 bg-[#D7E2EA]/8 p-4"
          : "max-w-[92%] rounded-2xl border border-white/8 bg-white/[0.04] p-4"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-heading text-[10px] font-medium uppercase tracking-wider text-[#D7E2EA]/40">
          <SparklesIcon className="size-3" />
          {isUser ? "You" : "AI Tutor"}
        </span>
        {!isUser ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={copy}
            aria-label="Copy answer"
            className="text-[#D7E2EA]/30 hover:text-[#D7E2EA]"
          >
            <ClipboardIcon className="size-3" />
          </Button>
        ) : null}
      </div>
      <div className="prose prose-invert max-w-none prose-p:leading-7 prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40 prose-p:text-[#D7E2EA]/80">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      </div>
    </article>
  )
}
