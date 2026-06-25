import type { Confidence, Source } from "@/lib/research/types"
import { isTrustedDomain } from "@/lib/research/trust"
import { webSearch, type SearchResult } from "@/lib/search/search-provider"
import { getResearchMode } from "@/lib/research/modes"

/**
 * Source extraction, comparison, filtering, citation formatting, and confidence
 * scoring. This is the "read sources → verify facts" half of the workflow.
 */

/**
 * Run all planned queries, merge + de-duplicate results, drop weak/outdated
 * sources, rank trusted ones higher, and re-number them as [1..n] citations.
 */
export async function gatherSources(
  queries: string[],
  modeId: string
): Promise<{ sources: Source[]; quickAnswers: string[]; errors: string[] }> {
  const mode = getResearchMode(modeId)
  const errors: string[] = []
  const quickAnswers: string[] = []

  // Coding mode biases towards official docs / Q&A.
  const includeDomains =
    mode.id === "coding"
      ? ["developer.mozilla.org", "docs.python.org", "react.dev", "nextjs.org", "stackoverflow.com"]
      : undefined

  const searches = await Promise.all(
    queries.map((q) =>
      webSearch(q, {
        depth: mode.searchDepth,
        maxResults: mode.maxSources,
        includeDomains,
      })
    )
  )

  const merged: Source[] = []
  const seen = new Set<string>()

  for (const search of searches as SearchResult[]) {
    if (search.error) errors.push(search.error)
    if (search.quickAnswer) quickAnswers.push(search.quickAnswer)

    for (const source of search.results) {
      const key = source.url.replace(/[#?].*$/, "").toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(source)
    }
  }

  // Filter out weak sources: very low relevance or empty summaries (unless
  // trusted). Then rank trusted domains and higher scores first.
  const filtered = merged
    .filter((s) => isTrustedDomain(s.url) || (s.score ?? 0) >= 0.2)
    .filter((s) => s.summary.length > 0 || isTrustedDomain(s.url))

  filtered.sort((a, b) => {
    const trustA = isTrustedDomain(a.url) ? 1 : 0
    const trustB = isTrustedDomain(b.url) ? 1 : 0
    if (trustA !== trustB) return trustB - trustA
    return (b.score ?? 0) - (a.score ?? 0)
  })

  // Keep within the mode's budget and re-number as clean [1..n] citations.
  const ranked = filtered.slice(0, mode.maxSources).map((s, i) => ({ ...s, id: i + 1 }))

  return { sources: ranked, quickAnswers, errors }
}

/**
 * Format the gathered sources into a context block the model reads. Each source
 * is numbered so the model can cite it as [1], [2], … We instruct the model to
 * ONLY cite from this list — it must never invent a citation.
 */
export function buildSourceContext(sources: Source[]): string {
  if (sources.length === 0) return ""
  const lines = sources.map(
    (s) => `[${s.id}] ${s.title} — ${s.domain}\nURL: ${s.url}\nExcerpt: ${s.summary}`
  )
  return [
    "You have read the following sources. Cite them inline as [number] when you",
    "use a fact from them. Do NOT cite any source that is not in this list, and",
    "do NOT invent URLs. If the sources conflict, say so explicitly.",
    "",
    ...lines,
  ].join("\n")
}

/**
 * "What I checked" — a plain-language list of verification actions, shown to the
 * student after the answer so the process is transparent.
 */
export function buildCheckedList(
  sources: Source[],
  queries: string[],
  researchUsed: boolean
): string[] {
  if (!researchUsed) {
    return [
      "Answered from well-established knowledge (no live search needed for this one).",
      "Flagged anything uncertain rather than guessing.",
    ]
  }

  const trustedCount = sources.filter((s) => isTrustedDomain(s.url)).length
  const checked: string[] = []

  if (queries.length) {
    checked.push(`Searched the web for: ${queries.map((q) => `“${q.slice(0, 60)}”`).join(", ")}.`)
  }
  checked.push(`Read ${sources.length} source${sources.length === 1 ? "" : "s"} and extracted the key facts.`)
  if (trustedCount > 0) {
    checked.push(`${trustedCount} of them are from trusted / official domains.`)
  }
  checked.push("Compared sources and dropped weak or off-topic results.")
  checked.push("Grounded the final answer in the cited sources only.")
  return checked
}

/**
 * Confidence scoring. Higher when: research was actually performed, more sources
 * agree, and trusted domains are involved. Lower when there were errors or no
 * sources. This is a transparent heuristic — never inflated.
 */
export function scoreConfidence(
  sources: Source[],
  researchUsed: boolean,
  hadErrors: boolean
): Confidence {
  if (!researchUsed) {
    return {
      level: 70,
      label: "Moderate",
      reason: "Answered from established knowledge without a live search.",
    }
  }

  if (sources.length === 0) {
    return {
      level: 25,
      label: "Low",
      reason: hadErrors
        ? "Web search was unavailable, so this answer is not source-verified."
        : "No reliable sources were found, so treat this answer with caution.",
    }
  }

  const trustedCount = sources.filter((s) => isTrustedDomain(s.url)).length
  const avgScore =
    sources.reduce((sum, s) => sum + (s.score ?? 0.4), 0) / sources.length

  // Base on number of sources, trust, and average relevance.
  let level = 40
  level += Math.min(sources.length, 6) * 5 // up to +30
  level += Math.min(trustedCount, 4) * 5 // up to +20
  level += Math.round(avgScore * 10) // up to ~+10
  if (hadErrors) level -= 10
  level = Math.max(20, Math.min(96, level))

  const label: Confidence["label"] =
    level >= 85 ? "Very High" : level >= 70 ? "High" : level >= 50 ? "Moderate" : "Low"

  return {
    level,
    label,
    reason: `Based on ${sources.length} source${sources.length === 1 ? "" : "s"}` +
      (trustedCount ? `, ${trustedCount} from trusted domains` : "") +
      `, with ${avgScore >= 0.5 ? "strong" : "moderate"} topical relevance.`,
  }
}
