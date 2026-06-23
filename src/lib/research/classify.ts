import type { Classification, QuestionType } from "@/lib/research/types"
import { getResearchMode } from "@/lib/research/modes"

/**
 * Decide what kind of question this is and whether the agent MUST research the
 * web before answering.
 *
 * This is a fast, deterministic heuristic — no extra LLM round-trip — so the
 * "Understanding" and "Planning" steps appear instantly in the UI. The core
 * rule from the product spec: never answer factual / latest / source-based
 * questions from memory alone.
 */

const CURRENT_INFO_SIGNALS = [
  "latest", "today", "now", "current", "recent", "2024", "2025", "2026",
  "news", "price", "stock", "release", "released", "update", "this year",
  "who is the", "who won", "weather", "score", "live", "trending", "version",
]

const CODING_SIGNALS = [
  "code", "function", "bug", "error", "api", "library", "framework", "npm",
  "python", "javascript", "typescript", "react", "next.js", "nextjs", "sql",
  "compile", "syntax", "install", "deploy", "git", "docker", "regex",
  "stack trace", "exception", "import", "package",
]

const EXAM_SIGNALS = [
  "exam", "marks", "board", "neet", "jee", "upsc", "test", "revision",
  "important questions", "syllabus", "previous year", "model answer",
]

const SCHOOL_SIGNALS = [
  "ncert", "class ", "chapter", "homework", "textbook", "define", "theorem",
  "derive", "explain the concept", "what is", "difference between",
]

// Questions whose answer doesn't change and is settled knowledge — research is
// optional here (the model may already know it reliably).
const STATIC_QUESTION_SIGNALS = [
  "what is", "define", "explain", "difference between", "how does",
  "why does", "derive", "prove", "summarise", "summarize", "write a",
  "solve", "calculate", "translate",
]

function includesAny(haystack: string, needles: string[]): string[] {
  return needles.filter((n) => haystack.includes(n))
}

export function classifyQuestion(rawQuestion: string, modeId: string): Classification {
  const q = rawQuestion.toLowerCase()
  const mode = getResearchMode(modeId)

  const currentHits = includesAny(q, CURRENT_INFO_SIGNALS)
  const codingHits = includesAny(q, CODING_SIGNALS)
  const examHits = includesAny(q, EXAM_SIGNALS)
  const schoolHits = includesAny(q, SCHOOL_SIGNALS)
  const staticHits = includesAny(q, STATIC_QUESTION_SIGNALS)

  // Pick the dominant question type.
  let type: QuestionType = "school-doubt"
  if (currentHits.length > 0) type = "current-info"
  else if (codingHits.length > 0) type = "coding"
  else if (examHits.length > 0) type = "exam-prep"
  else if (mode.id === "deep") type = "deep-research"
  else if (schoolHits.length > 0) type = "school-doubt"

  // Decide whether research is required.
  // - Current info ALWAYS needs research.
  // - Modes that force research (Deep, Coding) always research.
  // - Otherwise research is required unless it's clearly a static, settled
  //   knowledge question with no "latest/current" signal.
  let researchRequired: boolean
  let reason: string

  if (type === "current-info") {
    researchRequired = true
    reason = "The question asks for latest or time-sensitive information, so the agent must verify it against live sources."
  } else if (mode.forceResearch) {
    researchRequired = true
    reason = `${mode.name} always reads sources before answering.`
  } else if (type === "coding") {
    researchRequired = true
    reason = "Coding answers are checked against official documentation before code is written."
  } else if (staticHits.length > 0 && currentHits.length === 0 && rawQuestion.length < 240) {
    researchRequired = false
    reason = "This is settled, conceptual knowledge, so the agent can answer directly — but it will still flag any uncertainty."
  } else {
    researchRequired = true
    reason = "The question is factual or open-ended, so the agent searches and verifies before answering."
  }

  const understanding = buildUnderstanding(rawQuestion, type)
  const plannedQueries = researchRequired ? buildQueries(rawQuestion, type) : []

  return { type, researchRequired, understanding, plannedQueries, reason }
}

function buildUnderstanding(question: string, type: QuestionType): string {
  const trimmed = question.replace(/\s+/g, " ").trim()
  const label: Record<QuestionType, string> = {
    "school-doubt": "a school concept doubt",
    "current-info": "a request for current / latest information",
    coding: "a coding / project question",
    "exam-prep": "an exam-preparation question",
    "deep-research": "a deep research question",
  }
  return `You're asking ${label[type]}: “${trimmed.slice(0, 200)}${trimmed.length > 200 ? "…" : ""}”.`
}

/**
 * Turn a question into 1–3 search queries. Coding questions get an extra
 * "official docs" query; current-info questions get a date-anchored query.
 */
function buildQueries(question: string, type: QuestionType): string[] {
  const base = question.replace(/\s+/g, " ").trim().slice(0, 180)
  const queries = [base]

  if (type === "coding") {
    queries.push(`${base} official documentation`)
  } else if (type === "current-info") {
    queries.push(`${base} latest 2026`)
  } else if (type === "deep-research") {
    queries.push(`${base} overview`)
    queries.push(`${base} evidence research`)
  }

  return Array.from(new Set(queries)).slice(0, 3)
}
