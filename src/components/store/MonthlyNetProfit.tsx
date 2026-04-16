"use client";

import { useEffect, useState } from "react";
import type { MonthlyNetProfitData } from "@/lib/data/finance";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { METRICS } from "@/components/ui/metric-definitions";

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
  return periodIso.slice(0, 7); // "YYYY-MM-01" → "YYYY-MM"
}

function npmTone(npmPct: number, hasRevenue: boolean): "stable" | "watch" | "risk" {
  if (!hasRevenue) return "watch";
  if (npmPct < 0) return "risk";
  if (npmPct < 3) return "watch";
  return "stable";
}

interface Props {
  initialPeriod: string; // "YYYY-MM-01"
}

export function MonthlyNetProfit({ initialPeriod }: Props) {
  const [period, setPeriod] = useState(periodToInputValue(initialPeriod));
  const [data, setData] = useState<MonthlyNetProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/finance/month-overhead?period=${period}-01`)
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

  const tone = data ? npmTone(data.npmPct, data.configuredRevenue > 0) : "watch";

  return (
    <div>
      {/* Header row: month picker + NPM card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={eyebrow}>Mois du profit net</p>
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
              {data.totalOrders} commandes · {data.deliveredOrders} livrees
            </p>
          )}
        </div>

        <div style={card}>
          <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
            Profit net du mois
            <MetricTooltip {...METRICS.netProfitMonth} />
          </p>
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

      {/* Mini waterfall: CM → overhead lines → net profit */}
      {data && !loading && (
        <div style={card}>
          <p style={eyebrow}>Cascade frais fixes</p>

          {!data.hasAnyData ? (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Aucune commande ce mois-ci.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* CM after ads — starting point */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 1fr) minmax(110px, 160px)",
                  gap: 16,
                  padding: "12px 0",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                  CM apres publicite
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 18,
                    fontWeight: 600,
                    color: data.contributionMarginAfterAds >= 0 ? GREEN : RED,
                    textAlign: "right",
                  }}
                >
                  {fmtCurrency(data.contributionMarginAfterAds)}
                </span>
              </div>

              {/* Overhead lines */}
              {data.overhead.length === 0 ? (
                <p style={{ fontSize: 11, color: AMBER, padding: "8px 0", opacity: 0.8 }}>
                  Aucun frais fixe enregistre pour ce mois. Configurer dans les parametres.
                </p>
              ) : (
                data.overhead.map((o) => (
                  <div
                    key={o.category}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(120px, 1fr) minmax(110px, 160px)",
                      gap: 16,
                      padding: "7px 0",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                      − {o.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "rgba(246,70,93,0.85)",
                        textAlign: "right",
                      }}
                    >
                      {fmtCurrency(-o.amount)}
                    </span>
                  </div>
                ))
              )}

              {/* Net profit final line */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 1fr) minmax(110px, 160px)",
                  gap: 16,
                  padding: "16px 0",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  marginTop: 8,
                  background:
                    data.netProfit > 0
                      ? "rgba(14,203,129,0.04)"
                      : data.netProfit < 0
                        ? "rgba(246,70,93,0.04)"
                        : "transparent",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>
                  = Profit net
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 22,
                    fontWeight: 700,
                    color:
                      data.netProfit > 0 ? GREEN : data.netProfit < 0 ? RED : "#fff",
                    textAlign: "right",
                  }}
                >
                  {fmtCurrency(data.netProfit)}
                </span>
              </div>

              {data.configuredRevenue > 0 && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                  NPM {fmtPct(data.npmPct)} sur revenu configure
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
