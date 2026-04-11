import { cn } from "@/lib/utils"

export type ConnectionStatus = {
  connected: boolean
  store_id: string | null
  scopes: string[] | null
  last_updated: string | null
  expires_at: string | null
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function formatScopes(scopes: string[] | null): string {
  if (!scopes || scopes.length === 0) return "—"
  return scopes.join(", ")
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-white/6 py-3 last:border-0">
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-1">{label}</p>
      <p className={cn("text-sm text-[#e8e3d9]", mono && "font-mono")}>{value}</p>
    </div>
  )
}

export function ConnectionCard({
  connection,
}: {
  connection: ConnectionStatus | null
}) {
  const connected = connection?.connected ?? false

  return (
    <section aria-label="Connexion Converty">
      <div className="rounded-xl border border-white/8 bg-white/4 overflow-hidden">
        {/* Card header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-rose-500"
              )}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Connexion Converty
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              connected
                ? "bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/30"
                : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"
            )}
          >
            {connected ? "Actif" : "Non connecté"}
          </span>
        </div>

        {/* Card body */}
        <div className="px-5">
          {connected && connection ? (
            <>
              <Field label="Boutique" value={connection.store_id ?? "—"} mono />
              <Field label="Autorisations" value={formatScopes(connection.scopes)} />
              <Field label="Dernière mise à jour" value={formatDate(connection.last_updated)} />
              <Field label="Expiration du jeton" value={formatDate(connection.expires_at)} />
            </>
          ) : (
            <div className="py-6">
              <p className="text-sm text-white/40">
                Aucun compte Converty lié.{" "}
                <a href="/" className="text-[#e8e3d9] underline underline-offset-2 hover:text-white transition-colors">
                  Démarrer le flux OAuth
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
