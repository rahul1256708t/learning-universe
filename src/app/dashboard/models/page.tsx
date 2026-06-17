import { BrainCircuitIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LEARNING_MODES, OPENROUTER_MODELS } from "@/lib/learning"

export default function ModelsPage() {
  return (
    <main className="flex flex-col gap-4">
      <Card className="border-white/10 bg-card/75 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Model selection</CardTitle>
          <CardDescription>Available OpenRouter models for Learning Universe.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {OPENROUTER_MODELS.map((model) => (
            <div key={model.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <BrainCircuitIcon />
              <p className="mt-3 font-medium">{model.name}</p>
              <p className="mt-1 font-mono text-xs text-cyan-100">{model.id}</p>
              <p className="mt-2 text-sm text-muted-foreground">{model.strength}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-card/65 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Learning modes</CardTitle>
          <CardDescription>Each mode adds a dedicated system prompt.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {LEARNING_MODES.map((mode) => (
            <Badge key={mode.id} variant="secondary">{mode.name}</Badge>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
