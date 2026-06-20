"use client"

import { useRef, useState, useTransition } from "react"
import { FileTextIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type MaterialDocument = {
  id: string
  name: string
  type: string | null
  chunk_count: number
  created_at: string
}

type MaterialsManagerProps = {
  initialDocuments: MaterialDocument[]
  embeddingsReady: boolean
}

const MAX_FILE_BYTES = 1 * 1024 * 1024 // 1MB of text
const ACCEPTED_FILE_TYPES =
  ".txt,.md,.markdown,.csv,.json,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.rb,.php,.sql,.yml,.yaml,.xml,.log,text/*"

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."))
    reader.readAsText(file)
  })
}

export function MaterialsManager({ initialDocuments, embeddingsReady }: MaterialsManagerProps) {
  const [documents, setDocuments] = useState<MaterialDocument[]>(initialDocuments)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is too large. Max size is 1 MB of text.")
      return
    }

    setIsUploading(true)
    try {
      const content = await readFileAsText(file)
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type || "text/plain", content }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { document?: MaterialDocument; error?: string }
        | null

      if (!response.ok || !payload?.document) {
        throw new Error(payload?.error ?? "Could not index this file.")
      }

      setDocuments((current) => [payload.document as MaterialDocument, ...current])
      toast.success(`Indexed ${file.name}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the file.")
    } finally {
      setIsUploading(false)
    }
  }

  function deleteDocument(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/documents/${id}`, { method: "DELETE" })
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Could not delete this document.")
        }
        setDocuments((current) => current.filter((doc) => doc.id !== id))
        toast.success("Material removed.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete the document.")
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="font-heading text-base font-black uppercase tracking-wider text-[#D7E2EA]">
          Study Materials
        </CardTitle>
        <CardDescription className="text-[#D7E2EA]/40">
          Upload your notes, textbooks, and documents. The agent searches them to ground its answers.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!embeddingsReady ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/8 px-3.5 py-3 text-sm text-amber-200/90">
            <span>⚠</span>
            <span>
              Add <code className="font-mono">EMBEDDINGS_API_KEY</code> (or{" "}
              <code className="font-mono">OPENAI_API_KEY</code>) on the server to enable uploading and searching
              materials.
            </span>
          </div>
        ) : null}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileSelected}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !embeddingsReady}
            className="rounded-xl border-white/15 font-heading text-xs uppercase tracking-widest text-[#D7E2EA]/70"
          >
            {isUploading ? (
              <Loader2Icon className="size-3.5 animate-spin" data-icon="inline-start" />
            ) : (
              <UploadIcon className="size-3.5" data-icon="inline-start" />
            )}
            {isUploading ? "Indexing…" : "Upload material"}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {documents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-[#D7E2EA]/30">
              No materials yet. Upload a file to build your knowledge base.
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#D7E2EA]/70">
                  <FileTextIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-medium text-[#D7E2EA]/85">{doc.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#D7E2EA]/40">
                    {doc.chunk_count} {doc.chunk_count === 1 ? "chunk" : "chunks"} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => deleteDocument(doc.id)}
                  disabled={deletingId === doc.id}
                  aria-label={`Delete ${doc.name}`}
                  className="text-[#D7E2EA]/40 hover:text-destructive"
                >
                  {deletingId === doc.id ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
