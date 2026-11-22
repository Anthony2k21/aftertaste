type CollapseToggleProps = {
  collapsed: boolean
  onToggle: () => void
  label: string
  controls?: string
  size?: "md" | "sm"
}

export function CollapseToggle({ collapsed, onToggle, label, controls, size = "md" }: CollapseToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls={controls}
      aria-label={`${collapsed ? "Expand" : "Minimise"} ${label}`}
      title={collapsed ? "Expand" : "Minimise"}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center border border-line bg-cream font-sans font-semibold text-bark tabular-nums transition-colors outline-none hover:border-clay hover:text-clay focus-visible:border-clay focus-visible:ring-1 focus-visible:ring-clay ${
        size === "sm" ? "h-8 min-w-8 px-1 text-[11px]" : "h-11 min-w-11 px-1.5 text-xs"
      }`}
    >
      {collapsed ? "[+]" : "[–]"}
    </button>
  )
}
