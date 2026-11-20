import type { Entry } from "./entries.ts"
import { entriesFromRows, entryToRow, type RatingRow } from "./rating-rows.ts"
import { getSupabase } from "./supabase.ts"

export class RatingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RatingsError"
  }
}

function client() {
  const supabase = getSupabase()
  if (!supabase) throw new RatingsError("Supabase isn’t configured.")
  return supabase
}

export async function fetchRatings(): Promise<Entry[]> {
  const { data, error } = await client()
    .from("ratings")
    .select("id, title, url, scores, total, created_at")
    .order("created_at", { ascending: false })
  if (error) throw new RatingsError("Couldn’t load ratings from your account.")
  return entriesFromRows((data ?? []) as RatingRow[]).entries
}

export async function insertRating(entry: Entry, userId: string): Promise<void> {
  const { error } = await client().from("ratings").insert(entryToRow(entry, userId))
  if (!error) return
  if (error.code === "23505") return
  throw new RatingsError("Couldn’t save to your account. Nothing was stored.")
}

export async function insertRatings(entries: Entry[], userId: string): Promise<void> {
  if (entries.length === 0) return
  const { error } = await client()
    .from("ratings")
    .upsert(entries.map((entry) => entryToRow(entry, userId)), {
      onConflict: "id",
      ignoreDuplicates: true,
    })
  if (error) throw new RatingsError("Couldn’t add those ratings to your account.")
}

export async function deleteRating(id: string): Promise<void> {
  const { error } = await client().from("ratings").delete().eq("id", id)
  if (error) throw new RatingsError("Couldn’t delete that rating.")
}

export async function clearRatings(userId: string): Promise<void> {
  const { error } = await client().from("ratings").delete().eq("user_id", userId)
  if (error) throw new RatingsError("Couldn’t clear your ratings.")
}
