import type { InvestorSummary } from "@/lib/data/investors";

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
  fontSize: 28,
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

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 1,
  }).format(n);
}

const STATUS_COLOR: Record<string, string> = {
  in_capital_repayment: AMBER,
  in_profit_share: YELLOW,
  settled: GREEN,
  in_loss: RED,
};

const STATUS_LABEL: Record<string, string> = {
  in_capital_repayment: "Capital en cours",
  in_profit_share: "Profit a verser",
  settled: "Solde",
  in_loss: "Perte",
};

export function InvestorsSummaryCards({ data }: { data: InvestorSummary }) {
  if (data.activeDealsCount === 0 && data.deals.length === 0) {
    return (
      <div style={{ ...card, padding: "16px 22px" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          Aucun deal investisseur configure.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        <div style={card}>
          <p style={eyebrow}>Capital deploye</p>
          <p style={bigNum}>{fmtCurrency(data.totalCapitalDeployed)}</p>
          <p style={hint}>
            {data.activeDealsCount} deal{data.activeDealsCount > 1 ? "s" : ""} actif
            {data.activeDealsCount > 1 ? "s" : ""}
          </p>
        </div>
        <div style={card}>
          <p style={eyebrow}>Capital restant du</p>
          <p
            style={{
              ...bigNum,
              color:
                data.totalCapitalOutstanding > 0 ? AMBER : GREEN,
            }}
          >
            {fmtCurrency(data.totalCapitalOutstanding)}
          </p>
          <p style={hint}>A retourner aux investisseurs</p>
        </div>
        <div style={card}>
          <p style={eyebrow}>Profit a verser</p>
          <p
            style={{
              ...bigNum,
              color:
                data.totalProfitShareOwing > 0 ? YELLOW : "rgba(255,255,255,0.3)",
            }}
          >
            {fmtCurrency(data.totalProfitShareOwing)}
          </p>
          <p style={hint}>Part de profit accumulee</p>
        </div>
        <div style={card}>
          <p style={eyebrow}>Total a payer</p>
          <p
            style={{
              ...bigNum,
              color: data.totalOwedNow > 0 ? "#fff" : GREEN,
            }}
          >
            {fmtCurrency(data.totalOwedNow)}
          </p>
          <p style={hint}>Capital + profit dus</p>
        </div>
      </div>

      {/* Per-deal table */}
      {data.deals.length > 0 && (
        <div className="scroll-x" style={{ ...card, padding: "0" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 110px 110px 110px 110px",
              gap: 12,
              padding: "14px 22px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.3)",
              minWidth: 720,
            }}
          >
            <span>INVESTISSEUR</span>
            <span>SCOPE</span>
            <span style={{ textAlign: "right" }}>CAPITAL</span>
            <span style={{ textAlign: "right" }}>PROFIT NET</span>
            <span style={{ textAlign: "right" }}>A PAYER</span>
            <span style={{ textAlign: "right" }}>STATUT</span>
          </div>
          {data.deals.map((d) => (
            <div
              key={d.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 110px 110px 110px 110px",
                gap: 12,
                padding: "12px 22px",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                opacity: d.status === "closed" ? 0.5 : 1,
                minWidth: 720,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#fff",
                  fontWeight: 500,
                }}
              >
                {d.investor_name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {d.product_name ?? "General"} · {d.profit_share_pct.toFixed(0)}%
              </span>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.65)",
                  textAlign: "right",
                }}
              >
                {fmtCurrency(d.capital_deployed)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 12,
                  color:
                    d.scopeNetProfit > 0
                      ? GREEN
                      : d.scopeNetProfit < 0
                        ? RED
                        : "rgba(255,255,255,0.3)",
                  textAlign: "right",
                }}
              >
                {fmtCurrency(d.scopeNetProfit)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: d.waterfall.totalOwedNow > 0 ? YELLOW : GREEN,
                  textAlign: "right",
                }}
              >
                {fmtCurrency(d.waterfall.totalOwedNow)}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: STATUS_COLOR[d.waterfall.status] ?? "#fff",
                  textAlign: "right",
                }}
              >
                {STATUS_LABEL[d.waterfall.status] ?? d.waterfall.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
