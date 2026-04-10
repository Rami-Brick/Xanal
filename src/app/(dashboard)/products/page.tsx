import { Metadata } from "next";
import { getProductsPageData } from "@/lib/data/products";

export const metadata: Metadata = { title: "Produits · Xanal" };
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

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function ProductRow({
  rank,
  name,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  barValue,
  barMax,
}: {
  rank: number;
  name: string;
  primary: number;
  secondary: number;
  primaryLabel: string;
  secondaryLabel: string;
  barValue: number;
  barMax: number;
}) {
  const w = barMax > 0 ? Math.max((barValue / barMax) * 100, 2) : 2;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr auto",
        gap: "0 12px",
        alignItems: "start",
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Rank */}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 500, paddingTop: 2 }}>
        {rank}
      </span>

      {/* Name + bar */}
      <div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.3, marginBottom: 6, wordBreak: "break-word" }}>
          {name}
        </p>
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
          <div style={{ height: "100%", width: `${w}%`, background: "rgba(255,255,255,0.4)", borderRadius: 99 }} />
        </div>
      </div>

      {/* Counts */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 500, color: "#fff", lineHeight: 1 }}>
          {fmt(primary)}
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{primaryLabel}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{fmt(secondary)}</p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>{secondaryLabel}</p>
      </div>
    </div>
  );
}

export default async function ProductsPage() {
  const d = await getProductsPageData();

  const maxTotal = Math.max(...d.byTotalOrders.map((p) => p.totalOrders), 1);
  const maxDelivered = Math.max(...d.byDeliveredOrders.map((p) => p.deliveredOrders), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Page title */}
      <div>
        <p style={eyebrow}>Produits</p>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#111", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Distribution produits
        </h1>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <div style={card}>
          <p style={eyebrow}>Produits totaux</p>
          <p style={bigNumber}>{fmt(d.totalProducts)}</p>
          <p style={hint}>dans le catalogue</p>
        </div>
        <div style={card}>
          <p style={eyebrow}>Produits actifs</p>
          <p style={bigNumber}>{fmt(d.activeProducts)}</p>
          <p style={hint}>statut actif</p>
        </div>
        <div style={card}>
          <p style={eyebrow}>Produits avec commandes</p>
          <p style={bigNumber}>{fmt(d.byTotalOrders.length)}</p>
          <p style={hint}>au moins 1 commande</p>
        </div>
        <div style={card}>
          <p style={eyebrow}>Avec livraisons</p>
          <p style={bigNumber}>{fmt(d.byDeliveredOrders.filter((p) => p.deliveredOrders > 0).length)}</p>
          <p style={hint}>au moins 1 livrée</p>
        </div>
      </div>

      {/* Side-by-side product tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* By total orders */}
        <div style={{ ...card, padding: "24px 28px" }}>
          <p style={{ ...eyebrow, marginBottom: 4 }}>Par commandes totales</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginBottom: 16 }}>Toutes commandes réelles confondues</p>
          <div>
            {d.byTotalOrders.map((p, i) => (
              <ProductRow
                key={p.productId}
                rank={i + 1}
                name={p.name}
                primary={p.totalOrders}
                secondary={p.totalUnits}
                primaryLabel="commandes"
                secondaryLabel="unités"
                barValue={p.totalOrders}
                barMax={maxTotal}
              />
            ))}
            {d.byTotalOrders.length === 0 && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", paddingTop: 12 }}>Aucune donnée</p>
            )}
          </div>
        </div>

        {/* By delivered orders */}
        <div style={{ ...card, padding: "24px 28px" }}>
          <p style={{ ...eyebrow, marginBottom: 4 }}>Par commandes livrées</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginBottom: 16 }}>Uniquement les commandes avec statut livré</p>
          <div>
            {d.byDeliveredOrders.map((p, i) => (
              <ProductRow
                key={p.productId}
                rank={i + 1}
                name={p.name}
                primary={p.deliveredOrders}
                secondary={p.deliveredUnits}
                primaryLabel="livrées"
                secondaryLabel="unités livrées"
                barValue={p.deliveredOrders}
                barMax={maxDelivered}
              />
            ))}
            {d.byDeliveredOrders.length === 0 && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", paddingTop: 12 }}>Aucune donnée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
