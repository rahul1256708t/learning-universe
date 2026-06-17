import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ chatId: string }>

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const { chatId } = await params
  const supabase = await createClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
