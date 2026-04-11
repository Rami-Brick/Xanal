import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTerminalOrder } from "@/lib/converty/order-status";

const PAGE_SIZE = 1000;

interface OrderRow {
  id: string;
  status: string | null;
  is_test: boolean | null;
  history: unknown;
}

function ns(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase().replace(/_/g, " ");
}

async function fetchAll<T>(table: string, cols: string, orderCol = "id"): Promise<T[]> {
  const supabase = createAdminClient();
  const rows: T[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .order(orderCol, { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);

    const batch = (data ?? []) as T[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  return rows;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmées",
  deposit: "Déposées",
  "in transit": "En transit",
  delivered: "Livrées",
  returned: "Retournées",
  rejected: "Rejetées",
};

export interface DashboardOverviewData {
  totalOrders: number;
  activeOrders: number;
  terminalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  rejectedOrders: number;
  totalProducts: number;
  byStatus: { status: string; label: string; count: number }[];
  connectedStores: number;
  lastSyncAt: string | null;
  syncFreshness: "stable" | "watch" | "risk";
}

export const getDashboardOverview = cache(async (): Promise<DashboardOverviewData> => {
  const supabase = createAdminClient();
  const now = new Date();

  const [orders, productsCount, tokensResult, lastSyncResult] = await Promise.all([
    fetchAll<OrderRow>("orders", "id, status, is_test, history", "id"),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("converty_tokens").select("store_id", { count: "exact", head: true }),
    supabase
      .from("sync_log")
      .select("started_at, status")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const real = orders.filter((o) => !o.is_test);
  const active = real.filter((o) => !isTerminalOrder(ns(o.status), o.history, now));
  const terminal = real.filter((o) => isTerminalOrder(ns(o.status), o.history, now));
  const delivered = real.filter((o) => ns(o.status) === "delivered");
  const returned = real.filter((o) => ns(o.status) === "returned");
  const rejected = real.filter((o) => ns(o.status) === "rejected");

  const statusMap = new Map<string, number>();
  for (const key of Object.keys(STATUS_LABELS)) statusMap.set(key, 0);
  for (const o of real) {
    const s = ns(o.status);
    if (statusMap.has(s)) statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }

  const byStatus = Object.keys(STATUS_LABELS).map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    count: statusMap.get(s) ?? 0,
  }));

  const lastSyncAt = lastSyncResult.data?.started_at ?? null;
  const ageMs = lastSyncAt ? now.getTime() - new Date(lastSyncAt).getTime() : Infinity;
  const lastSyncFailed = lastSyncResult.data?.status === "failed";
  const syncFreshness: "stable" | "watch" | "risk" = lastSyncFailed
    ? "risk"
    : ageMs > 6 * 60 * 60 * 1000
      ? "watch"
      : "stable";

  return {
    totalOrders: real.length,
    activeOrders: active.length,
    terminalOrders: terminal.length,
    deliveredOrders: delivered.length,
    returnedOrders: returned.length,
    rejectedOrders: rejected.length,
    totalProducts: productsCount.count ?? 0,
    byStatus,
    connectedStores: tokensResult.count ?? 0,
    lastSyncAt,
    syncFreshness,
  };
});
