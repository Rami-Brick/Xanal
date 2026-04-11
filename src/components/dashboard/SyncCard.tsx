"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export type SyncLogEntry = {
  sync_type: string
  status: string
  records_synced: number | null
  records_created: number | null
  records_updated: number | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  triggered_by: string | null
}

type SyncType = "products" | "orders"
type SyncState = "idle" | "loading" | "success" | "error"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function SyncStatusDot({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
    )
  }
  if (status === "failed") {
    return <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
}

function SyncStatusLabel({ status }: { status: string }) {
  if (status === "completed") return <span className="text-emerald-400">Terminé</span>
  if (status === "failed") return <span className="text-rose-400">Échoué</span>
  return <span className="text-amber-400">En cours</span>
}

function SyncPanel({
  type,
  label,
  lastSync,
  state,
  message,
  onSync,
}: {
  type: SyncType
  label: string
  lastSync: SyncLogEntry | null
  state: SyncState
  message: string | null
  onSync: (type: SyncType) => void
}) {
  const isLoading = state === "loading"

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          {label}
        </span>
        <button
          onClick={() => onSync(type)}
          disabled={isLoading}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all",
            isLoading
              ? "bg-white/5 text-white/25 cursor-not-allowed"
              : "bg-white/8 text-[#e8e3d9] hover:bg-white/14 active:scale-95"
          )}
        >
          {isLoading ? "Sync…" : "Synchroniser"}
        </button>
      </div>

      {/* Panel body */}
      <div className="px-5 py-4 space-y-3">
        {/* Inline feedback */}
        {state === "success" && message && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/6 px-3 py-2.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
            <p className="text-[11px] text-emerald-400 leading-relaxed">{message}</p>
          </div>
        )}
        {state === "error" && message && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/6 px-3 py-2.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            <p className="text-[11px] text-rose-400 leading-relaxed">{message}</p>
          </div>
        )}

        {/* Last sync state */}
        {lastSync ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <SyncStatusDot status={lastSync.status} />
              <span className="text-[11px] text-white/35">Dernier sync —</span>
              <span className="text-[11px] font-medium">
                <SyncStatusLabel status={lastSync.status} />
              </span>
            </div>
            <div className="font-mono text-[11px] text-white/30 space-y-0.5">
              <p>{lastSync.records_synced ?? 0} enreg. · {formatDate(lastSync.completed_at)}</p>
              {lastSync.records_created !== null && (
                <p>+{lastSync.records_created} créés · {lastSync.records_updated ?? 0} maj</p>
              )}
              {lastSync.error_message && (
                <p className="text-rose-400/80 mt-1">{lastSync.error_message}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-white/20">Aucun historique.</p>
        )}
      </div>
    </div>
  )
}

export function SyncCard({
  lastProductsSync,
  lastOrdersSync,
}: {
  lastProductsSync: SyncLogEntry | null
  lastOrdersSync: SyncLogEntry | null
}) {
  const router = useRouter()

  const [productsState, setProductsState] = useState<SyncState>("idle")
  const [productsMessage, setProductsMessage] = useState<string | null>(null)
  const [ordersState, setOrdersState] = useState<SyncState>("idle")
  const [ordersMessage, setOrdersMessage] = useState<string | null>(null)

  async function handleSync(type: SyncType) {
    const setState = type === "products" ? setProductsState : setOrdersState
    const setMessage = type === "products" ? setProductsMessage : setOrdersMessage

    setState("loading")
    setMessage(null)

    try {
      const res = await fetch(`/api/sync/${type}`, { method: "POST" })
      const data = (await res.json()) as {
        success: boolean
        data?: { synced: number; created: number; updated: number }
        error?: string
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Synchronisation échouée")
      }

      const { synced, created, updated } = data.data ?? { synced: 0, created: 0, updated: 0 }
      setState("success")
      setMessage(`${synced} synchronisé(s) · ${created} créé(s) · ${updated} mis à jour`)
      router.refresh()
    } catch (err) {
      setState("error")
      setMessage(err instanceof Error ? err.message : "Erreur inconnue")
    }
  }

  return (
    <section aria-label="Synchronisation manuelle">
      <div className="mb-3 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
          Synchronisation manuelle
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SyncPanel
          type="products"
          label="Produits"
          lastSync={lastProductsSync}
          state={productsState}
          message={productsMessage}
          onSync={handleSync}
        />
        <SyncPanel
          type="orders"
          label="Commandes"
          lastSync={lastOrdersSync}
          state={ordersState}
          message={ordersMessage}
          onSync={handleSync}
        />
      </div>
    </section>
  )
}
