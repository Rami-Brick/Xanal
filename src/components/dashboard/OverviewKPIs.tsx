import { cn } from "@/lib/utils"

export type KPIData = {
  ordersToday: number
  deliveredRevenue: number
  deliveredCount: number
  averageOrderValue: number
  returnRate: number
  confirmationRate: number
  totalOrders: number
}

function formatCurrency(value: number): string {
  return (
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: value === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    }) + " DT"
  )
}

function formatPercent(value: number): string {
  return value.toFixed(1) + " %"
}

function KPICard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: "emerald" | "amber" | "rose" | "sky" | "default"
}) {
  const accentLine: Record<string, string> = {
    emerald: "from-transparent via-emerald-400/40 to-transparent",
    amber:   "from-transparent via-amber-400/40 to-transparent",
    rose:    "from-transparent via-rose-500/40 to-transparent",
    sky:     "from-transparent via-sky-400/40 to-transparent",
    default: "from-transparent via-white/10 to-transparent",
  }
  const accentColor = accent ?? "default"

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/8 bg-white/4 p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          accentLine[accentColor]
        )}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30 mb-4">
        {label}
      </p>
      <p className="text-4xl font-bold tabular-nums leading-none text-[#e8e3d9]">
        {value}
      </p>
      {sub && <p className="mt-2 text-[11px] text-white/25">{sub}</p>}
    </div>
  )
}

export function OverviewKPIs({ data }: { data: KPIData }) {
  const returnRateAccent: "emerald" | "amber" | "rose" =
    data.returnRate < 5 ? "emerald" : data.returnRate < 15 ? "amber" : "rose"

  const confirmAccent: "emerald" | "amber" | "rose" =
    data.confirmationRate >= 60 ? "emerald" : data.confirmationRate >= 40 ? "amber" : "rose"

  return (
    <section aria-label="Indicateurs clés">
      {/* Row 1: money metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          label="Revenus livrés"
          value={formatCurrency(data.deliveredRevenue)}
          sub={`${data.deliveredCount.toLocaleString("fr-FR")} commandes livrées`}
          accent="emerald"
        />
        <KPICard
          label="Panier moyen"
          value={formatCurrency(data.averageOrderValue)}
          sub={`sur ${data.totalOrders.toLocaleString("fr-FR")} commandes`}
          accent="amber"
        />
        <KPICard
          label="Commandes aujourd'hui"
          value={data.ordersToday.toLocaleString("fr-FR")}
          sub={`${data.totalOrders.toLocaleString("fr-FR")} au total`}
          accent="default"
        />
      </div>

      {/* Row 2: rate metrics */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <KPICard
          label="Taux de livraison"
          value={formatPercent(data.confirmationRate)}
          sub="livrées / total commandes"
          accent={confirmAccent}
        />
        <KPICard
          label="Taux de retour"
          value={formatPercent(data.returnRate)}
          sub="retournées / total commandes"
          accent={returnRateAccent}
        />
      </div>
    </section>
  )
}
