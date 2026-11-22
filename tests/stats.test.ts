import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { ScoreMap } from "../src/lib/criteria.ts"
import type { Entry } from "../src/lib/entries.ts"
import type { Kind } from "../src/lib/kinds.ts"
import { scoreRatings } from "../src/lib/score.ts"
import { computeStats, isLateNight, mean, pearson } from "../src/lib/stats.ts"

const utcHour = (iso: string) => new Date(iso).getUTCHours()

function make(id: string, kind: Kind, scores: ScoreMap, date: string, title = id): Entry {
  return { id, kind, title, url: "", date, scores, total: scoreRatings(scores).total }
}

function s(fulfilled: number, rest: Partial<ScoreMap> = {}): ScoreMap {
  return {
    fulfilled,
    feelAfter: 4,
    watchAgain: 4,
    learned: 3,
    worthTime: 4,
    attention: 4,
    actOn: 2,
    ...rest,
  }
}

const sample: Entry[] = [
  make("a", "video", s(5), "2026-11-20T00:30:00.000Z"),
  make("b", "video", s(2), "2026-11-20T01:15:00.000Z", ""),
  make("c", "music", s(5, { feelAfter: 5, watchAgain: 5 }), "2026-11-20T14:00:00.000Z"),
  make("d", "experience", s(3), "2026-11-20T18:00:00.000Z"),
  make("e", "video", s(1, { feelAfter: 2 }), "2026-11-20T20:00:00.000Z", "  "),
  make("f", "music", s(4), "2026-11-21T03:59:00.000Z"),
]

describe("helpers", () => {
  it("mean and pearson behave", () => {
    assert.equal(mean([]), null)
    assert.equal(mean([1, 2, 3]), 2)
    assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1)
    assert.equal(pearson([1, 2, 3], [3, 2, 1]), -1)
    assert.equal(pearson([2, 2, 2], [1, 2, 3]), null)
    assert.equal(pearson([1], [1]), null)
  })

  it("late night is 00:00 to 04:59", () => {
    assert.equal(isLateNight(0), true)
    assert.equal(isLateNight(4), true)
    assert.equal(isLateNight(5), false)
    assert.equal(isLateNight(23), false)
  })
})

describe("computeStats", () => {
  it("needs at least three entries", () => {
    assert.equal(computeStats([]), null)
    assert.equal(computeStats(sample.slice(0, 2)), null)
    assert.notEqual(computeStats(sample.slice(0, 3), { hourOf: utcHour }), null)
  })

  it("groups by type, best average first", () => {
    const stats = computeStats(sample, { hourOf: utcHour })!
    assert.equal(stats.total, 6)
    assert.deepEqual(
      stats.byType.map((type) => [type.kind, type.count]),
      [
        ["music", 2],
        ["experience", 1],
        ["video", 3],
      ],
    )
    const music = stats.byType[0]!
    assert.equal(music.average, (sample[2]!.total + sample[5]!.total) / 2)
    assert.equal(stats.average, sample.reduce((sum, e) => sum + e.total, 0) / 6)
  })

  it("averages each criterion and flags the weakest with an insight", () => {
    const stats = computeStats(sample, { hourOf: utcHour })!
    const actOn = stats.criteria.find((c) => c.id === "actOn")!
    assert.equal(actOn.average, 2)
    assert.equal(stats.weakest[0], "actOn")
    assert.equal(stats.weakest[1], "learned")
    assert.match(stats.insight, /You enjoy more than you act/)
    assert.match(stats.insight, /Act on it/)
  })

  it("names the criterion that tracks the total most closely", () => {
    const stats = computeStats(sample, { hourOf: utcHour })!
    assert.equal(stats.driver?.id, "fulfilled")
    assert.ok(stats.driver!.r > 0.9)
    assert.match(stats.driver!.text, /Fulfilled/)
  })

  it("splits late-night entries from the rest", () => {
    const stats = computeStats(sample, { hourOf: utcHour })!
    const late = [sample[0]!, sample[1]!, sample[5]!]
    const rest = [sample[2]!, sample[3]!, sample[4]!]
    assert.equal(stats.lateNight.count, 3)
    assert.equal(stats.lateNight.share, 0.5)
    assert.equal(stats.lateNight.average, late.reduce((t, e) => t + e.total, 0) / 3)
    assert.equal(stats.lateNight.restAverage, rest.reduce((t, e) => t + e.total, 0) / 3)
  })

  it("lists top and bottom three without overlap, and counts untitled", () => {
    const stats = computeStats(sample, { hourOf: utcHour })!
    assert.deepEqual(stats.top.map((e) => e.id), ["c", "a", "f"])
    assert.deepEqual(stats.bottom.map((e) => e.id), ["e", "b", "d"])
    assert.equal(stats.untitled, 2)

    const small = computeStats(sample.slice(0, 4), { hourOf: utcHour })!
    assert.equal(small.top.length, 3)
    assert.equal(small.bottom.length, 1)
  })

  it("copes when nothing varies", () => {
    const flat = ["x", "y", "z"].map((id) => make(id, "book", s(3), "2026-11-20T12:00:00.000Z"))
    const stats = computeStats(flat, { hourOf: utcHour })!
    assert.equal(stats.driver, null)
    assert.equal(stats.lateNight.count, 0)
    assert.match(stats.lateNight.text, /Nothing logged/)
  })
})
