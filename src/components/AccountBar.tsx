import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabase } from "@/lib/supabase"

export type AccountUser = {
  id: string
  email: string
}

type AccountBarProps = {
  ready: boolean
  user: AccountUser | null
}

export function AccountBar({ ready, user }: AccountBarProps) {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [seenUserId, setSeenUserId] = useState(user?.id ?? null)

  if ((user?.id ?? null) !== seenUserId) {
    setSeenUserId(user?.id ?? null)
    setSentTo(null)
    setNotice(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const supabase = getSupabase()
    const trimmed = email.trim()
    if (!supabase || !trimmed || sending) return
    setSending(true)
    setNotice(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    })
    setSending(false)
    if (error) {
      setSentTo(null)
      setNotice(error.message || "Couldn’t send the link. Try again in a minute.")
      return
    }
    setSentTo(trimmed)
    setNotice(null)
  }

  async function signOut() {
    const supabase = getSupabase()
    if (!supabase || signingOut) return
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()
    setSigningOut(false)
    if (error) setNotice(error.message || "Couldn’t sign out.")
  }

  return (
    <section className="rounded-3xl bg-paper px-5 py-5 ring-1 ring-ink/10 sm:px-6">
      {!ready ? (
        <p className="text-sm text-bark">Checking sign-in…</p>
      ) : user ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-bark">
            Signed in as <span className="font-medium text-ink">{user.email || "your account"}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full bg-paper px-5"
            onClick={() => void signOut()}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      ) : sentTo ? (
        <div className="flex flex-col gap-2">
          <p className="text-base text-ink">Check {sentTo} for a sign-in link.</p>
          <p className="text-sm leading-relaxed text-bark">
            Open it in this browser. The link signs this device into your account.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="mt-1 h-10 w-fit rounded-full px-3 text-bark"
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </Button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div>
            <h2 className="text-2xl leading-tight font-medium">Sync across devices</h2>
            <p className="mt-1 text-sm leading-relaxed text-bark">
              Email yourself a sign-in link. Until you open it, ratings stay in this browser.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 rounded-xl bg-paper px-3.5 text-base placeholder:text-clay"
              />
            </div>
            <Button
              type="submit"
              disabled={sending || email.trim() === ""}
              className="h-12 rounded-full px-5 text-base"
            >
              {sending ? "Sending…" : "Email me a link"}
            </Button>
          </div>
        </form>
      )}
      {notice ? (
        <p className="mt-3 text-sm text-bark" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  )
}
