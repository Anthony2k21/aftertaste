import { parseBackup, type Entry } from "./entries.ts"

export type RatingRow = {
  id: string
  user_id?: string
  title: string | null
  url: string | null
  scores: unknown
  total: number | null
  created_at: string
}

export function entryToRow(entry: Entry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    title: entry.title,
    url: entry.url,
    scores: entry.scores,
    total: entry.total,
    created_at: entry.date,
  }
}

export function entriesFromRows(rows: RatingRow[]): { entries: Entry[]; skipped: number } {
  const parsed = parseBackup({
    entries: rows.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      url: row.url ?? "",
      date: row.created_at,
      scores: row.scores,
      total: row.total ?? 0,
    })),
  })
  if (!parsed.ok) return { entries: [], skipped: rows.length }
  return { entries: parsed.entries, skipped: parsed.skipped }
}
