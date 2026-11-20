import { Button } from "@/components/ui/button"

type ImportOfferProps = {
  count: number
  busy: boolean
  onImport: () => void
  onDismiss: () => void
}

export function ImportOffer({ count, busy, onImport, onDismiss }: ImportOfferProps) {
  const label = count === 1 ? "1 rating is" : `${count} ratings are`

  return (
    <section className="rounded-3xl bg-linen px-5 py-5 sm:px-6">
      <h2 className="text-2xl leading-tight font-medium">Bring this browser along</h2>
      <p className="mt-2 text-base leading-relaxed text-bark">
        {label} saved only on this device. Add {count === 1 ? "it" : "them"} to your account
        once, so {count === 1 ? "it shows" : "they show"} up on your other devices.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-11 rounded-full px-5"
          onClick={onImport}
          disabled={busy}
        >
          {busy ? "Adding…" : "Add to my account"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full bg-paper px-5"
          onClick={onDismiss}
          disabled={busy}
        >
          Not now
        </Button>
      </div>
    </section>
  )
}
