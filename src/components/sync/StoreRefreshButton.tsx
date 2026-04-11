"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  storeId: string;
  tone: "stable" | "watch" | "risk";
}

export function StoreRefreshButton({ storeId, tone }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");

  // Only show automatically for watch/risk stores; stable stores can still use it
  const isUrgent = tone !== "stable";

  function handleRefresh() {
    setResult("idle");
    startTransition(async () => {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_id: storeId }),
        });
        const payload = (await res.json()) as { success?: boolean; error?: string };

        if (!res.ok || !payload.success) {
          throw new Error(payload.error ?? `HTTP ${res.status}`);
        }

        setResult("success");
        console.log(`[store-refresh] success for ${storeId}`);
        router.refresh();
      } catch (err) {
        setResult("error");
        console.log(
          `[store-refresh] failed for ${storeId}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    });
  }

  const resultColor =
    result === "success"
      ? "rgba(74,222,128,0.8)"
      : result === "error"
      ? "rgba(248,113,113,0.8)"
      : "transparent";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
      <button
        onClick={handleRefresh}
        disabled={isPending}
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: isUrgent ? (isPending ? "rgba(251,191,36,0.4)" : "rgba(251,191,36,0.9)") : (isPending ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)"),
          background: isUrgent ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isUrgent ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 6,
          padding: "5px 12px",
          cursor: isPending ? "not-allowed" : "pointer",
          transition: "opacity 0.12s",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {isPending ? "…" : "Rafraîchir"}
      </button>
      {result !== "idle" && (
        <span style={{ fontSize: 11, color: resultColor }}>
          {result === "success" ? "Sync terminé" : "Échec"}
        </span>
      )}
    </div>
  );
}
