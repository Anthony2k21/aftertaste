import { CRITERIA, type CriterionId } from "./criteria.ts"
import type { Entry } from "./entries.ts"
import { KINDS, type Kind } from "./kinds.ts"

export const MIN_ENTRIES_FOR_STATS = 3

export type TypeStat = { kind: Kind; label: string; count: number; average: number }
export type CriterionStat = { id: CriterionId; label: string; short: string; average: number }
export type Driver = { id: CriterionId; short: string; r: number; text: string }
export type LateNight = {
  count: number
  share: number
  average: number | null
  restAverage: number | null
  text: string
}

export type Stats = {
  total: number
  average: number
  byType: TypeStat[]
  criteria: CriterionStat[]
  weakest: CriterionId[]
  insight: string
  driver: Driver | null
  lateNight: LateNight
  top: Entry[]
  bottom: Entry[]
  untitled: number
}

export type StatsOptions = {
  /** Hour (0-23) an entry was logged, in the viewer's time zone by default. */
  hourOf?: (iso: string) => number
}

const ENJOY: CriterionId[] = ["fulfilled", "feelAfter", "attention", "watchAgain"]
const USE: CriterionId[] = ["actOn", "learned"]

export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Pearson correlation. Null when either side never varies. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null
  const mx = mean(xs.slice(0, n)) as number
  const my = mean(ys.slice(0, n)) as number
  let cov = 0
  let vx = 0
  let vy = 0
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - mx
    const dy = ys[i]! - my
    cov += dx * dy
    vx += dx * dx
    vy += dy * dy
  }
  if (vx === 0 || vy === 0) return null
  return cov / Math.sqrt(vx * vy)
}

export function isLateNight(hour: number): boolean {
  return hour >= 0 && hour < 5
}

function localHour(iso: string): number {
  return new Date(iso).getHours()
}

function byScoreThenNewest(a: Entry, b: Entry): number {
  return b.total - a.total || b.date.localeCompare(a.date)
}

export function computeStats(entries: Entry[], options: StatsOptions = {}): Stats | null {
  if (entries.length < MIN_ENTRIES_FOR_STATS) return null
  const hourOf = options.hourOf ?? localHour
  const totals = entries.map((entry) => entry.total)

  const byType: TypeStat[] = KINDS.flatMap((kind) => {
    const group = entries.filter((entry) => entry.kind === kind.id)
    if (group.length === 0) return []
    return [
      {
        kind: kind.id,
        label: kind.label,
        count: group.length,
        average: mean(group.map((entry) => entry.total)) as number,
      },
    ]
  }).sort((a, b) => b.average - a.average || b.count - a.count)

  const criteria: CriterionStat[] = CRITERIA.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    short: criterion.short,
    average: mean(entries.map((entry) => entry.scores[criterion.id])) as number,
  }))

  const ascending = [...criteria].sort((a, b) => a.average - b.average)
  const lowest = ascending[0]!
  const highest = ascending[ascending.length - 1]!
  const weakest = ascending
    .slice(0, 2)
    .filter((item, index) => index === 0 || item.average < highest.average)
    .map((item) => item.id)

  let insight: string
  if (lowest.average === highest.average) {
    insight = "Every criterion averages the same so far."
  } else if (USE.includes(lowest.id) && ENJOY.includes(highest.id)) {
    insight = `You enjoy more than you act: “${lowest.short}” is your lowest (${lowest.average.toFixed(1)}/5).`
  } else {
    insight = `“${lowest.short}” is your weakest (${lowest.average.toFixed(1)}/5); “${highest.short}” is your strongest (${highest.average.toFixed(1)}/5).`
  }

  let driver: Driver | null = null
  for (const criterion of CRITERIA) {
    const r = pearson(
      entries.map((entry) => entry.scores[criterion.id]),
      totals,
    )
    if (r === null) continue
    if (!driver || r > driver.r) {
      driver = { id: criterion.id, short: criterion.short, r, text: "" }
    }
  }
  if (driver) {
    const strength = driver.r >= 0.7 ? "drives" : driver.r >= 0.4 ? "shapes" : "loosely tracks"
    driver.text = `“${driver.short}” ${strength} your scores most.`
  }

  const late = entries.filter((entry) => isLateNight(hourOf(entry.date)))
  const rest = entries.filter((entry) => !isLateNight(hourOf(entry.date)))
  const lateAverage = mean(late.map((entry) => entry.total))
  const restAverage = mean(rest.map((entry) => entry.total))
  let lateText: string
  if (late.length === 0) {
    lateText = "Nothing logged between midnight and 5am."
  } else if (restAverage === null) {
    lateText = "Everything so far was logged between midnight and 5am."
  } else {
    const gap = Math.round((lateAverage as number) - restAverage)
    lateText =
      Math.abs(gap) < 3
        ? "Late-night picks score about the same as the rest."
        : gap > 0
          ? `Late-night picks score ${gap} points higher than the rest.`
          : `Late-night picks score ${-gap} points lower than the rest.`
  }

  const ranked = [...entries].sort(byScoreThenNewest)
  const top = ranked.slice(0, 3)
  const topIds = new Set(top.map((entry) => entry.id))
  const bottom = ranked
    .filter((entry) => !topIds.has(entry.id))
    .slice(-3)
    .reverse()

  return {
    total: entries.length,
    average: mean(totals) as number,
    byType,
    criteria,
    weakest,
    insight,
    driver,
    lateNight: {
      count: late.length,
      share: late.length / entries.length,
      average: lateAverage,
      restAverage,
      text: lateText,
    },
    top,
    bottom,
    untitled: entries.filter((entry) => entry.title.trim() === "").length,
  }
}
