import Link from "next/link"

import { signIn, signUp } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthFormProps = {
  mode: "login" | "signup"
  error?: string
  notice?: string
  hasSupabase: boolean
}

export function AuthForm({ mode, error, notice, hasSupabase }: AuthFormProps) {
  const isSignup = mode === "signup"

  return (
    <Card className="w-full max-w-md border-white/10 bg-card/75 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>{isSignup ? "Create your account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isSignup
            ? "Start saving your learning missions."
            : "Sign in to enter your protected dashboard."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSupabase ? (
          <div className="mb-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">
            Supabase env vars are required before auth can run.
          </div>
        ) : null}
        {notice ? (
          <div className="mb-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form action={isSignup ? signUp : signIn} className="flex flex-col gap-4">
          {isSignup ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" placeholder="Rahul Gupta" />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="student@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} placeholder="At least 6 characters" />
          </div>
          <Button type="submit" size="lg" disabled={!hasSupabase}>
            {isSignup ? "Sign up" : "Log in"}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          {isSignup ? "Already exploring?" : "New to the universe?"}{" "}
          <Link className="text-cyan-100 underline-offset-4 hover:underline" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
