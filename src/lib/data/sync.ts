import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORE_WATCH_STALE_MS } from "@/lib/sync/constants";

const PAGE_SIZE = 1000;

interface TokenRow {
  store_id: string;
  scopes: string[] | null;
  updated_at: string | null;
  expires_at: string | null;
}

interface SyncLogRow {
  id: string;
  store_id: string | null;
  sync_type: string | null;
  status: string | null;
  records_synced: number | null;
  records_created: number | null;
  records_updated: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
}

export interface StoreHealth {
  storeId: string;
  scopes: string[];
  tokenUpdatedAt: string | null;
  tokenExpiresAt: string | null;
  lastSyncType: string | null;
  lastSyncStatus: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  tone: "stable" | "watch" | "risk";
  ageLabel: string;
}

export interface SyncPageData {
  stores: StoreHealth[];
  recentLogs: SyncLogRow[];
  totalSyncs: number;
  successRate: number;
}


function ageLabel(dateStr: string | null, now: Date): string {
  if (!dateStr) return "Jamais synchronisé";
  const ms = now.getTime() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Il y a ${days} j`;
}

export const getSyncPageData = cache(async (): Promise<SyncPageData> => {
  const supabase = createAdminClient();
  const now = new Date();

  const [tokensResult, recentLogsResult, statsResult] = await Promise.all([
    supabase
      .from("converty_tokens")
      .select("store_id, scopes, updated_at, expires_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("sync_log")
      .select("id, store_id, sync_type, status, records_synced, records_created, records_updated, error_message, started_at, completed_at, triggered_by")
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("sync_log")
      .select("status")
      .order("started_at", { ascending: false })
      .limit(PAGE_SIZE),
  ]);

  const tokens = (tokensResult.data ?? []) as TokenRow[];
  const recentLogs = (recentLogsResult.data ?? []) as SyncLogRow[];
  const allStats = (statsResult.data ?? []) as { status: string | null }[];

  const storeIds = tokens.map((t) => t.store_id);
  const lastSyncByStore = new Map<string, SyncLogRow>();

  if (storeIds.length > 0) {
    let page = 0;
    while (lastSyncByStore.size < storeIds.length) {
      const { data, error } = await supabase
        .from("sync_log")
        .select("id, store_id, sync_type, status, records_synced, records_created, records_updated, error_message, started_at, completed_at, triggered_by")
        .in("store_id", storeIds)
        .order("started_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) break;
      const batch = (data ?? []) as SyncLogRow[];
      for (const row of batch) {
        if (row.store_id && !lastSyncByStore.has(row.store_id)) {
          lastSyncByStore.set(row.store_id, row);
        }
      }
      if (batch.length < PAGE_SIZE) break;
      page += 1;
    }
  }

  const stores: StoreHealth[] = tokens.map((token) => {
    const last = lastSyncByStore.get(token.store_id);
    const lastAt = last?.completed_at ?? last?.started_at ?? null;
    const ageMs = lastAt ? now.getTime() - new Date(lastAt).getTime() : Infinity;

    let tone: StoreHealth["tone"] = "stable";
    if (last?.status === "failed") tone = "risk";
    else if (ageMs > STORE_WATCH_STALE_MS) tone = "watch";

    return {
      storeId: token.store_id,
      scopes: token.scopes ?? [],
      tokenUpdatedAt: token.updated_at,
      tokenExpiresAt: token.expires_at,
      lastSyncType: last?.sync_type ?? null,
      lastSyncStatus: last?.status ?? null,
      lastSyncAt: lastAt,
      errorMessage: last?.error_message ?? null,
      tone,
      ageLabel: ageLabel(lastAt, now),
    };
  });

  const totalSyncs = allStats.length;
  const successCount = allStats.filter((r) => r.status === "completed").length;
  const successRate = totalSyncs > 0 ? Math.round((successCount / totalSyncs) * 100) : 0;

  return { stores, recentLogs, totalSyncs, successRate };
});
