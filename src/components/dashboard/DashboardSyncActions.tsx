"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SyncFeedbackTone = "idle" | "success" | "error";

interface SyncResponse {
  success: boolean;
  data?: {
    stores_synced?: number;
  };
  error?: string;
}

export function DashboardSyncActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: SyncFeedbackTone;
    message: string;
  }>({
    tone: "idle",
    message: "Les commandes et les produits restent pilotés par le backend validé en phase 1.",
  });

  const feedbackClassName = useMemo(
    () =>
      ({
        idle: "border-black/10 bg-white/80 text-stone-600",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        error: "border-rose-200 bg-rose-50 text-rose-900",
      })[feedback.tone],
    [feedback.tone]
  );

  function handleSyncAll() {
    startTransition(async () => {
      try {
        setFeedback({
          tone: "idle",
          message: "Synchronisation multi-boutiques en cours…",
        });

        const response = await fetch("/api/sync/all", { method: "POST" });
        const payload = (await response.json()) as SyncResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "Impossible de lancer la synchronisation.");
        }

        const storesSynced = payload.data?.stores_synced ?? 0;
        setFeedback({
          tone: "success",
          message: `Synchronisation relancée pour ${storesSynced} boutique(s). Les cartes seront rafraîchies automatiquement.`,
        });
        router.refresh();
      } catch (error) {
        setFeedback({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Erreur inconnue pendant la synchronisation.",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
            Pilotage sync
          </p>
          <p className="mt-1 max-w-md text-sm leading-6 text-stone-600">
            Garder la donnée fraîche sans monopoliser l'écran principal. Cette
            action relance la pile produits + commandes validée côté backend.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={isPending}
          className={cn(
            "inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-medium transition",
            isPending
              ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
              : "border-stone-900 bg-stone-900 text-stone-50 hover:bg-stone-800"
          )}
        >
          {isPending ? "Synchronisation…" : "Synchroniser tout"}
        </button>
      </div>
      <div className={cn("rounded-[1.5rem] border px-4 py-3 text-sm", feedbackClassName)}>
        {feedback.message}
      </div>
    </div>
  );
}
