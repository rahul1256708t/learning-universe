"use client"

import { useState, useTransition } from "react"
import { LayersIcon, Loader2Icon, RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { toast } from "sonner"

type Flashcard = {
  question: string
  answer: string
}

type Props = {
  lastAiContent: string
  model: string
  chatId: string | null
}

/* Parse "Q: ... A: ..." format from AI response */
function parseCards(text: string): Flashcard[] {
  const cards: Flashcard[] = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  let i = 0
  while (i < lines.length) {
    const qLine = lines[i]
    const aLine = lines[i + 1]
    if (qLine?.match(/^Q\d*[:.]/i) && aLine?.match(/^A\d*[:.]/i)) {
      cards.push({
        question: qLine.replace(/^Q\d*[:.]\s*/i, "").trim(),
        answer: aLine.replace(/^A\d*[:.]\s*/i, "").trim(),
      })
      i += 2
    } else {
      i++
    }
  }

  return cards
}

export function FlashcardPanel({ lastAiContent, model, chatId }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isPending, startTransition] = useTransition()

  function generate() {
    if (!lastAiContent) {
      toast.error("Send a message first to generate flashcards.")
      return
    }

    startTransition(async () => {
      try {
        const prompt =
          `Based on this study content, generate exactly 6 flashcards.\n` +
          `Format each card EXACTLY like this, one per line pair:\n` +
          `Q: [question]\nA: [answer]\n\n` +
          `Content:\n${lastAiContent.slice(0, 1200)}`

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: prompt,
            model,
            mode: "tutor",
            chatId,
          }),
        })

        if (!response.ok || !response.body) {
          throw new Error("Could not generate flashcards.")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let full = ""
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          full += decoder.decode(value, { stream: true })
        }

        const parsed = parseCards(full)
        if (parsed.length === 0) {
          toast.error("Could not parse flashcards. Try again.")
          return
        }

        setCards(parsed)
        setCurrent(0)
        setFlipped(false)
        toast.success(`${parsed.length} flashcards ready!`)
      } catch {
        toast.error("Flashcard generation failed.")
      }
    })
  }

  function next() {
    setFlipped(false)
    setTimeout(() => setCurrent((c) => (c + 1) % cards.length), 150)
  }

  function prev() {
    setFlipped(false)
    setTimeout(() => setCurrent((c) => (c - 1 + cards.length) % cards.length), 150)
  }

  function reset() {
    setCards([])
    setCurrent(0)
    setFlipped(false)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayersIcon className="size-3.5 text-[#D7E2EA]/50" />
          <p className="font-heading text-xs font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
            Flashcards
          </p>
        </div>
        {cards.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-[#D7E2EA]/30 transition hover:text-[#D7E2EA]/70"
          >
            <RotateCcwIcon className="size-3.5" />
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <>
          <p className="mb-4 text-xs leading-relaxed text-[#D7E2EA]/35">
            Generate study flashcards from the last AI response automatically.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={isPending || !lastAiContent}
            style={
              !isPending && lastAiContent
                ? {
                    background:
                      "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
                    outline: "2px solid #ffffff",
                    outlineOffset: "-2px",
                  }
                : undefined
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-heading text-xs font-medium uppercase tracking-widest text-[#D7E2EA]/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <LayersIcon className="size-3.5" />
                Generate Flashcards
              </>
            )}
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Card counter */}
          <p className="text-center font-heading text-[10px] uppercase tracking-wider text-[#D7E2EA]/30">
            {current + 1} / {cards.length}
          </p>

          {/* Flip card */}
          <div
            className="relative cursor-pointer"
            style={{ perspective: "800px", height: "160px" }}
            onClick={() => setFlipped((f) => !f)}
          >
            <div
              className="relative h-full w-full transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front – Question */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"
                style={{ backfaceVisibility: "hidden" }}
              >
                <span className="font-heading text-[9px] uppercase tracking-widest text-[#D7E2EA]/30">
                  Question
                </span>
                <p className="text-sm font-medium leading-relaxed text-[#D7E2EA]/85">
                  {cards[current]?.question}
                </p>
                <span className="font-heading text-[9px] uppercase tracking-widest text-[#D7E2EA]/20">
                  tap to reveal
                </span>
              </div>

              {/* Back – Answer */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/10 p-4 text-center"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <span className="font-heading text-[9px] uppercase tracking-widest text-purple-400/60">
                  Answer
                </span>
                <p className="text-sm leading-relaxed text-[#D7E2EA]/85">
                  {cards[current]?.answer}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[#D7E2EA]/50 transition hover:bg-white/10 hover:text-[#D7E2EA]"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="font-heading text-[10px] uppercase tracking-wider text-[#D7E2EA]/30 transition hover:text-[#D7E2EA]/60"
            >
              {flipped ? "Show Question" : "Show Answer"}
            </button>
            <button
              type="button"
              onClick={next}
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[#D7E2EA]/50 transition hover:bg-white/10 hover:text-[#D7E2EA]"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
