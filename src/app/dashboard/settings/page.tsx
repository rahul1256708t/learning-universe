import { CheckCircle2Icon, XCircleIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { PageHeader } from "@/components/page-header"

export default function SettingsPage() {
  const rows = [
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["OPENROUTER_API_KEY", Boolean(process.env.OPENROUTER_API_KEY)],
    ["OPENROUTER_SITE_URL", Boolean(process.env.OPENROUTER_SITE_URL)],
    ["OPENROUTER_SITE_NAME", Boolean(process.env.OPENROUTER_SITE_NAME)],
  ] as const

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Deployment readiness for Vercel and Supabase." />

      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base font-semibold tracking-tight text-white">
            Environment Variables
          </CardTitle>
          <CardDescription className="text-[#D7E2EA]/40">
            All variables must be set in your Vercel project settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.map(([key, ready]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3.5"
            >
              <span className="font-mono text-sm text-[#D7E2EA]/70">{key}</span>
              <span
                className={`flex items-center gap-1.5 font-heading text-xs font-medium uppercase tracking-wider ${
                  ready ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {ready ? (
                  <CheckCircle2Icon className="size-4" />
                ) : (
                  <XCircleIcon className="size-4" />
                )}
                {ready ? "Configured" : "Missing"}
              </span>
            </div>
          ))}
          <p className="mt-2 font-heading text-xs uppercase tracking-wider text-[#D7E2EA]/30">
            Supabase client:{" "}
            <span className={hasSupabaseConfig() ? "text-emerald-400" : "text-red-400"}>
              {hasSupabaseConfig() ? "Ready" : "Missing public env vars"}
            </span>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
