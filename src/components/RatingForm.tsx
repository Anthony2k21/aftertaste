import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionTitle } from "@/components/SectionTitle"
import {
  CRITERIA,
  asComplete,
  emptyRatings,
  ratedCount,
  type CriterionId,
  type DraftRatings,
} from "@/lib/criteria"
import type { Entry } from "@/lib/entries"
import { DEFAULT_KIND, KINDS, type Kind } from "@/lib/kinds"
import { formatPoints, scoreRatings, tierClass } from "@/lib/score"

type RatingFormProps = {
  onSave: (entry: Entry) => Promise<string | null> | string | null
  savedLabel: string
  holdMessage?: string | null
}

export function RatingForm({ onSave, savedLabel, holdMessage = null }: RatingFormProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<Kind>(DEFAULT_KIND)
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
        kind,
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
    <Card className="shadow-none [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader>
        <SectionTitle index="01">Rate something</SectionTitle>
        <p className="mt-1 text-sm leading-relaxed text-bark">
          Anything you watched, heard, read, played or lived. Title and link can stay blank; the score comes from the seven ratings.
        </p>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-8" onSubmit={onSubmit} noValidate>
          <div className="grid gap-5">
            <KindPicker value={kind} onChange={(next) => {
              setKind(next)
              setNotice(null)
            }} />
            <div className="grid gap-2">
              <Label htmlFor="entry-title">Title (optional)</Label>
              <Input
                ref={titleRef}
                id="entry-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setNotice(null)
                }}
                placeholder="An album, a book, a night out"
                autoComplete="off"
                className="h-12 bg-cream px-3.5 text-base placeholder:text-bark/60"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-url">Link (optional)</Label>
              <Input
                id="entry-url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  setNotice(null)
                }}
                placeholder="https://"
                autoComplete="off"
                inputMode="url"
                className="h-12 bg-cream px-3.5 text-base placeholder:text-bark/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-bark uppercase">Scale 1–5 · 1 is low · 5 is high</p>
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
              className="h-12 px-6 text-sm sm:min-w-44"
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
    <fieldset className="m-0 border-0 border-t border-line p-0 pt-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <p id={labelId} className="min-w-0 text-sm leading-snug font-semibold text-ink">
          {label}
        </p>
        <p className="shrink-0 text-[11px] font-semibold tracking-[0.14em] tabular-nums text-clay">W{String(weight).padStart(2, "0")}</p>
      </div>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-5 gap-1"
        onKeyDown={onKeyDown}
      >
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score
          const filled = value !== null && score < value
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
                  ? "h-12 w-full min-w-0 px-0 text-base font-bold tracking-normal tabular-nums"
                  : filled
                    ? "h-12 w-full min-w-0 border-clay/50 bg-clay/15 px-0 text-base tracking-normal text-clay tabular-nums hover:bg-clay/25"
                    : "h-12 w-full min-w-0 border-line bg-cream px-0 text-base tracking-normal text-bark tabular-nums hover:text-ink"
              }
            >
              {score}
            </Button>
          )
        })}
      </div>
      {hint ? <p className="mt-2 text-xs text-bark"><span className="text-clay">! </span>{hint}</p> : null}
    </fieldset>
  )
}

function ScoreReadout({ ratings }: { ratings: DraftRatings }) {
  const complete = asComplete(ratings)
  const result = complete ? scoreRatings(complete) : null
  const filled = ratedCount(ratings)

  if (!result) {
    return (
      <div className="border border-dashed border-line bg-linen px-4 py-4 sm:px-5" aria-live="polite">
        <p className="text-xs leading-relaxed text-bark">
          {filled}/7 rated. The total shows up when every row has a number.
        </p>
        <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
          {CRITERIA.map((criterion) => (
            <span
              key={criterion.id}
              className={
                ratings[criterion.id] === null
                  ? "h-2.5 border border-line bg-cream"
                  : "h-2.5 bg-clay"
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
    <div className="border border-clay/50 bg-cream px-4 py-5 sm:px-6" aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-bark uppercase">Total / 100</p>
          <p className="mt-2 font-sans text-6xl leading-none font-bold tabular-nums sm:text-7xl">
            <span className="text-bark/50" aria-hidden="true">[</span>
            <span className="text-clay">{String(result.total).padStart(3, "0")}</span>
            <span className="sr-only">{result.total}</span>
            <span className="text-bark/50" aria-hidden="true">]</span>
          </p>
        </div>
        <p className={`px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase ${tierClass(result.tier)}`}>
          {result.tier}
        </p>
      </div>
      <SegmentBar value={result.total} />
      {note ? <p className="mt-3 text-xs leading-relaxed text-bark">{note}</p> : null}
      <ul className="mt-6 flex flex-col gap-3">
        {result.contributions.map((item) => {
          const width = item.weight === 0 ? 0 : (item.points / item.weight) * 100
          return (
            <li key={item.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="tracking-[0.12em] text-ink uppercase">{item.short}</span>
                <span className="tabular-nums text-bark">
                  {formatPoints(item.points)} / {item.weight}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden bg-linen"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={item.weight}
                aria-valuenow={item.points}
                aria-label={`${item.label}: ${formatPoints(item.points)} of ${item.weight}`}
              >
                <div
                  className="h-full bg-clay motion-safe:transition-[width] motion-safe:duration-300"
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

function SegmentBar({ value }: { value: number }) {
  const lit = Math.round(value / 5)
  return (
    <div className="mt-4 grid grid-cols-20 gap-[3px]" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <span key={index} className={index < lit ? "h-3 bg-clay" : "h-3 bg-linen"} />
      ))}
    </div>
  )
}

function KindPicker({ value, onChange }: { value: Kind; onChange: (kind: Kind) => void }) {
  const groupRef = useRef<HTMLDivElement>(null)

  function choose(index: number) {
    const next = KINDS[(index + KINDS.length) % KINDS.length]
    onChange(next.id)
    requestAnimationFrame(() => {
      groupRef.current?.querySelector<HTMLButtonElement>(`[data-kind="${next.id}"]`)?.focus()
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown"
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp"
    if (!forward && !back) return
    event.preventDefault()
    const current = KINDS.findIndex((kind) => kind.id === value)
    choose(current + (forward ? 1 : -1))
  }

  return (
    <div className="grid gap-2">
      <p id="entry-kind-label" className="text-[11px] leading-none font-semibold tracking-[0.18em] text-bark uppercase">
        Type
      </p>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby="entry-kind-label"
        className="grid grid-cols-4 gap-1"
        onKeyDown={onKeyDown}
      >
        {KINDS.map((kind) => {
          const selected = kind.id === value
          return (
            <Button
              key={kind.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-kind={kind.id}
              variant={selected ? "default" : "outline"}
              onClick={() => onChange(kind.id)}
              className={
                selected
                  ? "h-10 min-w-0 px-1 text-[10px] tracking-[0.08em]"
                  : "h-10 min-w-0 border-line bg-cream px-1 text-[10px] tracking-[0.08em] text-bark hover:text-ink"
              }
            >
              {kind.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
