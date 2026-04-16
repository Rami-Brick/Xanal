"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SettlementWithReconciliation } from "@/lib/data/settlements";

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

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

interface PreviewCalc {
  deliveredCount: number;
  returnedCount: number;
  grossRevenue: number;
  deliveryFees: number;
  returnBurden: number;
  expectedAmount: number;
}

export function SettlementsSection() {
  const router = useRouter();

  const [settlements, setSettlements] = useState<SettlementWithReconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState(daysAgoIso(7));
  const [periodTo, setPeriodTo] = useState(todayIso());
  const [settlementDate, setSettlementDate] = useState(todayIso());
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<PreviewCalc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/settlements");
      const json = await res.json();
      if (json.success) setSettlements(json.data.settlements);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Fetch preview whenever date range changes
  useEffect(() => {
    if (!periodFrom || !periodTo || periodTo < periodFrom) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    fetch(`/api/settlements?preview=1&period_from=${periodFrom}&period_to=${periodTo}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setPreview(json.data);
        else setPreview(null);
      })
      .catch(() => { if (!cancelled) setPreview(null); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [periodFrom, periodTo]);

  function resetForm() {
    setEditId(null);
    setPeriodFrom(daysAgoIso(7));
    setPeriodTo(todayIso());
    setSettlementDate(todayIso());
    setActualAmount(0);
    setNote("");
    setResult(null);
    setErrorMsg(null);
  }

  function startEdit(s: SettlementWithReconciliation) {
    setEditId(s.id);
    setPeriodFrom(s.period_from);
    setPeriodTo(s.period_to);
    setSettlementDate(s.settlement_date);
    setActualAmount(s.actual_amount);
    setNote(s.note ?? "");
    setResult(null);
    setErrorMsg(null);
  }

  async function save() {
    setSaving(true);
    setResult(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settlements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId ?? undefined,
          period_from: periodFrom,
          period_to: periodTo,
          settlement_date: settlementDate,
          actual_amount: actualAmount,
          note: note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setResult("error");
        setErrorMsg(json.error ?? "Erreur");
        return;
      }
      setResult("success");
      resetForm();
      await loadAll();
      router.refresh();
    } catch {
      setResult("error");
      setErrorMsg("Erreur reseau");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce reglement ?")) return;
    try {
      await fetch(`/api/settlements?id=${id}`, { method: "DELETE" });
      await loadAll();
      router.refresh();
    } catch {
      // ignore
    }
  }

  const previewGap = preview ? preview.expectedAmount - actualAmount : null;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <p style={{ ...eyebrow, marginBottom: 0 }}>Reglements transporteur</p>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
          Reconciliation attendu vs recu par versement
        </span>
      </div>

      {/* Form */}
      <div style={{ ...card, marginBottom: 10 }}>
        <p style={{ ...eyebrow, marginBottom: 14 }}>
          {editId ? "Modifier le reglement" : "Ajouter un reglement"}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Periode du</label>
            <input
              type="date"
              style={{ ...inputStyle, width: "100%" }}
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Periode au</label>
            <input
              type="date"
              style={{ ...inputStyle, width: "100%" }}
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Date du versement</label>
            <input
              type="date"
              style={{ ...inputStyle, width: "100%" }}
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Montant recu (TND)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              style={{ ...inputStyle, width: "100%" }}
              value={actualAmount || ""}
              onChange={(e) => setActualAmount(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Note (optionnel)</label>
          <input
            type="text"
            placeholder="Ex: virement bancaire, reference..."
            style={{ ...inputStyle, width: "100%", fontFamily: "inherit" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Preview card */}
        {preview && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 14,
              opacity: previewLoading ? 0.6 : 1,
            }}
          >
            <p style={{ ...eyebrow, marginBottom: 10 }}>Reconciliation prevue</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 14,
                fontSize: 11,
              }}
            >
              <div>
                <p style={{ color: "rgba(255,255,255,0.3)" }}>Livrees</p>
                <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 14, color: "#fff", marginTop: 2 }}>
                  {preview.deliveredCount} · {fmtCurrency(preview.grossRevenue)}
                </p>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.3)" }}>Retours</p>
                <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 14, color: "#fff", marginTop: 2 }}>
                  {preview.returnedCount}
                </p>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.3)" }}>Frais transporteur</p>
                <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 14, color: RED, marginTop: 2, opacity: 0.8 }}>
                  {fmtCurrency(-(preview.deliveryFees + preview.returnBurden))}
                </p>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.3)" }}>Attendu</p>
                <p
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 16,
                    fontWeight: 600,
                    color: YELLOW,
                    marginTop: 2,
                  }}
                >
                  {fmtCurrency(preview.expectedAmount)}
                </p>
              </div>
              {actualAmount > 0 && previewGap !== null && (
                <div>
                  <p style={{ color: "rgba(255,255,255,0.3)" }}>Ecart</p>
                  <p
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 16,
                      fontWeight: 600,
                      color:
                        Math.abs(previewGap) < 0.5
                          ? GREEN
                          : Math.abs(previewGap / Math.max(preview.expectedAmount, 1)) > 0.05
                            ? RED
                            : AMBER,
                      marginTop: 2,
                    }}
                  >
                    {previewGap > 0 ? "−" : "+"}
                    {fmtCurrency(Math.abs(previewGap))}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={saving ? btnDisabled : btnPrimary}
          >
            {saving ? "..." : editId ? "Mettre a jour" : "Enregistrer le reglement"}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} style={btnGhost}>
              Annuler
            </button>
          )}
          {result === "success" && (
            <span style={{ fontSize: 12, color: GREEN }}>Enregistre</span>
          )}
          {result === "error" && (
            <span style={{ fontSize: 12, color: RED }}>{errorMsg ?? "Erreur"}</span>
          )}
        </div>
      </div>

      {/* Settlements table */}
      <div style={card}>
        <p style={eyebrow}>Historique des reglements</p>
        {loading ? (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
        ) : settlements.length === 0 ? (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            Aucun reglement enregistre.
          </p>
        ) : (
          <div className="scroll-x">
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 100px 100px 100px 100px 80px",
                gap: 12,
                padding: "0 0 10px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.08em",
                minWidth: 760,
              }}
            >
              <span>DATE</span>
              <span>PERIODE COUVERTE</span>
              <span style={{ textAlign: "right" }}>LIVREES</span>
              <span style={{ textAlign: "right" }}>ATTENDU</span>
              <span style={{ textAlign: "right" }}>RECU</span>
              <span style={{ textAlign: "right" }}>ECART</span>
              <span style={{ textAlign: "right" }}></span>
            </div>
            {settlements.map((s) => {
              const gapColor =
                Math.abs(s.gap) < 0.5
                  ? GREEN
                  : s.gapPct !== null && Math.abs(s.gapPct) > 5
                    ? RED
                    : AMBER;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr 100px 100px 100px 100px 80px",
                    gap: 12,
                    padding: "10px 0",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    minWidth: 760,
                  }}
                >
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                    {fmtDate(s.settlement_date)}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    {fmtDate(s.period_from)} → {fmtDate(s.period_to)}
                    {s.note && (
                      <span style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                        {s.note}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      textAlign: "right",
                    }}
                  >
                    {s.deliveredCount}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      textAlign: "right",
                    }}
                  >
                    {fmtCurrency(s.expectedAmount)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 13,
                      color: YELLOW,
                      textAlign: "right",
                    }}
                  >
                    {fmtCurrency(s.actual_amount)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      color: gapColor,
                      textAlign: "right",
                    }}
                  >
                    {s.gap > 0 ? "−" : "+"}
                    {fmtCurrency(Math.abs(s.gap))}
                  </span>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      style={{ ...btnGhost, padding: "4px 8px", fontSize: 11 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      style={{ ...btnDanger, padding: "4px 8px", fontSize: 11 }}
                    >
                      X
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
