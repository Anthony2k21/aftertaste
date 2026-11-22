import { useEffect, useState } from "react"

import {
  loadUiState,
  saveUiState,
  setCardCollapsed,
  setCardsCollapsed,
  toggleSection,
  type SectionId,
} from "./ui-state.ts"

export function useUiState() {
  const [state, setState] = useState(loadUiState)

  useEffect(() => {
    saveUiState(state)
  }, [state])

  return {
    isSectionCollapsed: (id: SectionId) => Boolean(state.sections[id]),
    toggleSection: (id: SectionId) => setState((current) => toggleSection(current, id)),
    collapsedCards: new Set(state.cards),
    setCardCollapsed: (id: string, collapsed: boolean) =>
      setState((current) => setCardCollapsed(current, id, collapsed)),
    setCardsCollapsed: (ids: string[], collapsed: boolean) =>
      setState((current) => setCardsCollapsed(current, ids, collapsed)),
  }
}
