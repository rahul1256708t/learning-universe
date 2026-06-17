"use client"

import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/lib/database.types"
import { getSupabaseConfig } from "@/lib/supabase/config"

export function createClient() {
  const config = getSupabaseConfig()

  if (!config) {
    throw new Error("Supabase environment variables are not configured.")
  }

  return createBrowserClient<Database>(config.url, config.anonKey)
}
