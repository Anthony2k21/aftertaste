export const CRITERIA = [
  {
    id: "fulfilled",
    label: "How fulfilled do I feel",
    short: "Fulfilled",
    weight: 20,
  },
  {
    id: "feelAfter",
    label: "How good do I feel afterwards",
    short: "Feel after",
    weight: 20,
  },
  {
    id: "watchAgain",
    label: "Would I do it again",
    short: "Do again",
    weight: 15,
  },
  {
    id: "learned",
    label: "Did I learn something",
    short: "Learned",
    weight: 15,
  },
  {
    id: "worthTime",
    label: "Worth the time",
    short: "Worth the time",
    weight: 15,
  },
  {
    id: "attention",
    label: "Held my attention",
    short: "Attention",
    weight: 10,
  },
  {
    id: "actOn",
    label: "Will I act on it",
    short: "Act on it",
    weight: 5,
  },
] as const

export type CriterionId = (typeof CRITERIA)[number]["id"]

export type ScoreMap = Record<CriterionId, number>

export type DraftRatings = Record<CriterionId, number | null>

export const WEIGHT_TOTAL = CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0)

export function emptyRatings(): DraftRatings {
  return {
    fulfilled: null,
    feelAfter: null,
    watchAgain: null,
    learned: null,
    worthTime: null,
    attention: null,
    actOn: null,
  }
}

export function ratedCount(ratings: DraftRatings): number {
  return CRITERIA.reduce((count, criterion) => {
    return ratings[criterion.id] === null ? count : count + 1
  }, 0)
}

export function asComplete(ratings: DraftRatings): ScoreMap | null {
  if (CRITERIA.some((criterion) => ratings[criterion.id] === null)) return null
  return {
    fulfilled: ratings.fulfilled as number,
    feelAfter: ratings.feelAfter as number,
    watchAgain: ratings.watchAgain as number,
    learned: ratings.learned as number,
    worthTime: ratings.worthTime as number,
    attention: ratings.attention as number,
    actOn: ratings.actOn as number,
  }
}
