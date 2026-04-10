import { Metadata } from "next";
import { getDashboardOverview } from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Vue d'ensemble · Xanal" };
export const dynamic = "force-dynamic";

// ─── design tokens ────────────────────────────────────────────────────────────
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

const bigNumber: React.CSSProperties = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: 38,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  color: "#fff",
};

const hint: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.3)",
  marginTop: 6,
  lineHeight: 1.4,
};

const TONE_COLORS = {
  stable: { dot: "#4ade80", text: "rgba(74,222,128,0.85)" },
  watch: { dot: "#fbbf24", text: "rgba(251,191,36,0.85)" },
  risk: { dot: "#f87171", text: "rgba(248,113,113,0.85)" },
} as const;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function pct(n: number, total: number) {
  if (total === 0) return "0 %";
  return `${Math.round((n / total) * 100)} %`;
}

function Bar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.max((value / max) * 100, 2) : 2;
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${w}%`, background: "rgba(255,255,255,0.45)", borderRadius: 99, transition: "width 0.3s" }} />
    </div>
  );
}

export default async function DashboardPage() {
  const d = await getDashboardOverview();
  const syncTone = TONE_COLORS[d.syncFreshness];
  const maxStatus = Math.max(...d.byStatus.map((s) => s.count), 1);

  function formatSyncAge(dateStr: string | null): string {
    if (!dateStr) return "Jamais";
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs} h`;
    return `Il y a ${Math.floor(hrs / 24)} j`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Page title */}
      <div>
        <p style={eyebrow}>Vue d'ensemble</p>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#111", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          État du dataset
        </h1>
      </div>

      {/* Hero KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
        {[
          { label: "Commandes totales", value: fmt(d.totalOrders), sub: "hors tests" },
          { label: "Actives", value: fmt(d.activeOrders), sub: `${pct(d.activeOrders, d.totalOrders)} du total` },
          { label: "Terminales", value: fmt(d.terminalOrders), sub: `${pct(d.terminalOrders, d.totalOrders)} du total` },
          { label: "Livrées", value: fmt(d.deliveredOrders), sub: `${pct(d.deliveredOrders, d.totalOrders)} du total` },
          { label: "Retournées", value: fmt(d.returnedOrders), sub: `${pct(d.returnedOrders, d.totalOrders)} du total` },
          { label: "Produits", value: fmt(d.totalProducts), sub: "synced" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={card}>
            <p style={eyebrow}>{label}</p>
            <p style={bigNumber}>{value}</p>
            <p style={hint}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Status repartition + sync summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12 }}>

        {/* Status breakdown */}
        <div style={{ ...card, padding: "24px 28px" }}>
          <p style={{ ...eyebrow, marginBottom: 20 }}>Répartition par statut</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {d.byStatus.map(({ label, count }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{label}</span>
                  <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 500, color: "#fff", letterSpacing: "-0.01em" }}>
                    {fmt(count)}
                  </span>
                </div>
                <Bar value={count} max={maxStatus} />
              </div>
            ))}
          </div>
        </div>

        {/* Sync + stores */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, flex: 1 }}>
            <p style={eyebrow}>Synchronisation</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: syncTone.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: syncTone.text, fontWeight: 500 }}>
                {d.syncFreshness === "stable" ? "Données fraîches" : d.syncFreshness === "watch" ? "À rafraîchir" : "Sync à sécuriser"}
              </span>
            </div>
            <p style={{ ...hint, marginTop: 12 }}>Dernier sync : {formatSyncAge(d.lastSyncAt)}</p>
          </div>

          <div style={card}>
            <p style={eyebrow}>Boutiques connectées</p>
            <p style={{ ...bigNumber, fontSize: 28, marginTop: 8 }}>{fmt(d.connectedStores)}</p>
            <p style={hint}>Source Converty active</p>
          </div>

          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={eyebrow}>Actif / Terminal</p>
            {[
              { label: "Actives", count: d.activeOrders },
              { label: "Terminales", count: d.terminalOrders },
            ].map(({ label, count }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{fmt(count)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Actives</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{pct(d.activeOrders, d.totalOrders)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
