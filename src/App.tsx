import { useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"

import { AccountBar, type AccountUser } from "@/components/AccountBar"
import { ImportOffer } from "@/components/ImportOffer"
import { RatingForm } from "@/components/RatingForm"
import { Scoreboard } from "@/components/Scoreboard"
import { ScoringGuide } from "@/components/ScoringGuide"
import type { Entry } from "@/lib/entries"
import {
  clearRatings,
  deleteRating,
  fetchRatings,
  insertRating,
  insertRatings,
} from "@/lib/remote-ratings"
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase"
import {
  loadEntries,
  localImportChoice,
  persistEntries,
  rememberLocalImport,
} from "@/lib/storage"

const configured = isSupabaseConfigured()

export default function App() {
  const [authReady, setAuthReady] = useState(!configured)
  const [listReady, setListReady] = useState(!configured)
  const [user, setUser] = useState<AccountUser | null>(null)
  const [entries, setEntries] = useState<Entry[]>(() => (configured ? [] : loadEntries()))
  const [problem, setProblem] = useState<string | null>(null)
  const [importOffer, setImportOffer] = useState<Entry[] | null>(null)
  const [importing, setImporting] = useState(false)

  const entriesRef = useRef(entries)
  const userRef = useRef(user)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    let active = true

    async function apply(session: Session | null) {
      if (!active) return
      if (!session) {
        setUser(null)
        setEntries(loadEntries())
        setImportOffer(null)
        setProblem(null)
        setAuthReady(true)
        setListReady(true)
        return
      }

      const nextUser = {
        id: session.user.id,
        email: session.user.email ?? "",
      }
      setUser(nextUser)
      setAuthReady(true)
      setListReady(false)
      try {
        const remote = await fetchRatings()
        if (!active) return
        setEntries(remote)
        setProblem(null)
        const choice = localImportChoice(nextUser.id)
        const local = loadEntries()
        const remoteIds = new Set(remote.map((entry) => entry.id))
        const fresh = local.filter((entry) => !remoteIds.has(entry.id))
        if (choice || fresh.length === 0) {
          if (!choice && local.length > 0) rememberLocalImport(nextUser.id, "imported")
          setImportOffer(null)
        } else {
          setImportOffer(fresh)
        }
      } catch (error) {
        if (!active) return
        setEntries([])
        setImportOffer(null)
        setProblem(error instanceof Error ? error.message : "Couldn’t load ratings from your account.")
      } finally {
        if (active) setListReady(true)
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return
      queueMicrotask(() => {
        void apply(session)
      })
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function saveEntry(entry: Entry): Promise<string | null> {
    const currentUser = userRef.current
    if (currentUser) {
      try {
        await insertRating(entry, currentUser.id)
      } catch (error) {
        return error instanceof Error ? error.message : "Couldn’t save to your account."
      }
      setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
      setProblem(null)
      return null
    }

    const next = [entry, ...entriesRef.current.filter((item) => item.id !== entry.id)]
    if (!persistEntries(next)) {
      return "This browser didn’t keep the save. Ratings may disappear when you reload."
    }
    setEntries(next)
    setProblem(null)
    return null
  }

  async function removeEntry(id: string) {
    const currentUser = userRef.current
    if (currentUser) {
      await deleteRating(id)
      setEntries((current) => current.filter((entry) => entry.id !== id))
      return
    }
    const next = entriesRef.current.filter((entry) => entry.id !== id)
    if (!persistEntries(next)) throw new Error("This browser didn’t keep the change.")
    setEntries(next)
  }

  async function replaceEntries(next: Entry[]) {
    const currentUser = userRef.current
    if (!currentUser) {
      if (!persistEntries(next)) throw new Error("This browser didn’t keep the change.")
      setEntries(next)
      return
    }

    const current = entriesRef.current
    try {
      if (next.length === 0) {
        await clearRatings(currentUser.id)
        setEntries([])
        return
      }
      const currentIds = new Set(current.map((entry) => entry.id))
      const nextIds = new Set(next.map((entry) => entry.id))
      for (const entry of current) {
        if (!nextIds.has(entry.id)) await deleteRating(entry.id)
      }
      const added = next.filter((entry) => !currentIds.has(entry.id))
      if (added.length > 0) await insertRatings(added, currentUser.id)
      setEntries(await fetchRatings())
    } catch (error) {
      setEntries(await fetchRatings().catch(() => current))
      throw error
    }
  }

  async function importLocal() {
    const currentUser = userRef.current
    const offer = importOffer
    if (!currentUser || !offer || importing) return
    setImporting(true)
    try {
      await insertRatings(offer, currentUser.id)
      rememberLocalImport(currentUser.id, "imported")
      setEntries(await fetchRatings())
      setImportOffer(null)
      setProblem(null)
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn’t add those ratings to your account.")
    } finally {
      setImporting(false)
    }
  }

  function dismissImport() {
    const currentUser = userRef.current
    if (!currentUser) return
    rememberLocalImport(currentUser.id, "dismissed")
    setImportOffer(null)
  }

  const signedIn = Boolean(user)
  const footer = !configured
    ? "Saved ratings stay in this browser. Export a JSON backup if you want a copy somewhere else."
    : signedIn
      ? "Ratings sync to your account. Export JSON if you also want a file."
      : "Sign in to sync ratings across devices. Until then they stay in this browser."

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-14 px-4 py-12 sm:px-6 sm:py-20">
        <header className="flex flex-col gap-4">
          <p className="text-xs font-medium tracking-[0.22em] text-clay uppercase">
            {signedIn ? "Synced ratings" : "Private ratings"}
          </p>
          <h1 className="text-5xl leading-none font-medium sm:text-6xl">Aftertaste</h1>
          <p className="max-w-md text-lg leading-relaxed text-bark">
            A quiet score for whether a video was worth the time, and how it left you.
          </p>
        </header>

        {configured ? <AccountBar ready={authReady} user={user} /> : null}

        {problem ? (
          <p className="rounded-2xl bg-linen px-4 py-3 text-sm text-ink" role="alert">
            {problem}
          </p>
        ) : null}

        {importOffer ? (
          <ImportOffer
            count={importOffer.length}
            busy={importing}
            onImport={() => void importLocal()}
            onDismiss={dismissImport}
          />
        ) : null}

        <RatingForm
          onSave={saveEntry}
          savedLabel={signedIn ? "Saved to your account." : "Saved in this browser."}
          holdMessage={configured && !authReady ? "Checking sign-in…" : null}
        />
        <ScoringGuide />
        <Scoreboard
          entries={entries}
          loading={configured && !listReady}
          storageLabel={signedIn ? "your account" : "this browser"}
          emptyHint={
            signedIn
              ? "Rate a video and it will sync to your account, highest score first."
              : "Rate a video and it will land here, highest score first."
          }
          onDelete={removeEntry}
          onReplace={replaceEntries}
        />

        <footer className="text-sm leading-relaxed text-bark">{footer}</footer>
      </main>
    </div>
  )
}
