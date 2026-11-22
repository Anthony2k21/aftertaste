import type { ReactNode } from "react"

import { CollapseToggle } from "@/components/CollapseToggle"
import { SectionTitle } from "@/components/SectionTitle"
import type { Entry } from "@/lib/entries"
import { kindLabel } from "@/lib/kinds"
import { MIN_ENTRIES_FOR_STATS, computeStats, type Stats as StatsData } from "@/lib/stats"

type StatsProps = {
  index: string
  entries: Entry[]
  loading?: boolean
  collapsed: boolean
  onToggle: () => void
}

export function Stats({ index, entries, loading = false, collapsed, onToggle }: StatsProps) {
  const stats = loading ? null : computeStats(entries)

  return (
    <section className="flex flex-col gap-4" aria-labelledby="stats-title">
      <div className="flex items-center justify-between gap-3">
        <div id="stats-title">
          <SectionTitle index={index}>Stats</SectionTitle>
        </div>
        <CollapseToggle collapsed={collapsed} onToggle={onToggle} label="stats" controls="stats-body" />
      </div>
      <div id="stats-body" hidden={collapsed}>
        {loading ? (
          <Empty title="Loading stats" body="Checking this account." />
        ) : !stats ? (
          <Empty
            title="Stats unlock at 3 ratings"
            body={`${entries.length} of ${MIN_ENTRIES_FOR_STATS} so far. Rate a few more and the patterns show up here.`}
            progress={entries.length}
          />
        ) : (
          <StatsBody stats={stats} />
        )}
      </div>
    </section>
  )
}

function Empty({ title, body, progress }: { title: string; body: string; progress?: number }) {
  return (
    <div className="border border-dashed border-line bg-paper/60 px-6 py-10 text-center">
      <p className="font-heading text-xl font-bold uppercase">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-bark">{body}</p>
      {progress !== undefined ? (
        <div className="mx-auto mt-4 grid w-24 grid-cols-3 gap-1" aria-hidden="true">
          {Array.from({ length: MIN_ENTRIES_FOR_STATS }, (_, i) => (
            <span key={i} className={i < progress ? "h-2.5 bg-clay" : "h-2.5 border border-line bg-cream"} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border border-line bg-paper px-4 py-4 sm:px-5">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-bark uppercase">{title}</p>
      {children}
    </div>
  )
}

function Blocks({ value, max, segments = 20, tone = "accent" }: { value: number; max: number; segments?: number; tone?: "accent" | "low" }) {
  const lit = Math.round((value / max) * segments)
  const on = tone === "low" ? "bg-ink" : "bg-clay"
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={i < lit ? `h-2 ${on}` : "h-2 bg-linen"} />
      ))}
    </div>
  )
}

function Insight({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-xs leading-relaxed text-ink">
      <span className="text-clay">&gt; </span>
      {children}
    </p>
  )
}

function round(value: number): number {
  return Math.round(value)
}

function StatsBody({ stats }: { stats: StatsData }) {
  const weakest = new Set(stats.weakest)
  const late = stats.lateNight

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-line bg-paper px-4 py-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-bark uppercase">Entries</p>
          <p className="mt-2 font-sans text-4xl leading-none font-bold tabular-nums">{stats.total}</p>
        </div>
        <div className="border border-line bg-paper px-4 py-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-bark uppercase">Average</p>
          <p className="mt-2 font-sans text-4xl leading-none font-bold text-clay tabular-nums">
            {String(round(stats.average)).padStart(3, "0")}
          </p>
        </div>
      </div>

      <Panel title="By type · best first">
        <ul className="grid gap-3">
          {stats.byType.map((type) => (
            <li key={type.kind}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="tracking-[0.12em] uppercase">
                  <span className="text-clay">[{type.label}]</span>{" "}
                  <span className="text-bark">×{type.count}</span>
                </span>
                <span className="font-semibold tabular-nums">{round(type.average)}</span>
              </div>
              <Blocks value={type.average} max={100} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Criteria · average out of 5">
        <ul className="grid gap-3">
          {stats.criteria.map((criterion) => {
            const low = weakest.has(criterion.id)
            return (
              <li key={criterion.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className={`tracking-[0.12em] uppercase ${low ? "text-ink" : "text-bark"}`}>
                    {criterion.short}
                    {low ? (
                      <span className="ml-2 border border-ink px-1 py-px text-[9px] tracking-[0.16em]">Low</span>
                    ) : null}
                  </span>
                  <span className="font-semibold tabular-nums">{criterion.average.toFixed(1)}</span>
                </div>
                <Blocks value={criterion.average} max={5} tone={low ? "low" : "accent"} />
              </li>
            )
          })}
        </ul>
        <Insight>{stats.insight}</Insight>
        {stats.driver ? (
          <Insight>
            {stats.driver.text}{" "}
            <span className="text-bark tabular-nums">(r = {stats.driver.r.toFixed(2)})</span>
          </Insight>
        ) : null}
      </Panel>

      <Panel title="Late night · 00:00–04:59">
        <div className="flex items-end justify-between gap-4">
          <p className="font-sans text-3xl leading-none font-bold tabular-nums">
            {Math.round(late.share * 100)}
            <span className="text-base text-bark">%</span>
          </p>
          <p className="text-right text-xs leading-relaxed text-bark tabular-nums">
            {late.count} of {stats.total} logged late
            <br />
            avg {late.average === null ? "–" : round(late.average)} vs {late.restAverage === null ? "–" : round(late.restAverage)} rest
          </p>
        </div>
        <div className="mt-3">
          <Blocks value={late.share} max={1} />
        </div>
        <Insight>{late.text}</Insight>
      </Panel>

      <div className="grid gap-2 sm:grid-cols-2">
        <Panel title="Top 3">
          <RankList entries={stats.top} />
        </Panel>
        <Panel title="Bottom 3">
          {stats.bottom.length > 0 ? (
            <RankList entries={stats.bottom} />
          ) : (
            <p className="text-xs text-bark">Needs a fourth rating.</p>
          )}
        </Panel>
      </div>

      {stats.untitled > 0 ? (
        <p className="border border-dashed border-clay/60 bg-clay/5 px-4 py-3 text-xs leading-relaxed text-ink">
          <span className="font-semibold text-clay">! </span>
          {stats.untitled} {stats.untitled === 1 ? "entry has" : "entries have"} no title. Name them next time so you
          know what to repeat and what to skip.
        </p>
      ) : null}
    </div>
  )
}

function RankList({ entries }: { entries: Entry[] }) {
  return (
    <ol className="grid grid-cols-1 gap-2">
      {entries.map((entry, i) => (
        <li key={entry.id} className="flex min-w-0 items-baseline gap-2 text-xs">
          <span className="text-bark tabular-nums">{i + 1}.</span>
          <span className="shrink-0 text-[10px] tracking-[0.12em] text-clay uppercase">[{kindLabel(entry.kind)}]</span>
          <span className="min-w-0 flex-1 truncate">{entry.title.trim() || "Untitled"}</span>
          <span className="shrink-0 font-semibold text-clay tabular-nums">{entry.total}</span>
        </li>
      ))}
    </ol>
  )
}
