import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { classifyQuestion } from "@/lib/research/classify"
import { DEFAULT_RESEARCH_MODE, getResearchMode, isResearchMode } from "@/lib/research/modes"
import { DEFAULT_AGENT_MODEL, isAgentModel } from "@/lib/research/models"
import { streamCompletion, type ChatMessage } from "@/lib/research/llm"
import { rateLimit, sweepRateLimiter } from "@/lib/research/rate-limit"
import { logResearch, recallMemories, saveMemory } from "@/lib/research/memory"
import {
  buildCheckedList,
  buildSourceContext,
  gatherSources,
  scoreConfidence,
} from "@/lib/research/sources"
import type { AgentEvent, ResearchModeId } from "@/lib/research/types"

/**
 * Learning Universe — Research Agent endpoint.
 *
 * This is NOT a chat passthrough. It runs the full research workflow and
 * STREAMS the agent's progress to the client as newline-delimited JSON events
 * (see AgentEvent): understanding → planning → searching → reading → verifying
 * → writing. Sources, confidence, and "what I checked" are sent alongside the
 * answer tokens.
 *
 * All API keys (OpenRouter, Anthropic, Tavily, Supabase service) are read
 * server-side only and never reach the browser.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AgentRequest = {
  question?: string
  mode?: string
  model?: string
  chatId?: string | null
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function titleFromQuestion(question: string) {
  return question.replace(/\s+/g, " ").slice(0, 72) || "Research session"
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────
  const supabase = await createClient()
  if (!supabase) return jsonError("Supabase is not configured.", 500)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonError("You must be logged in to use the Research Agent.", 401)
  }

  // ── Rate limit ────────────────────────────────────────────────
  sweepRateLimiter()
  const limit = rateLimit(user.id, 12, 60_000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many research requests. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    )
  }

  // ── Validate input ────────────────────────────────────────────
  let body: AgentRequest
  try {
    body = (await request.json()) as AgentRequest
  } catch {
    return jsonError("Invalid request body.", 400)
  }

  const question = body.question?.trim() ?? ""
  const modeId = (body.mode?.trim() || DEFAULT_RESEARCH_MODE) as ResearchModeId
  const model = body.model?.trim() || DEFAULT_AGENT_MODEL
  let chatId = body.chatId?.trim() || null

  if (!question) return jsonError("A question is required.", 400)
  if (question.length > 6000) return jsonError("Question is too long.", 400)
  if (!isResearchMode(modeId)) return jsonError("Unknown research mode.", 400)
  if (!isAgentModel(model)) return jsonError("Model is not allowed.", 400)

  const mode = getResearchMode(modeId)

  // ── Resolve / create the chat row (reuses existing chats table) ──
  if (chatId) {
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!existing) return jsonError("Chat not found for this user.", 404)
    await supabase.from("chats").update({ model, mode: modeId }).eq("id", chatId)
  } else {
    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: titleFromQuestion(question), model, mode: modeId })
      .select("id")
      .single()
    if (error || !newChat) return jsonError(error?.message ?? "Could not create chat.", 500)
    chatId = newChat.id
  }

  const activeChatId = chatId!

  // Persist the user's question immediately.
  await supabase.from("messages").insert({
    chat_id: activeChatId,
    user_id: user.id,
    role: "user",
    content: question,
  })

  // ── Stream the research workflow ──────────────────────────────
  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: AgentEvent) => {
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = ""
      try {
        // 1 ─ Understand + 2 ─ Classify + 3 ─ Decide research
        send(controller, { type: "step", step: "understanding", status: "active" })
        const classification = classifyQuestion(question, modeId)
        send(controller, { type: "classification", classification })
        send(controller, {
          type: "step",
          step: "understanding",
          status: "done",
          detail: classification.understanding,
        })

        send(controller, { type: "step", step: "planning", status: "active" })
        send(controller, {
          type: "step",
          step: "planning",
          status: "done",
          detail: classification.researchRequired
            ? `Will search: ${classification.plannedQueries.join(" · ")}`
            : "No live search needed — answering from established knowledge.",
        })

        // Recall any relevant saved memory (lightweight RAG).
        const memories = await recallMemories(supabase, user.id, question, 3)

        // 4–8 ─ Search → read → extract → compare → filter
        let sources: Awaited<ReturnType<typeof gatherSources>>["sources"] = []
        let quickAnswers: string[] = []
        let hadErrors = false

        if (classification.researchRequired) {
          send(controller, { type: "step", step: "searching", status: "active" })
          const gathered = await gatherSources(classification.plannedQueries, modeId)
          sources = gathered.sources
          quickAnswers = gathered.quickAnswers
          hadErrors = gathered.errors.length > 0
          send(controller, {
            type: "step",
            step: "searching",
            status: "done",
            detail: `Found ${sources.length} source${sources.length === 1 ? "" : "s"}.`,
          })

          send(controller, { type: "step", step: "reading", status: "active" })
          send(controller, { type: "sources", sources })
          send(controller, {
            type: "step",
            step: "reading",
            status: "done",
            detail: "Extracted key facts from each source.",
          })

          send(controller, { type: "step", step: "verifying", status: "active" })
          send(controller, {
            type: "step",
            step: "verifying",
            status: "done",
            detail: sources.length
              ? "Compared sources and dropped weak/outdated ones."
              : "No reliable sources found — will answer cautiously.",
          })
        } else {
          for (const step of ["searching", "reading", "verifying"] as const) {
            send(controller, { type: "step", step, status: "skipped" })
          }
        }

        // 9 ─ Generate the final answer (grounded in the sources)
        send(controller, { type: "step", step: "writing", status: "active" })

        const systemPrompt = buildSystemPrompt(mode.answerStyle, classification.researchRequired)
        const sourceContext = buildSourceContext(sources)
        const memoryContext = memories.length
          ? `\n\nRelevant things this student has learned before:\n- ${memories.join("\n- ")}`
          : ""
        const quickHint =
          quickAnswers.length && classification.researchRequired
            ? `\n\nSearch engine summary (verify against the sources, do not cite this directly): ${quickAnswers[0].slice(0, 600)}`
            : ""

        const messages: ChatMessage[] = [
          { role: "system", content: systemPrompt + memoryContext },
          {
            role: "user",
            content: classification.researchRequired
              ? `${sourceContext}${quickHint}\n\nQuestion: ${question}\n\nAnswer using ONLY the sources above. Cite inline as [n]. If the sources don't cover something, say so instead of guessing.`
              : `Question: ${question}`,
          },
        ]

        const result = await streamCompletion(
          model,
          messages,
          (text) => {
            answer += text
            send(controller, { type: "token", text })
          },
          { temperature: mode.id === "coding" ? 0.2 : 0.4, maxTokens: mode.id === "deep" ? 2000 : 1400 }
        )

        send(controller, { type: "step", step: "writing", status: "done" })

        // 10–11 ─ Confidence + "what I checked"
        const confidence = scoreConfidence(sources, classification.researchRequired, hadErrors)
        const checked = buildCheckedList(sources, classification.plannedQueries, classification.researchRequired)

        send(controller, {
          type: "meta",
          confidence,
          checked,
          sources,
          classification,
          model: result.modelUsed,
          mode: modeId,
        })

        // ── Persist answer + logs + memory (best-effort) ──────────
        if (answer) {
          await supabase.from("messages").insert({
            chat_id: activeChatId,
            user_id: user.id,
            role: "assistant",
            content: answer,
          })
        }

        await supabase.from("usage_logs").insert({
          user_id: user.id,
          model: result.modelUsed,
          tokens_used: result.tokensUsed,
        })

        await logResearch(supabase, {
          userId: user.id,
          chatId: activeChatId,
          question,
          answer,
          sources,
          model: result.modelUsed,
          mode: modeId,
          confidence,
          researchUsed: classification.researchRequired,
          questionType: classification.type,
        })

        // 12 ─ Save a useful learning memory (only when researched & confident)
        if (classification.researchRequired && sources.length > 0 && confidence.level >= 50) {
          await saveMemory(supabase, {
            userId: user.id,
            topic: titleFromQuestion(question),
            summary: answer.slice(0, 600),
            sources,
            mode: modeId,
          })
        }

        send(controller, { type: "done", chatId: activeChatId })
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : "The research agent failed."
        send(controller, { type: "error", error: message })
        // Save whatever partial answer we have so nothing is lost.
        if (answer) {
          await supabase
            .from("messages")
            .insert({ chat_id: activeChatId, user_id: user.id, role: "assistant", content: answer })
            .then(() => undefined, () => undefined)
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-chat-id": activeChatId,
    },
  })
}

/** The core agent persona + non-negotiable quality rules. */
function buildSystemPrompt(answerStyle: string, researchRequired: boolean): string {
  return [
    "You are the Learning Universe Research Agent — a rigorous research assistant for students, not a casual chatbot.",
    "",
    "Non-negotiable rules:",
    "- NEVER invent sources, citations, URLs, statistics, or quotes.",
    "- Only cite sources from the provided list, using inline [n] markers.",
    "- Prefer official documentation, NCERT/education sources, research papers, and trusted sites.",
    "- If sources disagree, state the disagreement plainly.",
    "- If the evidence is thin or you are unsure, say so clearly rather than guessing.",
    "- Explain in simple, student-friendly language. Define jargon when you use it.",
    "- Format with Markdown (headings, bullets, code blocks) where it helps.",
    researchRequired
      ? "- This answer MUST be grounded in the supplied sources; do not rely on memory for facts."
      : "- No live sources were needed; still flag anything you are uncertain about.",
    "",
    `Answer style for this mode: ${answerStyle}`,
  ].join("\n")
}
