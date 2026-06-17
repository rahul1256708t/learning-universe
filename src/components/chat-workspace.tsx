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
    <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-h-[720px] border-white/10 bg-card/75 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{chat?.title ?? "New learning mission"}</CardTitle>
              <CardDescription>Streaming AI tutor chat with automatic Supabase saving.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/chat" className={buttonVariants({ variant: "outline" })}>
                <PlusIcon data-icon="inline-start" />
                New chat
              </Link>
              {chatId ? (
                <Button type="button" variant="destructive" onClick={deleteCurrentChat}>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
          {!hasOpenRouter ? (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">
              Add `OPENROUTER_API_KEY` to enable live AI responses.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Select value={model} onValueChange={(value) => value && setModel(value)} items={modelItems}>
              <SelectTrigger className="h-10 w-full border-white/10 bg-white/5">
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
              <SelectTrigger className="h-10 w-full border-white/10 bg-white/5">
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

          <ScrollArea className="min-h-[380px] flex-1 rounded-lg border border-white/10 bg-black/20">
            <div className="flex flex-col gap-4 p-4">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-muted-foreground">
                  Ask a study question to begin.
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
                <div className="flex max-w-[280px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] p-4 text-sm text-muted-foreground">
                  <Loader2Icon className="animate-spin" />
                  AI is thinking...
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a study question, paste homework, request notes, or generate a quiz..."
              className="min-h-28 resize-none border-white/10 bg-black/20"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{getModelName(model)}</Badge>
                <Badge variant="secondary">{getModeName(mode)}</Badge>
              </div>
              <Button
                type="button"
                size="lg"
                onClick={submitMessage}
                disabled={isPending}
                className="bg-gradient-to-r from-cyan-200 via-violet-200 to-amber-200 text-slate-950 hover:opacity-90"
              >
                <SendIcon data-icon="inline-start" />
                Launch question
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <aside className="flex flex-col gap-4">
        <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Mode selector</CardTitle>
            <CardDescription>Each mode sends a different system prompt.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {LEARNING_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left text-sm transition hover:bg-white/[0.08]"
              >
                <span className="font-medium">{item.name}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
              </button>
            ))}
          </CardContent>
        </Card>
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
          ? "ml-auto max-w-[88%] rounded-lg border border-cyan-200/20 bg-cyan-300/12 p-4"
          : "max-w-[92%] rounded-lg border border-white/10 bg-white/[0.05] p-4"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <SparklesIcon />
          {isUser ? "You" : "AI tutor"}
        </span>
        {!isUser ? (
          <Button type="button" size="icon-xs" variant="ghost" onClick={copy} aria-label="Copy answer">
            <ClipboardIcon />
          </Button>
        ) : null}
      </div>
      <div className="prose prose-invert max-w-none prose-p:leading-7 prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      </div>
    </article>
  )
}
