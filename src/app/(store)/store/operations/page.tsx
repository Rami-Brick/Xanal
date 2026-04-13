import { Metadata } from "next";
import { getStorePageData } from "@/lib/data/store";
import { PageShell } from "../../_shared/PageShell";
import { Bar } from "../../_shared/Bar";
import {
  AMBER,
  GREEN,
  RED,
  YELLOW,
  card,
  eyebrow,
  fmt,
  fmtCurrency,
} from "../../_shared/styles";

export const metadata: Metadata = { title: "Operations · Xanal" };
export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const d = await getStorePageData();
  const maxStatus = Math.max(...d.orderBreakdown.byStatus.map((s) => s.count), 1);

  return (
    <PageShell
      title="Operations"
      eyebrow="Pipeline et produits"
      storeId={d.connection.storeId}
      freshness={{
        tone: d.connection.syncFreshness,
        lastSyncAt: d.connection.lastSyncAt,
      }}
      notConnected={!d.connection.connected}
    >
      {/* Pipeline */}
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

      {/* Produits */}
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
                {d.productBreakdown.topByTotalOrders
                  .slice(0, 6)
                  .map(({ productId, name, totalOrders }, idx) => (
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
                  ))}
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
                {d.productBreakdown.topByDeliveredOrders
                  .slice(0, 6)
                  .map(({ productId, name, deliveredOrders }, idx) => (
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
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
