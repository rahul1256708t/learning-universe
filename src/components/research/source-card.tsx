"use client"

import { ExternalLinkIcon } from "lucide-react"

import type { Source } from "@/lib/research/types"
import { isTrustedDomain } from "@/lib/research/trust"

/**
 * A single source card shown under a researched answer: citation number, title
 * (links out), domain with a trust badge, relevance, and short summary.
 */
export function SourceCard({ source }: { source: Source }) {
  const trusted = isTrustedDomain(source.url)

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition-all duration-150 hover:border-cyan-400/30 hover:bg-white/[0.06]"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 font-heading text-xs font-bold text-cyan-200">
          {source.id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-heading text-xs font-medium leading-5 text-[#D7E2EA]/90 group-hover:text-white">
            {source.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#D7E2EA]/40">
              <ExternalLinkIcon className="size-3" />
              {source.domain}
            </span>
            {trusted ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-200">
                Trusted
              </span>
            ) : null}
            {typeof source.score === "number" ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#D7E2EA]/40">
                {Math.round(source.score * 100)}% match
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {source.summary ? (
        <p className="line-clamp-3 text-xs leading-5 text-[#D7E2EA]/50">{source.summary}</p>
      ) : null}
    </a>
  )
}
