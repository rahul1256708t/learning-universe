export type OpenRouterModel = {
  id: string
  name: string
  orbit: string
  strength: string
}

export type LearningModeId =
  | "tutor"
  | "homework"
  | "notes"
  | "quiz"
  | "exam-prep"
  | "eli5"
  | "formula"
  | "ncert"

export type LearningMode = {
  id: LearningModeId
  name: string
  shortName: string
  description: string
  systemPrompt: string
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    orbit: "Fast tutor",
    strength: "Quick explanations, outlines, and everyday study help.",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-70b",
    name: "Hermes 3 (70B)",
    orbit: "Deep reasoning agent",
    strength: "Excellent at structured thinking, step-by-step problem solving, and following complex study instructions.",
  },
  {
    id: "nousresearch/hermes-2-pro-llama-3-8b",
    name: "Hermes 2 Pro (8B)",
    orbit: "Fast agent",
    strength: "Great for quick answers, function-calling style responses, and lightweight study tasks.",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    orbit: "Advanced reasoning",
    strength: "Detailed tutoring for mixed subjects and complex questions.",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    orbit: "High velocity",
    strength: "Fast summaries, quizzes, and broad classroom coverage.",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    orbit: "Deep learning",
    strength: "Strong for writing, reasoning, and step-by-step explanations.",
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    orbit: "Open model",
    strength: "Good for coding help, analysis, and alternate explanations.",
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    orbit: "Structured answers",
    strength: "Useful for concise reasoning, notes, and exam-style responses.",
  },
]

export const LEARNING_MODES: LearningMode[] = [
  {
    id: "tutor",
    name: "AI Tutor Chat",
    shortName: "Tutor",
    description: "Socratic explanations with guided follow-up.",
    systemPrompt:
      "You are an AI tutor. Teach the student patiently, explain the concept in steps, check for understanding, and include one short follow-up question.",
  },
  {
    id: "homework",
    name: "Homework Helper",
    shortName: "Homework",
    description: "Hints and worked reasoning without doing dishonest work.",
    systemPrompt:
      "You are a homework helper. Guide the student toward the answer with hints, formulas, and reasoning. Do not encourage cheating; explain the method clearly.",
  },
  {
    id: "notes",
    name: "Notes Generator",
    shortName: "Notes",
    description: "Clean study notes with headings and key takeaways.",
    systemPrompt:
      "You generate high-quality study notes. Use clear headings, bullet points, definitions, examples, and a short recap.",
  },
  {
    id: "quiz",
    name: "Quiz Generator",
    shortName: "Quiz",
    description: "Practice questions with answers.",
    systemPrompt:
      "You create quizzes. Generate a balanced set of questions, include answer keys, and add one-line explanations for each answer.",
  },
  {
    id: "exam-prep",
    name: "Exam Prep Mode",
    shortName: "Exam Prep",
    description: "Revision plans, likely questions, and marking focus.",
    systemPrompt:
      "You are an exam prep coach. Prioritize high-yield concepts, likely question patterns, time management, and concise revision strategies.",
  },
  {
    id: "eli5",
    name: "Explain Like I'm 5 Mode",
    shortName: "ELI5",
    description: "Simple analogies and plain language.",
    systemPrompt:
      "Explain like the student is five. Use simple words, concrete analogies, and avoid jargon unless you define it immediately.",
  },
  {
    id: "formula",
    name: "Formula Helper",
    shortName: "Formula",
    description: "Formula meaning, usage, and worked examples.",
    systemPrompt:
      "You are a formula helper. State the formula, define each variable, explain when to use it, show one worked example, and mention common mistakes.",
  },
  {
    id: "ncert",
    name: "NCERT-style Answer Mode",
    shortName: "NCERT",
    description: "Structured school-board style answers.",
    systemPrompt:
      "Answer in an NCERT-style format. Use accurate definitions, step-by-step explanations, labeled points, and concise exam-ready language.",
  },
]

export const DEFAULT_MODEL = OPENROUTER_MODELS[0].id
export const DEFAULT_MODE: LearningModeId = "tutor"

export function isAllowedModel(model: string) {
  return OPENROUTER_MODELS.some((item) => item.id === model)
}

export function isAllowedMode(mode: string): mode is LearningModeId {
  return LEARNING_MODES.some((item) => item.id === mode)
}

export function getModePrompt(mode: LearningModeId) {
  return LEARNING_MODES.find((item) => item.id === mode)?.systemPrompt ?? LEARNING_MODES[0].systemPrompt
}

export function getModelName(model: string) {
  return OPENROUTER_MODELS.find((item) => item.id === model)?.name ?? model
}

export function getModeName(mode: string) {
  return LEARNING_MODES.find((item) => item.id === mode)?.shortName ?? mode
}
