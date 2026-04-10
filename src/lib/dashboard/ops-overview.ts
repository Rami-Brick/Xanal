import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTerminalOrder } from "@/lib/converty/order-status";

const SUPABASE_PAGE_SIZE = 1000;
const RETURN_ELIGIBLE_STATUSES = new Set([
  "deposit",
  "in transit",
  "delivered",
  "returned",
  "to be returned",
]);
const RETURN_NUMERATOR_STATUSES = new Set(["returned", "to be returned"]);
const PIPELINE_STATUSES = [
  "pending",
  "confirmed",
  "deposit",
  "in transit",
  "delivered",
  "returned",
  "rejected",
] as const;

type DashboardTone = "stable" | "watch" | "risk";

interface OrderRow {
  id: string;
  status: string | null;
  is_test: boolean | null;
  total_price: number | string | null;
  history: unknown;
  converty_created_at: string | null;
}

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | null;
  price_per_unit: number | string | null;
}

interface ProductRow {
  id: string;
  image_url: string | null;
  slug: string | null;
}

interface TokenRow {
  store_id: string;
  scopes: string[] | null;
  updated_at: string | null;
  expires_at: string | null;
}

interface SyncLogRow {
  store_id: string | null;
  sync_type: string | null;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface DashboardHeroMetric {
  label: string;
  value: string;
  hint: string;
  tone?: DashboardTone;
}

export interface DashboardPipelineMetric {
  status: string;
  label: string;
  count: number;
}

export interface DashboardTopProduct {
  name: string;
  units: number;
  revenue: number;
  share: number;
  imageUrl: string | null;
  slug: string | null;
}

export interface DashboardTrendPoint {
  date: string;
  label: string;
  orders: number;
  deliveredRevenue: number;
}

export interface DashboardAlert {
  title: string;
  body: string;
  tone: DashboardTone;
}

export interface DashboardStoreSync {
  storeId: string;
  scopes: string[];
  tokenUpdatedAt: string | null;
  tokenExpiresAt: string | null;
  lastSyncType: string | null;
  lastSyncStatus: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  tone: DashboardTone;
}

export interface OpsDashboardData {
  connectedStores: number;
  lastSuccessfulSyncAt: string | null;
  freshnessTone: DashboardTone;
  freshnessLabel: string;
  heroMetrics: DashboardHeroMetric[];
  pipeline: DashboardPipelineMetric[];
  topProducts: DashboardTopProduct[];
  trend: DashboardTrendPoint[];
  alerts: DashboardAlert[];
  stores: DashboardStoreSync[];
}

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase().replace(/_/g, " ");
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  }).format(value);
}

function formatCompactPercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

async function fetchAllRows<T extends object>(
  table: string,
  columns: string,
  orderColumn = "id"
): Promise<T[]> {
  const supabase = createAdminClient();
  const rows: T[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(page * SUPABASE_PAGE_SIZE, (page + 1) * SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to read ${table}: ${error.message}`);
    }

    const batch = ((data ?? []) as unknown) as T[];
    rows.push(...batch);

    if (batch.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return rows;
}

async function fetchLatestSyncByStore(storeIds: string[]) {
  const supabase = createAdminClient();
  const lastSyncByStore = new Map<string, SyncLogRow>();

  if (storeIds.length === 0) {
    return lastSyncByStore;
  }

  let page = 0;
  while (lastSyncByStore.size < storeIds.length) {
    const { data, error } = await supabase
      .from("sync_log")
      .select("store_id, sync_type, status, started_at, completed_at, error_message")
      .in("store_id", storeIds)
      .order("started_at", { ascending: false })
      .range(page * SUPABASE_PAGE_SIZE, (page + 1) * SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to read sync_log: ${error.message}`);
    }

    const batch = (data ?? []) as SyncLogRow[];
    for (const row of batch) {
      if (!row.store_id || lastSyncByStore.has(row.store_id)) {
        continue;
      }

      lastSyncByStore.set(row.store_id, row);
    }

    if (batch.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return lastSyncByStore;
}

function buildTrend(orders: OrderRow[]): DashboardTrendPoint[] {
  const now = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    return date;
  });

  const buckets = new Map<string, DashboardTrendPoint>();
  for (const date of days) {
    const iso = date.toISOString().slice(0, 10);
    buckets.set(iso, {
      date: iso,
      label: new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
      }).format(date),
      orders: 0,
      deliveredRevenue: 0,
    });
  }

  for (const order of orders) {
    if (order.is_test || !order.converty_created_at) {
      continue;
    }

    const bucket = buckets.get(order.converty_created_at.slice(0, 10));
    if (!bucket) {
      continue;
    }

    bucket.orders += 1;
    if (normalizeStatus(order.status) === "delivered") {
      bucket.deliveredRevenue += Number(order.total_price ?? 0);
    }
  }

  return Array.from(buckets.values());
}

function buildAlerts(params: {
  returnRate: number;
  confirmationRate: number;
  activeOrders: number;
  deliveredOrders: number;
  failedStores: string[];
  staleStores: string[];
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (params.failedStores.length > 0) {
    alerts.push({
      title: "Synchronisation à surveiller",
      body: `${params.failedStores.length} boutique(s) ont un dernier sync en échec. Vérifier les connecteurs avant d'interpréter les chiffres.`,
      tone: "risk",
    });
  }

  if (params.staleStores.length > 0) {
    alerts.push({
      title: "Données pas totalement fraîches",
      body: `${params.staleStores.length} boutique(s) n'ont pas eu de sync récente. Le pipeline opérationnel peut être incomplet.`,
      tone: "watch",
    });
  }

  if (params.returnRate >= 18) {
    alerts.push({
      title: "Charge retour élevée",
      body: `Le taux de retour atteint ${formatCompactPercent(params.returnRate)}. Cela mérite une revue par produit, ville et agent.`,
      tone: "risk",
    });
  }

  if (params.confirmationRate > 0 && params.confirmationRate < 70) {
    alerts.push({
      title: "Confirmation fragile",
      body: `Le taux de confirmation est à ${formatCompactPercent(params.confirmationRate)}. Vérifier le process d'appel et la qualité du trafic.`,
      tone: "watch",
    });
  }

  if (params.activeOrders > Math.max(params.deliveredOrders, 1)) {
    alerts.push({
      title: "Backlog actif conséquent",
      body: `${params.activeOrders} commandes restent actives, soit plus que le volume livré. Priorité à la vitesse de conversion du pipeline.`,
      tone: "watch",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Signal global rassurant",
      body: "Aucune anomalie opérationnelle évidente sur les métriques de base. La prochaine étape peut porter sur la couche financière.",
      tone: "stable",
    });
  }

  return alerts.slice(0, 3);
}

export const getOpsDashboardData = cache(async (): Promise<OpsDashboardData> => {
  const supabase = createAdminClient();
  const [orders, orderItems, products, tokens, lastSuccessfulSyncResult] =
    await Promise.all([
      fetchAllRows<OrderRow>(
        "orders",
        "id, status, is_test, total_price, history, converty_created_at",
        "converty_created_at"
      ),
      fetchAllRows<OrderItemRow>(
        "order_items",
        "order_id, product_id, product_name, quantity, price_per_unit",
        "created_at"
      ),
      fetchAllRows<ProductRow>("products", "id, image_url, slug"),
      fetchAllRows<TokenRow>("converty_tokens", "store_id, scopes, updated_at, expires_at", "updated_at"),
      supabase
        .from("sync_log")
        .select("started_at")
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const now = new Date();
  const nonTestOrders = orders.filter((order) => !order.is_test);
  const deliveredOrders = nonTestOrders.filter(
    (order) => normalizeStatus(order.status) === "delivered"
  );
  const activeOrders = nonTestOrders.filter(
    (order) => !isTerminalOrder(normalizeStatus(order.status), order.history, now)
  );

  const deliveredRevenue = deliveredOrders.reduce(
    (sum, order) => sum + Number(order.total_price ?? 0),
    0
  );
  const deliveredOrderCount = deliveredOrders.length;
  const averageOrderValue =
    deliveredOrderCount > 0 ? deliveredRevenue / deliveredOrderCount : 0;

  const returnNumerator = nonTestOrders.filter((order) =>
    RETURN_NUMERATOR_STATUSES.has(normalizeStatus(order.status))
  ).length;
  const returnDenominator = nonTestOrders.filter((order) =>
    RETURN_ELIGIBLE_STATUSES.has(normalizeStatus(order.status))
  ).length;
  const returnRate =
    returnDenominator > 0 ? (returnNumerator / returnDenominator) * 100 : 0;

  const confirmationNumerator = nonTestOrders.filter(
    (order) => normalizeStatus(order.status) === "confirmed"
  ).length;
  const confirmationDenominator = nonTestOrders.filter((order) => {
    const status = normalizeStatus(order.status);
    return status === "confirmed" || status === "rejected";
  }).length;
  const confirmationRate =
    confirmationDenominator > 0
      ? (confirmationNumerator / confirmationDenominator) * 100
      : 0;

  const pipelineCounts = new Map<string, number>();
  for (const status of PIPELINE_STATUSES) {
    pipelineCounts.set(status, 0);
  }
  for (const order of nonTestOrders) {
    const normalizedStatus = normalizeStatus(order.status);
    if (pipelineCounts.has(normalizedStatus)) {
      pipelineCounts.set(
        normalizedStatus,
        (pipelineCounts.get(normalizedStatus) ?? 0) + 1
      );
    }
  }

  const deliveredOrderIds = new Set(deliveredOrders.map((order) => order.id));
  const productById = new Map(
    products.map((product) => [product.id, product] as const)
  );
  const topProductMap = new Map<
    string,
    {
      name: string;
      units: number;
      revenue: number;
      imageUrl: string | null;
      slug: string | null;
    }
  >();

  for (const item of orderItems) {
    if (!deliveredOrderIds.has(item.order_id)) {
      continue;
    }

    const key = item.product_id ?? item.product_name;
    const quantity = Number(item.quantity ?? 0);
    const revenue = quantity * Number(item.price_per_unit ?? 0);
    const product = item.product_id ? productById.get(item.product_id) : null;
    const existing = topProductMap.get(key);

    if (existing) {
      existing.units += quantity;
      existing.revenue += revenue;
      continue;
    }

    topProductMap.set(key, {
      name: item.product_name,
      units: quantity,
      revenue,
      imageUrl: product?.image_url ?? null,
      slug: product?.slug ?? null,
    });
  }

  const topProducts = Array.from(topProductMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((product) => ({
      ...product,
      share: deliveredRevenue > 0 ? (product.revenue / deliveredRevenue) * 100 : 0,
    }));

  const trend = buildTrend(nonTestOrders);

  const storeIds = tokens.map((token) => token.store_id);
  const latestSyncByStore = await fetchLatestSyncByStore(storeIds);
  const staleThresholdMs = 6 * 60 * 60 * 1000;

  const stores: DashboardStoreSync[] = tokens.map((token) => {
    const latestSync = latestSyncByStore.get(token.store_id);
    const latestSyncAt = latestSync?.completed_at ?? latestSync?.started_at ?? null;
    const ageMs = latestSyncAt ? now.getTime() - new Date(latestSyncAt).getTime() : Infinity;

    let tone: DashboardTone = "stable";
    if (latestSync?.status === "failed") {
      tone = "risk";
    } else if (ageMs > staleThresholdMs) {
      tone = "watch";
    }

    return {
      storeId: token.store_id,
      scopes: token.scopes ?? [],
      tokenUpdatedAt: token.updated_at,
      tokenExpiresAt: token.expires_at,
      lastSyncType: latestSync?.sync_type ?? null,
      lastSyncStatus: latestSync?.status ?? null,
      lastSyncAt: latestSyncAt,
      errorMessage: latestSync?.error_message ?? null,
      tone,
    };
  });

  const failedStores = stores
    .filter((store) => store.lastSyncStatus === "failed")
    .map((store) => store.storeId);
  const staleStores = stores
    .filter((store) => store.tone === "watch")
    .map((store) => store.storeId);

  let freshnessTone: DashboardTone = "stable";
  let freshnessLabel = "Flux synchronisé";
  if (failedStores.length > 0) {
    freshnessTone = "risk";
    freshnessLabel = "Sync à sécuriser";
  } else if (staleStores.length > 0) {
    freshnessTone = "watch";
    freshnessLabel = "Sync à rafraîchir";
  }

  const lastSuccessfulSyncAt = lastSuccessfulSyncResult.data?.started_at ?? null;
  const heroMetrics: DashboardHeroMetric[] = [
    {
      label: "Revenu livré",
      value: formatCompactCurrency(deliveredRevenue),
      hint: `${deliveredOrderCount} commandes livrées`,
      tone: "stable",
    },
    {
      label: "Commandes actives",
      value: new Intl.NumberFormat("fr-FR").format(activeOrders.length),
      hint: "Pipeline encore en mouvement",
      tone: activeOrders.length > deliveredOrderCount ? "watch" : "stable",
    },
    {
      label: "Taux de retour",
      value: formatCompactPercent(returnRate),
      hint: `${returnNumerator} retours / ${returnDenominator} commandes expédiées`,
      tone: returnRate >= 18 ? "risk" : returnRate >= 10 ? "watch" : "stable",
    },
    {
      label: "Taux de confirmation",
      value: formatCompactPercent(confirmationRate),
      hint: `${confirmationNumerator} confirmées / ${confirmationDenominator} confirmées ou rejetées`,
      tone:
        confirmationRate > 0 && confirmationRate < 70
          ? "watch"
          : "stable",
    },
    {
      label: "Panier moyen livré",
      value: formatCompactCurrency(averageOrderValue),
      hint: "Moyenne sur les commandes livrées",
      tone: "stable",
    },
    {
      label: "Couverture sync",
      value: `${tokens.length}/${tokens.length}`,
      hint: freshnessLabel,
      tone: freshnessTone,
    },
  ];

  const pipeline = PIPELINE_STATUSES.map((status) => ({
    status,
    label:
      {
        pending: "En attente",
        confirmed: "Confirmées",
        deposit: "Déposées",
        "in transit": "En transit",
        delivered: "Livrées",
        returned: "Retournées",
        rejected: "Rejetées",
      }[status] ?? status,
    count: pipelineCounts.get(status) ?? 0,
  }));

  return {
    connectedStores: tokens.length,
    lastSuccessfulSyncAt,
    freshnessTone,
    freshnessLabel,
    heroMetrics,
    pipeline,
    topProducts,
    trend,
    alerts: buildAlerts({
      returnRate,
      confirmationRate,
      activeOrders: activeOrders.length,
      deliveredOrders: deliveredOrderCount,
      failedStores,
      staleStores,
    }),
    stores,
  };
});
