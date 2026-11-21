import { Card, CardContent } from "@/components/ui/card"
import { SectionTitle } from "@/components/SectionTitle"
import { CRITERIA } from "@/lib/criteria"

const TIERS = [
  ["90 and above", "Must-rewatch"],
  ["75–89", "Great"],
  ["60–74", "Decent"],
  ["40–59", "Meh"],
  ["Under 40", "Skip"],
] as const

export function ScoringGuide() {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle index="02">How scoring works</SectionTitle>
      <Card className="shadow-none [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(7)]">
        <CardContent className="gap-6 text-sm leading-relaxed text-bark">
          <p>
            A rating of 1 adds nothing. A rating of 5 adds that row’s full weight.
            2, 3, and 4 fill in a quarter, a half, and three quarters. The weights
            add up to 100. The total is the sum, rounded to the nearest whole number.
          </p>
          <p className="border-l-2 border-clay bg-linen px-4 py-3 text-ink">
            score = round(sum of weight × (rating − 1) / 4)
          </p>
          <ul className="grid gap-0">
            {CRITERIA.map((criterion) => (
              <li
                key={criterion.id}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0"
              >
                <span>{criterion.label}</span>
                <span className="shrink-0 tabular-nums text-clay">{criterion.weight}%</span>
              </li>
            ))}
          </ul>
          <p>
            If “How good do I feel after watching” is 1, the rounded total stops at 60.
          </p>
          <ul className="grid gap-2">
            {TIERS.map(([range, name]) => (
              <li key={name} className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
                <span className="font-semibold tracking-[0.1em] text-ink uppercase">{name}</span>
                <span className="tabular-nums">{range}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
