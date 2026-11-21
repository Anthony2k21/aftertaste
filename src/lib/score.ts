import { CRITERIA, type CriterionId, type ScoreMap } from "./criteria.ts"

export type TierName = "Must-revisit" | "Great" | "Decent" | "Meh" | "Skip"

export type Contribution = {
  id: CriterionId
  label: string
  short: string
  weight: number
  score: number
  points: number
}

export type ScoreResult = {
  total: number
  exact: number
  uncapped: number
  capped: boolean
  contributions: Contribution[]
  tier: TierName
}

export function pointsFor(weight: number, score: number): number {
  return (weight * (score - 1)) / 4
}

export function formatPoints(value: number): string {
  const quarters = Math.round(value * 4) / 4
  return quarters.toFixed(2).replace(/0$/, "").replace(/\.0$/, "")
}

export function tierFor(total: number): TierName {
  if (total >= 90) return "Must-revisit"
  if (total >= 75) return "Great"
  if (total >= 60) return "Decent"
  if (total >= 40) return "Meh"
  return "Skip"
}

export function tierClass(tier: TierName): string {
  switch (tier) {
    case "Must-revisit":
      return "border border-clay bg-clay text-cream"
    case "Great":
      return "border border-clay text-clay"
    case "Decent":
      return "border border-ink/70 text-ink"
    case "Meh":
      return "border border-line text-bark"
    case "Skip":
      return "border border-dashed border-line text-bark"
  }
}

export function scoreRatings(scores: ScoreMap): ScoreResult {
  const contributions: Contribution[] = CRITERIA.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    short: criterion.short,
    weight: criterion.weight,
    score: scores[criterion.id],
    points: pointsFor(criterion.weight, scores[criterion.id]),
  }))

  const exact = contributions.reduce((sum, contribution) => sum + contribution.points, 0)
  const uncapped = Math.round(exact)
  const capped = scores.feelAfter === 1 && uncapped > 60
  const total = scores.feelAfter === 1 ? Math.min(uncapped, 60) : uncapped

  return {
    total,
    exact,
    uncapped,
    capped,
    contributions,
    tier: tierFor(total),
  }
}
