import { AuthForm } from "@/components/auth-form"
import { AppBackground } from "@/components/app-background"
import { hasSupabaseConfig } from "@/lib/supabase/config"

type SearchParams = Promise<{ error?: string }>

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  return (
    <AppBackground>
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <AuthForm mode="signup" error={params.error} hasSupabase={hasSupabaseConfig()} />
      </main>
    </AppBackground>
  )
}
