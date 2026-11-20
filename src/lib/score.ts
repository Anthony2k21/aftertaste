import { CRITERIA, type CriterionId, type ScoreMap } from "./criteria.ts"

export type TierName = "Must-rewatch" | "Great" | "Decent" | "Meh" | "Skip"

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
  if (total >= 90) return "Must-rewatch"
  if (total >= 75) return "Great"
  if (total >= 60) return "Decent"
  if (total >= 40) return "Meh"
  return "Skip"
}

export function tierClass(tier: TierName): string {
  switch (tier) {
    case "Must-rewatch":
      return "bg-ink text-paper"
    case "Great":
      return "bg-bark text-paper"
    case "Decent":
      return "bg-clay text-paper"
    case "Meh":
      return "bg-linen text-ink"
    case "Skip":
      return "bg-paper text-bark ring-1 ring-ink/15"
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
