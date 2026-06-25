import type { Source } from "@/lib/research/types"
import { domainOf, isTrustedDomain } from "@/lib/research/trust"
import { tavilySearch, type TavilySearchResult } from "@/lib/research/tavily"

/**
 * Web search provider abstraction for the Learning Universe Research Agent.
 *
 * The agent is provider-agnostic: it talks to ONE generic `webSearch()` function
 * and the underlying provider is chosen by an environment variable. This means
 * you can add or swap a search API later without touching the agent pipeline.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONFIG (server-side only — never sent to the browser):              │
 * │    SEARCH_PROVIDER   tavily | brave | serpapi | exa   (default tavily)│
 * │    SEARCH_API_KEY    the key for the selected provider                │
 * │                                                                       │
 * │  Backward-compatible per-provider keys are also honoured if           │
 * │  SEARCH_API_KEY is not set:                                           │
 * │    TAVILY_API_KEY · BRAVE_API_KEY · SERPAPI_API_KEY · EXA_API_KEY     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Every provider returns the SAME normalized shape (Source[] + optional quick
 * answer). On a missing key or a failed request it returns an empty list with
 * an `error` string — it NEVER fabricates results, so the agent can lower its
 * confidence and tell the student that research was unavailable.
 */

export type SearchProvider = "tavily" | "brave" | "serpapi" | "exa"

export type SearchResult = TavilySearchResult

export type SearchOptions = {
  depth?: "basic" | "advanced"
  maxResults?: number
  includeDomains?: string[]
}

const VALID_PROVIDERS: SearchProvider[] = ["tavily", "brave", "serpapi", "exa"]

/** The provider selected via SEARCH_PROVIDER (defaults to Tavily). */
export function getSearchProvider(): SearchProvider {
  const raw = (process.env.SEARCH_PROVIDER ?? "tavily").trim().toLowerCase()
  return (VALID_PROVIDERS as string[]).includes(raw) ? (raw as SearchProvider) : "tavily"
}

/** Resolve the API key for a provider: generic SEARCH_API_KEY first, then the legacy per-provider var. */
function providerKey(provider: SearchProvider): string | undefined {
  const legacy: Record<SearchProvider, string | undefined> = {
    tavily: process.env.TAVILY_API_KEY,
    brave: process.env.BRAVE_API_KEY,
    serpapi: process.env.SERPAPI_API_KEY,
    exa: process.env.EXA_API_KEY,
  }
  return process.env.SEARCH_API_KEY?.trim() || legacy[provider]
}

/** Whether web research is configured (the active provider has a usable key). */
export function hasSearch(): boolean {
  return Boolean(providerKey(getSearchProvider()))
}

/** Human-readable name of the active provider, for UI/error messages. */
export function searchProviderName(): string {
  return { tavily: "Tavily", brave: "Brave Search", serpapi: "SerpAPI", exa: "Exa" }[getSearchProvider()]
}

/**
 * Run a single web search through the configured provider. This is the only
 * search entry-point the rest of the agent should use.
 */
export async function webSearch(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const provider = getSearchProvider()
  const apiKey = providerKey(provider)

  if (!apiKey) {
    return {
      results: [],
      error: `Research search API is not configured. Please add SEARCH_API_KEY (provider: ${provider}).`,
    }
  }

  switch (provider) {
    case "brave":
      return braveSearch(query, apiKey, options)
    case "serpapi":
      return serpapiSearch(query, apiKey, options)
    case "exa":
      return exaSearch(query, apiKey, options)
    case "tavily":
    default:
      // Reuse the existing, battle-tested Tavily client.
      return tavilySearch(query, { ...options, apiKey })
  }
}

/* ── Shared helpers ─────────────────────────────────────────────── */

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 320)
}

/** Normalize a raw result into a Source, dropping anything without a URL/title. */
function toSource(index: number, raw: { title?: string; url?: string; summary?: string; score?: number }): Source | null {
  if (!raw.url || !raw.title) return null
  return {
    id: index + 1,
    title: raw.title.slice(0, 200),
    url: raw.url,
    summary: clean(raw.summary ?? ""),
    score: typeof raw.score === "number" ? raw.score : undefined,
    domain: domainOf(raw.url),
  }
}

function wrapError(provider: string, error: unknown): SearchResult {
  const message = error instanceof Error ? error.message : "Unknown search error."
  return { results: [], error: `${provider} search error: ${message}` }
}

/* ── Brave Search (https://api.search.brave.com) ────────────────── */
async function braveSearch(query: string, apiKey: string, options: SearchOptions): Promise<SearchResult> {
  try {
    const count = Math.min(Math.max(options.maxResults ?? 5, 1), 10)
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
    const response = await fetch(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return { results: [], error: `Brave search failed (${response.status}). ${text.slice(0, 160)}` }
    }
    const data = (await response.json()) as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> }
    }
    const results = (data.web?.results ?? [])
      .map((r, i) => toSource(i, { title: r.title, url: r.url, summary: r.description }))
      .filter((s): s is Source => s !== null)
    return { results }
  } catch (error) {
    return wrapError("Brave", error)
  }
}

/* ── SerpAPI (Google results, https://serpapi.com) ──────────────── */
async function serpapiSearch(query: string, apiKey: string, options: SearchOptions): Promise<SearchResult> {
  try {
    const num = Math.min(Math.max(options.maxResults ?? 5, 1), 10)
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${num}&api_key=${apiKey}`
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return { results: [], error: `SerpAPI search failed (${response.status}). ${text.slice(0, 160)}` }
    }
    const data = (await response.json()) as {
      organic_results?: Array<{ title?: string; link?: string; snippet?: string }>
      answer_box?: { answer?: string; snippet?: string }
    }
    const results = (data.organic_results ?? [])
      .map((r, i) => toSource(i, { title: r.title, url: r.link, summary: r.snippet }))
      .filter((s): s is Source => s !== null)
    const quickAnswer = data.answer_box?.answer || data.answer_box?.snippet || undefined
    return { results, quickAnswer }
  } catch (error) {
    return wrapError("SerpAPI", error)
  }
}

/* ── Exa (neural search, https://exa.ai) ────────────────────────── */
async function exaSearch(query: string, apiKey: string, options: SearchOptions): Promise<SearchResult> {
  try {
    const numResults = Math.min(Math.max(options.maxResults ?? 5, 1), 10)
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        query,
        numResults,
        type: "auto",
        contents: { text: { maxCharacters: 500 } },
        ...(options.includeDomains?.length ? { includeDomains: options.includeDomains } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return { results: [], error: `Exa search failed (${response.status}). ${text.slice(0, 160)}` }
    }
    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; text?: string; score?: number }>
    }
    const results = (data.results ?? [])
      .map((r, i) => toSource(i, { title: r.title, url: r.url, summary: r.text, score: r.score }))
      .filter((s): s is Source => s !== null)
    return { results }
  } catch (error) {
    return wrapError("Exa", error)
  }
}

// Re-export for callers that only need trust scoring alongside search.
export { isTrustedDomain }
