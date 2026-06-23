"use client"

import type { Confidence } from "@/lib/research/types"

/**
 * Confidence meter shown under every researched answer. The bar colour and
 * width reflect how well-evidenced the answer is. Purely presentational.
 */

const BAND_COLOR: Record<Confidence["label"], string> = {
  Low: "from-rose-500 to-orange-500",
  Moderate: "from-amber-400 to-yellow-300",
  High: "from-cyan-400 to-emerald-400",
  "Very High": "from-fuchsia-400 to-cyan-300",
}

export function ConfidenceMeter({ confidence }: { confidence: Confidence }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E2EA]/45">
          Confidence
        </span>
        <span className="font-heading text-xs font-bold uppercase tracking-wider text-[#D7E2EA]">
          {confidence.label} · {confidence.level}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${BAND_COLOR[confidence.label]} transition-[width] duration-700 ease-out`}
          style={{ width: `${confidence.level}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-[#D7E2EA]/45">{confidence.reason}</p>
    </div>
  )
}
