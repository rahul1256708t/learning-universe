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
    <Card className="max-w-2xl border-white/10 bg-card/75 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>User profile</CardTitle>
        <CardDescription>Manage your Learning Universe identity.</CardDescription>
      </CardHeader>
      <CardContent>
        {params.notice === "saved" ? (
          <div className="mb-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">
            Profile saved.
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {params.error}
          </div>
        ) : null}
        <form action={updateProfile} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} placeholder="Student name" />
          </div>
          <Button type="submit" className="w-fit">Save profile</Button>
        </form>
      </CardContent>
    </Card>
  )
}
