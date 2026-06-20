import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { embeddingsConfigured } from "@/lib/embeddings"
import { ingestDocument } from "@/lib/documents"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_CONTENT_CHARS = 200_000

type IngestRequest = {
  name?: string
  type?: string
  content?: string
}

export async function GET() {
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

  const { data, error } = await supabase
    .from("documents")
    .select("id, name, type, chunk_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: data ?? [], embeddingsReady: embeddingsConfigured() })
}

export async function POST(request: Request) {
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

  if (!embeddingsConfigured()) {
    return NextResponse.json(
      { error: "Embeddings are not configured on the server. Set EMBEDDINGS_API_KEY (or OPENAI_API_KEY)." },
      { status: 503 }
    )
  }

  const body = (await request.json()) as IngestRequest
  const name = body.name?.trim()
  const content = body.content?.slice(0, MAX_CONTENT_CHARS)

  if (!name) {
    return NextResponse.json({ error: "A document name is required." }, { status: 400 })
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "The document has no readable text." }, { status: 400 })
  }

  try {
    const document = await ingestDocument(supabase, user.id, {
      name: name.slice(0, 200),
      type: body.type ?? null,
      content,
    })
    return NextResponse.json({ document })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not index the document."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
