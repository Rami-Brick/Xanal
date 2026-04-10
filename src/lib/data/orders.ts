import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTerminalOrder } from "@/lib/converty/order-status";

const PAGE_SIZE = 1000;

interface OrderRow {
  id: string;
  status: string | null;
  is_test: boolean | null;
  total_price: number | string | null;
  history: unknown;
  converty_created_at: string | null;
  delivery_company: string | null;
}

function normalizeStatus(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/_/g, " ");
}

async function fetchAllOrders(): Promise<OrderRow[]> {
  const supabase = createAdminClient();
  const rows: OrderRow[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, is_test, total_price, history, converty_created_at, delivery_company")
      .order("converty_created_at", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`orders fetch failed: ${error.message}`);
    const batch = (data ?? []) as OrderRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  return rows;
}

export interface OrdersPageData {
  totalOrders: number;
  activeOrders: number;
  terminalOrders: number;
  byStatus: { status: string; label: string; count: number }[];
  byDeliveryCompany: { company: string; count: number }[];
  activeVsTerminalSplit: { label: string; count: number; pct: number }[];
  deliveredVsReturnedVsRejected: { label: string; count: number; pct: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmées",
  deposit: "Déposées",
  "in transit": "En transit",
  delivered: "Livrées",
  returned: "Retournées",
  rejected: "Rejetées",
  cancelled: "Annulées",
};

const TRACKED_STATUSES = [
  "pending", "confirmed", "deposit", "in transit",
  "delivered", "returned", "rejected",
];

export const getOrdersPageData = cache(async (): Promise<OrdersPageData> => {
  const orders = await fetchAllOrders();
  const now = new Date();
  const real = orders.filter((o) => !o.is_test);

  const active = real.filter(
    (o) => !isTerminalOrder(normalizeStatus(o.status), o.history, now)
  );
  const terminal = real.filter(
    (o) => isTerminalOrder(normalizeStatus(o.status), o.history, now)
  );

  // Status repartition
  const statusMap = new Map<string, number>();
  for (const status of TRACKED_STATUSES) statusMap.set(status, 0);
  for (const o of real) {
    const s = normalizeStatus(o.status);
    if (statusMap.has(s)) statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const byStatus = TRACKED_STATUSES.map((s) => ({
    status: s,
    label: STATUS_LABELS[s] ?? s,
    count: statusMap.get(s) ?? 0,
  }));

  // Delivery company distribution
  const companyMap = new Map<string, number>();
  for (const o of real) {
    const c = o.delivery_company?.trim() || "Non renseigné";
    companyMap.set(c, (companyMap.get(c) ?? 0) + 1);
  }
  const byDeliveryCompany = Array.from(companyMap.entries())
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const total = real.length;
  const activeVsTerminalSplit = [
    { label: "Actives", count: active.length, pct: total > 0 ? (active.length / total) * 100 : 0 },
    { label: "Terminales", count: terminal.length, pct: total > 0 ? (terminal.length / total) * 100 : 0 },
  ];

  const delivered = real.filter((o) => normalizeStatus(o.status) === "delivered").length;
  const returned = real.filter((o) => normalizeStatus(o.status) === "returned").length;
  const rejected = real.filter((o) => normalizeStatus(o.status) === "rejected").length;
  const drrTotal = delivered + returned + rejected;
  const deliveredVsReturnedVsRejected = [
    { label: "Livrées", count: delivered, pct: drrTotal > 0 ? (delivered / drrTotal) * 100 : 0 },
    { label: "Retournées", count: returned, pct: drrTotal > 0 ? (returned / drrTotal) * 100 : 0 },
    { label: "Rejetées", count: rejected, pct: drrTotal > 0 ? (rejected / drrTotal) * 100 : 0 },
  ];

  return {
    totalOrders: real.length,
    activeOrders: active.length,
    terminalOrders: terminal.length,
    byStatus,
    byDeliveryCompany,
    activeVsTerminalSplit,
    deliveredVsReturnedVsRejected,
  };
});
