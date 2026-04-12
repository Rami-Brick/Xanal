"use client";

import { useEffect, useState } from "react";
import type { MonthlyPnlData } from "@/lib/data/monthly-pnl";

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

function periodToInputValue(periodIso: string): string {
  return periodIso.slice(0, 7);
}

function npmTone(npmPct: number, hasRevenue: boolean): "stable" | "watch" | "risk" {
  if (!hasRevenue) return "watch";
  if (npmPct < 0) return "risk";
  if (npmPct < 3) return "watch";
  return "stable";
}

interface WaterfallLine {
  label: string;
  amount: number; // positive = inflow shown as +; negative = outflow shown as −
  detail?: string;
  emphasize?: "subtotal" | "final";
}

function buildWaterfall(d: MonthlyPnlData): WaterfallLine[] {
  return [
    {
      label: "Revenu livre",
      amount: d.grossRevenue,
      detail: `${d.deliveredOrders} commandes livrees`,
    },
    {
      label: "− COGS",
      amount: -d.deliveredCogs,
      detail: `${d.productsMissingCogs > 0 ? `${d.productsMissingCogs} produit(s) sans cout` : "Tous les produits configures"}`,
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
    ...d.overhead.map((o) => ({
      label: `− ${o.label}`,
      amount: -o.amount,
    })),
    {
      label: "= Profit net",
      amount: d.netProfit,
      detail: d.configuredRevenue > 0 ? `NPM ${fmtPct(d.npmPct)}` : "—",
      emphasize: "final" as const,
    },
  ];
}

interface Props {
  initialPeriod: string; // "YYYY-MM-01"
}

export function MonthlyPnl({ initialPeriod }: Props) {
  const [period, setPeriod] = useState(periodToInputValue(initialPeriod));
  const [data, setData] = useState<MonthlyPnlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/monthly-pnl?period=${period}-01`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setData(json.data);
        else setError(json.error || "Erreur");
      })
      .catch(() => { if (!cancelled) setError("Erreur reseau"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const waterfall = data ? buildWaterfall(data) : [];
  const tone = data ? npmTone(data.npmPct, data.configuredRevenue > 0) : "watch";

  return (
    <div>
      {/* Header with month picker + NPM card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1fr) minmax(280px, 1.2fr)",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={eyebrow}>Periode</p>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
              fontSize: 18,
              fontWeight: 500,
              color: "#fff",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 14px",
              outline: "none",
              colorScheme: "dark",
            }}
          />
          {data && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {data.totalOrders} commandes · {data.deliveredOrders} livrees · {data.returnedOrders} retours
            </p>
          )}
        </div>

        <div style={card}>
          <p style={eyebrow}>Profit net du mois</p>
          {loading ? (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
          ) : error ? (
            <p style={{ fontSize: 13, color: RED }}>{error}</p>
          ) : data ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 38,
                    fontWeight: 500,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    color: tone === "stable" ? GREEN : tone === "risk" ? RED : "#fff",
                  }}
                >
                  {fmtCurrency(data.netProfit)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 16,
                    color: tone === "stable" ? GREEN : tone === "risk" ? RED : AMBER,
                  }}
                >
                  {data.configuredRevenue > 0 ? fmtPct(data.npmPct) : "—"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                {data.totalOverhead > 0
                  ? `Apres ${fmtCurrency(data.totalOverhead)} de frais fixes`
                  : "Frais fixes mensuels non renseignes"}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* Waterfall */}
      {data && !loading && (
        <div style={card}>
          <p style={eyebrow}>Cascade P&amp;L</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {waterfall.map((line, i) => {
              const isSubtotal = line.emphasize === "subtotal";
              const isFinal = line.emphasize === "final";
              const positive = line.amount > 0;
              const negative = line.amount < 0;
              const amountColor = isFinal
                ? data.netProfit < 0 ? RED : data.netProfit > 0 ? GREEN : "#fff"
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
                    gridTemplateColumns: "minmax(220px, 1fr) 100px 160px",
                    gap: 16,
                    padding: isFinal ? "16px 0" : isSubtotal ? "12px 0" : "8px 0",
                    borderTop:
                      isSubtotal || isFinal ? "1px solid rgba(255,255,255,0.08)" : "none",
                    marginTop: isSubtotal || isFinal ? 8 : 0,
                    background: isFinal ? "rgba(14,203,129,0.04)" : "transparent",
                    paddingLeft: isFinal || isSubtotal ? 0 : 0,
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

          {/* Sanity hints */}
          {data.totalOverhead === 0 && (
            <p style={{ fontSize: 10, color: AMBER, marginTop: 14, opacity: 0.7 }}>
              Aucun frais fixe enregistre pour ce mois. Configurer dans les parametres pour afficher le profit net reel.
            </p>
          )}
          {data.productsMissingCogs > 0 && (
            <p style={{ fontSize: 10, color: AMBER, marginTop: 8, opacity: 0.7 }}>
              {data.productsMissingCogs} produit(s) sans COGS configure. Le profit brut sous-estime la realite.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
