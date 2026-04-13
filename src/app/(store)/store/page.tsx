import { Metadata } from "next";
import Link from "next/link";
import { getStorePageData } from "@/lib/data/store";
import { StoreActions } from "@/components/store/StoreActions";
import { TrendChart } from "@/components/store/TrendChart";
import { MonthlyPnl } from "@/components/store/MonthlyPnl";
import { CashPositionCards } from "@/components/store/CashPositionCards";
import { getCashPosition } from "@/lib/data/settlements";
import { DailyPulse } from "@/components/store/DailyPulse";
import { getDailyPulse } from "@/lib/data/daily-pulse";
import { InvestorsSummaryCards } from "@/components/store/InvestorsSummaryCards";
import { getInvestorSummary } from "@/lib/data/investors";

function currentMonthIso(): string {
  const dt = new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-01`;
}

export const metadata: Metadata = { title: "Ma boutique · Xanal" };
export const dynamic = "force-dynamic";

const YELLOW = "#F0B90B";
const GREEN = "#0ECB81";
const RED = "#F6465D";
const AMBER = "#fbbf24";

const card: React.CSSProperties = {
  background: "#141414",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: "20px 22px",
};

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.28)",
  marginBottom: 16,
};

const bigNum: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
  fontSize: 34,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  color: "#fff",
  fontVariantNumeric: "tabular-nums",
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.22)",
  marginTop: 6,
};

const FRESHNESS = {
  stable: { dot: GREEN, label: "Donnees fraiches", glow: GREEN },
  watch: { dot: AMBER, label: "A rafraichir", glow: AMBER },
  risk: { dot: RED, label: "Sync requis", glow: RED },
} as const;

const TONE_COLORS = { stable: GREEN, watch: AMBER, risk: RED } as const;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: n >= 1000 ? 0 : 1,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)} %`;
}

function pct(n: number, total: number) {
  if (total === 0) return "0 %";
  return `${Math.round((n / total) * 100)} %`;
}

function formatSyncAge(dateStr: string | null): string {
  if (!dateStr) return "Jamais synchronise";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  return `Il y a ${Math.floor(hrs / 24)} j`;
}

function returnRateTone(rate: number): "stable" | "watch" | "risk" {
  if (rate >= 20) return "risk";
  if (rate >= 15) return "watch";
  return "stable";
}

function confirmationRateTone(rate: number): "stable" | "watch" | "risk" {
  if (rate === 0) return "stable";
  if (rate < 72) return "risk";
  if (rate < 80) return "watch";
  return "stable";
}

function Bar({
  value,
  max,
  color = "rgba(255,255,255,0.32)",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const w = max > 0 ? Math.max((value / max) * 100, 1) : 0;
  return (
    <div
      style={{
        height: 3,
        background: "rgba(255,255,255,0.07)",
        borderRadius: 99,
        overflow: "hidden",
        marginTop: 9,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${w}%`,
          background: color,
          borderRadius: 99,
        }}
      />
    </div>
  );
}

export default async function StorePage() {
  const [d, cashPosition, dailyPulse, investorSummary] = await Promise.all([
    getStorePageData(),
    getCashPosition(),
    getDailyPulse(),
    getInvestorSummary(),
  ]);
  const freshness = FRESHNESS[d.connection.syncFreshness];
  const maxStatus = Math.max(...d.orderBreakdown.byStatus.map((s) => s.count), 1);
  const rv = d.revenueMetrics;

  return (
    <>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#111111",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: YELLOW,
                display: "grid",
                placeItems: "center",
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#000",
                textTransform: "uppercase",
              }}
            >
              XA
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.22)",
              }}
            >
              Xanal
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/settings"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(255,255,255,0.38)",
                textDecoration: "none",
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}
            >
              Parametres
            </Link>
            <Link
              href="/dashboard"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(255,255,255,0.38)",
                textDecoration: "none",
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}
            >
              Tableau de bord
            </Link>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px 96px",
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
        {/* Store identity + sync freshness */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.22)",
                marginBottom: 12,
              }}
            >
              Boutique connectee
            </p>
            <h1
              style={{
                fontFamily: "var(--font-geist), system-ui, sans-serif",
                fontSize: 40,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: "#fff",
                marginBottom: 18,
              }}
            >
              {d.connection.storeId ?? "Non configuree"}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: freshness.dot,
                  boxShadow: `0 0 8px ${freshness.glow}`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>
                {freshness.label}
              </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.15)" }}>·</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.28)" }}>
                {formatSyncAge(d.connection.lastSyncAt)}
              </span>
            </div>
          </div>

          {!d.connection.connected && (
            <div
              style={{
                ...card,
                border: "1px solid rgba(240,185,11,0.2)",
                background: "rgba(240,185,11,0.06)",
                padding: "20px 24px",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: YELLOW,
                  marginBottom: 12,
                  opacity: 0.8,
                }}
              >
                Aucune boutique connectee
              </p>
              <a
                href="/api/auth/converty/start"
                style={{
                  display: "inline-block",
                  background: YELLOW,
                  color: "#000",
                  borderRadius: 8,
                  padding: "9px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  fontFamily: "var(--font-geist), system-ui, sans-serif",
                }}
              >
                Connecter Converty
              </a>
            </div>
          )}
        </div>

        {/* Section 0: Aujourd'hui (daily 5-minute view) */}
        <DailyPulse data={dailyPulse} />

        {/* Section 1: Indicateurs cles (financial hero) */}
        <section>
          <p style={eyebrow}>Indicateurs cles</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            {(
              [
                {
                  label: "Revenu livre",
                  value: fmtCurrency(rv.grossRevenue),
                  sub: `${fmt(d.kpis.deliveredOrders)} commandes livrees`,
                  accent: GREEN,
                },
                {
                  label: "Panier moyen",
                  value: fmtCurrency(rv.averageOrderValue),
                  sub: `sur ${fmt(d.kpis.deliveredOrders)} livraisons`,
                  accent: YELLOW,
                },
                {
                  label: "Commandes actives",
                  value: fmt(d.kpis.activeOrders),
                  sub: `${pct(d.kpis.activeOrders, d.kpis.validOrders)} des valides`,
                  accent: undefined,
                },
                {
                  label: "Taux de retour",
                  value: fmtPct(rv.returnRate),
                  sub: `${fmt(rv.returnNumerator)} retours / ${fmt(rv.returnDenominator)} expediees`,
                  accent: TONE_COLORS[returnRateTone(rv.returnRate)],
                },
                {
                  label: "Taux de confirmation",
                  value: fmtPct(rv.confirmationRate),
                  sub: `${fmt(rv.confirmationNumerator)} / ${fmt(rv.confirmationDenominator)} traitees`,
                  accent: TONE_COLORS[confirmationRateTone(rv.confirmationRate)],
                },
                {
                  label: "Commandes livrees",
                  value: fmt(d.kpis.deliveredOrders),
                  sub: `${pct(d.kpis.deliveredOrders, d.kpis.validOrders)} des valides`,
                  accent: GREEN,
                },
              ] as { label: string; value: string; sub: string; accent: string | undefined }[]
            ).map(({ label, value, sub, accent }) => (
              <div key={label} style={card}>
                <p style={eyebrow}>{label}</p>
                <p style={{ ...bigNum, color: accent ?? "#fff" }}>{value}</p>
                <p style={hint}>{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Tendance */}
        <section>
          <p style={eyebrow}>Tendance</p>
          <TrendChart data={d.dailyTrend} />
        </section>

        {/* Section 2bis: Rentabilite */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <p style={{ ...eyebrow, marginBottom: 0 }}>Rentabilite</p>
            {d.margins.totalActiveProducts > 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
                {fmt(d.margins.productsWithCogs)} / {fmt(d.margins.totalActiveProducts)} produits configures
              </span>
            )}
            <Link
              href="/settings"
              style={{
                fontSize: 11,
                color: YELLOW,
                textDecoration: "none",
                marginLeft: "auto",
                opacity: 0.7,
              }}
            >
              Configurer les couts →
            </Link>
          </div>

          {d.margins.productsMissingCogs > 0 && (
            <div
              style={{
                ...card,
                borderLeft: `3px solid ${AMBER}`,
                padding: "14px 18px",
                marginBottom: 10,
                background: "rgba(251,191,36,0.04)",
              }}
            >
              <p style={{ fontSize: 12, color: AMBER, fontWeight: 600, marginBottom: 4 }}>
                {fmt(d.margins.productsMissingCogs)} produit(s) sans cout unitaire
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                La marge brute n&apos;inclut que les produits avec un cout configure.
                Revenu couvert : {fmtCurrency(d.margins.configuredRevenue)} sur {fmtCurrency(rv.grossRevenue)}.
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            <div style={card}>
              <p style={eyebrow}>Profit brut</p>
              <p style={{ ...bigNum, color: d.margins.grossProfit > 0 ? GREEN : d.margins.grossProfit < 0 ? RED : "#fff" }}>
                {fmtCurrency(d.margins.grossProfit)}
              </p>
              <p style={hint}>Revenu livre moins COGS</p>
            </div>
            <div style={card}>
              <p style={eyebrow}>Marge brute</p>
              <p
                style={{
                  ...bigNum,
                  color:
                    d.margins.gpmPct >= 35
                      ? GREEN
                      : d.margins.gpmPct >= 22
                        ? AMBER
                        : d.margins.gpmPct > 0
                          ? RED
                          : "#fff",
                }}
              >
                {d.margins.configuredRevenue > 0 ? fmtPct(d.margins.gpmPct) : "—"}
              </p>
              <p style={hint}>
                Sur {fmtCurrency(d.margins.configuredRevenue)} configures
              </p>
            </div>
            <div style={card}>
              <p style={eyebrow}>CPO</p>
              <p
                style={{
                  ...bigNum,
                  color:
                    d.margins.cpo === 0
                      ? "rgba(255,255,255,0.3)"
                      : d.margins.cpo >= 42
                        ? RED
                        : d.margins.cpo >= 35
                          ? AMBER
                          : GREEN,
                }}
              >
                {d.kpis.deliveredOrders > 0 ? fmtCurrency(d.margins.cpo) : "—"}
              </p>
              <p style={hint}>Cout par commande livree</p>
            </div>
            <div style={card}>
              <p style={eyebrow}>Produits non configures</p>
              <p
                style={{
                  ...bigNum,
                  color: d.margins.productsMissingCogs > 0 ? AMBER : GREEN,
                }}
              >
                {fmt(d.margins.productsMissingCogs)}
              </p>
              <p style={hint}>A renseigner dans parametres</p>
            </div>
          </div>

          {/* Contribution margin + cost breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.2fr)",
              gap: 10,
              marginTop: 10,
            }}
          >
            {/* CM card */}
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <p style={eyebrow}>Marge de contribution</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <p
                    style={{
                      ...bigNum,
                      color:
                        d.margins.contributionMargin > 0
                          ? GREEN
                          : d.margins.contributionMargin < 0
                            ? RED
                            : "#fff",
                    }}
                  >
                    {fmtCurrency(d.margins.contributionMargin)}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                      fontSize: 16,
                      fontWeight: 500,
                      color:
                        d.margins.cmPct >= 20
                          ? GREEN
                          : d.margins.cmPct >= 10
                            ? AMBER
                            : d.margins.cmPct > 0
                              ? RED
                              : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {d.margins.configuredRevenue > 0 ? fmtPct(d.margins.cmPct) : "—"}
                  </p>
                </div>
                <p style={hint}>Profit brut moins couts variables</p>
              </div>
              <div
                style={{
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  lineHeight: 1.6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Profit brut</span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {fmtCurrency(d.margins.grossProfit)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>− Couts variables</span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                      color: RED,
                      opacity: 0.7,
                    }}
                  >
                    {fmtCurrency(d.margins.costBreakdown.totalVariableCosts)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cost breakdown card */}
            <div style={{ ...card }}>
              <p style={eyebrow}>Couts variables</p>
              {(
                [
                  {
                    label: "Livraison Cosmos",
                    value: d.margins.costBreakdown.deliveryFees,
                    detail: `${fmt(d.kpis.deliveredOrders)} × ${fmtCurrency(d.margins.fees.cosmosDeliveryFee)}`,
                  },
                  {
                    label: "Retours (livraison + frais retour)",
                    value: d.margins.costBreakdown.returnBurden,
                    detail: `${fmt(rv.returnNumerator)} × ${fmtCurrency(d.margins.fees.cosmosDeliveryFee + d.margins.fees.cosmosReturnFee)}`,
                  },
                  {
                    label: "Emballage",
                    value: d.margins.costBreakdown.packingCosts,
                    detail:
                      d.margins.fees.packingCostPerPackage > 0
                        ? `${fmt(d.kpis.deliveredOrders + rv.returnNumerator)} × ${fmtCurrency(d.margins.fees.packingCostPerPackage)}`
                        : "Non configure",
                  },
                  {
                    label: "Commission Converty",
                    value: d.margins.costBreakdown.convertyFees,
                    detail: `${(d.margins.fees.convertyFeeRate * 100).toFixed(2)} % sur le total`,
                  },
                ] as { label: string; value: number; detail: string }[]
              ).map(({ label, value, detail }, i, arr) => {
                const max = Math.max(...arr.map((x) => x.value), 1);
                const w = (value / max) * 100;
                return (
                  <div key={label} style={{ marginTop: i === 0 ? 0 : 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#fff",
                        }}
                      >
                        {fmtCurrency(value)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 2,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 99,
                        marginTop: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${w}%`,
                          background: RED,
                          opacity: 0.55,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.22)",
                        marginTop: 4,
                      }}
                    >
                      {detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2ter: P&L par produit (kill/keep) */}
        {d.productPnl.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
              <p style={{ ...eyebrow, marginBottom: 0 }}>P&amp;L par produit</p>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
                Kill / keep · tri par revenu livre
              </span>
            </div>
            <div style={{ ...card, padding: "0" }}>
              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px,2fr) 80px 110px 100px 100px 100px",
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                  PRODUIT
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  UNITES
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  REVENU
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  PROFIT BRUT
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  CM
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  CM %
                </span>
              </div>

              {/* Rows */}
              {d.productPnl.slice(0, 10).map((p) => {
                const cmColor =
                  p.cmPct >= 20
                    ? GREEN
                    : p.cmPct >= 10
                      ? AMBER
                      : p.cmPct > 0
                        ? "rgba(255,255,255,0.5)"
                        : RED;
                const cmBold = p.contributionMargin < 0;
                return (
                  <div
                    key={p.productId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(180px,2fr) 80px 110px 100px 100px 100px",
                      gap: 12,
                      padding: "12px 20px",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      background: cmBold ? "rgba(246,70,93,0.04)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.75)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.2)",
                          flexShrink: 0,
                        }}
                      >
                        {p.revenueShare.toFixed(0)} %
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.6)",
                        textAlign: "right",
                      }}
                    >
                      {fmt(p.deliveredUnits)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                        fontSize: 13,
                        color: YELLOW,
                        textAlign: "right",
                      }}
                    >
                      {fmtCurrency(p.deliveredRevenue)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                        fontSize: 13,
                        color: p.grossProfit > 0 ? GREEN : p.grossProfit < 0 ? RED : "rgba(255,255,255,0.3)",
                        textAlign: "right",
                      }}
                    >
                      {fmtCurrency(p.grossProfit)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                        fontSize: 13,
                        color: cmColor,
                        textAlign: "right",
                        fontWeight: cmBold ? 700 : 500,
                      }}
                    >
                      {fmtCurrency(p.contributionMargin)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                        fontSize: 13,
                        color: cmColor,
                        textAlign: "right",
                        fontWeight: cmBold ? 700 : 500,
                      }}
                    >
                      {fmtPct(p.cmPct)}
                    </span>
                  </div>
                );
              })}

              {d.productPnl.length > 10 && (
                <div
                  style={{
                    padding: "12px 20px",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.3)",
                    textAlign: "center",
                  }}
                >
                  {fmt(d.productPnl.length - 10)} produit(s) supplementaire(s) non affiche(s)
                </div>
              )}
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, lineHeight: 1.4 }}>
              CM allouee : frais logistiques et commissions repartis au prorata des unites livrees.
              Uniquement produits avec COGS configure.
            </p>
          </section>
        )}

        {/* Section 2quater-pre: Tresorerie */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <p style={{ ...eyebrow, marginBottom: 0 }}>Tresorerie</p>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
              Position globale Cosmos
            </span>
            <Link
              href="/settings"
              style={{
                fontSize: 11,
                color: YELLOW,
                textDecoration: "none",
                marginLeft: "auto",
                opacity: 0.7,
              }}
            >
              Gerer les reglements →
            </Link>
          </div>
          <CashPositionCards data={cashPosition} />
        </section>

        {/* Section 2quater-bis: Investisseurs */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <p style={{ ...eyebrow, marginBottom: 0 }}>Capital investisseurs</p>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
              Position globale par deal
            </span>
            <Link
              href="/settings"
              style={{
                fontSize: 11,
                color: YELLOW,
                textDecoration: "none",
                marginLeft: "auto",
                opacity: 0.7,
              }}
            >
              Gerer les deals →
            </Link>
          </div>
          <InvestorsSummaryCards data={investorSummary} />
        </section>

        {/* Section 2quater: Bilan mensuel */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <p style={{ ...eyebrow, marginBottom: 0 }}>Bilan mensuel</p>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
              Cascade complete avec frais fixes
            </span>
            <Link
              href="/settings"
              style={{
                fontSize: 11,
                color: YELLOW,
                textDecoration: "none",
                marginLeft: "auto",
                opacity: 0.7,
              }}
            >
              Editer les frais fixes →
            </Link>
          </div>
          <MonthlyPnl initialPeriod={currentMonthIso()} />
        </section>

        {/* Section 3: Alertes */}
        {d.alerts.length > 0 && (
          <section>
            <p style={eyebrow}>Alertes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {d.alerts.slice(0, 3).map((alert, i) => (
                <div
                  key={i}
                  style={{
                    ...card,
                    padding: "16px 20px",
                    borderLeft: `3px solid ${TONE_COLORS[alert.tone]}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                        alert.tone === "stable"
                          ? "rgba(255,255,255,0.5)"
                          : TONE_COLORS[alert.tone],
                    }}
                  >
                    {alert.title}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>
                    {alert.body}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Pipeline (existing commandes breakdown) */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 16 }}>
            <p style={{ ...eyebrow, marginBottom: 0 }}>Pipeline</p>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
              {fmt(d.kpis.validOrders)} valides · {fmt(d.kpis.totalProducts)} produits
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr minmax(260px, 300px)",
              gap: 10,
            }}
          >
            {/* Status breakdown */}
            <div style={{ ...card, padding: "24px 26px" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 22,
                  letterSpacing: "0.04em",
                }}
              >
                Repartition par statut
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {d.orderBreakdown.byStatus.map(({ label, count }) => (
                  <div key={label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                          fontSize: 20,
                          fontWeight: 500,
                          color: "#fff",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {fmt(count)}
                      </span>
                    </div>
                    <Bar value={count} max={maxStatus} color={YELLOW} />
                  </div>
                ))}
              </div>
            </div>

            {/* Active/Terminal + Terminal outcomes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...card, flex: 1 }}>
                <p style={eyebrow}>Actif / Terminal</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {d.orderBreakdown.activeVsTerminal.map(({ label, count, pct: p }) => (
                    <div key={label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                          {label}
                        </span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                              fontSize: 22,
                              fontWeight: 500,
                              color: "#fff",
                            }}
                          >
                            {fmt(count)}
                          </span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
                            {Math.round(p)} %
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          height: 2,
                          background: "rgba(255,255,255,0.07)",
                          borderRadius: 99,
                          marginTop: 9,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${p}%`,
                            background: "rgba(255,255,255,0.28)",
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card, flex: 1 }}>
                <p style={eyebrow}>Resultats terminaux</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {d.orderBreakdown.deliveredVsReturnedVsRejected.map(
                    ({ label, count, pct: p }) => {
                      const barColor =
                        label === "Livr\u00e9es"
                          ? GREEN
                          : label === "Rejet\u00e9es"
                            ? RED
                            : "rgba(255,255,255,0.22)";
                      return (
                        <div key={label}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                            }}
                          >
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                              {label}
                            </span>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                              <span
                                style={{
                                  fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                                  fontSize: 22,
                                  fontWeight: 500,
                                  color: "#fff",
                                }}
                              >
                                {fmt(count)}
                              </span>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
                                {Math.round(p)} %
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              height: 2,
                              background: "rgba(255,255,255,0.07)",
                              borderRadius: 99,
                              marginTop: 9,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${p}%`,
                                background: barColor,
                                borderRadius: 99,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Produits (3 rankings) */}
        <section>
          <p style={eyebrow}>Produits</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 10,
            }}
          >
            {/* Top by delivered revenue */}
            <div style={{ ...card, padding: "24px 26px" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 8,
                  letterSpacing: "0.04em",
                }}
              >
                <span style={{ color: YELLOW }}>● </span>Revenu par produit
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 18 }}>
                Commandes livrees uniquement
              </p>
              {d.productBreakdown.topByDeliveredRevenue.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
                  Aucune donnee disponible
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {d.productBreakdown.topByDeliveredRevenue.slice(0, 6).map(
                    ({ productId, name, deliveredRevenue, gpmPct }, idx) => {
                      const marginColor =
                        gpmPct === null
                          ? "rgba(255,255,255,0.18)"
                          : gpmPct >= 35
                            ? GREEN
                            : gpmPct >= 22
                              ? AMBER
                              : RED;
                      return (
                        <div
                          key={productId}
                          style={{ display: "flex", alignItems: "center", gap: 12 }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: "rgba(255,255,255,0.18)",
                              fontWeight: 600,
                              width: 16,
                              textAlign: "right",
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "rgba(255,255,255,0.65)",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {name}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                              fontSize: 11,
                              color: marginColor,
                              flexShrink: 0,
                              minWidth: 36,
                              textAlign: "right",
                            }}
                            title={gpmPct === null ? "COGS non configure" : "Marge brute"}
                          >
                            {gpmPct === null ? "—" : `${gpmPct.toFixed(0)} %`}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                              fontSize: 16,
                              fontWeight: 500,
                              color: YELLOW,
                              flexShrink: 0,
                            }}
                          >
                            {fmtCurrency(deliveredRevenue)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Top by total orders */}
            <div style={{ ...card, padding: "24px 26px" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 8,
                  letterSpacing: "0.04em",
                }}
              >
                Volume de commandes
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 18 }}>
                Commandes valides hors supprimees
              </p>
              {d.productBreakdown.topByTotalOrders.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
                  Aucune donnee disponible
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {d.productBreakdown.topByTotalOrders.slice(0, 6).map(
                    ({ productId, name, totalOrders }, idx) => (
                      <div
                        key={productId}
                        style={{ display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.18)",
                            fontWeight: 600,
                            width: 16,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.65)",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                            fontSize: 18,
                            fontWeight: 500,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {fmt(totalOrders)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Top by delivered orders */}
            <div style={{ ...card, padding: "24px 26px" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 8,
                  letterSpacing: "0.04em",
                }}
              >
                <span style={{ color: GREEN }}>● </span>Livraisons confirmees
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 18 }}>
                Commandes valides livrees
              </p>
              {d.productBreakdown.topByDeliveredOrders.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
                  Aucune donnee disponible
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {d.productBreakdown.topByDeliveredOrders.slice(0, 6).map(
                    ({ productId, name, deliveredOrders }, idx) => (
                      <div
                        key={productId}
                        style={{ display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.18)",
                            fontWeight: 600,
                            width: 16,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.65)",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                            fontSize: 18,
                            fontWeight: 500,
                            color: GREEN,
                            flexShrink: 0,
                          }}
                        >
                          {fmt(deliveredOrders)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 6: Actions */}
        <section>
          <p style={eyebrow}>Actions</p>
          <StoreActions connected={d.connection.connected} />
        </section>
      </main>
    </>
  );
}
