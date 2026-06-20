import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { embedQuery, embedTexts } from "@/lib/embeddings"

type Client = SupabaseClient<Database>

const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 200
const MAX_CHUNKS_PER_DOC = 200

/**
 * Split text into overlapping chunks, preferring paragraph boundaries so each
 * chunk stays semantically coherent.
 */
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  const paragraphs = normalized.split(/\n\s*\n/)
  const chunks: string[] = []
  let current = ""

  const pushCurrent = () => {
    const trimmed = current.trim()
    if (trimmed) chunks.push(trimmed)
    current = ""
  }

  for (const paragraph of paragraphs) {
    // A single oversized paragraph is hard-split with overlap.
    if (paragraph.length > CHUNK_SIZE) {
      pushCurrent()
      for (let start = 0; start < paragraph.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(paragraph.slice(start, start + CHUNK_SIZE).trim())
      }
      continue
    }

    if (current.length + paragraph.length + 2 > CHUNK_SIZE) {
      pushCurrent()
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph
  }

  pushCurrent()
  return chunks.slice(0, MAX_CHUNKS_PER_DOC)
}

export type IngestedDocument = {
  id: string
  name: string
  type: string | null
  chunk_count: number
  created_at: string
}

/**
 * Chunk + embed a document and persist it for the user. Returns the stored
 * document row. Throws if embeddings are unavailable or the file is empty.
 */
export async function ingestDocument(
  supabase: Client,
  userId: string,
  file: { name: string; type?: string | null; content: string }
): Promise<IngestedDocument> {
  const chunks = chunkText(file.content)
  if (chunks.length === 0) {
    throw new Error("The file has no readable text to index.")
  }

  const embeddings = await embedTexts(chunks)

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      name: file.name,
      type: file.type ?? null,
      chunk_count: chunks.length,
    })
    .select("id, name, type, chunk_count, created_at")
    .single()

  if (documentError || !document) {
    throw new Error(documentError?.message ?? "Could not save the document.")
  }

  const rows = chunks.map((content, index) => ({
    document_id: document.id,
    user_id: userId,
    chunk_index: index,
    content,
    embedding: embeddings[index],
  }))

  const { error: chunkError } = await supabase.from("document_chunks").insert(rows)

  if (chunkError) {
    // Roll back the parent so we never leave an empty, unsearchable document.
    await supabase.from("documents").delete().eq("id", document.id)
    throw new Error(chunkError.message)
  }

  return document
}

export type RetrievedChunk = {
  document_id: string
  document_name: string
  content: string
  similarity: number
}

/**
 * Embed the query and return the most relevant chunks from the user's
 * materials. Returns an empty array on any failure so callers can degrade
 * gracefully instead of erroring the whole request.
 */
export async function retrieveChunks(
  supabase: Client,
  query: string,
  matchCount = 5
): Promise<RetrievedChunk[]> {
  try {
    const embedding = await embedQuery(query)
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: embedding,
      match_count: matchCount,
    })

    if (error || !data) return []

    return data.map((row) => ({
      document_id: row.document_id,
      document_name: row.document_name,
      content: row.content,
      similarity: row.similarity,
    }))
  } catch {
    return []
  }
}
