"use client"

import { Loader2Icon } from "lucide-react"

import { RESEARCH_STEPS, type ResearchStepId, type StepStatus } from "@/lib/research/types"

/**
 * The visible research pipeline. Each stage lights up as the agent works:
 * understanding → planning → searching → reading → verifying → writing.
 * Makes the "research, don't just chat" behaviour tangible to the student.
 */

const STEP_ICON: Record<ResearchStepId, string> = {
  understanding: "🧠",
  planning: "🗺️",
  searching: "🛰️",
  reading: "📖",
  verifying: "🛡️",
  writing: "✍️",
}

export type StepState = { status: StepStatus; detail?: string }

export function ResearchSteps({
  states,
}: {
  states: Record<ResearchStepId, StepState>
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="mb-3 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
        Research pipeline
      </p>
      <ol className="flex flex-col gap-1">
        {RESEARCH_STEPS.map((step) => {
          const state = states[step.id] ?? { status: "pending" as StepStatus }
          const active = state.status === "active"
          const done = state.status === "done"
          const skipped = state.status === "skipped"

          return (
            <li
              key={step.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ${
                active
                  ? "border-cyan-400/40 bg-cyan-400/10"
                  : done
                    ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                    : "border-transparent"
              }`}
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center text-sm">
                {active ? (
                  <Loader2Icon className="size-4 animate-spin text-cyan-300" />
                ) : done ? (
                  <span className="font-bold text-emerald-300">✓</span>
                ) : skipped ? (
                  <span className="text-[#D7E2EA]/25">—</span>
                ) : (
                  <span className="opacity-40 grayscale">{STEP_ICON[step.id]}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-heading text-xs font-medium uppercase tracking-wider ${
                    active
                      ? "text-cyan-100"
                      : done
                        ? "text-[#D7E2EA]/80"
                        : skipped
                          ? "text-[#D7E2EA]/30 line-through"
                          : "text-[#D7E2EA]/40"
                  }`}
                >
                  {STEP_ICON[step.id]} {step.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#D7E2EA]/40">
                  {state.detail ?? step.hint}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** The pristine "all pending" state used to seed a new run. */
export function initialStepStates(): Record<ResearchStepId, StepState> {
  return {
    understanding: { status: "pending" },
    planning: { status: "pending" },
    searching: { status: "pending" },
    reading: { status: "pending" },
    verifying: { status: "pending" },
    writing: { status: "pending" },
  }
}
