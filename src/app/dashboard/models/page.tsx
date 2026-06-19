import { BrainCircuitIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LEARNING_MODES, OPENROUTER_MODELS } from "@/lib/learning"

export default function ModelsPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="overflow-hidden">
        <h1
          className="hero-heading font-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 8vw, 96px)" }}
        >
          Models
        </h1>
        <p className="mt-2 font-heading text-sm font-medium uppercase tracking-widest text-[#D7E2EA]/50">
          Available OpenRouter models and learning modes
        </p>
      </div>

      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base font-black uppercase tracking-wider text-[#D7E2EA]">
            AI Models
          </CardTitle>
          <CardDescription className="text-[#D7E2EA]/40">
            Available OpenRouter models for Learning Universe.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {OPENROUTER_MODELS.map((model, i) => (
            <div
              key={model.id}
              className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-lg border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 text-[#D7E2EA]">
                  <BrainCircuitIcon className="size-4" />
                </div>
                <span
                  className="hero-heading font-heading text-4xl font-black leading-none"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="font-heading text-sm font-medium uppercase tracking-wide text-[#D7E2EA]">
                {model.name}
              </p>
              <p className="font-mono text-[10px] text-[#D7E2EA]/40">{model.id}</p>
              <p className="text-xs leading-5 text-[#D7E2EA]/50">{model.strength}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base font-black uppercase tracking-wider text-[#D7E2EA]">
            Learning Modes
          </CardTitle>
          <CardDescription className="text-[#D7E2EA]/40">
            Each mode adds a dedicated system prompt for a focused workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {LEARNING_MODES.map((mode) => (
            <Badge
              key={mode.id}
              variant="secondary"
              className="rounded-full font-heading text-xs uppercase tracking-wider"
            >
              {mode.name}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
