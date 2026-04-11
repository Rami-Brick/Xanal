import { cn } from "@/lib/utils"

export type StatusCount = {
  status: string
  count: number
}

const STATUS_CONFIG: Record<string, { label: string; bar: string; text: string }> = {
  delivered:    { label: "Livré",       bar: "bg-emerald-400",    text: "text-emerald-400" },
  confirmed:    { label: "Confirmé",    bar: "bg-emerald-400/50", text: "text-emerald-400/70" },
  pending:      { label: "En attente",  bar: "bg-amber-400",      text: "text-amber-400" },
  attempt:      { label: "Tentative",   bar: "bg-amber-400/50",   text: "text-amber-400/70" },
  "in transit": { label: "En transit", bar: "bg-sky-400",        text: "text-sky-400" },
  returned:     { label: "Retourné",    bar: "bg-rose-500",       text: "text-rose-400" },
  rejected:     { label: "Rejeté",      bar: "bg-rose-500/50",    text: "text-rose-400/70" },
  exchange:     { label: "Échange",     bar: "bg-violet-400",     text: "text-violet-400" },
  uploaded:     { label: "Soumis",      bar: "bg-white/20",       text: "text-white/35" },
}

const STATUS_ORDER = [
  "delivered", "confirmed", "in transit", "pending",
  "attempt", "returned", "rejected", "exchange", "uploaded",
]

export function OrderStatusBreakdown({ counts }: { counts: StatusCount[] }) {
  const total = counts.reduce((sum, c) => sum + c.count, 0)

  // Sort by predefined order, then any unknowns at end
  const sorted = [...counts].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status.toLowerCase())
    const bi = STATUS_ORDER.indexOf(b.status.toLowerCase())
    if (ai === -1 && bi === -1) return b.count - a.count
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return (
    <section aria-label="Répartition des statuts">
      <div className="rounded-xl border border-white/8 bg-white/4 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Statuts des commandes
          </p>
        </div>

        {total === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-white/25">Aucune donnée disponible.</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {sorted.map((item) => {
              const cfg = STATUS_CONFIG[item.status.toLowerCase()] ?? {
                label: item.status,
                bar: "bg-white/20",
                text: "text-white/30",
              }
              const pct = total > 0 ? (item.count / total) * 100 : 0

              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[11px] font-medium", cfg.text)}>
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-white/30">
                        {pct.toFixed(0)} %
                      </span>
                      <span className="font-mono text-[12px] text-[#e8e3d9] w-8 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/6">
                    <div
                      className={cn("h-full rounded-full transition-all", cfg.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
