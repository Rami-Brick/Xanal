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

interface ProductRow {
  id: string;
  name: string;
  status: string | null;
  image_url: string | null;
}

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | null;
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

function ns(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/_/g, " ");
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

export interface StorePageData {
  connection: {
    storeId: string | null;
    connected: boolean;
    lastSyncAt: string | null;
    syncFreshness: "stable" | "watch" | "risk";
  };
  kpis: {
    totalOrders: number;
    activeOrders: number;
    terminalOrders: number;
    deliveredOrders: number;
    returnedOrders: number;
    rejectedOrders: number;
    totalProducts: number;
    activeProducts: number;
  };
  orderBreakdown: {
    byStatus: { status: string; label: string; count: number }[];
    activeVsTerminal: { label: string; count: number; pct: number }[];
    deliveredVsReturnedVsRejected: { label: string; count: number; pct: number }[];
  };
  productBreakdown: {
    topByTotalOrders: {
      productId: string;
      name: string;
      imageUrl: string | null;
      totalOrders: number;
      totalUnits: number;
    }[];
    topByDeliveredOrders: {
      productId: string;
      name: string;
      imageUrl: string | null;
      deliveredOrders: number;
      deliveredUnits: number;
    }[];
  };
}

export const getStorePageData = cache(async (): Promise<StorePageData> => {
  const supabase = createAdminClient();
  const now = new Date();

  const [orders, products, orderItems, tokenResult, lastSyncResult] = await Promise.all([
    fetchAll<OrderRow>("orders", "id, status, is_test, history", "id"),
    fetchAll<ProductRow>("products", "id, name, status, image_url", "id"),
    fetchAll<OrderItemRow>("order_items", "order_id, product_id, product_name, quantity", "id"),
    supabase
      .from("converty_tokens")
      .select("store_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sync_log")
      .select("started_at, status")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Connection & freshness
  const storeId = tokenResult.data?.store_id ?? null;
  const connected = storeId !== null;
  const lastSyncAt = lastSyncResult.data?.started_at ?? null;
  const ageMs = lastSyncAt ? now.getTime() - new Date(lastSyncAt).getTime() : Infinity;
  const lastSyncFailed = lastSyncResult.data?.status === "failed";
  const syncFreshness: "stable" | "watch" | "risk" = lastSyncFailed
    ? "risk"
    : ageMs > 6 * 60 * 60 * 1000
    ? "watch"
    : "stable";

  // Order metrics
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

  const total = real.length;
  const activeVsTerminal = [
    { label: "Actives", count: active.length, pct: total > 0 ? (active.length / total) * 100 : 0 },
    { label: "Terminales", count: terminal.length, pct: total > 0 ? (terminal.length / total) * 100 : 0 },
  ];

  const drrTotal = delivered.length + returned.length + rejected.length;
  const deliveredVsReturnedVsRejected = [
    { label: "Livrées", count: delivered.length, pct: drrTotal > 0 ? (delivered.length / drrTotal) * 100 : 0 },
    { label: "Retournées", count: returned.length, pct: drrTotal > 0 ? (returned.length / drrTotal) * 100 : 0 },
    { label: "Rejetées", count: rejected.length, pct: drrTotal > 0 ? (rejected.length / drrTotal) * 100 : 0 },
  ];

  // Product metrics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => (p.status ?? "active") === "active").length;

  const realOrderIds = new Set(real.map((o) => o.id));
  const deliveredOrderIds = new Set(delivered.map((o) => o.id));
  const productById = new Map(products.map((p) => [p.id, p]));

  interface ProductAgg {
    productId: string;
    name: string;
    imageUrl: string | null;
    totalOrders: number;
    totalUnits: number;
    deliveredOrders: number;
    deliveredUnits: number;
  }

  const agg = new Map<string, ProductAgg>();
  for (const item of orderItems) {
    if (!realOrderIds.has(item.order_id)) continue;
    const key = item.product_id ?? `name:${item.product_name}`;
    const product = item.product_id ? productById.get(item.product_id) : null;
    const name = product?.name ?? item.product_name;
    const qty = Number(item.quantity ?? 0);
    const isDelivered = deliveredOrderIds.has(item.order_id);

    const existing = agg.get(key);
    if (existing) {
      existing.totalOrders += 1;
      existing.totalUnits += qty;
      if (isDelivered) {
        existing.deliveredOrders += 1;
        existing.deliveredUnits += qty;
      }
    } else {
      agg.set(key, {
        productId: key,
        name,
        imageUrl: product?.image_url ?? null,
        totalOrders: 1,
        totalUnits: qty,
        deliveredOrders: isDelivered ? 1 : 0,
        deliveredUnits: isDelivered ? qty : 0,
      });
    }
  }

  const allProducts = Array.from(agg.values());
  const topByTotalOrders = [...allProducts]
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, 8)
    .map(({ productId, name, imageUrl, totalOrders, totalUnits }) => ({
      productId,
      name,
      imageUrl,
      totalOrders,
      totalUnits,
    }));
  const topByDeliveredOrders = [...allProducts]
    .sort((a, b) => b.deliveredOrders - a.deliveredOrders)
    .slice(0, 8)
    .map(({ productId, name, imageUrl, deliveredOrders, deliveredUnits }) => ({
      productId,
      name,
      imageUrl,
      deliveredOrders,
      deliveredUnits,
    }));

  return {
    connection: { storeId, connected, lastSyncAt, syncFreshness },
    kpis: {
      totalOrders: real.length,
      activeOrders: active.length,
      terminalOrders: terminal.length,
      deliveredOrders: delivered.length,
      returnedOrders: returned.length,
      rejectedOrders: rejected.length,
      totalProducts,
      activeProducts,
    },
    orderBreakdown: { byStatus, activeVsTerminal, deliveredVsReturnedVsRejected },
    productBreakdown: { topByTotalOrders, topByDeliveredOrders },
  };
});
