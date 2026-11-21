export const KINDS = [
  { id: "video", label: "Video" },
  { id: "music", label: "Music" },
  { id: "film", label: "Film/TV" },
  { id: "book", label: "Book" },
  { id: "game", label: "Game" },
  { id: "podcast", label: "Podcast" },
  { id: "experience", label: "Experience" },
  { id: "other", label: "Other" },
] as const

export type Kind = (typeof KINDS)[number]["id"]

export const DEFAULT_KIND: Kind = "video"

const KIND_IDS = new Set<string>(KINDS.map((kind) => kind.id))

/** Anything saved before types existed, or with an unknown type, counts as a video. */
export function normalizeKind(value: unknown): Kind {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase()
    if (KIND_IDS.has(trimmed)) return trimmed as Kind
  }
  return DEFAULT_KIND
}

export function kindLabel(kind: Kind): string {
  return KINDS.find((item) => item.id === kind)?.label ?? "Other"
}
