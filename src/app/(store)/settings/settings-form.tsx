"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  BusinessSettings,
  ProductCostRow,
  OverheadPeriod,
  OverheadCategory,
} from "@/lib/data/settings";

const OVERHEAD_LABELS: Record<OverheadCategory, string> = {
  salaries: "Salaires",
  rent: "Loyer",
  phone_internet: "Telephone / Internet",
  subscriptions: "Abonnements et logiciels",
  tax: "Declaration fiscale",
  daily_pickup: "Frais journaliers transporteur",
  other: "Autres",
};

const YELLOW = "#F0B90B";
const GREEN = "#0ECB81";
const RED = "#F6465D";

const card: React.CSSProperties = {
  background: "#141414",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: "24px 26px",
};

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.28)",
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(255,255,255,0.55)",
  marginBottom: 6,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
  fontSize: 15,
  fontWeight: 500,
  color: "#fff",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "10px 14px",
  width: "100%",
  outline: "none",
  fontVariantNumeric: "tabular-nums",
};

const btnPrimary: React.CSSProperties = {
  background: YELLOW,
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "10px 24px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-geist), system-ui, sans-serif",
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  opacity: 0.5,
  cursor: "not-allowed",
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 1,
  }).format(n);
}

interface Props {
  initialSettings: BusinessSettings | null;
  initialProductCosts: ProductCostRow[];
  initialOverhead: OverheadPeriod;
}

function periodToInputValue(periodIso: string): string {
  // periodIso is "YYYY-MM-01" — input[type=month] expects "YYYY-MM"
  return periodIso.slice(0, 7);
}

export function SettingsForm({
  initialSettings,
  initialProductCosts,
  initialOverhead,
}: Props) {
  const router = useRouter();

  // Fee form state
  const [fees, setFees] = useState({
    cosmos_delivery_fee: initialSettings?.cosmos_delivery_fee ?? 7,
    cosmos_return_fee: initialSettings?.cosmos_return_fee ?? 2,
    packing_cost_per_package: initialSettings?.packing_cost_per_package ?? 0,
    converty_fee_rate: initialSettings?.converty_fee_rate ?? 0.003,
  });
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeResult, setFeeResult] = useState<"success" | "error" | null>(null);

  // Product costs state
  const [costs, setCosts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const p of initialProductCosts) {
      map[p.product_id] = p.unit_cogs;
    }
    return map;
  });
  const [costSaving, setCostSaving] = useState(false);
  const [costResult, setCostResult] = useState<"success" | "error" | null>(null);

  // Overhead state
  const [overheadPeriod, setOverheadPeriod] = useState(
    periodToInputValue(initialOverhead.period)
  );
  const [overheadAmounts, setOverheadAmounts] = useState<Record<OverheadCategory, number>>(() => {
    const map = {} as Record<OverheadCategory, number>;
    for (const e of initialOverhead.entries) map[e.category] = e.amount;
    return map;
  });
  const [overheadLoading, setOverheadLoading] = useState(false);
  const [overheadSaving, setOverheadSaving] = useState(false);
  const [overheadResult, setOverheadResult] = useState<"success" | "error" | null>(null);

  // Reload overhead when period changes (skip first render — initial values come from props)
  const initialPeriodInput = periodToInputValue(initialOverhead.period);
  useEffect(() => {
    if (overheadPeriod === initialPeriodInput) return;
    let cancelled = false;
    setOverheadLoading(true);
    setOverheadResult(null);
    fetch(`/api/settings?overhead_period=${overheadPeriod}-01`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const entries: { category: OverheadCategory; amount: number }[] =
          json?.data?.overhead?.entries ?? [];
        const map = {} as Record<OverheadCategory, number>;
        for (const e of entries) map[e.category] = e.amount;
        setOverheadAmounts(map);
      })
      .catch(() => {
        if (!cancelled) setOverheadResult("error");
      })
      .finally(() => {
        if (!cancelled) setOverheadLoading(false);
      });
    return () => { cancelled = true; };
  }, [overheadPeriod, initialPeriodInput]);

  async function saveOverhead() {
    setOverheadSaving(true);
    setOverheadResult(null);
    try {
      const entries = Object.entries(overheadAmounts).map(([category, amount]) => ({
        category,
        amount,
      }));
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "overhead",
          period: `${overheadPeriod}-01`,
          entries,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setOverheadResult("success");
      router.refresh();
    } catch {
      setOverheadResult("error");
    } finally {
      setOverheadSaving(false);
    }
  }

  const overheadTotal = Object.values(overheadAmounts).reduce((sum, v) => sum + v, 0);

  async function saveFees() {
    setFeeSaving(true);
    setFeeResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "fees", ...fees }),
      });
      if (!res.ok) throw new Error("failed");
      setFeeResult("success");
      router.refresh();
    } catch {
      setFeeResult("error");
    } finally {
      setFeeSaving(false);
    }
  }

  async function saveCosts() {
    setCostSaving(true);
    setCostResult(null);
    try {
      const entries = Object.entries(costs)
        .filter(([, v]) => v > 0)
        .map(([product_id, unit_cogs]) => ({ product_id, unit_cogs }));

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "product_costs", entries }),
      });
      if (!res.ok) throw new Error("failed");
      setCostResult("success");
      router.refresh();
    } catch {
      setCostResult("error");
    } finally {
      setCostSaving(false);
    }
  }

  return (
    <>
      {/* Section 1: Frais generaux */}
      <section>
        <p style={eyebrow}>Frais generaux</p>
        <div style={card}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <label style={labelStyle}>Frais de livraison transporteur (TND)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                style={inputStyle}
                value={fees.cosmos_delivery_fee}
                onChange={(e) =>
                  setFees((f) => ({ ...f, cosmos_delivery_fee: Number(e.target.value) || 0 }))
                }
              />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 4 }}>
                Par commande deposee
              </p>
            </div>
            <div>
              <label style={labelStyle}>Frais de retour transporteur (TND)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                style={inputStyle}
                value={fees.cosmos_return_fee}
                onChange={(e) =>
                  setFees((f) => ({ ...f, cosmos_return_fee: Number(e.target.value) || 0 }))
                }
              />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 4 }}>
                Par retour
              </p>
            </div>
            <div>
              <label style={labelStyle}>Cout emballage (TND)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                style={inputStyle}
                value={fees.packing_cost_per_package}
                onChange={(e) =>
                  setFees((f) => ({
                    ...f,
                    packing_cost_per_package: Number(e.target.value) || 0,
                  }))
                }
              />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 4 }}>
                Par colis
              </p>
            </div>
            <div>
              <label style={labelStyle}>Commission Converty (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                style={inputStyle}
                value={(fees.converty_fee_rate * 100).toFixed(2)}
                onChange={(e) =>
                  setFees((f) => ({
                    ...f,
                    converty_fee_rate: (Number(e.target.value) || 0) / 100,
                  }))
                }
              />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 4 }}>
                Appliquee sur le prix total
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={saveFees}
              disabled={feeSaving}
              style={feeSaving ? btnDisabled : btnPrimary}
            >
              {feeSaving ? "En cours..." : "Enregistrer les frais"}
            </button>
            {feeResult === "success" && (
              <span style={{ fontSize: 12, color: GREEN }}>Enregistre</span>
            )}
            {feeResult === "error" && (
              <span style={{ fontSize: 12, color: RED }}>Erreur</span>
            )}
          </div>

          {initialSettings?.updated_at && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 12 }}>
              Derniere modification :{" "}
              {new Date(initialSettings.updated_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </section>

      {/* Section 2: Couts produits */}
      <section>
        <p style={eyebrow}>Couts produits (COGS)</p>
        <div style={card}>
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              marginBottom: 20,
              lineHeight: 1.4,
            }}
          >
            Cout unitaire par produit. Pour les bundles, indiquer le cout d&apos;une seule unite.
          </p>

          {initialProductCosts.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
              Aucun produit synchronise
            </p>
          ) : (
            <div className="scroll-x">
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 120px 120px",
                  gap: 12,
                  padding: "0 0 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  marginBottom: 8,
                  minWidth: 520,
                }}
              >
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
                  PRODUIT
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  PRIX VENTE
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  COUT UNITAIRE
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  MARGE BRUTE
                </span>
              </div>

              {/* Product rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {initialProductCosts.map((p) => {
                  const unitCogs = costs[p.product_id] ?? 0;
                  const margin = unitCogs > 0 ? p.product_price - unitCogs : 0;
                  const marginPct =
                    unitCogs > 0 && p.product_price > 0
                      ? ((p.product_price - unitCogs) / p.product_price) * 100
                      : 0;
                  const marginColor =
                    unitCogs === 0
                      ? "rgba(255,255,255,0.15)"
                      : margin > 0
                        ? GREEN
                        : RED;

                  return (
                    <div
                      key={p.product_id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 100px 120px 120px",
                        gap: 12,
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        minWidth: 520,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.6)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.product_name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.4)",
                          textAlign: "right",
                        }}
                      >
                        {fmtCurrency(p.product_price)}
                      </span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          style={{
                            ...inputStyle,
                            fontSize: 13,
                            padding: "6px 10px",
                            width: 100,
                            textAlign: "right",
                          }}
                          value={unitCogs || ""}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setCosts((prev) => ({ ...prev, [p.product_id]: val }));
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                          fontSize: 13,
                          color: marginColor,
                          textAlign: "right",
                        }}
                      >
                        {unitCogs > 0
                          ? `${fmtCurrency(margin)} (${marginPct.toFixed(0)} %)`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
                <button
                  onClick={saveCosts}
                  disabled={costSaving}
                  style={costSaving ? btnDisabled : btnPrimary}
                >
                  {costSaving ? "En cours..." : "Enregistrer les couts"}
                </button>
                {costResult === "success" && (
                  <span style={{ fontSize: 12, color: GREEN }}>Enregistre</span>
                )}
                {costResult === "error" && (
                  <span style={{ fontSize: 12, color: RED }}>Erreur</span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Frais fixes mensuels */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Frais fixes mensuels</p>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Salaires, loyer, abonnements, taxes — par mois
          </span>
        </div>
        <div style={card}>
          {/* Month picker */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 24,
              paddingBottom: 20,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>Periode</label>
            <input
              type="month"
              value={overheadPeriod}
              onChange={(e) => setOverheadPeriod(e.target.value)}
              style={{ ...inputStyle, width: 180, maxWidth: "100%" }}
            />
            {overheadLoading && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Chargement...</span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                TOTAL DU MOIS
              </span>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                  fontSize: 22,
                  fontWeight: 500,
                  color: overheadTotal > 0 ? "#fff" : "rgba(255,255,255,0.3)",
                  marginTop: 2,
                }}
              >
                {fmtCurrency(overheadTotal)}
              </span>
            </div>
          </div>

          {/* Categories grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 20,
              marginBottom: 24,
              opacity: overheadLoading ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {(Object.keys(OVERHEAD_LABELS) as OverheadCategory[]).map((cat) => (
              <div key={cat}>
                <label style={labelStyle}>{OVERHEAD_LABELS[cat]} (TND)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  style={inputStyle}
                  value={overheadAmounts[cat] || ""}
                  placeholder="0"
                  disabled={overheadLoading}
                  onChange={(e) =>
                    setOverheadAmounts((prev) => ({
                      ...prev,
                      [cat]: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={saveOverhead}
              disabled={overheadSaving || overheadLoading}
              style={overheadSaving || overheadLoading ? btnDisabled : btnPrimary}
            >
              {overheadSaving ? "En cours..." : "Enregistrer les frais"}
            </button>
            {overheadResult === "success" && (
              <span style={{ fontSize: 12, color: GREEN }}>Enregistre</span>
            )}
            {overheadResult === "error" && (
              <span style={{ fontSize: 12, color: RED }}>Erreur</span>
            )}
          </div>

          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 14, lineHeight: 1.5 }}>
            Les frais sont stockes par mois. Modifier un mois passe ne change pas l&apos;historique : une trace est conservee a chaque modification.
          </p>
        </div>
      </section>
    </>
  );
}
