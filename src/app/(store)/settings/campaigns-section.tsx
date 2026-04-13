"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CampaignPlatform, CampaignSpendForPeriod } from "@/lib/data/campaigns";
import type { ProductCostRow } from "@/lib/data/settings";

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
  fontSize: 14,
  fontWeight: 500,
  color: "#fff",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 12px",
  outline: "none",
  fontVariantNumeric: "tabular-nums",
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

const PLATFORMS: { value: CampaignPlatform; label: string }[] = [
  { value: "meta", label: "Meta" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google" },
  { value: "other", label: "Autre" },
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 1,
  }).format(n);
}

function periodToInputValue(periodIso: string): string {
  return periodIso.slice(0, 7);
}

function daysInMonth(periodInput: string): string[] {
  const [y, m] = periodInput.split("-").map((x) => parseInt(x, 10));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `${y}-${String(m).padStart(2, "0")}-${day}`;
  });
}

interface CampaignRow {
  id: string;
  name: string;
  platform: CampaignPlatform;
  product_id: string | null;
  active: boolean;
  product_name: string | null;
}

interface Props {
  initialPeriod: string; // "YYYY-MM-01"
  products: ProductCostRow[];
}

export function CampaignsSection({ initialPeriod, products }: Props) {
  const router = useRouter();

  const [period, setPeriod] = useState(periodToInputValue(initialPeriod));
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [spendRows, setSpendRows] = useState<CampaignSpendForPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit campaign form
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState<CampaignPlatform>("meta");
  const [formProductId, setFormProductId] = useState<string>("");
  const [formActive, setFormActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formResult, setFormResult] = useState<"success" | "error" | null>(null);

  // Expanded spend editor
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [editedSpend, setEditedSpend] = useState<Record<string, Record<string, number>>>({});
  // editedSpend[campaignId][date] = amount
  const [spendSaving, setSpendSaving] = useState<Record<string, boolean>>({});

  async function loadAll() {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch(`/api/campaigns?period=${period}-01`),
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();
      if (cJson.success) setCampaigns(cJson.data.campaigns);
      if (sJson.success) setSpendRows(sJson.data.rows);
      // Pre-seed editedSpend from current spendRows
      const seed: Record<string, Record<string, number>> = {};
      for (const row of sJson.data?.rows ?? []) {
        const m: Record<string, number> = {};
        for (const d of row.dailySpend as { spend_date: string; amount: number }[]) {
          m[d.spend_date] = d.amount;
        }
        seed[row.campaign_id] = m;
      }
      setEditedSpend(seed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  function resetForm() {
    setEditId(null);
    setFormName("");
    setFormPlatform("meta");
    setFormProductId("");
    setFormActive(true);
    setFormResult(null);
  }

  function startEdit(c: CampaignRow) {
    setEditId(c.id);
    setFormName(c.name);
    setFormPlatform(c.platform);
    setFormProductId(c.product_id ?? "");
    setFormActive(c.active);
    setFormResult(null);
  }

  async function saveCampaign() {
    if (!formName.trim()) {
      setFormResult("error");
      return;
    }
    setFormSaving(true);
    setFormResult(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "campaign",
          id: editId ?? undefined,
          name: formName.trim(),
          platform: formPlatform,
          product_id: formProductId || null,
          active: formActive,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setFormResult("success");
      resetForm();
      await loadAll();
      router.refresh();
    } catch {
      setFormResult("error");
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Supprimer cette campagne et toutes ses depenses ?")) return;
    try {
      await fetch(`/api/campaigns?id=${id}`, { method: "DELETE" });
      await loadAll();
      router.refresh();
    } catch {
      // ignore
    }
  }

  async function saveSpend(campaignId: string) {
    setSpendSaving((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const dayMap = editedSpend[campaignId] ?? {};
      const entries = Object.entries(dayMap).map(([spend_date, amount]) => ({
        campaign_id: campaignId,
        spend_date,
        amount,
      }));
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "spend", entries }),
      });
      if (!res.ok) throw new Error("failed");
      await loadAll();
      router.refresh();
    } finally {
      setSpendSaving((prev) => ({ ...prev, [campaignId]: false }));
    }
  }

  const days = daysInMonth(period);
  const totalSpendAllCampaigns = spendRows.reduce((s, r) => s + r.totalSpend, 0);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <p style={{ ...eyebrow, marginBottom: 0 }}>Campagnes publicitaires</p>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
          Meta, TikTok, Google — depenses journalieres par campagne
        </span>
      </div>

      {/* Add/edit form card */}
      <div style={{ ...card, marginBottom: 10 }}>
        <p style={{ ...eyebrow, marginBottom: 14 }}>
          {editId ? "Modifier la campagne" : "Ajouter une campagne"}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(200px,2fr) 140px 1fr auto",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={labelStyle}>Nom de la campagne</label>
            <input
              type="text"
              placeholder="Ex: Meta — Bundle promo"
              style={{ ...inputStyle, width: "100%" }}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Plateforme</label>
            <select
              style={{ ...inputStyle, width: "100%" }}
              value={formPlatform}
              onChange={(e) => setFormPlatform(e.target.value as CampaignPlatform)}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Produit</label>
            <select
              style={{ ...inputStyle, width: "100%" }}
              value={formProductId}
              onChange={(e) => setFormProductId(e.target.value)}
            >
              <option value="">— Aucun (multi-produits) —</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
              />
              Active
            </label>
            <button
              type="button"
              onClick={saveCampaign}
              disabled={formSaving}
              style={formSaving ? btnDisabled : btnPrimary}
            >
              {formSaving ? "..." : editId ? "Mettre a jour" : "Ajouter"}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} style={btnGhost}>
                Annuler
              </button>
            )}
          </div>
        </div>
        {formResult === "error" && (
          <p style={{ fontSize: 11, color: RED, marginTop: 8 }}>
            Erreur lors de l&apos;enregistrement. Le nom est obligatoire.
          </p>
        )}
      </div>

      {/* Period picker + total */}
      <div
        style={{
          ...card,
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 10,
        }}
      >
        <div>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Periode de depenses</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ ...inputStyle, width: 180, colorScheme: "dark" }}
          />
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
            TOTAL DEPENSES
          </p>
          <p
            style={{
              fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
              fontSize: 22,
              fontWeight: 500,
              color: totalSpendAllCampaigns > 0 ? "#fff" : "rgba(255,255,255,0.3)",
              marginTop: 2,
            }}
          >
            {fmtCurrency(totalSpendAllCampaigns)}
          </p>
        </div>
      </div>

      {/* Campaign rows */}
      {loading ? (
        <div style={card}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Chargement...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div style={card}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            Aucune campagne enregistree. Ajouter une campagne pour commencer.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.map((c) => {
            const spendRow = spendRows.find((r) => r.campaign_id === c.id);
            const totalSpend = spendRow?.totalSpend ?? 0;
            const isExpanded = expandedCampaignId === c.id;
            return (
              <div key={c.id} style={{ ...card, padding: "18px 22px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto auto",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.06)",
                          color: c.active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)",
                        }}
                      >
                        {c.platform}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: c.active ? "#fff" : "rgba(255,255,255,0.35)",
                          fontWeight: 500,
                        }}
                      >
                        {c.name}
                      </span>
                      {!c.active && (
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                          (inactive)
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                      {c.product_name ? `Produit : ${c.product_name}` : "Aucun produit mappe"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                      DEPENSE DU MOIS
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                        fontSize: 16,
                        color: totalSpend > 0 ? YELLOW : "rgba(255,255,255,0.3)",
                        fontWeight: 500,
                      }}
                    >
                      {fmtCurrency(totalSpend)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCampaignId(isExpanded ? null : c.id)
                    }
                    style={
                      isExpanded
                        ? {
                            ...btnGhost,
                            background: "rgba(240,185,11,0.15)",
                            color: YELLOW,
                            border: "1px solid rgba(240,185,11,0.3)",
                          }
                        : btnGhost
                    }
                  >
                    {isExpanded ? "Fermer" : "Saisir les depenses"}
                  </button>
                  <button type="button" onClick={() => startEdit(c)} style={btnGhost}>
                    Editer
                  </button>
                  <button type="button" onClick={() => deleteCampaign(c.id)} style={btnDanger}>
                    Supprimer
                  </button>
                </div>

                {/* Expanded daily spend editor */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 18,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {days.map((day) => {
                        const dayNum = parseInt(day.slice(-2), 10);
                        const val = editedSpend[c.id]?.[day] ?? 0;
                        return (
                          <div key={day}>
                            <label
                              style={{
                                fontSize: 10,
                                color: "rgba(255,255,255,0.3)",
                                display: "block",
                                marginBottom: 2,
                              }}
                            >
                              {dayNum}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="0"
                              style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "6px 8px" }}
                              value={val || ""}
                              onChange={(e) => {
                                const amount = Number(e.target.value) || 0;
                                setEditedSpend((prev) => ({
                                  ...prev,
                                  [c.id]: { ...(prev[c.id] ?? {}), [day]: amount },
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginTop: 16,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => saveSpend(c.id)}
                        disabled={spendSaving[c.id]}
                        style={spendSaving[c.id] ? btnDisabled : btnPrimary}
                      >
                        {spendSaving[c.id] ? "..." : "Enregistrer les depenses"}
                      </button>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        Saisir un montant par jour. Les 0 sont enregistres.
                      </span>
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
