import { Metadata } from "next";
import Link from "next/link";
import { getStorePageData } from "@/lib/data/store";
import { StoreActions } from "@/components/store/StoreActions";

export const metadata: Metadata = { title: "Ma boutique · Xanal" };
export const dynamic = "force-dynamic";

const YELLOW = "#F0B90B";
const GREEN = "#0ECB81";
const RED = "#F6465D";

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
  watch: { dot: "#fbbf24", label: "A rafraichir", glow: "#fbbf24" },
  risk: { dot: RED, label: "Sync requis", glow: RED },
} as const;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
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
  const d = await getStorePageData();
  const freshness = FRESHNESS[d.connection.syncFreshness];
  const maxStatus = Math.max(...d.orderBreakdown.byStatus.map((s) => s.count), 1);

  return (
    <>
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
              transition: "color 0.12s, border-color 0.12s",
              whiteSpace: "nowrap",
            }}
          >
            Tableau de bord →
          </Link>
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

        <section>
          <p style={eyebrow}>Vue d&apos;ensemble</p>
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
                  label: "Commandes en base",
                  value: fmt(d.kpis.totalDatabaseOrders),
                  sub: "hors tests",
                  accent: undefined,
                },
                {
                  label: "Commandes valides",
                  value: fmt(d.kpis.validOrders),
                  sub: "hors supprimees",
                  accent: YELLOW,
                },
                {
                  label: "Actives",
                  value: fmt(d.kpis.activeOrders),
                  sub: pct(d.kpis.activeOrders, d.kpis.validOrders) + " des valides",
                  accent: undefined,
                },
                {
                  label: "Terminales",
                  value: fmt(d.kpis.terminalOrders),
                  sub: pct(d.kpis.terminalOrders, d.kpis.validOrders) + " des valides",
                  accent: undefined,
                },
                {
                  label: "Livrees",
                  value: fmt(d.kpis.deliveredOrders),
                  sub: pct(d.kpis.deliveredOrders, d.kpis.validOrders) + " des valides",
                  accent: GREEN,
                },
                {
                  label: "Retournees",
                  value: fmt(d.kpis.returnedOrders),
                  sub: pct(d.kpis.returnedOrders, d.kpis.validOrders) + " des valides",
                  accent: RED,
                },
                {
                  label: "Rejetees",
                  value: fmt(d.kpis.rejectedOrders),
                  sub: pct(d.kpis.rejectedOrders, d.kpis.validOrders) + " des valides",
                  accent: undefined,
                },
                {
                  label: "Produits",
                  value: fmt(d.kpis.totalProducts),
                  sub: "catalogue",
                  accent: undefined,
                },
                {
                  label: "Produits actifs",
                  value: fmt(d.kpis.activeProducts),
                  sub: pct(d.kpis.activeProducts, d.kpis.totalProducts) + " du catalogue",
                  accent: undefined,
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

        <section>
          <p style={eyebrow}>Commandes</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr minmax(260px, 300px)",
              gap: 10,
            }}
          >
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
                  {d.orderBreakdown.deliveredVsReturnedVsRejected.map(({ label, count, pct: p }) => {
                    const barColor =
                      label === "LivrÃ©es"
                        ? GREEN
                        : label === "RejetÃ©es"
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
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <p style={eyebrow}>Produits</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 10,
            }}
          >
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
                Base uniquement sur les commandes valides livrees
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

        <section>
          <p style={eyebrow}>Actions</p>
          <StoreActions connected={d.connection.connected} />
        </section>
      </main>
    </>
  );
}
