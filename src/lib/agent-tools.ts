import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { embeddingsConfigured } from "@/lib/embeddings"
import { retrieveChunks } from "@/lib/documents"

type Client = SupabaseClient<Database>

export type ToolContext = {
  supabase: Client
  userId: string
}

// OpenAI-style tool/function schema understood by OpenRouter.
export type ToolSpec = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export const AGENT_TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "search_materials",
      description:
        "Search the student's uploaded study materials (their notes, textbooks, and documents) for passages relevant to a question. Use this first whenever the question could relate to material the student has provided, and cite the document names in your answer.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "A focused search query describing what to look for in the materials.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculator",
      description:
        "Evaluate an arithmetic expression and return an exact result. Use this for any non-trivial calculation instead of computing in your head.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "An arithmetic expression, e.g. (45 * 1.2) / 3 or 2^10.",
          },
        },
        required: ["expression"],
        additionalProperties: false,
      },
    },
  },
]

function calculate(expression: string): string {
  // Only digits, whitespace and arithmetic operators are allowed, so there is
  // no way to reference identifiers — the expression cannot run arbitrary code.
  if (!/^[0-9+\-*/().,%^\s]+$/.test(expression)) {
    return "Error: expression may only contain numbers and the operators + - * / % ^ ( )."
  }

  try {
    const js = expression.replace(/\^/g, "**")
    const result = Function(`"use strict"; return (${js});`)() as unknown
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return "Error: expression did not evaluate to a finite number."
    }
    return String(result)
  } catch {
    return "Error: could not evaluate the expression."
  }
}

async function searchMaterials(query: string, context: ToolContext): Promise<string> {
  if (!embeddingsConfigured()) {
    return "Materials search is unavailable because embeddings are not configured on the server."
  }

  const chunks = await retrieveChunks(context.supabase, query, 5)
  if (chunks.length === 0) {
    return "No relevant passages were found in the student's uploaded materials."
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] From "${chunk.document_name}" (similarity ${chunk.similarity.toFixed(2)}):\n${chunk.content}`
    )
    .join("\n\n")
}

/**
 * Execute a tool the model requested. Always resolves to a string result so the
 * agent loop can feed it back as a tool message.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<string> {
  switch (name) {
    case "search_materials": {
      const query = typeof args.query === "string" ? args.query : ""
      if (!query.trim()) return "Error: a search query is required."
      return searchMaterials(query, context)
    }
    case "calculator": {
      const expression = typeof args.expression === "string" ? args.expression : ""
      if (!expression.trim()) return "Error: an expression is required."
      return calculate(expression)
    }
    default:
      return `Error: unknown tool "${name}".`
  }
}
