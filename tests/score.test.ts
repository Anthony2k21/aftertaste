import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { WEIGHT_TOTAL, type ScoreMap } from "../src/lib/criteria.ts"
import {
  describeImport,
  hrefFor,
  mergeEntries,
  parseBackup,
  sortEntries,
  type Entry,
} from "../src/lib/entries.ts"
import { formatPoints, scoreRatings, tierFor } from "../src/lib/score.ts"

function scores(overrides: Partial<ScoreMap> = {}): ScoreMap {
  return {
    fulfilled: 1,
    feelAfter: 1,
    watchAgain: 1,
    learned: 1,
    worthTime: 1,
    attention: 1,
    actOn: 1,
    ...overrides,
  }
}

function entry(partial: Partial<Entry> & Pick<Entry, "id" | "total" | "date">): Entry {
  return {
    title: partial.title ?? "",
    url: partial.url ?? "",
    scores: partial.scores ?? scores({ feelAfter: 5, fulfilled: 5 }),
    ...partial,
  }
}

describe("scoreRatings", () => {
  it("weights add up to 100", () => {
    assert.equal(WEIGHT_TOTAL, 100)
  })

  it("gives every 5 a perfect score", () => {
    const result = scoreRatings(
      scores({
        fulfilled: 5,
        feelAfter: 5,
        watchAgain: 5,
        learned: 5,
        worthTime: 5,
        attention: 5,
        actOn: 5,
      }),
    )
    assert.equal(result.exact, 100)
    assert.equal(result.total, 100)
    assert.equal(result.tier, "Must-rewatch")
    assert.equal(result.capped, false)
    assert.deepEqual(
      result.contributions.map((item) => item.points),
      [20, 20, 15, 15, 15, 10, 5],
    )
  })

  it("gives every 1 a zero without raising it to the cap", () => {
    const result = scoreRatings(scores())
    assert.equal(result.exact, 0)
    assert.equal(result.total, 0)
    assert.equal(result.tier, "Skip")
    assert.equal(result.capped, false)
  })

  it("scores the midpoint as 50", () => {
    const result = scoreRatings(
      scores({
        fulfilled: 3,
        feelAfter: 3,
        watchAgain: 3,
        learned: 3,
        worthTime: 3,
        attention: 3,
        actOn: 3,
      }),
    )
    assert.equal(result.exact, 50)
    assert.equal(result.total, 50)
    assert.equal(result.tier, "Meh")
  })

  it("caps a high score at 60 when feel-after is 1", () => {
    const result = scoreRatings(
      scores({
        fulfilled: 5,
        feelAfter: 1,
        watchAgain: 5,
        learned: 5,
        worthTime: 5,
        attention: 5,
        actOn: 5,
      }),
    )
    assert.equal(result.exact, 80)
    assert.equal(result.uncapped, 80)
    assert.equal(result.total, 60)
    assert.equal(result.capped, true)
    assert.equal(result.tier, "Decent")
  })

  it("rounds once, from a quarter-point sum", () => {
    const result = scoreRatings(scores({ feelAfter: 3, attention: 2 }))
    assert.equal(result.exact, 12.5)
    assert.equal(result.total, 13)
    assert.equal(result.tier, "Skip")
  })

  it("lands on 90 for a must-rewatch boundary", () => {
    const result = scoreRatings(
      scores({
        fulfilled: 5,
        feelAfter: 5,
        watchAgain: 5,
        learned: 5,
        worthTime: 5,
        attention: 3,
        actOn: 1,
      }),
    )
    assert.equal(result.total, 90)
    assert.equal(result.tier, "Must-rewatch")
  })
})

describe("tierFor", () => {
  it("follows the published cuts", () => {
    assert.equal(tierFor(100), "Must-rewatch")
    assert.equal(tierFor(90), "Must-rewatch")
    assert.equal(tierFor(89), "Great")
    assert.equal(tierFor(75), "Great")
    assert.equal(tierFor(74), "Decent")
    assert.equal(tierFor(60), "Decent")
    assert.equal(tierFor(59), "Meh")
    assert.equal(tierFor(40), "Meh")
    assert.equal(tierFor(39), "Skip")
    assert.equal(tierFor(0), "Skip")
  })
})

describe("formatPoints", () => {
  it("drops trailing zeros and keeps quarters", () => {
    assert.equal(formatPoints(15), "15")
    assert.equal(formatPoints(2.5), "2.5")
    assert.equal(formatPoints(11.25), "11.25")
    assert.equal(formatPoints(0), "0")
  })
})

describe("parseBackup", () => {
  it("recomputes a capped total and trims text", () => {
    const parsed = parseBackup({
      version: 1,
      entries: [
        {
          id: "a",
          title: "  Talk  ",
          url: " https://example.com/watch ",
          date: "2026-11-20T12:00:00.000Z",
          scores: {
            fulfilled: 5,
            feelAfter: 1,
            watchAgain: 5,
            learned: 5,
            worthTime: 5,
            attention: 5,
            actOn: 5,
          },
          total: 99,
        },
      ],
    })
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.skipped, 0)
    assert.equal(parsed.entries[0]?.title, "Talk")
    assert.equal(parsed.entries[0]?.url, "https://example.com/watch")
    assert.equal(parsed.entries[0]?.total, 60)
  })

  it("accepts a bare array and skips broken rows", () => {
    const parsed = parseBackup([
      {
        id: "ok",
        title: "Clip",
        url: "",
        date: "2026-01-02T00:00:00.000Z",
        scores: scores({ feelAfter: 4, fulfilled: 4 }),
      },
      { id: "bad", scores: { fulfilled: 9 } },
      { id: "missing-date", scores: scores({ feelAfter: 5 }), date: "" },
    ])
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.entries.length, 1)
    assert.equal(parsed.skipped, 2)
    assert.equal(parsed.entries[0]?.id, "ok")
  })

  it("rejects a file that is not a backup", () => {
    assert.deepEqual(parseBackup({ hello: "nope" }), { ok: false })
    assert.deepEqual(parseBackup(null), { ok: false })
  })
})

describe("mergeEntries and sort", () => {
  it("skips ids that are already saved", () => {
    const existing = [entry({ id: "a", total: 10, date: "2026-01-01T00:00:00.000Z" })]
    const incoming = [
      entry({ id: "a", total: 99, date: "2026-02-01T00:00:00.000Z" }),
      entry({ id: "b", total: 70, date: "2026-03-01T00:00:00.000Z" }),
    ]
    const merged = mergeEntries(existing, incoming)
    assert.equal(merged.added, 1)
    assert.equal(merged.duplicate, 1)
    assert.deepEqual(
      merged.entries.map((item) => item.id),
      ["a", "b"],
    )
  })

  it("sorts by score, then by newest date", () => {
    const entries = [
      entry({ id: "low", total: 40, date: "2026-05-01T00:00:00.000Z" }),
      entry({ id: "high-old", total: 80, date: "2026-01-01T00:00:00.000Z" }),
      entry({ id: "high-new", total: 80, date: "2026-04-01T00:00:00.000Z" }),
    ]
    assert.deepEqual(
      sortEntries(entries, "score").map((item) => item.id),
      ["high-new", "high-old", "low"],
    )
    assert.deepEqual(
      sortEntries(entries, "date").map((item) => item.id),
      ["low", "high-new", "high-old"],
    )
  })
})

describe("describeImport", () => {
  it("talks about what actually changed", () => {
    assert.equal(describeImport(2, 0, 0), "Added 2 videos.")
    assert.equal(describeImport(1, 1, 1), "Added 1 video. 1 was already saved. Skipped 1 row that didn’t look like a rating.")
    assert.equal(describeImport(0, 1, 0), "That video is already on the scoreboard.")
    assert.equal(describeImport(0, 0, 0), "That backup doesn’t include any videos.")
  })
})

describe("hrefFor", () => {
  it("allows http(s) links only", () => {
    assert.equal(hrefFor("https://example.com/a"), "https://example.com/a")
    assert.equal(hrefFor("javascript:alert(1)"), null)
    assert.equal(hrefFor("example.com"), null)
    assert.equal(hrefFor(""), null)
  })
})

describe("localStorage round trip", () => {
  it("saves and reloads entries", async () => {
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

    const storage = await import("../src/lib/storage.ts")
    const saved = [
      entry({
        id: "stored",
        title: "Notes",
        url: "https://example.com",
        total: 12,
        date: "2026-11-20T15:04:00.000Z",
        scores: scores({ feelAfter: 3, attention: 2 }),
      }),
    ]
    assert.equal(storage.persistEntries(saved), true)
    const loaded = storage.loadEntries()
    assert.equal(loaded.length, 1)
    assert.equal(loaded[0]?.title, "Notes")
    assert.equal(loaded[0]?.total, 13)
    assert.equal(loaded[0]?.scores.attention, 2)
  })
})
