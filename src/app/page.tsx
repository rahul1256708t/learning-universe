import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon, LockIcon, RocketIcon, SparklesIcon } from "lucide-react"

import { AppBackground } from "@/components/app-background"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  "AI Tutor Chat",
  "Homework Helper",
  "Notes Generator",
  "Quiz Generator",
  "Exam Prep Mode",
  "Formula Helper",
]

export default function LandingPage() {
  return (
    <AppBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
              <RocketIcon />
            </span>
            <span className="text-lg font-semibold">Learning Universe</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Login</Link>
            <Link href="/signup" className={buttonVariants()}>Signup</Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_470px]">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-semibold leading-tight tracking-normal sm:text-6xl lg:text-7xl">
              Learning Universe
            </h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-muted-foreground">
              Explore knowledge across the AI universe
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Choose premium OpenRouter models, switch study modes, stream answers,
              and save every chat securely to your own Supabase project.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/chat"
                className={buttonVariants({
                  size: "lg",
                  className: "bg-gradient-to-r from-cyan-200 via-violet-200 to-amber-200 text-slate-950 hover:opacity-90",
                })}
              >
                Launch dashboard
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <Link href="/admin-info" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Admin API key info
                <LockIcon data-icon="inline-end" />
              </Link>
            </div>
          </div>

          <Card className="border-white/10 bg-card/75 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Study modes ready</CardTitle>
              <CardDescription>Built for learning workflows, not generic chat.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <SparklesIcon />
                  <p className="mt-3 text-sm font-medium">{feature}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 pb-8 md:grid-cols-3">
          {[
            ["Secure by design", "OpenRouter keys stay server-side in /api/chat."],
            ["Supabase Auth", "Email/password login, signup, logout, and protected routes."],
            ["Production ready", "Vercel env vars, RLS SQL, and deployment docs included."],
          ].map(([title, text]) => (
            <Card key={title} className="border-white/10 bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <Badge variant="secondary">
                  <BookOpenIcon />
                  Learning
                </Badge>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </AppBackground>
  )
}
