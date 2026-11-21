import { useRef, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SectionTitle } from "@/components/SectionTitle"
import { CRITERIA } from "@/lib/criteria"
import {
  backupPayload,
  describeImport,
  formatWhen,
  hostLabel,
  hrefFor,
  mergeEntries,
  parseBackup,
  sortEntries,
  type Entry,
  type SortKey,
} from "@/lib/entries"
import { KINDS, kindLabel, type Kind } from "@/lib/kinds"
import { tierClass, tierFor } from "@/lib/score"

type ScoreboardProps = {
  entries: Entry[]
  loading?: boolean
  storageLabel: string
  emptyHint: string
  onDelete: (id: string) => Promise<void> | void
  onReplace: (entries: Entry[]) => Promise<void> | void
}

export function Scoreboard({
  entries,
  loading = false,
  storageLabel,
  emptyHint,
  onDelete,
  onReplace,
}: ScoreboardProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [sort, setSort] = useState<SortKey>("score")
  const [filter, setFilter] = useState<Kind | "all">("all")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const presentKinds = KINDS.filter((kind) => entries.some((entry) => entry.kind === kind.id))
  const activeFilter =
    filter !== "all" && presentKinds.some((kind) => kind.id === filter) ? filter : "all"
  const visible = sortEntries(
    activeFilter === "all" ? entries : entries.filter((entry) => entry.kind === activeFilter),
    sort,
  )

  async function run(action: () => Promise<void> | void, success: string) {
    setPending(true)
    try {
      await action()
      setMessage(success)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That didn’t work.")
    } finally {
      setPending(false)
    }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(backupPayload(entries), null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `aftertaste-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setMessage("Downloaded a JSON backup.")
  }

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const parsed = parseBackup(JSON.parse(await file.text()))
      if (!parsed.ok) {
        setMessage("That file isn’t a backup this app can read.")
        return
      }
      const merged = mergeEntries(entries, parsed.entries)
      await run(
        () => onReplace(merged.entries),
        describeImport(merged.added, merged.duplicate, parsed.skipped),
      )
    } catch {
      setMessage("That file isn’t a backup this app can read.")
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionTitle index="03">Scoreboard</SectionTitle>
            <p className="mt-1.5 text-[11px] font-semibold tracking-[0.16em] text-bark uppercase">
              {entries.length === 0
                ? "Nothing saved yet"
                : `${activeFilter === "all" ? entries.length : `${visible.length} of ${entries.length}`} saved · ${sort === "score" ? "highest score first" : "newest first"}`}
            </p>
          </div>
          <div className="flex border border-line bg-cream p-0.5" role="group" aria-label="Sort saved ratings">
            <Button
              type="button"
              size="sm"
              variant={sort === "score" ? "default" : "ghost"}
              aria-pressed={sort === "score"}
              onClick={() => setSort("score")}
              className="px-3"
            >
              Score
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sort === "date" ? "default" : "ghost"}
              aria-pressed={sort === "date"}
              onClick={() => setSort("date")}
              className="px-3"
            >
              Date
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-paper"
            onClick={exportBackup}
            disabled={entries.length === 0 || pending}
          >
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-paper"
            onClick={() => fileRef.current?.click()}
            disabled={pending || loading}
          >
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={onImport}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-paper"
                disabled={entries.length === 0 || pending}
              >
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the scoreboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {entries.length} saved{" "}
                  {entries.length === 1 ? "rating" : "ratings"} from {storageLabel}.
                  A file you already exported stays where you put it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep them</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    void run(() => onReplace([]), "Cleared the scoreboard.")
                  }}
                >
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {presentKinds.length > 1 ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by type">
            {[{ id: "all" as const, label: "All" }, ...presentKinds].map((kind) => {
              const active = activeFilter === kind.id
              return (
                <Button
                  key={kind.id}
                  type="button"
                  size="xs"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => setFilter(kind.id)}
                  className={
                    active
                      ? "h-7 px-2 text-[10px]"
                      : "h-7 border-line bg-cream px-2 text-[10px] text-bark hover:text-ink"
                  }
                >
                  [{kind.label}]
                </Button>
              )
            })}
          </div>
        ) : null}
        {message ? (
          <p className="text-xs text-bark" role="status">
            <span className="text-clay">&gt; </span>
            {message}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
          <p className="font-heading text-xl font-bold uppercase">Loading ratings<span className="cursor-blink text-clay">_</span></p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-bark">Checking this account.</p>
        </div>
      ) : entries.length > 0 && visible.length === 0 ? (
        <div className="border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
          <p className="font-heading text-xl font-bold uppercase">Nothing of that type</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
          <p className="font-heading text-xl font-bold uppercase">Nothing saved yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-bark">{emptyHint}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((entry) => (
            <li key={entry.id}>
              <ScoreRow
                entry={entry}
                pending={pending}
                onDelete={(id) => {
                  void run(() => onDelete(id), "Removed from the scoreboard.")
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ScoreRow({
  entry,
  pending,
  onDelete,
}: {
  entry: Entry
  pending: boolean
  onDelete: (id: string) => void
}) {
  const href = hrefFor(entry.url)
  const label = entry.title.trim() || "Untitled"
  const tier = tierFor(entry.total)

  return (
    <article className="border border-line bg-paper px-4 py-4 transition-colors hover:border-clay/50 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-semibold tracking-[0.16em] text-clay uppercase">
            [{kindLabel(entry.kind)}]
          </p>
          <h3 className="text-lg leading-snug break-words">{label}</h3>
          {entry.url ? (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-xs text-clay underline decoration-clay/40 underline-offset-4"
              >
                {hostLabel(entry.url)}
              </a>
            ) : (
              <p className="mt-1 truncate text-xs text-bark">{entry.url}</p>
            )
          ) : null}
          <p className="mt-1 text-xs text-bark tabular-nums">{formatWhen(entry.date)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-sans text-4xl leading-none font-bold text-clay tabular-nums">{entry.total}</p>
          <p className={`mt-2 inline-flex px-2 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase ${tierClass(tier)}`}>
            {tier}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-xs sm:grid-cols-4">
        {CRITERIA.map((criterion) => (
          <div key={criterion.id} className="flex items-baseline justify-between gap-2">
            <dt className="tracking-[0.08em] text-bark uppercase">{criterion.short}</dt>
            <dd className="font-semibold tabular-nums">{entry.scores[criterion.id]}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-bark hover:text-destructive"
          onClick={() => onDelete(entry.id)}
          disabled={pending}
          aria-label={`Delete ${label}`}
        >
          Delete
        </Button>
      </div>
    </article>
  )
}
