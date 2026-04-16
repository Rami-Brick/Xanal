import { Metadata } from "next";
import { getStorePageData } from "@/lib/data/store";
import { TrendChart } from "@/components/store/TrendChart";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { METRICS } from "@/components/ui/metric-definitions";
import { PageShell } from "../../_shared/PageShell";
import {
  AMBER,
  GREEN,
  RED,
  YELLOW,
  TONE_COLORS,
  bigNum,
  card,
  eyebrow,
  fmt,
  fmtCurrency,
  fmtPct,
  hint,
  pct,
  returnRateTone,
  confirmationRateTone,
} from "../../_shared/styles";

export const metadata: Metadata = { title: "Performance · Xanal" };
export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const d = await getStorePageData();
  const rv = d.revenueMetrics;

  return (
    <PageShell
      title="Performance"
      eyebrow="Vue lifetime"
      storeId={d.connection.storeId}
      freshness={{
        tone: d.connection.syncFreshness,
        lastSyncAt: d.connection.lastSyncAt,
      }}
      notConnected={!d.connection.connected}
    >
      {/* Section 1: Indicateurs cles */}
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
                tooltipKey: "revenueDelivered",
                value: fmtCurrency(rv.grossRevenue),
                sub: `${fmt(d.kpis.deliveredOrders)} commandes livrees`,
                accent: GREEN,
              },
              {
                label: "Panier moyen",
                tooltipKey: "averageBasket",
                value: fmtCurrency(rv.averageOrderValue),
                sub: `sur ${fmt(d.kpis.deliveredOrders)} livraisons`,
                accent: YELLOW,
              },
              {
                label: "Commandes actives",
                tooltipKey: "activeOrders",
                value: fmt(d.kpis.activeOrders),
                sub: `${pct(d.kpis.activeOrders, d.kpis.validOrders)} des valides`,
                accent: undefined,
              },
              {
                label: "Taux de retour",
                tooltipKey: "returnRateLifetime",
                value: fmtPct(rv.returnRate),
                sub: `${fmt(rv.returnNumerator)} retours / ${fmt(rv.returnDenominator)} expediees`,
                accent: TONE_COLORS[returnRateTone(rv.returnRate)],
              },
              {
                label: "Taux de confirmation",
                tooltipKey: "confirmationRate",
                value: fmtPct(rv.confirmationRate),
                sub: `${fmt(rv.confirmationNumerator)} / ${fmt(rv.confirmationDenominator)} traitees`,
                accent: TONE_COLORS[confirmationRateTone(rv.confirmationRate)],
              },
              {
                label: "Commandes livrees",
                tooltipKey: "deliveredOrders",
                value: fmt(d.kpis.deliveredOrders),
                sub: `${pct(d.kpis.deliveredOrders, d.kpis.validOrders)} des valides`,
                accent: GREEN,
              },
            ] as { label: string; tooltipKey: keyof typeof METRICS; value: string; sub: string; accent: string | undefined }[]
          ).map(({ label, tooltipKey, value, sub, accent }) => (
            <div key={label} style={card}>
              <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
                {label}
                <MetricTooltip {...METRICS[tooltipKey]} />
              </p>
              <p style={{ ...bigNum, color: accent ?? "#fff" }}>{value}</p>
              <p style={hint}>{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Tendance */}
      <section>
        <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
          Tendance
          <MetricTooltip {...METRICS.trend} />
        </p>
        <TrendChart data={d.dailyTrend} />
      </section>

      {/* Section 3: Rentabilite */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Rentabilite</p>
          {d.margins.totalActiveProducts > 0 && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
              {fmt(d.margins.productsWithCogs)} / {fmt(d.margins.totalActiveProducts)} produits configures
            </span>
          )}
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
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              Profit brut
              <MetricTooltip {...METRICS.grossProfit} />
            </p>
            <p
              style={{
                ...bigNum,
                color:
                  d.margins.grossProfit > 0
                    ? GREEN
                    : d.margins.grossProfit < 0
                      ? RED
                      : "#fff",
              }}
            >
              {fmtCurrency(d.margins.grossProfit)}
            </p>
            <p style={hint}>Revenu livre moins COGS</p>
          </div>
          <div style={card}>
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              Marge brute
              <MetricTooltip {...METRICS.grossMargin} />
            </p>
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
            <p style={hint}>Sur {fmtCurrency(d.margins.configuredRevenue)} configures</p>
          </div>
          <div style={card}>
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              CPO
              <MetricTooltip {...METRICS.cpo} />
            </p>
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
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              Produits non configures
              <MetricTooltip {...METRICS.productsMissingCogs} />
            </p>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
                Marge de contribution
                <MetricTooltip {...METRICS.contributionMargin} />
              </p>
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

          <div style={card}>
            <p style={eyebrow}>Couts variables</p>
            {(
              [
                {
                  label: "Livraison transporteur",
                  tooltipKey: "costCosmos",
                  value: d.margins.costBreakdown.deliveryFees,
                  detail: `${fmt(d.kpis.deliveredOrders)} × ${fmtCurrency(d.margins.fees.carrierDeliveryFee)}`,
                },
                {
                  label: "Retours (livraison + frais retour)",
                  tooltipKey: "costReturns",
                  value: d.margins.costBreakdown.returnBurden,
                  detail: `${fmt(rv.returnNumerator)} × ${fmtCurrency(d.margins.fees.carrierDeliveryFee + d.margins.fees.carrierReturnFee)}`,
                },
                {
                  label: "Emballage",
                  tooltipKey: "costPacking",
                  value: d.margins.costBreakdown.packingCosts,
                  detail:
                    d.margins.fees.packingCostPerPackage > 0
                      ? `${fmt(d.kpis.deliveredOrders + rv.returnNumerator)} × ${fmtCurrency(d.margins.fees.packingCostPerPackage)}`
                      : "Non configure",
                },
                {
                  label: "Commission Converty",
                  tooltipKey: "costConverty",
                  value: d.margins.costBreakdown.convertyFees,
                  detail: `${(d.margins.fees.convertyFeeRate * 100).toFixed(2)} % sur le total`,
                },
              ] as { label: string; tooltipKey: keyof typeof METRICS; value: number; detail: string }[]
            ).map(({ label, tooltipKey, value, detail }, i, arr) => {
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
                    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                      {label}
                      <MetricTooltip {...METRICS[tooltipKey]} />
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

      {/* Section 4: P&L par produit */}
      {d.productPnl.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <p style={{ ...eyebrow, marginBottom: 0 }}>P&amp;L par produit</p>
              <MetricTooltip {...METRICS.pnlProduct} />
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
              Kill / keep · tri par revenu livre
            </span>
          </div>
          <div style={{ ...card, padding: "0", overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px,2fr) 80px 110px 100px 100px 100px",
                gap: 12,
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                minWidth: 680,
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
                    minWidth: 680,
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
                      color:
                        p.grossProfit > 0
                          ? GREEN
                          : p.grossProfit < 0
                            ? RED
                            : "rgba(255,255,255,0.3)",
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

      {/* Section 5: Alertes (lifetime) */}
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
    </PageShell>
  );
}
