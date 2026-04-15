"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCostRow } from "@/lib/data/settings";
import type {
  DealWaterfall,
  InvestorPayout,
  PayoutType,
  DealStatus,
} from "@/lib/data/investors";

const YELLOW = "#F0B90B";
const GREEN = "#0ECB81";
const RED = "#F6465D";
const AMBER = "#fbbf24";

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
  fontSize: 14,
  fontWeight: 500,
  color: "#fff",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 12px",
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  colorScheme: "dark" as const,
};

const btnPrimary: React.CSSProperties = {
  background: YELLOW,
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "9px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-geist), system-ui, sans-serif",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-geist), system-ui, sans-serif",
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: RED,
  border: "1px solid rgba(246,70,93,0.3)",
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
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 1,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00Z"));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  in_capital_repayment: { label: "Capital en cours", color: AMBER },
  in_profit_share: { label: "Profit a verser", color: YELLOW },
  settled: { label: "Solde", color: GREEN },
  in_loss: { label: "Perte", color: RED },
};

interface Props {
  products: ProductCostRow[];
}

export function InvestorsSection({ products }: Props) {
  const router = useRouter();

  const [deals, setDeals] = useState<DealWaterfall[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit deal form
  const [editId, setEditId] = useState<string | null>(null);
  const [investorName, setInvestorName] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [capitalDeployed, setCapitalDeployed] = useState<number>(0);
  const [profitSharePct, setProfitSharePct] = useState<number>(30);
  const [lossSharePct, setLossSharePct] = useState<number>(0);
  const [status, setStatus] = useState<DealStatus>("active");
  const [startedAt, setStartedAt] = useState(todayIso());
  const [closedAt, setClosedAt] = useState<string>("");
  const [note, setNote] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formResult, setFormResult] = useState<"success" | "error" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Expanded deal & payouts
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<Record<string, InvestorPayout[]>>({});
  // Payout form
  const [payoutDate, setPayoutDate] = useState(todayIso());
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutType, setPayoutType] = useState<PayoutType>("capital_return");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutSaving, setPayoutSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/investors?summary=1");
      const json = await res.json();
      if (json.success) setDeals(json.data.deals);
    } finally {
      setLoading(false);
    }
  }

  async function loadPayouts(dealId: string) {
    const res = await fetch(`/api/investors?payouts=1&deal_id=${dealId}`);
    const json = await res.json();
    if (json.success) {
      setPayouts((prev) => ({ ...prev, [dealId]: json.data.payouts }));
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function resetDealForm() {
    setEditId(null);
    setInvestorName("");
    setProductId("");
    setCapitalDeployed(0);
    setProfitSharePct(30);
    setLossSharePct(0);
    setStatus("active");
    setStartedAt(todayIso());
    setClosedAt("");
    setNote("");
    setFormResult(null);
    setFormError(null);
  }

  function startEditDeal(d: DealWaterfall) {
    setEditId(d.id);
    setInvestorName(d.investor_name);
    setProductId(d.product_id ?? "");
    setCapitalDeployed(d.capital_deployed);
    setProfitSharePct(d.profit_share_pct);
    setLossSharePct(d.loss_share_pct);
    setStatus(d.status);
    setStartedAt(d.started_at);
    setClosedAt(d.closed_at ?? "");
    setNote(d.note ?? "");
    setFormResult(null);
    setFormError(null);
  }

  async function saveDeal() {
    if (!investorName.trim()) {
      setFormResult("error");
      setFormError("Le nom est obligatoire.");
      return;
    }
    setFormSaving(true);
    setFormResult(null);
    setFormError(null);
    try {
      const res = await fetch("/api/investors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "deal",
          id: editId ?? undefined,
          investor_name: investorName.trim(),
          product_id: productId || null,
          capital_deployed: capitalDeployed,
          profit_share_pct: profitSharePct,
          loss_share_pct: lossSharePct,
          status,
          started_at: startedAt,
          closed_at: closedAt || null,
          note: note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormResult("error");
        setFormError(json.error ?? "Erreur");
        return;
      }
      setFormResult("success");
      resetDealForm();
      await loadAll();
      router.refresh();
    } catch {
      setFormResult("error");
      setFormError("Erreur reseau");
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteDeal(id: string) {
    if (!confirm("Supprimer ce deal et tous ses versements ?")) return;
    await fetch(`/api/investors?id=${id}`, { method: "DELETE" });
    await loadAll();
    router.refresh();
  }

  async function toggleExpand(dealId: string) {
    if (expandedId === dealId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(dealId);
    if (!payouts[dealId]) await loadPayouts(dealId);
  }

  async function savePayout(dealId: string) {
    if (payoutAmount <= 0) return;
    setPayoutSaving(true);
    try {
      const res = await fetch("/api/investors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payout",
          deal_id: dealId,
          payout_date: payoutDate,
          amount: payoutAmount,
          payout_type: payoutType,
          note: payoutNote || null,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setPayoutAmount(0);
      setPayoutNote("");
      await Promise.all([loadPayouts(dealId), loadAll()]);
      router.refresh();
    } finally {
      setPayoutSaving(false);
    }
  }

  async function deletePayout(payoutId: string, dealId: string) {
    if (!confirm("Supprimer ce versement ?")) return;
    await fetch(`/api/investors?type=payout&id=${payoutId}`, { method: "DELETE" });
    await Promise.all([loadPayouts(dealId), loadAll()]);
    router.refresh();
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <p style={{ ...eyebrow, marginBottom: 0 }}>Investisseurs</p>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
          Capital deploye, partage des profits, versements
        </span>
      </div>

      {/* Add/edit deal form */}
      <div style={{ ...card, marginBottom: 10 }}>
        <p style={{ ...eyebrow, marginBottom: 14 }}>
          {editId ? "Modifier le deal" : "Ajouter un deal"}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Nom investisseur</label>
            <input
              type="text"
              placeholder="Ex: Ali"
              style={{ ...inputStyle, width: "100%", fontFamily: "inherit" }}
              value={investorName}
              onChange={(e) => setInvestorName(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Produit (optionnel)</label>
            <select
              style={{ ...inputStyle, width: "100%" }}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">— General (toutes ventes) —</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Capital deploye (TND)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              style={{ ...inputStyle, width: "100%" }}
              value={capitalDeployed || ""}
              onChange={(e) => setCapitalDeployed(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={labelStyle}>Part profit (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              style={{ ...inputStyle, width: "100%" }}
              value={profitSharePct || ""}
              onChange={(e) => setProfitSharePct(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={labelStyle}>Part perte (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              style={{ ...inputStyle, width: "100%" }}
              value={lossSharePct || ""}
              onChange={(e) => setLossSharePct(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label style={labelStyle}>Date de debut</label>
            <input
              type="date"
              style={{ ...inputStyle, width: "100%" }}
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Statut</label>
            <select
              style={{ ...inputStyle, width: "100%" }}
              value={status}
              onChange={(e) => setStatus(e.target.value as DealStatus)}
            >
              <option value="active">Actif</option>
              <option value="closed">Cloture</option>
            </select>
          </div>
          {status === "closed" && (
            <div>
              <label style={labelStyle}>Date de cloture</label>
              <input
                type="date"
                style={{ ...inputStyle, width: "100%" }}
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
              />
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Note (optionnel)</label>
          <input
            type="text"
            placeholder="Ex: deal verbal, conditions speciales..."
            style={{ ...inputStyle, width: "100%", fontFamily: "inherit" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={saveDeal}
            disabled={formSaving}
            style={formSaving ? btnDisabled : btnPrimary}
          >
            {formSaving ? "..." : editId ? "Mettre a jour" : "Ajouter le deal"}
          </button>
          {editId && (
            <button type="button" onClick={resetDealForm} style={btnGhost}>
              Annuler
            </button>
          )}
          {formResult === "success" && (
            <span style={{ fontSize: 12, color: GREEN }}>Enregistre</span>
          )}
          {formResult === "error" && (
            <span style={{ fontSize: 12, color: RED }}>{formError ?? "Erreur"}</span>
          )}
        </div>
      </div>

      {/* Deals list */}
      {loading ? (
        <div style={card}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
        </div>
      ) : deals.length === 0 ? (
        <div style={card}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            Aucun deal investisseur enregistre.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {deals.map((d) => {
            const statusInfo = STATUS_BADGE[d.waterfall.status];
            const isExpanded = expandedId === d.id;
            const dealPayouts = payouts[d.id] ?? [];
            return (
              <div key={d.id} style={{ ...card, padding: "20px 24px" }}>
                {/* Top row — scrolls horizontally on narrow viewports */}
                <div className="scroll-x">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto auto auto",
                    gap: 14,
                    alignItems: "center",
                    minWidth: 720,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: d.status === "active" ? "#fff" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {d.investor_name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: `${statusInfo.color}22`,
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                      {d.status === "closed" && (
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                          (cloture)
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                      {d.product_name ? `Produit : ${d.product_name}` : "Deal general"} ·{" "}
                      depuis {fmtDate(d.started_at)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                      CAPITAL
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: 14,
                        color: "#fff",
                        marginTop: 2,
                      }}
                    >
                      {fmtCurrency(d.capital_deployed)}
                    </p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                      {d.profit_share_pct.toFixed(0)}% profit
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                      OUTSTANDING
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: 14,
                        color: d.waterfall.capitalOutstanding > 0 ? AMBER : GREEN,
                        marginTop: 2,
                      }}
                    >
                      {fmtCurrency(d.waterfall.capitalOutstanding)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                      A VERSER (PROFIT)
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: 14,
                        color: d.waterfall.profitShareOwing > 0 ? YELLOW : "rgba(255,255,255,0.3)",
                        marginTop: 2,
                      }}
                    >
                      {fmtCurrency(d.waterfall.profitShareOwing)}
                    </p>
                  </div>
                  <button type="button" onClick={() => toggleExpand(d.id)} style={btnGhost}>
                    {isExpanded ? "Fermer" : "Voir cascade"}
                  </button>
                  <button type="button" onClick={() => startEditDeal(d)} style={btnGhost}>
                    Editer
                  </button>
                  <button type="button" onClick={() => deleteDeal(d.id)} style={btnDanger}>
                    Supprimer
                  </button>
                </div>
                </div>

                {/* Expanded waterfall + payouts */}
                {isExpanded && (
                  <div
                    className="stack-mobile"
                    style={{
                      marginTop: 20,
                      paddingTop: 20,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr",
                      gap: 24,
                    }}
                  >
                    {/* Waterfall */}
                    <div>
                      <p style={{ ...eyebrow, marginBottom: 12 }}>
                        Cascade investisseur (depuis {fmtDate(d.started_at)})
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                        {[
                          { label: "Revenu livre", val: d.scopeDeliveredRevenue, color: "rgba(255,255,255,0.7)" },
                          { label: "− COGS", val: -d.scopeCogs, color: RED },
                          { label: "= Profit brut", val: d.scopeGrossProfit, color: GREEN, sub: true },
                          { label: "− Couts operations", val: -d.scopeOpsCosts, color: RED },
                          { label: "− Depenses publicitaires", val: -d.scopeAdSpend, color: RED },
                          { label: "= Profit net (scope)", val: d.scopeNetProfit, color: d.scopeNetProfit >= 0 ? GREEN : RED, final: true },
                        ].map((line, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "6px 0",
                              borderTop: line.sub || line.final ? "1px solid rgba(255,255,255,0.06)" : "none",
                              marginTop: line.sub || line.final ? 4 : 0,
                            }}
                          >
                            <span
                              style={{
                                color: line.final || line.sub ? "#fff" : "rgba(255,255,255,0.55)",
                                fontWeight: line.final ? 700 : line.sub ? 600 : 400,
                                fontSize: line.final ? 13 : 12,
                              }}
                            >
                              {line.label}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-geist-mono), monospace",
                                color: line.color,
                                fontWeight: line.final ? 700 : 500,
                                fontSize: line.final ? 14 : 12,
                              }}
                            >
                              {fmtCurrency(line.val)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Investor share box */}
                      <div
                        style={{
                          marginTop: 16,
                          padding: "14px 16px",
                          background: "rgba(240,185,11,0.04)",
                          border: "1px solid rgba(240,185,11,0.15)",
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                            Part investisseur ({d.scopeNetProfit >= 0 ? d.profit_share_pct : d.loss_share_pct} %)
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-geist-mono), monospace",
                              fontSize: 14,
                              color: d.waterfall.investorAccruedShare >= 0 ? GREEN : RED,
                              fontWeight: 600,
                            }}
                          >
                            {fmtCurrency(d.waterfall.investorAccruedShare)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                          <span>Capital retourne</span>
                          <span style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                            {fmtCurrency(d.capitalReturnedTotal)} / {fmtCurrency(d.capital_deployed)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                          <span>Profit deja verse</span>
                          <span style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                            {fmtCurrency(d.profitSharePaidTotal)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: "1px solid rgba(240,185,11,0.15)",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          <span>Total a payer maintenant</span>
                          <span style={{ fontFamily: "var(--font-geist-mono), monospace", color: YELLOW }}>
                            {fmtCurrency(d.waterfall.totalOwedNow)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payouts */}
                    <div>
                      <p style={{ ...eyebrow, marginBottom: 12 }}>Versements</p>

                      {/* Add payout form */}
                      <div
                        style={{
                          background: "rgba(255,255,255,0.025)",
                          borderRadius: 10,
                          padding: "14px 16px",
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Date</label>
                            <input
                              type="date"
                              style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "6px 10px" }}
                              value={payoutDate}
                              onChange={(e) => setPayoutDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Montant (TND)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "6px 10px" }}
                              value={payoutAmount || ""}
                              onChange={(e) => setPayoutAmount(Number(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Type</label>
                          <select
                            style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "6px 10px" }}
                            value={payoutType}
                            onChange={(e) => setPayoutType(e.target.value as PayoutType)}
                          >
                            <option value="capital_return">Retour capital</option>
                            <option value="profit_share">Part de profit</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Note (optionnel)"
                          style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "6px 10px", fontFamily: "inherit", marginBottom: 10 }}
                          value={payoutNote}
                          onChange={(e) => setPayoutNote(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => savePayout(d.id)}
                          disabled={payoutSaving || payoutAmount <= 0}
                          style={
                            payoutSaving || payoutAmount <= 0
                              ? btnDisabled
                              : { ...btnPrimary, padding: "6px 16px", fontSize: 12 }
                          }
                        >
                          {payoutSaving ? "..." : "Ajouter le versement"}
                        </button>
                      </div>

                      {/* Payouts list */}
                      {dealPayouts.length === 0 ? (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          Aucun versement enregistre.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {dealPayouts.map((p) => (
                            <div
                              key={p.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "80px 1fr 90px auto",
                                gap: 10,
                                alignItems: "center",
                                padding: "8px 0",
                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                                fontSize: 11,
                              }}
                            >
                              <span style={{ color: "rgba(255,255,255,0.5)" }}>
                                {fmtDate(p.payout_date)}
                              </span>
                              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                                {p.payout_type === "capital_return" ? "Capital" : "Profit"}
                                {p.note && (
                                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", display: "block" }}>
                                    {p.note}
                                  </span>
                                )}
                              </span>
                              <span
                                style={{
                                  fontFamily: "var(--font-geist-mono), monospace",
                                  color: p.payout_type === "profit_share" ? YELLOW : "#fff",
                                  textAlign: "right",
                                  fontWeight: 500,
                                }}
                              >
                                {fmtCurrency(p.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => deletePayout(p.id, d.id)}
                                style={{ ...btnDanger, padding: "3px 8px", fontSize: 10 }}
                              >
                                X
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
