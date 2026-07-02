"use client"

import { useMemo, useState, useTransition } from "react"
import {
  CheckIcon,
  LayersIcon,
  Loader2Icon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"
import { toast } from "sonner"

import type { Flashcard } from "@/lib/database.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Props = {
  initialCards: Flashcard[]
  initialTopic: string
}

type Rating = "again" | "good" | "easy"

/**
 * Flashcard Studio — generate decks with the agent, then review them with
 * spaced repetition. Ratings reschedule each card server-side (SM-2 lite).
 */
export function FlashcardStudio({ initialCards, initialTopic }: Props) {
  const [cards, setCards] = useState<Flashcard[]>(initialCards)
  const [topic, setTopic] = useState(initialTopic)
  const [isGenerating, startGenerate] = useTransition()

  // Review session state: the queue of due card ids being studied now.
  const [queue, setQueue] = useState<string[]>([])
  const [flipped, setFlipped] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [isRating, startRating] = useTransition()

  const now = Date.now()
  const dueCards = useMemo(
    () => cards.filter((c) => new Date(c.due_at).getTime() <= now),
    [cards, now]
  )
  const decks = useMemo(() => {
    const byTopic = new Map<string, Flashcard[]>()
    for (const c of cards) {
      const list = byTopic.get(c.topic) ?? []
      list.push(c)
      byTopic.set(c.topic, list)
    }
    return [...byTopic.entries()].map(([deckTopic, deckCards]) => ({
      topic: deckTopic,
      cards: deckCards,
      due: deckCards.filter((c) => new Date(c.due_at).getTime() <= now).length,
    }))
  }, [cards, now])

  const currentCard = queue.length ? cards.find((c) => c.id === queue[0]) ?? null : null

  function generate() {
    const trimmed = topic.trim()
    if (!trimmed) {
      toast.error("Enter a topic first.")
      return
    }
    startGenerate(async () => {
      try {
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate", topic: trimmed }),
        })
        const payload = (await response.json()) as { cards?: Flashcard[]; error?: string }
        if (!response.ok || !payload.cards) throw new Error(payload.error ?? "Generation failed.")
        setCards((prev) => [...payload.cards!, ...prev])
        setTopic("")
        toast.success(`${payload.cards.length} cards added to your deck — they're due now.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Generation failed.")
      }
    })
  }

  function startReview(ids: string[]) {
    if (!ids.length) return
    setQueue(ids)
    setFlipped(false)
    setReviewedCount(0)
  }

  function rate(rating: Rating) {
    const card = currentCard
    if (!card) return
    startRating(async () => {
      try {
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "review", cardId: card.id, rating }),
        })
        const payload = (await response.json()) as { card?: Flashcard; error?: string }
        if (!response.ok || !payload.card) throw new Error(payload.error ?? "Could not save review.")

        setCards((prev) => prev.map((c) => (c.id === payload.card!.id ? payload.card! : c)))
        setFlipped(false)
        setReviewedCount((n) => n + 1)
        setQueue((prev) => {
          const rest = prev.slice(1)
          // "Again" keeps the card in this session — it comes back at the end.
          return rating === "again" ? [...rest, card.id] : rest
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save review.")
      }
    })
  }

  async function deleteDeck(deckTopic: string) {
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", topic: deckTopic }),
    })
    if (!response.ok) {
      toast.error("Could not delete the deck.")
      return
    }
    setCards((prev) => prev.filter((c) => c.topic !== deckTopic))
    setQueue([])
    toast.success("Deck deleted.")
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── Review area ─────────────────────────────────── */}
      <Card className="relative min-h-[520px] overflow-hidden border-white/10 bg-black/40 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-32 left-1/2 size-72 -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />

        <CardHeader className="relative border-b border-white/8">
          <CardTitle className="flex items-center gap-2 font-heading text-base font-black uppercase tracking-wider text-[#D7E2EA]">
            <LayersIcon className="size-4 text-purple-300" />
            Review Session
          </CardTitle>
          <CardDescription className="text-[#D7E2EA]/40">
            {dueCards.length
              ? `${dueCards.length} card${dueCards.length === 1 ? "" : "s"} due for review.`
              : "No cards due — generate a deck or come back later."}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative flex flex-1 flex-col items-center justify-center gap-5 p-6">
          {currentCard ? (
            <>
              <p className="font-heading text-[10px] uppercase tracking-widest text-[#D7E2EA]/35">
                {currentCard.topic} · {queue.length} left · {reviewedCount} reviewed
              </p>

              {/* Flip card */}
              <div
                className="w-full max-w-xl cursor-pointer"
                style={{ perspective: "1000px", height: "240px" }}
                onClick={() => setFlipped((f) => !f)}
              >
                <div
                  className="relative h-full w-full transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <span className="font-heading text-[9px] uppercase tracking-widest text-[#D7E2EA]/30">
                      Question
                    </span>
                    <p className="text-base font-medium leading-relaxed text-[#D7E2EA]/90">
                      {currentCard.question}
                    </p>
                    <span className="font-heading text-[9px] uppercase tracking-widest text-[#D7E2EA]/20">
                      tap to reveal
                    </span>
                  </div>
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-purple-500/25 bg-purple-500/10 p-6 text-center"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <span className="font-heading text-[9px] uppercase tracking-widest text-purple-400/60">
                      Answer
                    </span>
                    <p className="text-base leading-relaxed text-[#D7E2EA]/90">{currentCard.answer}</p>
                  </div>
                </div>
              </div>

              {/* Rating buttons (shown after flipping, like Anki) */}
              {flipped ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <RatingButton
                    label="Again"
                    hint="< 10 min"
                    tone="rose"
                    disabled={isRating}
                    onClick={() => rate("again")}
                  />
                  <RatingButton
                    label="Good"
                    hint={nextIntervalHint(currentCard, "good")}
                    tone="cyan"
                    disabled={isRating}
                    onClick={() => rate("good")}
                  />
                  <RatingButton
                    label="Easy"
                    hint={nextIntervalHint(currentCard, "easy")}
                    tone="emerald"
                    disabled={isRating}
                    onClick={() => rate("easy")}
                  />
                </div>
              ) : (
                <p className="font-heading text-[10px] uppercase tracking-widest text-[#D7E2EA]/30">
                  Flip the card, then rate how well you knew it
                </p>
              )}
            </>
          ) : queue.length === 0 && reviewedCount > 0 ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🎉</span>
              <p className="font-heading text-sm font-medium uppercase tracking-widest text-[#D7E2EA]/80">
                Session complete — {reviewedCount} review{reviewedCount === 1 ? "" : "s"}
              </p>
              <p className="max-w-sm text-xs leading-5 text-[#D7E2EA]/40">
                Each card is now rescheduled. Come back when the next cards fall due.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-4xl">🃏</span>
              <p className="max-w-sm text-xs leading-5 text-[#D7E2EA]/40">
                {dueCards.length
                  ? "Start a review session to study everything that's due."
                  : "Generate a deck from any topic — the agent writes the cards and spaced repetition schedules them."}
              </p>
              {dueCards.length ? (
                <button
                  type="button"
                  onClick={() => startReview(dueCards.map((c) => c.id))}
                  style={{
                    background: "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
                    boxShadow: "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
                    outline: "2px solid #ffffff",
                    outlineOffset: "-3px",
                  }}
                  className="flex items-center gap-2 rounded-full px-8 py-3 font-heading text-sm font-medium uppercase tracking-widest text-white transition-transform duration-200 hover:scale-[1.03]"
                >
                  <ZapIcon className="size-4" />
                  Review {dueCards.length} due card{dueCards.length === 1 ? "" : "s"}
                </button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Right rail: generate + decks ─────────────────── */}
      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
          <p className="mb-3 flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            <SparklesIcon className="size-3.5" />
            New Deck
          </p>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="Topic — e.g. Photosynthesis, class 10"
            className="mb-3 rounded-xl border-white/10 bg-black/20 text-[#D7E2EA] placeholder:text-[#D7E2EA]/25"
          />
          <button
            type="button"
            onClick={generate}
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-heading text-xs font-medium uppercase tracking-widest text-[#D7E2EA]/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <LayersIcon className="size-3.5" />
                Generate flashcards
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
          <p className="mb-3 font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            Your Decks ({decks.length})
          </p>
          <div className="flex flex-col gap-2">
            {decks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-[#D7E2EA]/30">
                Decks you generate will appear here.
              </p>
            ) : (
              decks.map((deck) => (
                <div
                  key={deck.topic}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
                >
                  <p className="line-clamp-1 font-heading text-xs font-medium uppercase tracking-wide text-[#D7E2EA]/80">
                    {deck.topic}
                  </p>
                  <p className="mt-1 text-[11px] text-[#D7E2EA]/40">
                    {deck.cards.length} cards · {deck.due} due
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={deck.due === 0}
                      onClick={() =>
                        startReview(
                          deck.cards
                            .filter((c) => new Date(c.due_at).getTime() <= Date.now())
                            .map((c) => c.id)
                        )
                      }
                      className="flex items-center gap-1 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <RotateCcwIcon className="size-3" />
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDeck(deck.topic)}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#D7E2EA]/40 transition hover:border-rose-400/30 hover:text-rose-200"
                    >
                      <Trash2Icon className="size-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-xs leading-6 text-[#D7E2EA]/45 backdrop-blur-xl">
          <p className="mb-2 flex items-center gap-1.5 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            <CheckIcon className="size-3" />
            How spaced repetition works
          </p>
          Rate each card after flipping it. <span className="text-rose-200">Again</span> shows it once more
          this session, <span className="text-cyan-200">Good</span> pushes it days away, and{" "}
          <span className="text-emerald-200">Easy</span> pushes it even further — so you review right before
          you would forget.
        </div>
      </aside>
    </div>
  )
}

function RatingButton({
  label,
  hint,
  tone,
  disabled,
  onClick,
}: {
  label: string
  hint: string
  tone: "rose" | "cyan" | "emerald"
  disabled: boolean
  onClick: () => void
}) {
  const styles = {
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20",
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-24 flex-col items-center rounded-xl border px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      <span className="font-heading text-xs font-bold uppercase tracking-widest">{label}</span>
      <span className="text-[10px] opacity-70">{hint}</span>
    </button>
  )
}

/** Preview of the next interval, mirroring the server's SM-2-lite math. */
function nextIntervalHint(card: Flashcard, rating: "good" | "easy"): string {
  const repetitions = card.repetitions + 1
  let days: number
  if (repetitions === 1) days = rating === "easy" ? 2 : 1
  else if (repetitions === 2) days = rating === "easy" ? 6 : 3
  else days = Math.min(365, card.interval_days * card.ease * (rating === "easy" ? 1.3 : 1))
  const rounded = Math.max(1, Math.round(days))
  return `${rounded} day${rounded === 1 ? "" : "s"}`
}
