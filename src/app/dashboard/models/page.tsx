import { BrainCircuitIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LEARNING_MODES, OPENROUTER_MODELS } from "@/lib/learning"
import { PageHeader } from "@/components/page-header"

export default function ModelsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Models" subtitle="Available AI models and learning modes." />

      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base font-semibold tracking-tight text-white">
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
                <span className="font-heading text-2xl font-semibold leading-none text-white/15">
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
          <CardTitle className="font-heading text-base font-semibold tracking-tight text-white">
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
