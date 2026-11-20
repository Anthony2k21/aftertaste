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
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const visible = sortEntries(entries, sort)

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
            <h2 className="text-3xl leading-tight font-medium">Scoreboard</h2>
            <p className="mt-1 text-sm text-bark">
              {entries.length === 0
                ? "Nothing saved yet"
                : `${entries.length} saved · ${sort === "score" ? "highest score first" : "newest first"}`}
            </p>
          </div>
          <div className="flex rounded-full bg-linen p-1" role="group" aria-label="Sort saved videos">
            <Button
              type="button"
              size="sm"
              variant={sort === "score" ? "default" : "ghost"}
              aria-pressed={sort === "score"}
              onClick={() => setSort("score")}
              className="rounded-full px-3"
            >
              Score
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sort === "date" ? "default" : "ghost"}
              aria-pressed={sort === "date"}
              onClick={() => setSort("date")}
              className="rounded-full px-3"
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
            className="rounded-full bg-paper"
            onClick={exportBackup}
            disabled={entries.length === 0 || pending}
          >
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full bg-paper"
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
                className="rounded-full bg-paper"
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
        {message ? (
          <p className="text-sm text-bark" role="status">
            {message}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-clay/60 px-6 py-14 text-center">
          <p className="text-2xl font-medium">Loading ratings</p>
          <p className="mx-auto mt-2 max-w-sm text-bark">Checking this account.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-clay/60 px-6 py-14 text-center">
          <p className="text-2xl font-medium">Nothing saved yet</p>
          <p className="mx-auto mt-2 max-w-sm text-bark">{emptyHint}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
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
    <article className="rounded-3xl bg-paper px-4 py-4 ring-1 ring-ink/10 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl leading-snug font-medium break-words">{label}</h3>
          {entry.url ? (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm text-clay underline decoration-clay/40 underline-offset-4"
              >
                {hostLabel(entry.url)}
              </a>
            ) : (
              <p className="mt-1 truncate text-sm text-bark">{entry.url}</p>
            )
          ) : null}
          <p className="mt-1 text-sm text-bark">{formatWhen(entry.date)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-4xl leading-none font-medium tabular-nums">{entry.total}</p>
          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tierClass(tier)}`}>
            {tier}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        {CRITERIA.map((criterion) => (
          <div key={criterion.id} className="flex items-baseline justify-between gap-2">
            <dt className="text-bark">{criterion.short}</dt>
            <dd className="tabular-nums">{entry.scores[criterion.id]}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full text-bark"
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
