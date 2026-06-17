import { CheckCircle2Icon, XCircleIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { hasSupabaseConfig } from "@/lib/supabase/config"

export default function SettingsPage() {
  const rows = [
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["OPENROUTER_API_KEY", Boolean(process.env.OPENROUTER_API_KEY)],
    ["OPENROUTER_SITE_URL", Boolean(process.env.OPENROUTER_SITE_URL)],
    ["OPENROUTER_SITE_NAME", Boolean(process.env.OPENROUTER_SITE_NAME)],
  ] as const

  return (
    <Card className="border-white/10 bg-card/75 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Deployment readiness for Vercel and Supabase.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.map(([key, ready]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <span className="font-mono text-sm">{key}</span>
            <span className="flex items-center gap-2 text-sm">
              {ready ? <CheckCircle2Icon /> : <XCircleIcon />}
              {ready ? "Configured" : "Missing"}
            </span>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">
          Supabase client status: {hasSupabaseConfig() ? "ready" : "missing public env vars"}.
        </p>
      </CardContent>
    </Card>
  )
}
