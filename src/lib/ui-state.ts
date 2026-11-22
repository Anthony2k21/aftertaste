export const UI_STATE_KEY = "aftertaste.ui.v1"

export type SectionId = "form" | "stats" | "scoreboard" | "guide"

export type UiState = {
  sections: Partial<Record<SectionId, boolean>>
  cards: string[]
}

const SECTION_IDS: SectionId[] = ["form", "stats", "scoreboard", "guide"]

export function emptyUiState(): UiState {
  return { sections: {}, cards: [] }
}

export function parseUiState(raw: unknown): UiState {
  const state = emptyUiState()
  if (!raw || typeof raw !== "object") return state
  const record = raw as { sections?: unknown; cards?: unknown }
  if (record.sections && typeof record.sections === "object") {
    for (const id of SECTION_IDS) {
      if ((record.sections as Record<string, unknown>)[id] === true) state.sections[id] = true
    }
  }
  if (Array.isArray(record.cards)) {
    state.cards = [...new Set(record.cards.filter((id): id is string => typeof id === "string"))].slice(0, 5000)
  }
  return state
}

export function loadUiState(): UiState {
  if (typeof localStorage === "undefined") return emptyUiState()
  try {
    const text = localStorage.getItem(UI_STATE_KEY)
    return text ? parseUiState(JSON.parse(text)) : emptyUiState()
  } catch {
    return emptyUiState()
  }
}

export function saveUiState(state: UiState): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(state))
  } catch {
    // Collapsed panels are a nicety; ignore a full or blocked store.
  }
}

export function toggleSection(state: UiState, id: SectionId): UiState {
  const sections = { ...state.sections }
  if (sections[id]) delete sections[id]
  else sections[id] = true
  return { ...state, sections }
}

export function setCardCollapsed(state: UiState, id: string, collapsed: boolean): UiState {
  const cards = state.cards.filter((card) => card !== id)
  if (collapsed) cards.push(id)
  return { ...state, cards }
}

export function setCardsCollapsed(state: UiState, ids: string[], collapsed: boolean): UiState {
  const targets = new Set(ids)
  const cards = state.cards.filter((card) => !targets.has(card))
  if (collapsed) cards.push(...ids)
  return { ...state, cards }
}
