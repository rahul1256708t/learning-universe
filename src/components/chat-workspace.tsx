"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ClipboardIcon,
  FileTextIcon,
  Loader2Icon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
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
import { FlashcardPanel } from "@/components/flashcard-panel"

/* ── Mode icons ─────────────────────────────────────────────── */
const MODE_ICONS: Record<string, string> = {
  tutor: "🎓",
  homework: "📝",
  notes: "📋",
  quiz: "❓",
  "exam-prep": "🏆",
  eli5: "🧸",
  formula: "🔬",
  ncert: "📚",
}

/* ── Vision-capable models ──────────────────────────────────── */
const VISION_MODELS = new Set([
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "anthropic/claude-3.5-sonnet",
])

type ChatWorkspaceProps = {
  chat: Chat | null
  messages: Message[]
  hasOpenRouter: boolean
}

type Attachment = {
  name: string
  type: string
  size: number
  kind: "text" | "image"
  content: string
}

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_FILE_TYPES =
  ".txt,.md,.markdown,.csv,.json,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.rb,.php,.sql,.yml,.yaml,.xml,.log,text/*,image/*"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."))
    reader.readAsText(file)
  })
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."))
    reader.readAsDataURL(file)
  })
}

export function ChatWorkspace({ chat, messages: initialMessages, hasOpenRouter }: ChatWorkspaceProps) {
  const [chatId, setChatId] = useState(chat?.id ?? null)
  const [model, setModel] = useState(chat?.model ?? DEFAULT_MODEL)
  const [mode, setMode] = useState(chat?.mode ?? DEFAULT_MODE)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [streamingAnswer, setStreamingAnswer] = useState("")
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const modelItems = useMemo(
    () => OPENROUTER_MODELS.map((item) => ({ label: item.name, value: item.id })),
    []
  )
  const modeItems = useMemo(
    () => LEARNING_MODES.map((item) => ({ label: item.name, value: item.id })),
    []
  )

  /* Last AI message for flashcard generation */
  const lastAiContent = useMemo(() => {
    const aiMessages = messages.filter((m) => m.role === "assistant")
    return aiMessages[aiMessages.length - 1]?.content ?? ""
  }, [messages])

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (file.size > MAX_FILE_BYTES) {
      toast.error(`File is too large. Max size is ${formatBytes(MAX_FILE_BYTES)}.`)
      return
    }

    const isImage = file.type.startsWith("image/")

    if (isImage && !VISION_MODELS.has(model)) {
      toast.error("Switch to GPT-4o, Gemini 2.0 Flash, or Claude to attach images.")
      return
    }

    setIsReadingFile(true)
    try {
      const content = isImage ? await readFileAsDataUrl(file) : await readFileAsText(file)
      setAttachment({
        name: file.name,
        type: file.type || (isImage ? "image/png" : "text/plain"),
        size: file.size,
        kind: isImage ? "image" : "text",
        content,
      })
      toast.success(`Attached ${file.name}.`)
    } catch {
      toast.error("Could not read that file.")
    } finally {
      setIsReadingFile(false)
    }
  }

  function buildDisplayContent(message: string, file: Attachment | null) {
    if (!file) return message
    if (file.kind === "image") {
      return message ? `${message}\n\n[Attached image: ${file.name}]` : `[Attached image: ${file.name}]`
    }
    const block = `----- Attached file: ${file.name} -----\n\`\`\`\n${file.content}\n\`\`\``
    return message ? `${message}\n\n${block}` : block
  }

  async function submitMessage() {
    const message = input.trim()
    const file = attachment

    if (!message && !file) {
      toast.error("Type a question or attach a file before launch.")
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
      content: buildDisplayContent(message, file),
      created_at: new Date().toISOString(),
    }

    setMessages((current) => [...current, pendingUserMessage])
    setInput("")
    setAttachment(null)
    setStreamingAnswer("")

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            model,
            mode,
            chatId,
            attachment: file
              ? { name: file.name, type: file.type, kind: file.kind, content: file.content }
              : null,
          }),
        })

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "The AI route could not complete the request.")
        }

        const nextChatId = response.headers.get("x-chat-id")
        if (nextChatId) setChatId(nextChatId)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let answer = ""

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          answer += decoder.decode(value, { stream: true })
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
        const msg = error instanceof Error ? error.message : "Something went wrong."
        toast.error(msg)
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submitMessage()
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">

      {/* ── Main chat card ─────────────────────────────── */}
      <Card className="min-h-[720px] border-white/10 bg-black/40 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <CardHeader className="border-b border-white/8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-heading text-base font-semibold tracking-tight text-white">
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
                      {item.name}{VISION_MODELS.has(item.id) ? " 👁" : ""}
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
                      {MODE_ICONS[item.id]} {item.name}
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
              onKeyDown={handleKeyDown}
              placeholder="Ask a study question, paste homework, attach a file, or generate a quiz… (Ctrl+Enter to send)"
              className="min-h-28 resize-none rounded-lg border-white/8 bg-black/20 text-[#D7E2EA] placeholder:text-[#D7E2EA]/25"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileSelected}
              className="hidden"
            />

            {/* Attachment preview */}
            {attachment ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                {attachment.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachment.content}
                    alt={attachment.name}
                    className="size-10 shrink-0 rounded-md border border-white/10 object-cover"
                  />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#D7E2EA]/70">
                    <FileTextIcon className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-xs font-medium text-[#D7E2EA]/85">{attachment.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#D7E2EA]/40">
                    {attachment.kind === "image" ? "Image" : "Text"} · {formatBytes(attachment.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setAttachment(null)}
                  aria-label="Remove attachment"
                  className="text-[#D7E2EA]/40 hover:text-[#D7E2EA]"
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReadingFile}
                  className="rounded-xl border-white/15 font-heading text-[10px] uppercase tracking-widest text-[#D7E2EA]/70"
                >
                  {isReadingFile ? (
                    <Loader2Icon className="size-3 animate-spin" data-icon="inline-start" />
                  ) : (
                    <PaperclipIcon className="size-3" data-icon="inline-start" />
                  )}
                  Attach file
                </Button>
                <Badge variant="secondary" className="font-heading text-[10px] uppercase tracking-wider">
                  {getModelName(model)}
                </Badge>
                <Badge variant="secondary" className="font-heading text-[10px] uppercase tracking-wider">
                  {MODE_ICONS[mode]} {getModeName(mode)}
                </Badge>
              </div>
              <button
                type="button"
                onClick={submitMessage}
                disabled={isPending}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 font-heading text-xs font-medium uppercase tracking-widest text-[#05070D] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:px-8 sm:py-3 sm:text-sm"
              >
                <SendIcon className="size-3.5" />
                Launch question
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Right sidebar ──────────────────────────────── */}
      <aside className="flex flex-col gap-4">

        {/* Mode selector */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
          <p className="mb-3 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            Study Mode
          </p>
          <div className="flex flex-col gap-1.5">
            {LEARNING_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`rounded-xl border p-3 text-left text-sm transition-all duration-150 ${
                  mode === item.id
                    ? "border-purple-500/40 bg-purple-500/15"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <span className="block font-heading text-xs font-medium uppercase tracking-wider text-[#D7E2EA]/80">
                  {MODE_ICONS[item.id]} {item.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#D7E2EA]/40">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Flashcard panel */}
        <FlashcardPanel
          lastAiContent={lastAiContent}
          model={model}
          chatId={chatId}
        />

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
