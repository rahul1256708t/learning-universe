import type { Source } from "@/lib/research/types"
import { domainOf, isTrustedDomain } from "@/lib/research/trust"

export { domainOf, isTrustedDomain }

/**
 * Web research tool — Tavily search.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  API KEY: set TAVILY_API_KEY in your environment (.env.local /        │
 * │  Vercel project settings). This key is read ONLY on the server and    │
 * │  is never sent to the browser. Get one at https://tavily.com.         │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Returns normalized Source objects. NEVER fabricates results — if the key is
 * missing or the request fails, it returns an empty list and the caller marks
 * the answer's confidence down accordingly.
 */

export type TavilyRawResult = {
  title?: string
  url?: string
  content?: string
  score?: number
  raw_content?: string | null
}

export type TavilySearchResult = {
  results: Source[]
  /** Tavily's own quick answer, if it returned one — used as a hint, not a citation. */
  quickAnswer?: string
  error?: string
}

export function hasTavily(): boolean {
  return Boolean(process.env.TAVILY_API_KEY)
}

/**
 * Run a single Tavily search. `depth` "advanced" reads more thoroughly.
 * Education/coding domains can be boosted by passing includeDomains.
 *
 * The API key is resolved by the caller (the search-provider abstraction) and
 * passed in via options.apiKey; it falls back to TAVILY_API_KEY for callers
 * that use Tavily directly. The key is read server-side only.
 */
export async function tavilySearch(
  query: string,
  options: {
    depth?: "basic" | "advanced"
    maxResults?: number
    includeDomains?: string[]
    apiKey?: string
  } = {}
): Promise<TavilySearchResult> {
  const apiKey = options.apiKey ?? process.env.TAVILY_API_KEY
  if (!apiKey) {
    return { results: [], error: "Search API key is not configured on the server." }
  }

  const { depth = "basic", maxResults = 5, includeDomains } = options

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: depth,
        max_results: Math.min(Math.max(maxResults, 1), 10),
        include_answer: true,
        include_raw_content: false,
        ...(includeDomains?.length ? { include_domains: includeDomains } : {}),
      }),
      // Don't let a slow search hang the whole request.
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return { results: [], error: `Tavily search failed (${response.status}). ${text.slice(0, 200)}` }
    }

    const data = (await response.json()) as {
      results?: TavilyRawResult[]
      answer?: string
    }

    const results: Source[] = (data.results ?? [])
      .filter((r) => r.url && r.title)
      .map((r, index) => ({
        id: index + 1,
        title: (r.title ?? "Untitled source").slice(0, 200),
        url: r.url!,
        summary: cleanSnippet(r.content ?? ""),
        score: typeof r.score === "number" ? r.score : undefined,
        domain: domainOf(r.url!),
      }))

    return { results, quickAnswer: data.answer?.trim() || undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown search error."
    return { results: [], error: `Tavily search error: ${message}` }
  }
}

function cleanSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 320)
}
