import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { configuredEnv } from "./env.ts"

let client: SupabaseClient | null | undefined

export function isSupabaseConfigured(): boolean {
  return configuredEnv(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY) !== null
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client
  const env = configuredEnv(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  if (!env) {
    client = null
    return null
  }
  client = createClient(env.url, env.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })
  return client
}
