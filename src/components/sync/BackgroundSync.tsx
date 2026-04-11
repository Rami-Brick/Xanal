"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BACKGROUND_SYNC_STALE_MS, TAB_GUARD_MS } from "@/lib/sync/constants";

const SESSION_KEY = "xanal:bg-sync-last-triggered";

interface SyncStatusResponse {
  success: boolean;
  data?: {
    last_sync: string | null;
    last_sync_status: string | null;
  };
}

function getTabGuard(): number {
  try {
    return Number(sessionStorage.getItem(SESSION_KEY) ?? "0");
  } catch {
    return 0;
  }
}

function setTabGuard(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — proceed without guard
  }
}

export function BackgroundSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      console.log("[background-sync] checking freshness");

      // Tab-level guard: skip if we already triggered a sync recently in this tab
      const lastTriggered = getTabGuard();
      const msSinceLastTrigger = Date.now() - lastTriggered;
      if (lastTriggered > 0 && msSinceLastTrigger < TAB_GUARD_MS) {
        console.log(
          `[background-sync] skipped — tab guard active (triggered ${Math.round(msSinceLastTrigger / 1000)}s ago)`
        );
        return;
      }

      // Fetch current sync status
      let statusRes: SyncStatusResponse;
      try {
        const res = await fetch("/api/sync/status");
        statusRes = (await res.json()) as SyncStatusResponse;
      } catch (err) {
        console.log("[background-sync] failed to fetch sync status:", err);
        return;
      }

      if (!statusRes.success || !statusRes.data) {
        console.log("[background-sync] sync status unavailable — skipping");
        return;
      }

      const { last_sync, last_sync_status } = statusRes.data;

      // Determine staleness
      const lastSyncMs = last_sync ? new Date(last_sync).getTime() : 0;
      const ageMs = Date.now() - lastSyncMs;
      const isFresh = last_sync !== null && ageMs < BACKGROUND_SYNC_STALE_MS;

      if (isFresh) {
        console.log(
          `[background-sync] data is fresh (${Math.round(ageMs / 1000)}s old, threshold ${BACKGROUND_SYNC_STALE_MS / 1000}s) — skipping`
        );
        return;
      }

      // Check if a sync is already running (last entry is "started" with no completion)
      if (last_sync_status === "started") {
        console.log("[background-sync] sync already in progress — skipping");
        return;
      }

      console.log(
        `[background-sync] data is stale (${last_sync ? `${Math.round(ageMs / 60000)}min old` : "never synced"}) -> triggering /api/sync`
      );

      // Set tab guard before triggering so parallel tabs don't also fire
      setTabGuard();

      // Trigger background sync
      let syncOk = false;
      try {
        const syncRes = await fetch("/api/sync", { method: "POST" });
        const syncPayload = (await syncRes.json()) as { success?: boolean; error?: string };

        if (cancelled) return;

        if (!syncRes.ok || !syncPayload.success) {
          throw new Error(syncPayload.error ?? `HTTP ${syncRes.status}`);
        }

        syncOk = true;
        console.log("[background-sync] sync success");
      } catch (err) {
        if (cancelled) return;
        console.log(
          "[background-sync] sync failed:",
          err instanceof Error ? err.message : String(err)
        );
        // Do not refresh — keep existing data visible
        return;
      }

      if (syncOk) {
        console.log("[background-sync] triggering router refresh");
        router.refresh();
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // Run once on mount — router is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders nothing — purely behavioral
  return null;
}
