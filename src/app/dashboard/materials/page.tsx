import { MaterialsManager, type MaterialDocument } from "@/components/materials-manager"
import { embeddingsConfigured } from "@/lib/embeddings"
import { createClient } from "@/lib/supabase/server"

export default async function MaterialsPage() {
  const supabase = await createClient()
  let documents: MaterialDocument[] = []

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data } = await supabase
        .from("documents")
        .select("id, name, type, chunk_count, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      documents = data ?? []
    }
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="overflow-hidden">
        <h1
          className="hero-heading font-heading font-black uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 8vw, 96px)" }}
        >
          Materials
        </h1>
        <p className="mt-2 font-heading text-sm font-medium uppercase tracking-widest text-[#D7E2EA]/50">
          Your knowledge base for the study agent
        </p>
      </div>

      <MaterialsManager initialDocuments={documents} embeddingsReady={embeddingsConfigured()} />
    </main>
  )
}
