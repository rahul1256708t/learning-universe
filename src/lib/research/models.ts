/**
 * Model configuration for the Research Agent.
 *
 * The agent has a primary model and an ordered fallback chain. If the primary
 * model errors (rate limit, outage, bad gateway), the route automatically
 * retries down the chain so the student still gets an answer.
 *
 * All of these run through OpenRouter EXCEPT models whose id starts with
 * "anthropic-direct/", which are served by the optional direct Anthropic API
 * (Claude Opus 4.8). See src/lib/research/llm.ts for routing.
 */
export type AgentModel = {
  id: string
  name: string
  orbit: string
  strength: string
  /** Can this model see images? */
  vision: boolean
}

export const AGENT_MODELS: AgentModel[] = [
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    orbit: "Fast research",
    strength: "Quick, reliable synthesis of sources for everyday questions.",
    vision: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    orbit: "Advanced research",
    strength: "Strong reasoning over many sources and mixed subjects.",
    vision: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    orbit: "Deep synthesis",
    strength: "Excellent at comparing sources and careful, structured writing.",
    vision: true,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    orbit: "High velocity",
    strength: "Fast summarisation across broad classroom topics.",
    vision: true,
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    orbit: "Open model",
    strength: "Solid for coding research and alternate explanations.",
    vision: false,
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    orbit: "Structured answers",
    strength: "Concise reasoning, notes, and exam-style responses.",
    vision: false,
  },
  // Optional: served by the direct Anthropic API when ANTHROPIC_API_KEY is set.
  // Falls back to OpenRouter's Claude if the direct key is missing.
  {
    id: "anthropic-direct/claude-opus-4-8",
    name: "Claude Opus 4.8 (Direct)",
    orbit: "Frontier reasoning",
    strength: "Deepest multi-source research and verification. Needs ANTHROPIC_API_KEY.",
    vision: true,
  },
]

export const DEFAULT_AGENT_MODEL = AGENT_MODELS[0].id

/** Fallback order used when the primary model fails, most-reliable first. */
export const FALLBACK_CHAIN: string[] = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.1-70b-instruct",
]

export function isAgentModel(id: string): boolean {
  return AGENT_MODELS.some((m) => m.id === id)
}

export function getAgentModel(id: string): AgentModel | undefined {
  return AGENT_MODELS.find((m) => m.id === id)
}

export function getAgentModelName(id: string): string {
  return AGENT_MODELS.find((m) => m.id === id)?.name ?? id
}

export function isVisionModel(id: string): boolean {
  return AGENT_MODELS.find((m) => m.id === id)?.vision ?? false
}

/**
 * Build the model attempt order: the chosen model first, then each fallback
 * that isn't already the chosen model. Direct-Anthropic models are demoted in
 * the fallback list because they need an extra key.
 */
export function buildAttemptChain(primary: string): string[] {
  const chain = [primary, ...FALLBACK_CHAIN.filter((m) => m !== primary)]
  return Array.from(new Set(chain))
}
