import type { ReactNode } from "react"

export function SectionTitle({ index, children }: { index: string; children: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-3 text-2xl leading-tight sm:text-3xl">
      <span className="font-sans text-xs font-semibold tracking-[0.2em] text-clay tabular-nums">[{index}]</span>
      <span>{children}</span>
    </h2>
  )
}
