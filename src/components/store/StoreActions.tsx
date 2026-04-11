"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const YELLOW = "#F0B90B";
const GREEN = "#0ECB81";
const RED = "#F6465D";

type SyncKey = "all" | "orders" | "products";

interface SyncState {
  loading: boolean;
  result: "success" | "error" | null;
  message: string;
}

const INIT: SyncState = { loading: false, result: null, message: "" };

const ACTIONS: { key: SyncKey; label: string; endpoint: string }[] = [
  { key: "all", label: "Tout synchroniser", endpoint: "/api/sync" },
  { key: "orders", label: "Sync commandes", endpoint: "/api/sync/orders-all" },
  { key: "products", label: "Sync produits", endpoint: "/api/sync/products" },
];

export function StoreActions({
  connected,
}: {
  connected: boolean;
}) {
  const router = useRouter();
  const [states, setStates] = useState<Record<SyncKey, SyncState>>({
    all: { ...INIT },
    orders: { ...INIT },
    products: { ...INIT },
  });

  async function runSync(key: SyncKey, endpoint: string) {
    setStates((prev) => ({ ...prev, [key]: { loading: true, result: null, message: "" } }));
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const ok = res.ok;
      setStates((prev) => ({
        ...prev,
        [key]: { loading: false, result: ok ? "success" : "error", message: ok ? "Terminé" : "Erreur" },
      }));
      if (ok) router.refresh();
    } catch {
      setStates((prev) => ({
        ...prev,
        [key]: { loading: false, result: "error", message: "Erreur réseau" },
      }));
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
      }}
    >
      {/* Sync buttons */}
      {ACTIONS.map(({ key, label, endpoint }) => {
        const s = states[key];
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => runSync(key, endpoint)}
              disabled={s.loading}
              style={{
                background: key === "all" ? YELLOW : "rgba(255,255,255,0.07)",
                color: key === "all" ? "#000" : "rgba(255,255,255,0.7)",
                border: key === "all" ? "none" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-geist), system-ui, sans-serif",
                cursor: s.loading ? "not-allowed" : "pointer",
                opacity: s.loading ? 0.6 : 1,
                transition: "opacity 0.15s, background 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {s.loading ? "En cours…" : label}
            </button>
            {s.result !== null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: s.result === "success" ? GREEN : RED,
                }}
              >
                {s.message}
              </span>
            )}
          </div>
        );
      })}

      {/* Reconnect Converty */}
      <a
        href="/api/auth/converty/start"
        style={{
          display: "inline-block",
          background: "transparent",
          color: connected ? "rgba(255,255,255,0.35)" : YELLOW,
          border: connected
            ? "1px solid rgba(255,255,255,0.1)"
            : `1px solid rgba(240,185,11,0.4)`,
          borderRadius: 8,
          padding: "9px 18px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-geist), system-ui, sans-serif",
          textDecoration: "none",
          whiteSpace: "nowrap",
          transition: "color 0.15s, border-color 0.15s",
        }}
      >
        {connected ? "Reconnecter Converty" : "Connecter Converty"}
      </a>
    </div>
  );
}
