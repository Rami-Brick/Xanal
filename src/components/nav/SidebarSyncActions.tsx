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

const ACTIONS: { key: SyncKey; label: string; endpoint: string; primary?: boolean }[] = [
  { key: "all", label: "Tout synchroniser", endpoint: "/api/sync", primary: true },
  { key: "orders", label: "Sync commandes", endpoint: "/api/sync/orders-all" },
  { key: "products", label: "Sync produits", endpoint: "/api/sync/products" },
];

interface Props {
  connected: boolean;
}

export function SidebarSyncActions({ connected }: Props) {
  const router = useRouter();
  const [states, setStates] = useState<Record<SyncKey, SyncState>>({
    all: { ...INIT },
    orders: { ...INIT },
    products: { ...INIT },
  });

  async function runSync(key: SyncKey, endpoint: string) {
    setStates((prev) => ({
      ...prev,
      [key]: { loading: true, result: null, message: "" },
    }));
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const ok = res.ok;
      setStates((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          result: ok ? "success" : "error",
          message: ok ? "Terminé" : "Erreur",
        },
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ACTIONS.map(({ key, label, endpoint, primary }) => {
        const s = states[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => runSync(key, endpoint)}
            disabled={s.loading}
            style={{
              background: primary ? YELLOW : "rgba(255,255,255,0.04)",
              color: primary ? "#000" : "rgba(255,255,255,0.6)",
              border: primary ? "none" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-geist), system-ui, sans-serif",
              cursor: s.loading ? "not-allowed" : "pointer",
              opacity: s.loading ? 0.6 : 1,
              transition: "opacity 0.12s, background 0.12s",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{s.loading ? "En cours..." : label}</span>
            {s.result !== null && !s.loading && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: s.result === "success" ? GREEN : RED,
                  marginLeft: 8,
                }}
              >
                {s.message}
              </span>
            )}
          </button>
        );
      })}

      <a
        href="/api/auth/converty/start"
        style={{
          display: "block",
          background: "transparent",
          color: connected ? "rgba(255,255,255,0.4)" : YELLOW,
          border: connected
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(240,185,11,0.35)",
          borderRadius: 8,
          padding: "7px 12px",
          fontSize: 11,
          fontWeight: 500,
          fontFamily: "var(--font-geist), system-ui, sans-serif",
          textDecoration: "none",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {connected ? "Reconnecter Converty" : "Connecter Converty"}
      </a>
    </div>
  );
}
