import { AuthForm } from "@/components/auth-form"
import { AppBackground } from "@/components/app-background"
import { hasSupabaseConfig } from "@/lib/supabase/config"

type SearchParams = Promise<{ error?: string; notice?: string }>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const notice = params.notice === "check-email" ? "Check your email to confirm your account." : undefined

  return (
    <AppBackground>
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <AuthForm mode="login" error={params.error} notice={notice} hasSupabase={hasSupabaseConfig()} />
      </main>
    </AppBackground>
  )
}
