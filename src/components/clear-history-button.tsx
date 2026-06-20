"use client"

import { useState, useTransition } from "react"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function ClearHistoryButton() {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function clearHistory() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/chats", { method: "DELETE" })
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Could not clear chat history.")
        }
        toast.success("Chat history cleared.")
        // Full reset so the deleted chats and any open chat disappear.
        window.location.href = "/dashboard/chat"
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong.")
        setConfirming(false)
      }
    })
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Button
        type="button"
        variant={confirming ? "destructive" : "outline"}
        size="sm"
        onClick={clearHistory}
        disabled={isPending}
        className="flex-1 rounded-xl border-white/15 font-heading text-[10px] font-medium uppercase tracking-widest"
      >
        {isPending ? (
          <Loader2Icon className="size-3 animate-spin" data-icon="inline-start" />
        ) : (
          <Trash2Icon className="size-3" data-icon="inline-start" />
        )}
        {confirming ? "Confirm clear" : "Clear history"}
      </Button>
      {confirming && !isPending ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          className="rounded-xl font-heading text-[10px] font-medium uppercase tracking-widest text-[#D7E2EA]/50"
        >
          Cancel
        </Button>
      ) : null}
    </div>
  )
}
