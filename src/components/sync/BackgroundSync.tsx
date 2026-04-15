"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BACKGROUND_SYNC_POLL_MS,
  BACKGROUND_SYNC_STALE_MS,
  TAB_GUARD_MS,
} from "@/lib/sync/constants";
import { SyncStatusContext, type SyncPhase, type SyncStatusValue } from "./SyncStatusContext";

const SESSION_KEY = "xanal:bg-sync-last-triggered";
const JUST_UPDATED_MS = 3000;

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

export function BackgroundSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const runningRef = useRef(false);
  const justUpdatedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      if (cancelled) return;
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        // Fetch current sync status
        let statusRes: SyncStatusResponse;
        try {
          const res = await fetch("/api/sync/status");
          statusRes = (await res.json()) as SyncStatusResponse;
        } catch (err) {
          console.log("[background-sync] failed to fetch sync status:", err);
          return;
        }
        if (cancelled) return;

        if (!statusRes.success || !statusRes.data) {
          // Unauthenticated or no token — silently no-op
          return;
        }

        const { last_sync, last_sync_status } = statusRes.data;
        setLastSyncAt(last_sync);

        // Reflect in-progress syncs (manual or another tab) in the UI
        if (last_sync_status === "started") {
          setPhase((prev) => (prev === "syncing" ? prev : "checking"));
          return;
        }

        // Tab-level guard: skip if we already triggered a sync recently in this tab
        const lastTriggered = getTabGuard();
        const msSinceLastTrigger = Date.now() - lastTriggered;
        if (lastTriggered > 0 && msSinceLastTrigger < TAB_GUARD_MS) {
          return;
        }

        // Determine staleness
        const lastSyncMs = last_sync ? new Date(last_sync).getTime() : 0;
        const ageMs = Date.now() - lastSyncMs;
        const isFresh = last_sync !== null && ageMs < BACKGROUND_SYNC_STALE_MS;
        if (isFresh) {
          setPhase((prev) => (prev === "just-updated" ? prev : "idle"));
          return;
        }

        console.log(
          `[background-sync] data is stale (${last_sync ? `${Math.round(ageMs / 60000)}min old` : "never synced"}) -> triggering /api/sync`
        );

        setTabGuard();
        setPhase("syncing");

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
          setPhase("idle");
          return;
        }

        if (syncOk) {
          setLastSyncAt(new Date().toISOString());
          setPhase("just-updated");
          if (justUpdatedTimerRef.current) clearTimeout(justUpdatedTimerRef.current);
          justUpdatedTimerRef.current = setTimeout(() => {
            if (!cancelled) setPhase("idle");
          }, JUST_UPDATED_MS);
          router.refresh();
        }
      } finally {
        runningRef.current = false;
      }
    }

    function startInterval() {
      if (intervalId !== null) return;
      intervalId = setInterval(tick, BACKGROUND_SYNC_POLL_MS);
    }

    function stopInterval() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibility() {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        void tick();
        startInterval();
      } else {
        stopInterval();
      }
    }

    // Initial run on mount
    void tick();

    if (typeof document !== "undefined") {
      if (document.visibilityState === "visible") {
        startInterval();
      }
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      cancelled = true;
      stopInterval();
      if (justUpdatedTimerRef.current) clearTimeout(justUpdatedTimerRef.current);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<SyncStatusValue>(
    () => ({ lastSyncAt, phase }),
    [lastSyncAt, phase]
  );

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>;
}
