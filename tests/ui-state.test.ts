import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  UI_STATE_KEY,
  emptyUiState,
  loadUiState,
  parseUiState,
  saveUiState,
  setCardCollapsed,
  setCardsCollapsed,
  toggleSection,
} from "../src/lib/ui-state.ts"

describe("ui state", () => {
  it("toggles sections and cards", () => {
    let state = toggleSection(emptyUiState(), "stats")
    assert.equal(state.sections.stats, true)
    state = toggleSection(state, "stats")
    assert.equal(state.sections.stats, undefined)

    state = setCardCollapsed(state, "a", true)
    state = setCardCollapsed(state, "a", true)
    assert.deepEqual(state.cards, ["a"])
    state = setCardsCollapsed(state, ["a", "b", "c"], true)
    assert.deepEqual(state.cards.sort(), ["a", "b", "c"])
    state = setCardsCollapsed(state, ["a", "b"], false)
    assert.deepEqual(state.cards, ["c"])
    state = setCardCollapsed(state, "c", false)
    assert.deepEqual(state.cards, [])
  })

  it("ignores junk when parsing", () => {
    assert.deepEqual(parseUiState(null), emptyUiState())
    assert.deepEqual(parseUiState({ sections: { form: true, nope: true, stats: "yes" }, cards: ["x", 3, "x"] }), {
      sections: { form: true },
      cards: ["x"],
    })
  })

  it("survives a reload through localStorage", () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
      },
    })
    saveUiState({ sections: { scoreboard: true }, cards: ["id-1"] })
    assert.ok(store.has(UI_STATE_KEY))
    assert.deepEqual(loadUiState(), { sections: { scoreboard: true }, cards: ["id-1"] })
    store.set(UI_STATE_KEY, "{broken")
    assert.deepEqual(loadUiState(), emptyUiState())
  })
})
