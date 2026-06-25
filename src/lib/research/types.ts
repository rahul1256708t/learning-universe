/**
 * Shared types for the Learning Universe Research Agent.
 *
 * The agent is NOT a chatbot. Every researched answer carries the evidence it
 * was built from: the sources it read, what it verified, and how confident it
 * is. These types describe that contract between the /api/agent route and the
 * ResearchAgent UI.
 */

/* ── Research modes the user can pick ───────────────────────────── */
export type ResearchModeId =
  | "fast"
  | "deep"
  | "ncert"
  | "exam"
  | "coding"
  | "tutor"
  | "notes"
  | "quiz"
  | "formula"
  | "homework"

/* ── How the agent classifies an incoming question ──────────────── */
export type QuestionType =
  | "school-doubt"
  | "current-info"
  | "coding"
  | "exam-prep"
  | "deep-research"

/* ── The visible pipeline stages shown in the UI ────────────────── */
export type ResearchStepId =
  | "understanding"
  | "planning"
  | "searching"
  | "reading"
  | "verifying"
  | "writing"

export type StepStatus = "pending" | "active" | "done" | "skipped"

/* A source card shown under a researched answer. */
export type Source = {
  id: number
  title: string
  url: string
  /** Short, human-readable summary of what this source contributed. */
  summary: string
  /** Tavily relevance score 0..1, when available. */
  score?: number
  /** Hostname, e.g. "ncert.nic.in" — used for the trust badge. */
  domain: string
}

/* The confidence band attached to every researched answer. */
export type Confidence = {
  /** 0..100 */
  level: number
  label: "Low" | "Moderate" | "High" | "Very High"
  reason: string
}

/* The classification result that decides the whole workflow. */
export type Classification = {
  type: QuestionType
  /** Whether the agent must search the web before answering. */
  researchRequired: boolean
  /** Plain-language restatement of the question (step: Understanding). */
  understanding: string
  /** The search queries the agent intends to run (step: Planning). */
  plannedQueries: string[]
  reason: string
}

/* ── Streaming events emitted by /api/agent (newline-delimited JSON) ── */
export type AgentEvent =
  | { type: "step"; step: ResearchStepId; status: StepStatus; detail?: string }
  | { type: "classification"; classification: Classification }
  | { type: "sources"; sources: Source[] }
  | { type: "token"; text: string }
  | {
      type: "meta"
      confidence: Confidence
      checked: string[]
      sources: Source[]
      classification: Classification
      model: string
      mode: ResearchModeId
    }
  | { type: "done"; chatId: string }
  | { type: "error"; error: string }

export const RESEARCH_STEPS: { id: ResearchStepId; label: string; hint: string }[] = [
  { id: "understanding", label: "Understanding question", hint: "Parsing what you actually need" },
  { id: "planning", label: "Planning research", hint: "Deciding what to look up" },
  { id: "searching", label: "Searching web", hint: "Querying trusted sources" },
  { id: "reading", label: "Reading sources", hint: "Extracting useful facts" },
  { id: "verifying", label: "Verifying facts", hint: "Comparing & filtering sources" },
  { id: "writing", label: "Writing final answer", hint: "Grounding the answer in evidence" },
]
