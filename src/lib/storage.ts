import { parseBackup, type Entry } from "./entries.ts"

const STORAGE_KEY = "aftertaste.entries.v1"
const IMPORT_KEY = "aftertaste.local-import.v1"

export type ImportChoice = "imported" | "dismissed"

export function loadEntries(): Entry[] {
  if (typeof localStorage === "undefined") return []
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return []
    const parsed = parseBackup(JSON.parse(text))
    return parsed.ok ? parsed.entries : []
  } catch {
    return []
  }
}

export function persistEntries(entries: Entry[]): boolean {
  if (typeof localStorage === "undefined") return false
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, entries }),
    )
    return true
  } catch {
    return false
  }
}

export function localImportChoice(userId: string): ImportChoice | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(IMPORT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const choice = parsed[userId]
    return choice === "imported" || choice === "dismissed" ? choice : null
  } catch {
    return null
  }
}

export function rememberLocalImport(userId: string, choice: ImportChoice): void {
  if (typeof localStorage === "undefined") return
  let current: Record<string, ImportChoice> = {}
  try {
    const raw = localStorage.getItem(IMPORT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      for (const [id, value] of Object.entries(parsed)) {
        if (value === "imported" || value === "dismissed") current[id] = value
      }
    }
  } catch {
    current = {}
  }
  current[userId] = choice
  localStorage.setItem(IMPORT_KEY, JSON.stringify(current))
}
