// Shared style constants + formatters for /store/* pages.
// Duplicated from the original store/page.tsx inline definitions.
// A future polish phase could move these into a theme module.

export const YELLOW = "#F0B90B";
export const GREEN = "#0ECB81";
export const RED = "#F6465D";
export const AMBER = "#fbbf24";

export const card: React.CSSProperties = {
  background: "#141414",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: "20px 22px",
};

export const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.28)",
  marginBottom: 16,
};

export const bigNum: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
  fontSize: 34,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  color: "#fff",
  fontVariantNumeric: "tabular-nums",
};

export const hint: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.22)",
  marginTop: 6,
};

export const TONE_COLORS = { stable: GREEN, watch: AMBER, risk: RED } as const;

export const FRESHNESS = {
  stable: { dot: GREEN, label: "Donnees fraiches", glow: GREEN },
  watch: { dot: AMBER, label: "A rafraichir", glow: AMBER },
  risk: { dot: RED, label: "Sync requis", glow: RED },
} as const;

export function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: n >= 1000 ? 0 : 1,
  }).format(n);
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)} %`;
}

export function pct(n: number, total: number): string {
  if (total === 0) return "0 %";
  return `${Math.round((n / total) * 100)} %`;
}

export function formatSyncAge(dateStr: string | null): string {
  if (!dateStr) return "Jamais synchronise";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  return `Il y a ${Math.floor(hrs / 24)} j`;
}

export function returnRateTone(rate: number): "stable" | "watch" | "risk" {
  if (rate >= 20) return "risk";
  if (rate >= 15) return "watch";
  return "stable";
}

export function confirmationRateTone(rate: number): "stable" | "watch" | "risk" {
  if (rate === 0) return "stable";
  if (rate < 72) return "risk";
  if (rate < 80) return "watch";
  return "stable";
}
