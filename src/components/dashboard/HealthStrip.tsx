import { cn } from "@/lib/utils"
import type { ConnectionStatus } from "@/components/dashboard/ConnectionCard"
import type { SyncLogEntry } from "@/components/dashboard/SyncCard"

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "jamais"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${days} j`
}

function Pill({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean | null
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3.5 py-2.5">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          ok === null
            ? "bg-white/20"
            : ok
            ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]"
            : "bg-rose-500"
        )}
      />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/25 leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[12px] text-[#e8e3d9] truncate">{value}</p>
      </div>
    </div>
  )
}

export function HealthStrip({
  connection,
  lastProductsSync,
  lastOrdersSync,
}: {
  connection: ConnectionStatus | null
  lastProductsSync: SyncLogEntry | null
  lastOrdersSync: SyncLogEntry | null
}) {
  return (
    <section aria-label="Santé du système">
      <div className="flex flex-wrap gap-3">
        <Pill
          label="Converty"
          value={connection?.store_id ?? "Non connecté"}
          ok={connection?.connected ?? false}
        />
        <Pill
          label="Sync produits"
          value={
            lastProductsSync
              ? `${lastProductsSync.records_synced ?? 0} enreg. · ${formatRelativeTime(lastProductsSync.completed_at)}`
              : "jamais"
          }
          ok={
            lastProductsSync
              ? lastProductsSync.status === "completed"
              : null
          }
        />
        <Pill
          label="Sync commandes"
          value={
            lastOrdersSync
              ? `${lastOrdersSync.records_synced ?? 0} enreg. · ${formatRelativeTime(lastOrdersSync.completed_at)}`
              : "jamais"
          }
          ok={
            lastOrdersSync
              ? lastOrdersSync.status === "completed"
              : null
          }
        />
      </div>
    </section>
  )
}
