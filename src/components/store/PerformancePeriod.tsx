"use client";

import { useEffect, useState } from "react";
import type { FinanceRangeData } from "@/lib/data/finance";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { METRICS } from "@/components/ui/metric-definitions";

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

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 1,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)} %`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function firstOfLastMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastDayOfLastMonth(): string {
  const d = new Date();
  d.setDate(0); // last day of prev month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface WaterfallLine {
  label: string;
  amount: number;
  detail?: string;
  emphasize?: "subtotal" | "final";
}

function buildWaterfall(d: FinanceRangeData): WaterfallLine[] {
  return [
    {
      label: "Revenu livre",
      amount: d.grossRevenue,
      detail: `${d.deliveredOrders} commandes livrees`,
    },
    {
      label: "− COGS",
      amount: -d.deliveredCogs,
      detail: d.productsMissingCogs > 0
        ? `${d.productsMissingCogs} produit(s) sans cout`
        : "Tous les produits configures",
    },
    {
      label: "= Profit brut",
      amount: d.grossProfit,
      detail: d.configuredRevenue > 0 ? `${fmtPct(d.gpmPct)} sur revenu configure` : "—",
      emphasize: "subtotal",
    },
    {
      label: "− Livraison Cosmos",
      amount: -d.deliveryFees,
      detail: `${d.deliveredOrders} livraisons`,
    },
    {
      label: "− Retours (livraison + frais)",
      amount: -d.returnBurden,
      detail: `${d.returnedOrders} retours`,
    },
    {
      label: "− Emballage",
      amount: -d.packingCosts,
      detail: d.packingCosts > 0 ? `${d.deliveredOrders + d.returnedOrders} colis` : "Non configure",
    },
    {
      label: "− Commission Converty",
      amount: -d.convertyFees,
      detail: "Sur le total des commandes",
    },
    {
      label: "= Marge de contribution",
      amount: d.contributionMargin,
      detail: d.configuredRevenue > 0 ? fmtPct(d.cmPct) : "—",
      emphasize: "subtotal",
    },
    {
      label: "− Depenses publicitaires",
      amount: -d.adSpend,
      detail: d.adSpend > 0
        ? (d.blendedRoas !== null ? `ROAS ${d.blendedRoas.toFixed(2)}x` : "")
        : "Aucune campagne saisie",
    },
    {
      label: "= CM apres publicite",
      amount: d.contributionMarginAfterAds,
      detail: d.configuredRevenue > 0 ? fmtPct(d.cmPctAfterAds) : "—",
      emphasize: "final",
    },
  ];
}

interface Props {
  initialFrom: string; // YYYY-MM-DD
  initialTo: string;   // YYYY-MM-DD
}

export function PerformancePeriod({ initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [data, setData] = useState<FinanceRangeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateError = from > to ? "La date de début doit être antérieure ou égale à la date de fin." : null;

  useEffect(() => {
    if (from > to) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/finance/range?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setData(json.data);
        else setError(json.error || "Erreur");
      })
      .catch(() => { if (!cancelled) setError("Erreur reseau"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  const waterfall = data ? buildWaterfall(data) : [];

  const quickSelects = [
    {
      label: "Ce mois",
      action: () => { setFrom(firstOfCurrentMonth()); setTo(todayIso()); },
    },
    {
      label: "Mois dernier",
      action: () => { setFrom(firstOfLastMonth()); setTo(lastDayOfLastMonth()); },
    },
    {
      label: "30 jours",
      action: () => { setFrom(daysAgo(29)); setTo(todayIso()); },
    },
    {
      label: "90 jours",
      action: () => { setFrom(daysAgo(89)); setTo(todayIso()); },
    },
  ];

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
    fontSize: 15,
    fontWeight: 500,
    color: "#fff",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "8px 12px",
    outline: "none",
    colorScheme: "dark",
    flex: "1 1 130px",
    minWidth: 0,
  };

  return (
    <div>
      {/* Picker card */}
      <div style={{ ...card, marginBottom: 10 }}>
        <p style={{ ...eyebrow, marginBottom: 12 }}>Periode</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Du</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={inputStyle}
            />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Au</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {quickSelects.map((q) => (
              <button
                key={q.label}
                onClick={q.action}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.55)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "5px 10px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
        {dateError && (
          <p style={{ fontSize: 11, color: RED, marginTop: 4 }}>{dateError}</p>
        )}
        {data && !loading && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
            {data.totalOrders} commandes · {data.deliveredOrders} livrees · {data.returnedOrders} retours
          </p>
        )}
      </div>

      {/* KPI row */}
      {!dateError && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={card}>
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              Depense publicitaire
              <MetricTooltip {...METRICS.adSpendPeriod} />
            </p>
            {loading ? (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
            ) : error ? (
              <p style={{ fontSize: 13, color: RED }}>{error}</p>
            ) : data ? (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 28,
                    fontWeight: 500,
                    color: data.adSpend > 0 ? "#fff" : "rgba(255,255,255,0.3)",
                    lineHeight: 1,
                  }}
                >
                  {fmtCurrency(data.adSpend)}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 6 }}>
                  {data.adSpendNoProduct > 0
                    ? `${fmtCurrency(data.adSpendNoProduct)} non mappe`
                    : "Saisie manuelle"}
                </p>
              </>
            ) : null}
          </div>

          <div style={card}>
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              ROAS global
              <MetricTooltip {...METRICS.roasGlobal} />
            </p>
            {loading ? (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
            ) : error ? (
              <p style={{ fontSize: 13, color: RED }}>{error}</p>
            ) : data ? (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 28,
                    fontWeight: 500,
                    lineHeight: 1,
                    color:
                      data.blendedRoas === null
                        ? "rgba(255,255,255,0.3)"
                        : data.blendedRoas >= 3.5
                          ? GREEN
                          : data.blendedRoas >= 2.5
                            ? AMBER
                            : data.blendedRoas >= 2.0
                              ? "rgba(255,255,255,0.7)"
                              : RED,
                  }}
                >
                  {data.blendedRoas === null ? "—" : `${data.blendedRoas.toFixed(2)}x`}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 6 }}>
                  Revenu livre / depense sur la periode
                </p>
              </>
            ) : null}
          </div>

          <div style={card}>
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              CAC
              <MetricTooltip {...METRICS.cac} />
            </p>
            {loading ? (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
            ) : error ? (
              <p style={{ fontSize: 13, color: RED }}>{error}</p>
            ) : data ? (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 28,
                    fontWeight: 500,
                    color: data.cac === null ? "rgba(255,255,255,0.3)" : "#fff",
                    lineHeight: 1,
                  }}
                >
                  {data.cac === null ? "—" : fmtCurrency(data.cac)}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 6 }}>
                  {data.newCustomers} nouveaux clients
                </p>
              </>
            ) : null}
          </div>

          <div style={card}>
            <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
              Clients livres
              <MetricTooltip {...METRICS.deliveredCustomers} />
            </p>
            {loading ? (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
            ) : error ? (
              <p style={{ fontSize: 13, color: RED }}>{error}</p>
            ) : data ? (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 28,
                    fontWeight: 500,
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  {data.totalDeliveredCustomers}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 6 }}>
                  {data.newCustomers} nouveaux ·{" "}
                  {data.totalDeliveredCustomers - data.newCustomers} recurrents
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Waterfall */}
      {!dateError && data && !loading && (
        <div style={card}>
          <p style={eyebrow}>Cascade performance</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {waterfall.map((line, i) => {
              const isSubtotal = line.emphasize === "subtotal";
              const isFinal = line.emphasize === "final";
              const positive = line.amount > 0;
              const negative = line.amount < 0;
              const amountColor = isFinal
                ? line.amount < 0 ? RED : line.amount > 0 ? YELLOW : "#fff"
                : isSubtotal
                  ? line.amount < 0 ? RED : line.amount > 0 ? GREEN : "rgba(255,255,255,0.6)"
                  : negative
                    ? "rgba(246,70,93,0.85)"
                    : positive
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.25)";
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(120px, 1fr) minmax(60px, 100px) minmax(110px, 160px)",
                    gap: 16,
                    padding: isFinal ? "16px 0" : isSubtotal ? "12px 0" : "8px 0",
                    borderTop:
                      isSubtotal || isFinal ? "1px solid rgba(255,255,255,0.08)" : "none",
                    marginTop: isSubtotal || isFinal ? 8 : 0,
                    background: isFinal ? "rgba(240,185,11,0.04)" : "transparent",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: isFinal ? 14 : isSubtotal ? 13 : 12,
                      color: isFinal || isSubtotal ? "#fff" : "rgba(255,255,255,0.55)",
                      fontWeight: isFinal ? 700 : isSubtotal ? 600 : 400,
                    }}
                  >
                    {line.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.25)",
                      textAlign: "right",
                    }}
                  >
                    {line.detail ?? ""}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                      fontSize: isFinal ? 22 : isSubtotal ? 18 : 14,
                      fontWeight: isFinal ? 700 : isSubtotal ? 600 : 500,
                      color: amountColor,
                      textAlign: "right",
                    }}
                  >
                    {fmtCurrency(line.amount)}
                  </span>
                </div>
              );
            })}
          </div>
          {data.productsMissingCogs > 0 && (
            <p style={{ fontSize: 10, color: AMBER, marginTop: 14, opacity: 0.7 }}>
              {data.productsMissingCogs} produit(s) sans COGS configure. Le profit brut sous-estime la realite.
            </p>
          )}
        </div>
      )}

      {/* Per-product ROAS table */}
      {!dateError && data && !loading && data.roasPerProduct.length > 0 && (
        <div style={{ ...card, marginTop: 10 }}>
          <p style={eyebrow}>ROAS par produit</p>
          <div className="scroll-x">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 1.5fr) 110px 110px 100px",
                gap: 12,
                padding: "0 0 10px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                minWidth: 560,
              }}
            >
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>PRODUIT</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textAlign: "right" }}>DEPENSE</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textAlign: "right" }}>REVENU LIVRE</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textAlign: "right" }}>ROAS</span>
            </div>
            {data.roasPerProduct.map((r) => {
              const roasColor =
                r.roas >= 3.5
                  ? GREEN
                  : r.roas >= 2.5
                    ? AMBER
                    : r.roas >= 2.0
                      ? "rgba(255,255,255,0.55)"
                      : RED;
              return (
                <div
                  key={r.productId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 1.5fr) 110px 110px 100px",
                    gap: 12,
                    padding: "10px 0",
                    alignItems: "baseline",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    minWidth: 560,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.productName ?? r.productId}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.55)",
                      textAlign: "right",
                    }}
                  >
                    {fmtCurrency(r.spend)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                      fontSize: 13,
                      color: YELLOW,
                      textAlign: "right",
                    }}
                  >
                    {fmtCurrency(r.revenue)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                      fontSize: 14,
                      fontWeight: 600,
                      color: roasColor,
                      textAlign: "right",
                    }}
                  >
                    {r.roas.toFixed(2)}x
                  </span>
                </div>
              );
            })}
          </div>
          {data.adSpendNoProduct > 0 && (
            <p style={{ fontSize: 10, color: AMBER, marginTop: 10, opacity: 0.7 }}>
              {fmtCurrency(data.adSpendNoProduct)} de depenses non mappes a un produit (inclus dans ROAS global).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
