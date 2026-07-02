"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ClipboardIcon,
  ListChecksIcon,
  Loader2Icon,
  PlusIcon,
  SatelliteDishIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import type { Chat, Message } from "@/lib/database.types"
import {
  DEFAULT_RESEARCH_MODE,
  RESEARCH_MODES,
  getResearchMode,
} from "@/lib/research/modes"
import { AGENT_MODELS, DEFAULT_AGENT_MODEL, getAgentModelName } from "@/lib/research/models"
import type {
  AgentEvent,
  Classification,
  Confidence,
  ResearchModeId,
  ResearchStepId,
  Source,
} from "@/lib/research/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ConfidenceMeter } from "@/components/research/confidence-meter"
import { SourceCard } from "@/components/research/source-card"
import { ResearchSteps, initialStepStates, type StepState } from "@/components/research/research-steps"

/* A fully-rendered research turn (question + grounded answer + evidence). */
type ResearchTurn = {
  id: string
  question: string
  answer: string
  sources: Source[]
  confidence: Confidence | null
  checked: string[]
  classification: Classification | null
  modelUsed: string
}

type ResearchAgentProps = {
  chat: Chat | null
  messages: Message[]
  hasOpenRouter: boolean
  hasSearch: boolean
  searchProvider: string
}

/* Quick follow-ups offered under a finished answer, per the product spec.
   Actions either preload a follow-up prompt, or (href) open a study tool
   with the topic prefilled. */
type NextAction = {
  label: string
  mode: ResearchModeId | null
  prompt?: (q: string) => string
  href?: (q: string) => string
}

const NEXT_ACTIONS: NextAction[] = [
  { label: "📝 Make short notes", mode: "notes", prompt: (q) => `Make short revision notes on: ${q}` },
  { label: "❓ Take a quiz", mode: null, href: (q) => `/dashboard/quiz?topic=${encodeURIComponent(q)}` },
  { label: "🧒 Explain like class 10", mode: "tutor", prompt: (q) => `Explain this for a class 10 student: ${q}` },
  { label: "🏆 Board-style answer", mode: "exam", prompt: (q) => `Give a board-exam-style answer for: ${q}` },
  { label: "🃏 Create flashcards", mode: null, href: (q) => `/dashboard/flashcards?topic=${encodeURIComponent(q)}` },
  { label: "➕ Solve similar questions", mode: "homework", prompt: (q) => `Give and solve 3 similar practice questions for: ${q}` },
]

const TYPE_LABEL: Record<string, string> = {
  "school-doubt": "School doubt",
  "current-info": "Current information",
  coding: "Coding / project",
  "exam-prep": "Exam preparation",
  "deep-research": "Deep research",
}

export function ResearchAgent({ chat, messages, hasOpenRouter, hasSearch, searchProvider }: ResearchAgentProps) {
  const router = useRouter()
  const [chatId, setChatId] = useState(chat?.id ?? null)
  const [mode, setMode] = useState<ResearchModeId>((chat?.mode as ResearchModeId) ?? DEFAULT_RESEARCH_MODE)
  const [model, setModel] = useState(chat?.model && AGENT_MODELS.some((m) => m.id === chat.model) ? chat.model : DEFAULT_AGENT_MODEL)
  const [input, setInput] = useState("")

  // Completed turns rendered with full evidence. Seeded from saved history
  // (sources aren't stored on messages, so historical answers show text only).
  const [turns, setTurns] = useState<ResearchTurn[]>(() => seedTurnsFromHistory(messages))

  // The in-flight research run.
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [steps, setSteps] = useState<Record<ResearchStepId, StepState>>(initialStepStates)
  const [liveSources, setLiveSources] = useState<Source[]>([])
  const [liveAnswer, setLiveAnswer] = useState("")
  const [liveClassification, setLiveClassification] = useState<Classification | null>(null)
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  const modeItems = useMemo(() => RESEARCH_MODES.map((m) => ({ label: m.name, value: m.id })), [])
  const modelItems = useMemo(() => AGENT_MODELS.map((m) => ({ label: m.name, value: m.id })), [])
  const activeMode = getResearchMode(mode)

  function resetRun() {
    setSteps(initialStepStates())
    setLiveSources([])
    setLiveAnswer("")
    setLiveClassification(null)
  }

  async function runResearch() {
    const question = input.trim()
    if (!question) {
      toast.error("Enter a question to research.")
      return
    }
    if (!hasOpenRouter) {
      toast.error("OPENROUTER_API_KEY is missing on the server.")
      return
    }

    setInput("")
    setActiveQuestion(question)
    resetRun()

    startTransition(async () => {
      let answer = ""
      let finalSources: Source[] = []
      let finalConfidence: Confidence | null = null
      let finalChecked: string[] = []
      let finalClassification: Classification | null = null
      let finalModel = model

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, mode, model, chatId }),
        })

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "The research agent could not start.")
        }

        const nextChatId = response.headers.get("x-chat-id")
        if (nextChatId) setChatId(nextChatId)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            let event: AgentEvent
            try {
              event = JSON.parse(trimmed) as AgentEvent
            } catch {
              continue
            }

            switch (event.type) {
              case "step":
                setSteps((prev) => ({
                  ...prev,
                  [event.step]: { status: event.status, detail: event.detail ?? prev[event.step]?.detail },
                }))
                break
              case "classification":
                finalClassification = event.classification
                setLiveClassification(event.classification)
                break
              case "sources":
                finalSources = event.sources
                setLiveSources(event.sources)
                break
              case "token":
                answer += event.text
                setLiveAnswer(answer)
                queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
                break
              case "meta":
                finalConfidence = event.confidence
                finalChecked = event.checked
                finalSources = event.sources
                finalClassification = event.classification
                finalModel = event.model
                break
              case "error":
                throw new Error(event.error)
              case "done":
                break
            }
          }
        }

        // Commit the completed turn and clear the live run.
        setTurns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            question,
            answer,
            sources: finalSources,
            confidence: finalConfidence,
            checked: finalChecked,
            classification: finalClassification,
            modelUsed: finalModel,
          },
        ])
        setActiveQuestion(null)
        resetRun()
        toast.success("Research complete — saved to your library.")
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Research failed."
        toast.error(msg)
        // Keep whatever was produced so the student doesn't lose it.
        if (answer) {
          setTurns((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              question,
              answer,
              sources: finalSources,
              confidence: finalConfidence,
              checked: finalChecked,
              classification: finalClassification,
              modelUsed: finalModel,
            },
          ])
        }
        setActiveQuestion(null)
        resetRun()
      }
    })
  }

  /* A "next action" chip preloads the composer with a follow-up and switches
     to the most useful mode — or jumps to a study tool with the topic ready. */
  function applyNextAction(action: NextAction, question: string) {
    if (action.href) {
      router.push(action.href(question))
      return
    }
    if (action.mode) setMode(action.mode)
    if (action.prompt) setInput(action.prompt(question))
    toast.info("Loaded a follow-up — press Start research.")
    queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
  }

  async function deleteCurrentChat() {
    if (!chatId) return
    const response = await fetch(`/api/chats/${chatId}`, { method: "DELETE" })
    if (!response.ok) {
      toast.error("Could not delete this session.")
      return
    }
    toast.success("Session deleted.")
    window.location.href = "/dashboard/chat"
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      runResearch()
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── Main research console ───────────────────────── */}
      <Card className="relative min-h-[760px] overflow-hidden border-white/10 bg-black/40 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {/* cosmic glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 size-72 -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 size-72 rounded-full bg-cyan-500/15 blur-3xl" />

        <CardHeader className="relative border-b border-white/8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-heading text-base font-black uppercase tracking-wider text-[#D7E2EA]">
                <SatelliteDishIcon className="size-4 text-cyan-300" />
                AI Research Agent
              </CardTitle>
              <CardDescription className="text-[#D7E2EA]/40">
                Searches the web, reads sources, verifies facts, and answers with citations.
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
                New research
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

        <CardContent className="relative flex min-h-0 flex-1 flex-col gap-4 pt-4">
          {!hasOpenRouter ? (
            <Notice tone="amber">
              Add <code className="font-mono">OPENROUTER_API_KEY</code> on the server to enable the agent.
            </Notice>
          ) : null}
          {hasOpenRouter && !hasSearch ? (
            <Notice tone="cyan">
              Research search API is not configured. Add <code className="font-mono">SEARCH_API_KEY</code>{" "}
              (provider: <span className="font-mono">{searchProvider}</span>) to enable live web research.
              Without it the agent still answers, but marks its confidence down and can&apos;t cite sources.
            </Notice>
          ) : null}

          {/* Mode + model selectors */}
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={mode} onValueChange={(v) => v && setMode(v as ResearchModeId)} items={modeItems}>
              <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-white/5 font-heading text-xs uppercase tracking-wider">
                <SelectValue placeholder="Research mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {RESEARCH_MODES.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.icon} {m.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={(v) => v && setModel(v)} items={modelItems}>
              <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-white/5 font-heading text-xs uppercase tracking-wider">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {AGENT_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Transcript */}
          <ScrollArea className="min-h-[380px] flex-1 rounded-xl border border-white/8 bg-black/25">
            <div ref={scrollRef} className="flex flex-col gap-5 p-4">
              {turns.length === 0 && !activeQuestion ? (
                <EmptyState modeName={activeMode.name} />
              ) : null}

              {turns.map((turn) => (
                <TurnView key={turn.id} turn={turn} onNextAction={applyNextAction} />
              ))}

              {/* Live run */}
              {activeQuestion ? (
                <div className="flex flex-col gap-3">
                  <QuestionBubble text={activeQuestion} />
                  <ResearchSteps states={steps} />
                  {liveSources.length > 0 ? (
                    <SourcesGrid sources={liveSources} compact />
                  ) : null}
                  {liveAnswer ? (
                    <AnswerBlock content={liveAnswer} streaming />
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] p-4 text-sm text-[#D7E2EA]/50">
                      <Loader2Icon className="size-4 animate-spin" />
                      <span className="font-heading text-xs uppercase tracking-wider">
                        {liveClassification
                          ? liveClassification.researchRequired
                            ? "Researching sources…"
                            : "Composing answer…"
                          : "Understanding your question…"}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask anything — the agent will research it in ${activeMode.name}… (Ctrl+Enter to launch)`}
              className="min-h-24 resize-none rounded-lg border-white/8 bg-black/20 text-[#D7E2EA] placeholder:text-[#D7E2EA]/25"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 font-heading text-[10px] uppercase tracking-wider text-[#D7E2EA]/40">
                <span>{activeMode.icon} {activeMode.name}</span>
                <span className="text-[#D7E2EA]/20">·</span>
                <span>{getAgentModelName(model)}</span>
              </p>
              <button
                type="button"
                onClick={runResearch}
                disabled={isPending}
                style={{
                  background: "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
                  boxShadow: "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
                  outline: "2px solid #ffffff",
                  outlineOffset: "-3px",
                }}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 font-heading text-xs font-medium uppercase tracking-widest text-white transition-transform duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 sm:px-8 sm:py-3 sm:text-sm"
              >
                {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SatelliteDishIcon className="size-3.5" />}
                {isPending ? "Researching…" : "Start research"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Right rail: mode selector ───────────────────── */}
      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
          <p className="mb-3 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            Research Mode
          </p>
          <div className="flex flex-col gap-1.5">
            {RESEARCH_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-xl border p-3 text-left transition-all duration-150 ${
                  mode === m.id
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <span className="block font-heading text-xs font-medium uppercase tracking-wider text-[#D7E2EA]/85">
                  {m.icon} {m.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#D7E2EA]/40">{m.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-xs leading-6 text-[#D7E2EA]/45 backdrop-blur-xl">
          <p className="mb-2 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            How this works
          </p>
          The agent classifies your question, decides if it needs to search, reads multiple trusted sources,
          compares them, then writes a cited answer with a confidence score. It never invents sources.
        </div>
      </aside>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function TurnView({
  turn,
  onNextAction,
}: {
  turn: ResearchTurn
  onNextAction: (action: NextAction, question: string) => void
}) {
  // Only show research-status badges for turns produced this session (the ones
  // that carry a classification). Seeded history has no evidence to report.
  const researched = turn.classification?.researchRequired ?? null

  return (
    <div className="flex flex-col gap-3">
      <QuestionBubble text={turn.question} classification={turn.classification} />
      <AnswerBlock content={turn.answer} modelUsed={turn.modelUsed} />

      {researched !== null ? (
        <div className="flex flex-wrap items-center gap-2">
          <AnswerBadge tone={researched ? "fuchsia" : "slate"}>
            {researched ? "🔬 Research Used" : "⚡ Direct Answer"}
          </AnswerBadge>
          {turn.sources.length > 0 ? (
            <AnswerBadge tone="emerald">✓ Sources Verified ({turn.sources.length})</AnswerBadge>
          ) : null}
        </div>
      ) : null}

      {turn.confidence ? <ConfidenceMeter confidence={turn.confidence} /> : null}

      {turn.checked.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="mb-2 flex items-center gap-1.5 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            <ListChecksIcon className="size-3.5" />
            What I checked
          </p>
          <ul className="flex flex-col gap-1.5">
            {turn.checked.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[#D7E2EA]/60">
                <span className="mt-0.5 text-emerald-300">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {turn.sources.length > 0 ? (
        <section>
          <p className="mb-2 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            Sources used ({turn.sources.length})
          </p>
          <SourcesGrid sources={turn.sources} />
        </section>
      ) : null}

      {turn.question ? (
        <section>
          <p className="mb-2 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            Suggested next steps
          </p>
          <div className="flex flex-wrap gap-2">
            {NEXT_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => onNextAction(action, turn.question)}
                className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs text-[#D7E2EA]/70 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100"
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function AnswerBadge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: "fuchsia" | "emerald" | "slate"
}) {
  const styles = {
    fuchsia: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    slate: "border-white/15 bg-white/5 text-[#D7E2EA]/70",
  }[tone]
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${styles}`}>
      {children}
    </span>
  )
}

function SourcesGrid({ sources, compact = false }: { sources: Source[]; compact?: boolean }) {
  return (
    <div className={`grid gap-2.5 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
      {sources.map((s) => (
        <SourceCard key={`${s.id}-${s.url}`} source={s} />
      ))}
    </div>
  )
}

function QuestionBubble({ text, classification }: { text: string; classification?: Classification | null }) {
  return (
    <div className="ml-auto max-w-[88%] rounded-2xl border border-[#D7E2EA]/15 bg-[#D7E2EA]/8 p-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-heading text-[10px] font-medium uppercase tracking-wider text-[#D7E2EA]/40">You</span>
        {classification ? (
          <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-fuchsia-200">
            {TYPE_LABEL[classification.type] ?? classification.type}
          </span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-[#D7E2EA]/90">{text}</p>
    </div>
  )
}

function AnswerBlock({
  content,
  streaming = false,
  modelUsed,
}: {
  content: string
  streaming?: boolean
  modelUsed?: string
}) {
  async function copy() {
    await navigator.clipboard.writeText(content)
    toast.success("Copied answer.")
  }

  return (
    <article className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-heading text-[10px] font-medium uppercase tracking-wider text-[#D7E2EA]/40">
          <SparklesIcon className="size-3 text-cyan-300" />
          Research Agent{modelUsed ? ` · ${getAgentModelName(modelUsed)}` : ""}
          {streaming ? <span className="ml-1 animate-pulse text-cyan-300">▍</span> : null}
        </span>
        {!streaming ? (
          <Button type="button" size="icon-xs" variant="ghost" onClick={copy} aria-label="Copy answer" className="text-[#D7E2EA]/30 hover:text-[#D7E2EA]">
            <ClipboardIcon className="size-3" />
          </Button>
        ) : null}
      </div>
      <div className="prose prose-invert max-w-none prose-p:leading-7 prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40 prose-p:text-[#D7E2EA]/80">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </article>
  )
}

function EmptyState({ modeName }: { modeName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 p-10 text-center">
      <span className="text-3xl">🛰️</span>
      <p className="font-heading text-sm font-medium uppercase tracking-widest text-[#D7E2EA]/70">
        Ask the Research Agent anything
      </p>
      <p className="max-w-md text-xs leading-5 text-[#D7E2EA]/40">
        It will understand your question, decide if it needs to search, read trusted sources, verify the facts,
        and write a cited answer — currently in <span className="text-cyan-200">{modeName}</span>.
      </p>
    </div>
  )
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "amber" | "cyan" }) {
  const styles =
    tone === "amber"
      ? "border-amber-400/20 bg-amber-400/8 text-amber-200/90"
      : "border-cyan-400/20 bg-cyan-400/8 text-cyan-100/90"
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${styles}`}>
      <span>{tone === "amber" ? "⚠" : "🛰️"}</span>
      <span>{children}</span>
    </div>
  )
}

/* Render saved history as text-only turns (evidence isn't stored on messages). */
function seedTurnsFromHistory(messages: Message[]): ResearchTurn[] {
  const turns: ResearchTurn[] = []
  let pendingQuestion: string | null = null

  for (const m of messages) {
    if (m.role === "user") {
      pendingQuestion = m.content
    } else if (m.role === "assistant") {
      turns.push({
        id: m.id,
        question: pendingQuestion ?? "",
        answer: m.content,
        sources: [],
        confidence: null,
        checked: [],
        classification: null,
        modelUsed: "",
      })
      pendingQuestion = null
    }
  }

  return turns
}
