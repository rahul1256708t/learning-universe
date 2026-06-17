import Link from "next/link"
import { KeyRoundIcon, LockIcon, ServerIcon } from "lucide-react"

import { AppBackground } from "@/components/app-background"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminInfoPage() {
  return (
    <AppBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-5 px-4 py-10">
        <Card className="border-white/10 bg-card/75 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Admin-managed AI key</CardTitle>
            <CardDescription>
              Students never enter or see the OpenRouter API key.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[
              [KeyRoundIcon, "OPENROUTER_API_KEY", "Server-only secret used inside /api/chat."],
              [ServerIcon, "OpenRouter route", "The browser sends message, model, mode, and chatId only."],
              [LockIcon, "No service role in UI", "Frontend uses only Supabase URL and anon/public key."],
            ].map(([Icon, title, text]) => (
              <div key={String(title)} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <Icon />
                <p className="mt-3 font-medium">{String(title)}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(text)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Link href="/dashboard/chat" className={buttonVariants({ className: "w-fit" })}>
          Back to app
        </Link>
      </main>
    </AppBackground>
  )
}
