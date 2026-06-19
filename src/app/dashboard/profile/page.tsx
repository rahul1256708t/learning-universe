import { updateProfile } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/server"

type SearchParams = Promise<{ notice?: string; error?: string }>

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }

  const { data: profile } =
    supabase && user
      ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      : { data: null }

  return (
    <main className="flex flex-col gap-6">
      <div className="overflow-hidden">
        <h1
          className="hero-heading font-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 8vw, 96px)" }}
        >
          Profile
        </h1>
        <p className="mt-2 font-heading text-sm font-medium uppercase tracking-widest text-[#D7E2EA]/50">
          Manage your Learning Universe identity
        </p>
      </div>

      <Card className="max-w-2xl border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base font-black uppercase tracking-wider text-[#D7E2EA]">
            User Profile
          </CardTitle>
          <CardDescription className="text-[#D7E2EA]/40">
            Update your name and review your account details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.notice === "saved" ? (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-3.5 py-3 text-sm text-cyan-100">
              Profile saved successfully.
            </div>
          ) : null}
          {params.error ? (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
              {params.error}
            </div>
          ) : null}
          <form action={updateProfile} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label className="font-heading text-xs uppercase tracking-wider text-[#D7E2EA]/60">
                Email
              </Label>
              <Input
                value={user?.email ?? ""}
                disabled
                className="h-11 border-white/10 bg-white/5 text-[#D7E2EA]/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="full_name"
                className="font-heading text-xs uppercase tracking-wider text-[#D7E2EA]/60"
              >
                Full Name
              </Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Student name"
                className="h-11 border-white/10 bg-white/5 text-[#D7E2EA]"
              />
            </div>
            <Button
              type="submit"
              className="w-fit rounded-full font-heading text-xs uppercase tracking-widest"
              style={{
                background:
                  "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
                boxShadow:
                  "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
                outline: "2px solid #ffffff",
                outlineOffset: "-3px",
              }}
            >
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
