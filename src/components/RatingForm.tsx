import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CRITERIA,
  asComplete,
  emptyRatings,
  ratedCount,
  type CriterionId,
  type DraftRatings,
} from "@/lib/criteria"
import type { Entry } from "@/lib/entries"
import { formatPoints, scoreRatings, tierClass } from "@/lib/score"

type RatingFormProps = {
  onSave: (entry: Entry) => Promise<string | null> | string | null
  savedLabel: string
  holdMessage?: string | null
}

export function RatingForm({ onSave, savedLabel, holdMessage = null }: RatingFormProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [ratings, setRatings] = useState<DraftRatings>(() => emptyRatings())
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const complete = asComplete(ratings)
  const result = complete ? scoreRatings(complete) : null
  const helper = notice ?? holdMessage ?? (result ? "" : "Rate all seven to save.")

  function setScore(id: CriterionId, score: number) {
    setRatings((current) => ({ ...current, [id]: score }))
    setNotice(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!complete || !result || saving || holdMessage) return
    setSaving(true)
    try {
      const error = await onSave({
        id: crypto.randomUUID(),
        title: title.trim(),
        url: url.trim(),
        date: new Date().toISOString(),
        scores: complete,
        total: result.total,
      })
      if (error) {
        setNotice(error)
        return
      }
      setTitle("")
      setUrl("")
      setRatings(emptyRatings())
      setNotice(savedLabel)
      titleRef.current?.focus()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-3xl shadow-none ring-ink/10 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader>
        <h2 className="text-3xl leading-tight font-medium">Rate a video</h2>
        <p className="text-base text-bark">
          Title and link can stay blank. The score comes from the seven ratings.
        </p>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-8" onSubmit={onSubmit} noValidate>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="video-title">Title (optional)</Label>
              <Input
                ref={titleRef}
                id="video-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setNotice(null)
                }}
                placeholder="A film, a talk, a clip"
                autoComplete="off"
                className="h-12 rounded-xl bg-paper px-3.5 text-base placeholder:text-clay"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-url">Link (optional)</Label>
              <Input
                id="video-url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  setNotice(null)
                }}
                placeholder="https://"
                autoComplete="off"
                inputMode="url"
                className="h-12 rounded-xl bg-paper px-3.5 text-base placeholder:text-clay"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <p className="text-sm text-bark">1 is low. 5 is high.</p>
            {CRITERIA.map((criterion) => (
              <RatingScale
                key={criterion.id}
                id={criterion.id}
                label={criterion.label}
                weight={criterion.weight}
                value={ratings[criterion.id]}
                onChange={(score) => setScore(criterion.id, score)}
                hint={
                  criterion.id === "feelAfter" ? "A 1 caps the total at 60." : undefined
                }
              />
            ))}
          </div>

          <ScoreReadout ratings={ratings} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-h-5 text-sm text-bark" role="status">
              {helper}
            </p>
            <Button
              type="submit"
              disabled={!result || saving || Boolean(holdMessage)}
              className="h-12 rounded-full px-6 text-base sm:min-w-40"
            >
              {saving ? "Saving…" : "Save rating"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function RatingScale({
  id,
  label,
  weight,
  value,
  onChange,
  hint,
}: {
  id: string
  label: string
  weight: number
  value: number | null
  onChange: (score: number) => void
  hint?: string
}) {
  const groupRef = useRef<HTMLDivElement>(null)
  const labelId = `${id}-label`

  function choose(next: number) {
    onChange(next)
    requestAnimationFrame(() => {
      groupRef.current?.querySelector<HTMLButtonElement>(`[data-score="${next}"]`)?.focus()
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown"
    ) {
      return
    }
    event.preventDefault()
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1
    const current = value ?? (delta > 0 ? 0 : 6)
    choose(Math.min(5, Math.max(1, current + delta)))
  }

  return (
    <fieldset className="m-0 border-0 p-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p id={labelId} className="min-w-0 text-base leading-snug font-medium">
          {label}
        </p>
        <p className="shrink-0 text-sm tabular-nums text-clay">{weight}%</p>
      </div>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-5 gap-1.5 sm:gap-2"
        onKeyDown={onKeyDown}
      >
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score
          const tabIndex = value === null ? (score === 1 ? 0 : -1) : selected ? 0 : -1
          return (
            <Button
              key={score}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={tabIndex}
              data-score={score}
              variant={selected ? "default" : "outline"}
              onClick={() => choose(score)}
              className={
                selected
                  ? "h-11 w-full min-w-0 rounded-xl px-0 text-base tabular-nums sm:h-12"
                  : "h-11 w-full min-w-0 rounded-xl border-clay/70 bg-paper px-0 text-base text-ink tabular-nums shadow-none hover:bg-linen sm:h-12"
              }
            >
              {score}
            </Button>
          )
        })}
      </div>
      {hint ? <p className="mt-2 text-sm text-bark">{hint}</p> : null}
    </fieldset>
  )
}

function ScoreReadout({ ratings }: { ratings: DraftRatings }) {
  const complete = asComplete(ratings)
  const result = complete ? scoreRatings(complete) : null
  const filled = ratedCount(ratings)

  if (!result) {
    return (
      <div className="rounded-2xl bg-linen px-4 py-4 sm:px-5" aria-live="polite">
        <p className="text-sm text-bark">
          {filled} of 7 rated. The total shows up when every row has a number.
        </p>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {CRITERIA.map((criterion) => (
            <span
              key={criterion.id}
              className={
                ratings[criterion.id] === null
                  ? "size-2 rounded-full bg-paper ring-1 ring-clay/50"
                  : "size-2 rounded-full bg-ink"
              }
            />
          ))}
        </div>
      </div>
    )
  }

  const exactLabel = formatPoints(result.exact)
  const note =
    result.capped
      ? `Adds up to ${exactLabel}. Capped at 60 because “feel after” is 1.`
      : result.exact !== result.total
        ? `Adds up to ${exactLabel}, rounded to ${result.total}.`
        : null

  return (
    <div className="rounded-2xl bg-linen px-4 py-5 sm:px-6" aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-bark uppercase">Total</p>
          <p className="mt-2 font-heading text-6xl leading-none font-medium tabular-nums sm:text-7xl">
            {result.total}
          </p>
        </div>
        <p className={`rounded-full px-3 py-1.5 text-sm font-medium ${tierClass(result.tier)}`}>
          {result.tier}
        </p>
      </div>
      {note ? <p className="mt-3 text-sm leading-relaxed text-bark">{note}</p> : null}
      <ul className="mt-6 flex flex-col gap-3">
        {result.contributions.map((item) => {
          const width = item.weight === 0 ? 0 : (item.points / item.weight) * 100
          return (
            <li key={item.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink">{item.short}</span>
                <span className="tabular-nums text-bark">
                  {formatPoints(item.points)} / {item.weight}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-ink/10"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={item.weight}
                aria-valuenow={item.points}
                aria-label={`${item.label}: ${formatPoints(item.points)} of ${item.weight}`}
              >
                <div
                  className="h-full rounded-full bg-clay motion-safe:transition-[width] motion-safe:duration-300"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
