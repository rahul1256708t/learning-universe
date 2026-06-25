import type { ResearchModeId } from "@/lib/research/types"

/**
 * Research modes replace the old "study modes". Each mode tunes:
 *  - how much research the agent does (search depth / number of sources),
 *  - how the final answer is written,
 *  - and whether research is forced on even for questions that look static.
 */
export type ResearchMode = {
  id: ResearchModeId
  name: string
  shortName: string
  icon: string
  description: string
  /** Tavily search depth. */
  searchDepth: "basic" | "advanced"
  /** Max number of sources to read. */
  maxSources: number
  /** Force a web search even if the classifier thinks it's unnecessary. */
  forceResearch: boolean
  /** Appended to the system prompt to shape the writing style. */
  answerStyle: string
}

export const RESEARCH_MODES: ResearchMode[] = [
  {
    id: "fast",
    name: "Fast Research",
    shortName: "Fast",
    icon: "⚡",
    description: "Quick web check, then a concise grounded answer.",
    searchDepth: "basic",
    maxSources: 4,
    forceResearch: false,
    answerStyle:
      "Be concise and direct. Lead with the answer, then 2–4 supporting points. Keep it tight.",
  },
  {
    id: "deep",
    name: "Deep Research",
    shortName: "Deep",
    icon: "🔬",
    description: "Read many sources, compare them, and synthesize thoroughly.",
    searchDepth: "advanced",
    maxSources: 8,
    forceResearch: true,
    answerStyle:
      "Write a thorough, well-structured answer with headings. Compare what different sources say, note agreements and disagreements explicitly, and end with a short synthesis.",
  },
  {
    id: "ncert",
    name: "NCERT Mode",
    shortName: "NCERT",
    icon: "📚",
    description: "School-board style answers grounded in NCERT/education sources.",
    searchDepth: "basic",
    maxSources: 5,
    forceResearch: false,
    answerStyle:
      "Answer in NCERT / Indian school-board style: precise definitions, clearly numbered points, neat step-by-step working, and exam-ready phrasing. Prefer NCERT and recognised education sources.",
  },
  {
    id: "exam",
    name: "Exam Mode",
    shortName: "Exam",
    icon: "🏆",
    description: "Short, marks-ready answers prioritising high-yield points.",
    searchDepth: "basic",
    maxSources: 4,
    forceResearch: false,
    answerStyle:
      "Give a short, marks-ready answer. Use crisp bullet points a student can reproduce in an exam. Bold the key terms an examiner looks for. No filler.",
  },
  {
    id: "coding",
    name: "Coding Research",
    shortName: "Coding",
    icon: "💻",
    description: "Search official docs first, then give verified code.",
    searchDepth: "advanced",
    maxSources: 6,
    forceResearch: true,
    answerStyle:
      "Search the official documentation before writing any code. Give correct, runnable code in fenced blocks, explain the key lines, and call out version-specific or deprecated APIs. Cite the docs you relied on.",
  },
  {
    id: "tutor",
    name: "Step-by-Step Tutor",
    shortName: "Tutor",
    icon: "🎓",
    description: "Patient, simple, step-by-step teaching for students.",
    searchDepth: "basic",
    maxSources: 4,
    forceResearch: false,
    answerStyle:
      "Teach like a patient tutor. Explain in simple language and clear steps, define jargon the moment you use it, use a concrete example, and finish with one short check-for-understanding question.",
  },
  {
    id: "homework",
    name: "Homework Solver",
    shortName: "Homework",
    icon: "📝",
    description: "Step-by-step solutions with formula, working, and final answer.",
    searchDepth: "basic",
    maxSources: 4,
    forceResearch: false,
    answerStyle:
      "You solve homework step by step. State the formula or method used, show the substitution and each calculation step, and clearly box the final answer. Do not skip steps.",
  },
  {
    id: "notes",
    name: "Notes Generator",
    shortName: "Notes",
    icon: "🗒️",
    description: "Short, easy, revision-friendly notes.",
    searchDepth: "basic",
    maxSources: 4,
    forceResearch: false,
    answerStyle:
      "You create short and easy revision notes. Use clear headings, bold keywords, bullet points, formulas, a tiny example where useful, and a quick one-line summary at the end. Keep it scannable for last-minute revision.",
  },
  {
    id: "quiz",
    name: "Quiz Generator",
    shortName: "Quiz",
    icon: "❓",
    description: "Practice questions (MCQs, short answers) with an answer key.",
    searchDepth: "basic",
    maxSources: 4,
    forceResearch: false,
    answerStyle:
      "You generate practice questions from the topic — a mix of MCQs, fill-in-the-blanks, and short answers. Number them clearly and place the answer key with one-line explanations at the very end (unless the student asks for quiz mode without answers).",
  },
  {
    id: "formula",
    name: "Formula Helper",
    shortName: "Formula",
    icon: "🧮",
    description: "Formulas, variables, units, and when to use each.",
    searchDepth: "basic",
    maxSources: 4,
    forceResearch: false,
    answerStyle:
      "You are a formula helper. State the formula clearly, define every variable with its unit, explain exactly when to use it, show one short worked example, and warn about common mistakes.",
  },
]

export const DEFAULT_RESEARCH_MODE: ResearchModeId = "fast"

export function isResearchMode(id: string): id is ResearchModeId {
  return RESEARCH_MODES.some((m) => m.id === id)
}

export function getResearchMode(id: string): ResearchMode {
  return RESEARCH_MODES.find((m) => m.id === id) ?? RESEARCH_MODES[0]
}
