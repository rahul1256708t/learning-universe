import Link from "next/link"

import { signIn, signUp } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/password-input"

function CosmicLogo() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      className="text-primary drop-shadow-[0_0_14px_rgba(34,211,238,0.55)]"
      aria-hidden="true"
    >
      <circle cx="26" cy="26" r="10" fill="currentColor" fillOpacity="0.45" />
      <circle cx="26" cy="26" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <ellipse cx="26" cy="26" rx="24" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" transform="rotate(-25 26 26)" />
      <circle cx="46.5" cy="19.5" r="2.5" fill="currentColor" fillOpacity="0.9" />
      <circle cx="7" cy="11" r="1.5" fill="currentColor" fillOpacity="0.5" />
      <circle cx="43" cy="44" r="1.5" fill="currentColor" fillOpacity="0.5" />
      <circle cx="10" cy="43" r="1" fill="currentColor" fillOpacity="0.4" />
      <circle cx="39" cy="8" r="1" fill="currentColor" fillOpacity="0.4" />
    </svg>
  )
}

type AuthFormProps = {
  mode: "login" | "signup"
  error?: string
  notice?: string
  hasSupabase: boolean
}

export function AuthForm({ mode, error, notice, hasSupabase }: AuthFormProps) {
  const isSignup = mode === "signup"

  return (
    <Card className="w-full max-w-md border-primary/15 bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur-xl ring-primary/10">
      <CardHeader className="flex flex-col items-center gap-4 pb-4 pt-7 text-center">
        <CosmicLogo />
        <div className="space-y-1.5">
          <CardTitle className="bg-gradient-to-br from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-2xl font-bold text-transparent">
            {isSignup ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "Start your learning journey in the universe."
              : "Sign in to enter your protected dashboard."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-7">
        {!hasSupabase && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-400/20 bg-amber-400/8 px-3.5 py-3 text-sm text-amber-200/90">
            <svg className="mt-0.5 size-4 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Supabase env vars are required before auth can run.
          </div>
        )}
        {notice && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-cyan-400/20 bg-cyan-400/8 px-3.5 py-3 text-sm text-cyan-100">
            <svg className="mt-0.5 size-4 shrink-0 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        <form action={isSignup ? signUp : signIn} className="flex flex-col gap-4">
          {isSignup && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Rahul Gupta"
                autoComplete="name"
                className="h-11"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="student@example.com"
              autoComplete="email"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignup && (
                <span className="text-xs text-muted-foreground">Min. 6 characters</span>
              )}
            </div>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </div>
          <Button
            type="submit"
            disabled={!hasSupabase}
            className="mt-1 h-11 w-full text-base font-semibold shadow-lg shadow-primary/25"
          >
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? "Already exploring?" : "New to the universe?"}{" "}
          <Link
            className="font-medium text-cyan-300 underline-offset-4 transition-colors hover:text-cyan-200 hover:underline"
            href={isSignup ? "/login" : "/signup"}
          >
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
