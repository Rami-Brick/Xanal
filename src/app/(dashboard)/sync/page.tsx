import { Metadata } from "next";
import { getSyncPageData } from "@/lib/data/sync";
import { SyncActions } from "@/components/sync/SyncActions";

export const metadata: Metadata = { title: "Sync · Xanal" };
export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  background: "#141414",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  boxShadow: "0 12px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)",
  padding: "22px 24px",
};

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.3)",
  marginBottom: 6,
};

const TONE = {
  stable: { dot: "#4ade80", label: "Sain", text: "rgba(74,222,128,0.85)" },
  watch: { dot: "#fbbf24", label: "À rafraîchir", text: "rgba(251,191,36,0.85)" },
  risk: { dot: "#f87171", label: "En échec", text: "rgba(248,113,113,0.85)" },
} as const;

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("fr-FR").format(n ?? 0);
}

const SYNC_TYPE_LABELS: Record<string, string> = {
  orders: "Commandes",
  products: "Produits",
  "orders-all": "Toutes commandes",
  "orders-archived": "Archivées",
  "orders-incremental": "Incrémental",
  full: "Complet",
  all: "Complet multi-boutiques",
};

export default async function SyncPage() {
  const d = await getSyncPageData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Page title */}
      <div>
        <p style={eyebrow}>Synchronisation</p>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#111", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Pipeline de données
        </h1>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "Boutiques connectées", value: String(d.stores.length) },
          { label: "Total syncs récents", value: fmt(d.totalSyncs) },
          { label: "Taux de succès", value: `${d.successRate} %` },
          { label: "Boutiques saines", value: String(d.stores.filter((s) => s.tone === "stable").length) },
        ].map(({ label, value }) => (
          <div key={label} style={card}>
            <p style={eyebrow}>{label}</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 32, fontWeight: 500, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1, marginTop: 6 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Stores + actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 12 }}>

        {/* Store health */}
        <div style={{ ...card, padding: "24px 28px" }}>
          <p style={{ ...eyebrow, marginBottom: 20 }}>Santé par boutique</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {d.stores.length === 0 && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Aucune boutique connectée.</p>
            )}
            {d.stores.map((store) => {
              const tone = TONE[store.tone];
              return (
                <div
                  key={store.storeId}
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{store.storeId}</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{store.ageLabel}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: tone.dot }} />
                      <span style={{ fontSize: 11, color: tone.text, fontWeight: 500 }}>{tone.label}</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginTop: 14 }}>
                    {[
                      { k: "Dernier type", v: store.lastSyncType ? (SYNC_TYPE_LABELS[store.lastSyncType] ?? store.lastSyncType) : "—" },
                      { k: "Statut", v: store.lastSyncStatus ?? "—" },
                      { k: "Sync à", v: formatDate(store.lastSyncAt) },
                      { k: "Scopes", v: store.scopes.length > 0 ? store.scopes.join(", ") : "—" },
                    ].map(({ k, v }) => (
                      <div key={k}>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{k}</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", wordBreak: "break-word" }}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {store.errorMessage && (
                    <p style={{ fontSize: 12, color: "rgba(248,113,113,0.8)", marginTop: 12, padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 7, border: "1px solid rgba(248,113,113,0.15)" }}>
                      {store.errorMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual sync actions + Converty connect */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, padding: "24px 28px" }}>
            <p style={{ ...eyebrow, marginBottom: 16 }}>Actions manuelles</p>
            <SyncActions />
          </div>

          {/* Converty connection */}
          <div style={{ ...card, padding: "20px 24px" }}>
            <p style={{ ...eyebrow, marginBottom: 4 }}>Converty</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginBottom: 16, lineHeight: 1.4 }}>
              Ajouter une boutique
            </p>
            <a
              href="/api/auth/converty/start"
              style={{
                display: "block",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#fff",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "10px 16px",
                textDecoration: "none",
                transition: "background 0.12s, border-color 0.12s",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Connecter Converty
            </a>
          </div>
        </div>
      </div>

      {/* Recent sync log */}
      <div style={{ ...card, padding: "24px 28px" }}>
        <p style={{ ...eyebrow, marginBottom: 20 }}>Journal récent</p>
        {d.recentLogs.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Aucun log disponible.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "180px 120px 80px 80px 80px 1fr",
              gap: "0 16px",
              padding: "0 0 10px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              {["Démarré à", "Type", "Statut", "Créés", "MAJ", "Boutique"].map((h) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>{h}</span>
              ))}
            </div>

            {d.recentLogs.slice(0, 30).map((log) => {
              const isOk = log.status === "completed";
              const isFail = log.status === "failed";
              const statusColor = isOk ? "rgba(74,222,128,0.75)" : isFail ? "rgba(248,113,113,0.75)" : "rgba(255,255,255,0.35)";
              return (
                <div
                  key={log.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 120px 80px 80px 80px 1fr",
                    gap: "0 16px",
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{formatDate(log.started_at)}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                    {log.sync_type ? (SYNC_TYPE_LABELS[log.sync_type] ?? log.sync_type) : "—"}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: statusColor }}>
                    {log.status ?? "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{fmt(log.records_created)}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{fmt(log.records_updated)}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.store_id ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
