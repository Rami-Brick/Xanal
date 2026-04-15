import type { DailyPulseData } from "@/lib/data/daily-pulse";
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
  marginBottom: 14,
};

const TONE_COLORS = { stable: GREEN, watch: AMBER, risk: RED } as const;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 1,
  }).format(n);
}

function delta(today: number, yesterday: number): { label: string; tone: "stable" | "watch" | "risk" } | null {
  if (yesterday === 0 && today === 0) return null;
  if (yesterday === 0) return { label: "+nouv.", tone: "stable" };
  const diff = today - yesterday;
  const pct = (diff / yesterday) * 100;
  const sign = diff > 0 ? "+" : "";
  const label = `${sign}${Math.round(pct)}%`;
  const tone: "stable" | "watch" | "risk" = pct >= 0 ? "stable" : pct >= -20 ? "watch" : "risk";
  return { label, tone };
}

function returnRateTone(rate: number): "stable" | "watch" | "risk" {
  if (rate >= 28) return "risk";
  if (rate >= 20) return "watch";
  if (rate >= 15) return "watch";
  return "stable";
}

function roasTone(roas: number | null): "stable" | "watch" | "risk" {
  if (roas === null) return "stable";
  if (roas < 2.0) return "risk";
  if (roas < 2.5) return "watch";
  if (roas < 3.5) return "watch";
  return "stable";
}

interface PipelineStep {
  label: string;
  count: number;
  tone?: "stable" | "watch" | "risk";
}

function buildSteps(d: DailyPulseData): PipelineStep[] {
  return [
    { label: "En attente", count: d.today.pending },
    { label: "Confirmees", count: d.today.confirmed, tone: "stable" },
    { label: "Deposees", count: d.today.deposit },
    { label: "En transit", count: d.today.inTransit },
    { label: "Livrees", count: d.today.delivered, tone: "stable" },
  ];
}

export function DailyPulse({ data }: { data: DailyPulseData }) {
  const steps = buildSteps(data);
  const adSpendDelta = delta(data.todayAdSpend, data.yesterdayAdSpend);
  const orderDelta = delta(data.today.total, data.yesterday.total);
  const rrTone = returnRateTone(data.rollingReturnRate);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <p style={{ ...eyebrow, marginBottom: 0 }}>Aujourd&apos;hui</p>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            textTransform: "capitalize",
          }}
        >
          {data.todayLabel}
        </span>
      </div>

      {/* Pipeline strip */}
      <div style={{ ...card, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <p style={{ ...eyebrow, marginBottom: 0 }}>Pipeline du jour</p>
            <MetricTooltip {...METRICS.pipelineToday} />
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            {fmt(data.today.total)} commandes · {fmtCurrency(data.today.totalRevenuePotential)} potentiel
          </span>
          {orderDelta && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 11,
                fontWeight: 600,
                color: TONE_COLORS[orderDelta.tone],
                marginLeft: "auto",
              }}
            >
              {orderDelta.label} vs hier
              <MetricTooltip {...METRICS.deltaVsYesterday} />
            </span>
          )}
        </div>

        <div
          className="scroll-x"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${steps.length}, minmax(90px, 1fr))`,
            gap: 8,
            alignItems: "stretch",
          }}
        >
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const stepColor = step.tone === "stable" ? GREEN : "rgba(255,255,255,0.5)";
            return (
              <div
                key={step.label}
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  position: "relative",
                }}
              >
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: 8,
                  }}
                >
                  {step.label}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 26,
                    fontWeight: 500,
                    lineHeight: 1,
                    color: stepColor,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(step.count)}
                </p>
                {!isLast && (
                  <span
                    style={{
                      position: "absolute",
                      right: -10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.15)",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  >
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom row: small extras (returned/rejected today) */}
        {(data.today.returned > 0 || data.today.rejected > 0) && (
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.04)",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {data.today.returned > 0 && (
              <span>
                Retours :{" "}
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: RED,
                    fontWeight: 500,
                  }}
                >
                  {fmt(data.today.returned)}
                </span>
              </span>
            )}
            {data.today.rejected > 0 && (
              <span>
                Rejets :{" "}
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: 500,
                  }}
                >
                  {fmt(data.today.rejected)}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPIs row: return rate, ad spend, today campaigns summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {/* Return rate (rolling 7d) */}
        <div style={card}>
          <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
            Taux retour 7j
            <MetricTooltip {...METRICS.returnRate7d} />
          </p>
          <p
            style={{
              fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
              fontSize: 30,
              fontWeight: 500,
              lineHeight: 1,
              color: TONE_COLORS[rrTone],
            }}
          >
            {data.rollingReturnRate.toFixed(1)} %
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
            {fmt(data.rollingReturnNumerator)} / {fmt(data.rollingReturnDenominator)} expediees ·{" "}
            <span style={{ color: "rgba(255,255,255,0.4)" }}>cible &lt; 15 %</span>
          </p>
        </div>

        {/* Ad spend today */}
        <div style={card}>
          <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
            Depenses pubs (jour)
            <MetricTooltip {...METRICS.adSpendToday} />
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <p
              style={{
                fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                fontSize: 30,
                fontWeight: 500,
                lineHeight: 1,
                color: data.todayAdSpend > 0 ? "#fff" : "rgba(255,255,255,0.3)",
              }}
            >
              {fmtCurrency(data.todayAdSpend)}
            </p>
            {adSpendDelta && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: TONE_COLORS[adSpendDelta.tone],
                }}
              >
                {adSpendDelta.label}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
            Hier : {fmtCurrency(data.yesterdayAdSpend)}
          </p>
        </div>

        {/* Per-campaign ROAS today */}
        <div style={card}>
          <p style={{ ...eyebrow, display: "inline-flex", alignItems: "center" }}>
            ROAS du jour
            <MetricTooltip {...METRICS.roasToday} />
          </p>
          {data.todayCampaigns.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
              Aucune depense publicitaire aujourd&apos;hui
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.todayCampaigns.slice(0, 4).map((c) => {
                const tone = roasTone(c.roas);
                return (
                  <div
                    key={c.campaignId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 70px 70px",
                      gap: 10,
                      alignItems: "baseline",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.4)",
                        textAlign: "right",
                      }}
                    >
                      {fmtCurrency(c.spend)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: 13,
                        fontWeight: 600,
                        color: TONE_COLORS[tone],
                        textAlign: "right",
                      }}
                    >
                      {c.roas !== null ? `${c.roas.toFixed(2)}x` : "—"}
                    </span>
                  </div>
                );
              })}
              {data.todayCampaigns.length > 4 && (
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
                  +{data.todayCampaigns.length - 4} autre(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {data.alerts.slice(0, 4).map((alert, i) => (
            <div
              key={i}
              style={{
                ...card,
                padding: "12px 18px",
                borderLeft: `3px solid ${TONE_COLORS[alert.tone]}`,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    alert.tone === "stable"
                      ? "rgba(255,255,255,0.6)"
                      : TONE_COLORS[alert.tone],
                }}
              >
                {alert.title}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>
                {alert.body}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
