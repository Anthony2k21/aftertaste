import { CRITERIA, type CriterionId, type ScoreMap } from "./criteria.ts"
import { scoreRatings } from "./score.ts"

export type Entry = {
  id: string
  title: string
  url: string
  date: string
  scores: ScoreMap
  total: number
}

export type SortKey = "score" | "date"

export type ParseResult =
  | { ok: true; entries: Entry[]; skipped: number }
  | { ok: false }

const CRITERION_IDS = CRITERIA.map((criterion) => criterion.id)

export function sortEntries(entries: Entry[], sort: SortKey): Entry[] {
  return [...entries].sort((a, b) => {
    if (sort === "date") {
      const byDate = b.date.localeCompare(a.date)
      return byDate !== 0 ? byDate : b.total - a.total
    }
    const byScore = b.total - a.total
    return byScore !== 0 ? byScore : b.date.localeCompare(a.date)
  })
}

export function mergeEntries(existing: Entry[], incoming: Entry[]): {
  entries: Entry[]
  added: number
  duplicate: number
} {
  const ids = new Set(existing.map((entry) => entry.id))
  const entries = [...existing]
  let added = 0
  let duplicate = 0

  for (const entry of incoming) {
    if (ids.has(entry.id)) {
      duplicate += 1
      continue
    }
    ids.add(entry.id)
    entries.push(entry)
    added += 1
  }

  return { entries, added, duplicate }
}

export function describeImport(added: number, duplicate: number, skipped: number): string {
  if (added === 0 && duplicate === 0 && skipped === 0) {
    return "That backup doesn’t include any videos."
  }
  if (added === 0 && skipped === 0) {
    return duplicate === 1
      ? "That video is already on the scoreboard."
      : "Those videos are already on the scoreboard."
  }

  const parts: string[] = []
  if (added > 0) parts.push(`Added ${added} ${added === 1 ? "video" : "videos"}.`)
  if (duplicate > 0) {
    parts.push(`${duplicate} ${duplicate === 1 ? "was" : "were"} already saved.`)
  }
  if (skipped > 0) {
    parts.push(
      `Skipped ${skipped} ${skipped === 1 ? "row" : "rows"} that didn’t look like a rating.`,
    )
  }
  return parts.join(" ")
}

export function backupPayload(entries: Entry[]) {
  return {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    entries,
  }
}

export function parseBackup(raw: unknown): ParseResult {
  const list = extractList(raw)
  if (!list) return { ok: false }

  const entries: Entry[] = []
  let skipped = 0

  for (const item of list) {
    const entry = normalizeEntry(item)
    if (!entry) {
      skipped += 1
      continue
    }
    entries.push(entry)
  }

  return { ok: true, entries, skipped }
}

export function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function hrefFor(url: string): string | null {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function hostLabel(url: string): string {
  const href = hrefFor(url)
  if (!href) return url.trim()
  const parsed = new URL(href)
  const path = parsed.pathname === "/" ? "" : parsed.pathname
  return `${parsed.host}${path}${parsed.search}`
}

function extractList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== "object") return null
  const entries = (raw as { entries?: unknown }).entries
  return Array.isArray(entries) ? entries : null
}

function normalizeEntry(raw: unknown): Entry | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as {
    id?: unknown
    title?: unknown
    url?: unknown
    date?: unknown
    scores?: unknown
  }

  const scores = normalizeScores(record.scores)
  if (!scores) return null

  const date = typeof record.date === "string" ? record.date.trim() : ""
  if (!date || Number.isNaN(Date.parse(date))) return null

  const id = cleanId(record.id)
  const title = cleanText(record.title, 200)
  const url = cleanText(record.url, 2000)
  const total = scoreRatings(scores).total

  return { id, title, url, date, scores, total }
}

function normalizeScores(raw: unknown): ScoreMap | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Partial<Record<CriterionId, unknown>>
  const scores = {} as ScoreMap

  for (const id of CRITERION_IDS) {
    const value = record[id]
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
      return null
    }
    scores[id] = value
  }

  return scores
}

function cleanId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 80)
  return crypto.randomUUID()
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}
