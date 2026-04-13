import type { CashPosition } from "@/lib/data/settlements";

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

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00Z"));
}

export function CashPositionCards({ data }: { data: CashPosition }) {
  const lastGap = data.lastGap;
  const gapColor =
    lastGap === null
      ? "rgba(255,255,255,0.3)"
      : Math.abs(lastGap) < 0.5
        ? GREEN
        : data.lastGapPct !== null && Math.abs(data.lastGapPct) > 5
          ? RED
          : AMBER;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 10,
      }}
    >
      <div style={card}>
        <p style={eyebrow}>Cash encaisse</p>
        <p style={{ ...bigNum, color: data.totalSettled > 0 ? GREEN : "rgba(255,255,255,0.3)" }}>
          {fmtCurrency(data.totalSettled)}
        </p>
        <p style={hint}>
          {data.settlementsCount > 0
            ? `${data.settlementsCount} reglement(s) recu(s)`
            : "Aucun reglement enregistre"}
        </p>
      </div>
      <div style={card}>
        <p style={eyebrow}>Cash en transit</p>
        <p style={{ ...bigNum, color: data.cashInTransit > 0 ? YELLOW : "rgba(255,255,255,0.3)" }}>
          {fmtCurrency(data.cashInTransit)}
        </p>
        <p style={hint}>
          {data.lastSettlementCoveredUntil
            ? `Depuis le ${fmtDate(data.lastSettlementCoveredUntil)}`
            : "Configurer un reglement"}
        </p>
      </div>
      <div style={card}>
        <p style={eyebrow}>Dernier reglement</p>
        <p style={{ ...bigNum, fontSize: 22, color: "#fff" }}>
          {fmtDate(data.lastSettlementDate)}
        </p>
        <p style={hint}>
          {data.lastSettlementCoveredUntil
            ? `Couvre jusqu'au ${fmtDate(data.lastSettlementCoveredUntil)}`
            : "—"}
        </p>
      </div>
      <div style={card}>
        <p style={eyebrow}>Ecart dernier reglement</p>
        <p style={{ ...bigNum, color: gapColor }}>
          {lastGap === null
            ? "—"
            : (lastGap > 0 ? "−" : "+") + fmtCurrency(Math.abs(lastGap))}
        </p>
        <p style={hint}>
          {data.lastGapPct !== null ? `${data.lastGapPct.toFixed(1)} % attendu` : "—"}
        </p>
      </div>
    </div>
  );
}
