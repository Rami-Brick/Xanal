import { cn } from "@/lib/utils"

export type RecentOrder = {
  converty_id: string
  reference: number | null
  status: string
  customer_name: string | null
  customer_city: string | null
  total_price: number
  converty_created_at: string | null
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  delivered:   { label: "Livré",       dot: "bg-emerald-400", text: "text-emerald-400" },
  confirmed:   { label: "Confirmé",    dot: "bg-emerald-400/60", text: "text-emerald-400/70" },
  pending:     { label: "En attente",  dot: "bg-amber-400",   text: "text-amber-400" },
  attempt:     { label: "Tentative",   dot: "bg-amber-400/60", text: "text-amber-400/70" },
  "in transit":{ label: "En transit", dot: "bg-sky-400",     text: "text-sky-400" },
  returned:    { label: "Retourné",    dot: "bg-rose-500",    text: "text-rose-400" },
  rejected:    { label: "Rejeté",      dot: "bg-rose-500/60", text: "text-rose-400/70" },
  exchange:    { label: "Échange",     dot: "bg-violet-400",  text: "text-violet-400" },
  uploaded:    { label: "Soumis",      dot: "bg-white/30",    text: "text-white/40" },
}

function getStatus(status: string) {
  return (
    STATUS_CONFIG[status.toLowerCase()] ?? {
      label: status,
      dot: "bg-white/20",
      text: "text-white/30",
    }
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso))
}

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + " DT"
}

export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  return (
    <section aria-label="Commandes récentes">
      <div className="rounded-xl border border-white/8 bg-white/4 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Commandes récentes
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-white/25">Aucune commande synchronisée.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {orders.map((order) => {
              const s = getStatus(order.status)
              return (
                <div
                  key={order.converty_id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors"
                >
                  {/* Reference */}
                  <span className="w-14 shrink-0 font-mono text-[11px] text-white/30">
                    #{order.reference ?? "—"}
                  </span>

                  {/* Customer */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#e8e3d9] truncate">
                      {order.customer_name ?? "—"}
                    </p>
                    {order.customer_city && (
                      <p className="text-[11px] text-white/30 truncate">{order.customer_city}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                    <span className={cn("text-[11px] font-medium", s.text)}>
                      {s.label}
                    </span>
                  </div>

                  {/* Price */}
                  <span className="w-20 shrink-0 text-right font-mono text-[12px] text-[#e8e3d9]">
                    {formatCurrency(order.total_price)}
                  </span>

                  {/* Date */}
                  <span className="w-16 shrink-0 text-right text-[11px] text-white/25">
                    {formatDate(order.converty_created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
