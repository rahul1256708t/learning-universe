import Link from "next/link"
import { ArrowLeftIcon, KeyRoundIcon, LockIcon, ServerIcon } from "lucide-react"

import { AppBackground } from "@/components/app-background"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"

const INFO_ITEMS = [
  {
    Icon: KeyRoundIcon,
    title: "OPENROUTER_API_KEY",
    text: "Server-only secret used inside /api/chat. Students never see or touch it.",
  },
  {
    Icon: ServerIcon,
    title: "OpenRouter Route",
    text: "The browser sends message, model, mode, and chatId only — no key is exposed.",
  },
  {
    Icon: LockIcon,
    title: "No Service Role in UI",
    text: "Frontend uses only the Supabase URL and public anon key. The service role stays server-side.",
  },
]

export default function AdminInfoPage() {
  return (
    <AppBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-8 px-4 py-10">
        <PageHeader title="Admin info" subtitle="How the AI key is kept secure." />

        <Card className="border-white/10 bg-black/40 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-white">
              Admin-Managed AI Key
            </CardTitle>
            <CardDescription className="text-[#D7E2EA]/40">
              Students never enter or see the OpenRouter API key.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {INFO_ITEMS.map(({ Icon, title, text }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-5"
              >
                <div className="flex size-9 items-center justify-center rounded-xl border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 text-[#D7E2EA]">
                  <Icon className="size-4" />
                </div>
                <p className="font-heading text-sm font-medium uppercase tracking-wide text-[#D7E2EA]">
                  {title}
                </p>
                <p className="text-sm leading-6 text-[#D7E2EA]/45">{text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Link
          href="/dashboard/chat"
          className="flex w-fit items-center gap-2 rounded-full border-2 border-[#D7E2EA]/20 px-6 py-2.5 font-heading text-xs font-medium uppercase tracking-widest text-[#D7E2EA]/60 transition-colors hover:border-[#D7E2EA]/40 hover:text-[#D7E2EA]"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to app
        </Link>
      </main>
    </AppBackground>
  )
}
