"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SyncAction {
  id: string;
  label: string;
  endpoint: string;
  description: string;
}

const ACTIONS: SyncAction[] = [
  { id: "all", label: "Sync complet", endpoint: "/api/sync/all", description: "Produits + commandes toutes boutiques" },
  { id: "sync", label: "Sync unifié", endpoint: "/api/sync", description: "Pipeline unifié par boutique" },
  { id: "orders", label: "Commandes", endpoint: "/api/sync/orders", description: "Commandes actives" },
  { id: "orders-all", label: "Toutes commandes", endpoint: "/api/sync/orders-all", description: "Backfill complet commandes" },
  { id: "orders-archived", label: "Archivées", endpoint: "/api/sync/orders-archived", description: "Commandes archivées" },
  { id: "products", label: "Produits", endpoint: "/api/sync/products", description: "Catalogue produits" },
];

interface FeedbackState {
  actionId: string | null;
  tone: "idle" | "success" | "error";
  message: string;
}

export function SyncActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>({ actionId: null, tone: "idle", message: "" });

  function handleSync(action: SyncAction) {
    setFeedback({ actionId: action.id, tone: "idle", message: "En cours…" });

    startTransition(async () => {
      try {
        const res = await fetch(action.endpoint, { method: "POST" });
        const payload = await res.json() as { success?: boolean; error?: string };

        if (!res.ok || !payload.success) {
          throw new Error(payload.error ?? "Erreur inconnue.");
        }

        setFeedback({ actionId: action.id, tone: "success", message: "Sync terminé." });
        router.refresh();
      } catch (err) {
        setFeedback({
          actionId: action.id,
          tone: "error",
          message: err instanceof Error ? err.message : "Erreur inconnue.",
        });
      }
    });
  }

  const feedbackColor = {
    idle: "rgba(255,255,255,0.3)",
    success: "rgba(74,222,128,0.8)",
    error: "rgba(248,113,113,0.8)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ACTIONS.map((action) => {
        const isActive = isPending && feedback.actionId === action.id;
        return (
          <div
            key={action.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              padding: "12px 16px",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.78)", lineHeight: 1 }}>
                {action.label}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
                {action.description}
              </p>
              {feedback.actionId === action.id && feedback.message && (
                <p style={{ fontSize: 11, color: feedbackColor[feedback.tone], marginTop: 5 }}>
                  {feedback.message}
                </p>
              )}
            </div>
            <button
              onClick={() => handleSync(action)}
              disabled={isPending}
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: isActive ? "rgba(255,255,255,0.4)" : "#fff",
                background: isActive ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 7,
                padding: "7px 14px",
                cursor: isPending ? "not-allowed" : "pointer",
                transition: "background 0.12s",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {isActive ? "…" : "Lancer"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
