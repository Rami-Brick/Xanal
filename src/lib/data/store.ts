import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTerminalOrder } from "@/lib/converty/order-status";
import {
  computeGrossProfit,
  computeProductMargins,
  computeContributionMargin,
  computeCpo,
  computeProductPnl,
  type ProductMarginRow,
} from "@/lib/finance/margins";

const PAGE_SIZE = 1000;

interface OrderRow {
  id: string;
  status: string | null;
  is_test: boolean | null;
  history: unknown;
  total_price: number | string | null;
  converty_created_at: string | null;
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
  price_per_unit: number | string | null;
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

function isValidOrderForAnalytics(order: OrderRow) {
  return !order.is_test && ns(order.status) !== "deleted";
}

function isAttemptLikeStatus(status: string) {
  return /^attempt(\b|\s)/.test(status);
}

function isPendingOrAttemptStatus(status: string) {
  return status === "pending" || isAttemptLikeStatus(status);
}

function isBusinessConfirmedStatus(status: string) {
  return status !== "" && !isPendingOrAttemptStatus(status) && status !== "rejected";
}

const RETURN_ELIGIBLE_STATUSES = new Set([
  "deposit",
  "in transit",
  "delivered",
  "returned",
  "to be returned",
]);
const RETURN_NUMERATOR_STATUSES = new Set(["returned", "to be returned"]);

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmées",
  deposit: "Déposées",
  "in transit": "En transit",
  delivered: "Livrées",
  returned: "Retournées",
  rejected: "Rejetées",
};

type Tone = "stable" | "watch" | "risk";

export interface StorePageData {
  connection: {
    storeId: string | null;
    connected: boolean;
    lastSyncAt: string | null;
    syncFreshness: Tone;
  };
  kpis: {
    totalDatabaseOrders: number;
    validOrders: number;
    totalOrders: number;
    activeOrders: number;
    terminalOrders: number;
    deliveredOrders: number;
    returnedOrders: number;
    rejectedOrders: number;
    totalProducts: number;
    activeProducts: number;
  };
  revenueMetrics: {
    grossRevenue: number;
    averageOrderValue: number;
    returnRate: number;
    confirmationRate: number;
    returnNumerator: number;
    returnDenominator: number;
    confirmationNumerator: number;
    confirmationDenominator: number;
  };
  dailyTrend: {
    date: string;
    label: string;
    orders: number;
    deliveredOrders: number;
    deliveredRevenue: number;
  }[];
  alerts: {
    title: string;
    body: string;
    tone: Tone;
  }[];
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
    topByDeliveredRevenue: {
      productId: string;
      name: string;
      imageUrl: string | null;
      deliveredRevenue: number;
      deliveredUnits: number;
      revenueShare: number;
      grossProfit: number | null;
      gpmPct: number | null;
    }[];
  };
  margins: {
    grossProfit: number;
    gpmPct: number;
    configuredRevenue: number;
    unconfiguredRevenue: number;
    productsWithCogs: number;
    productsMissingCogs: number;
    totalActiveProducts: number;
    contributionMargin: number;
    cmPct: number;
    cpo: number;
    cpoTotalVariableCost: number;
    deliveredCogs: number;
    costBreakdown: {
      deliveryFees: number;
      returnBurden: number;
      packingCosts: number;
      convertyFees: number;
      totalVariableCosts: number;
    };
    fees: {
      carrierDeliveryFee: number;
      carrierReturnFee: number;
      packingCostPerPackage: number;
      convertyFeeRate: number;
    };
  };
  productPnl: {
    productId: string;
    name: string;
    imageUrl: string | null;
    deliveredUnits: number;
    deliveredRevenue: number;
    deliveredCogs: number;
    grossProfit: number;
    gpmPct: number;
    allocatedOpsCost: number;
    contributionMargin: number;
    cmPct: number;
    revenueShare: number;
  }[];
}

export const getStorePageData = cache(async (): Promise<StorePageData> => {
  const supabase = createAdminClient();
  const now = new Date();

  const [
    orders,
    products,
    orderItems,
    productCostsResult,
    businessSettingsResult,
    tokenResult,
    lastSyncResult,
  ] = await Promise.all([
    fetchAll<OrderRow>("orders", "id, status, is_test, history, total_price, converty_created_at", "id"),
    fetchAll<ProductRow>("products", "id, name, status, image_url", "id"),
    fetchAll<OrderItemRow>("order_items", "order_id, product_id, product_name, quantity, price_per_unit", "id"),
    supabase.from("product_costs").select("product_id, unit_cogs"),
    supabase
      .from("business_settings")
      .select("cosmos_delivery_fee, cosmos_return_fee, packing_cost_per_package, converty_fee_rate")
      .limit(1)
      .maybeSingle(),
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

  const productCosts = (productCostsResult.data ?? []).map((row) => ({
    product_id: row.product_id as string,
    unit_cogs: Number(row.unit_cogs ?? 0),
  }));

  const settings = businessSettingsResult.data;
  const fees = {
    carrierDeliveryFee: Number(settings?.cosmos_delivery_fee ?? 0),
    carrierReturnFee: Number(settings?.cosmos_return_fee ?? 0),
    packingCostPerPackage: Number(settings?.packing_cost_per_package ?? 0),
    convertyFeeRate: Number(settings?.converty_fee_rate ?? 0.003),
  };

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
  const databaseOrders = orders.filter((o) => !o.is_test);
  const real = orders.filter(isValidOrderForAnalytics);
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

  // Revenue metrics
  const grossRevenue = delivered.reduce(
    (sum, o) => sum + Number(o.total_price ?? 0),
    0
  );
  const averageOrderValue =
    delivered.length > 0 ? grossRevenue / delivered.length : 0;

  // Return rate: (returned + to_be_returned) / (deposit + in_transit + delivered + returned + to_be_returned)
  const returnNumerator = real.filter((o) =>
    RETURN_NUMERATOR_STATUSES.has(ns(o.status))
  ).length;
  const returnDenominator = real.filter((o) =>
    RETURN_ELIGIBLE_STATUSES.has(ns(o.status))
  ).length;
  const returnRate =
    returnDenominator > 0 ? (returnNumerator / returnDenominator) * 100 : 0;

  // Confirmation rate:
  // confirmed orders / treated orders
  // Business rule:
  // - pending + attempt* = not yet treated
  // - rejected = treated but not confirmed
  // - anything else = confirmed
  const confirmationNumerator = real.filter(
    (o) => isBusinessConfirmedStatus(ns(o.status))
  ).length;
  const confirmationDenominator = real.filter((o) => {
    const s = ns(o.status);
    return s !== "" && !isPendingOrAttemptStatus(s);
  }).length;
  const confirmationRate =
    confirmationDenominator > 0
      ? (confirmationNumerator / confirmationDenominator) * 100
      : 0;

  // Daily trend (last 30 days — client filters to 7/14/30)
  const trendDays = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - i));
    return date;
  });
  const trendBuckets = new Map<
    string,
    { date: string; label: string; orders: number; deliveredOrders: number; deliveredRevenue: number }
  >();
  for (const date of trendDays) {
    const iso = date.toISOString().slice(0, 10);
    trendBuckets.set(iso, {
      date: iso,
      label: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date),
      orders: 0,
      deliveredOrders: 0,
      deliveredRevenue: 0,
    });
  }
  for (const o of real) {
    if (!o.converty_created_at) continue;
    const bucket = trendBuckets.get(o.converty_created_at.slice(0, 10));
    if (!bucket) continue;
    bucket.orders += 1;
    if (ns(o.status) === "delivered") {
      bucket.deliveredOrders += 1;
      bucket.deliveredRevenue += Number(o.total_price ?? 0);
    }
  }
  const dailyTrend = Array.from(trendBuckets.values());

  // Alerts
  const alerts: StorePageData["alerts"] = [];
  if (lastSyncFailed) {
    alerts.push({
      title: "Synchronisation en echec",
      body: "Le dernier sync a echoue. Les donnees affichees peuvent etre incompletes.",
      tone: "risk",
    });
  } else if (syncFreshness === "watch") {
    alerts.push({
      title: "Donnees pas totalement fraiches",
      body: "Le dernier sync date de plus de 6 heures. Pensez a relancer une synchronisation.",
      tone: "watch",
    });
  }
  if (returnRate >= 20) {
    alerts.push({
      title: "Taux de retour critique",
      body: `Le taux de retour atteint ${returnRate.toFixed(1)} %. Revoir par produit et par ville.`,
      tone: "risk",
    });
  } else if (returnRate >= 15) {
    alerts.push({
      title: "Taux de retour a surveiller",
      body: `Le taux de retour est a ${returnRate.toFixed(1)} %. Seuil d'alerte proche.`,
      tone: "watch",
    });
  }
  if (confirmationRate > 0 && confirmationRate < 72) {
    alerts.push({
      title: "Confirmation fragile",
      body: `Le taux de confirmation est a ${confirmationRate.toFixed(1)} %. Verifier le process de confirmation.`,
      tone: confirmationRate < 60 ? "risk" : "watch",
    });
  }
  if (active.length > Math.max(delivered.length, 1)) {
    alerts.push({
      title: "Backlog actif consequent",
      body: `${active.length} commandes actives, soit plus que le volume livre. Priorite a la conversion du pipeline.`,
      tone: "watch",
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      title: "Situation stable",
      body: "Aucune anomalie operationnelle evidente sur les metriques de base.",
      tone: "stable",
    });
  }

  // Product metrics
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
    deliveredRevenue: number;
  }

  const agg = new Map<string, ProductAgg>();
  for (const item of orderItems) {
    if (!realOrderIds.has(item.order_id)) continue;
    const key = item.product_id ?? `name:${item.product_name}`;
    const product = item.product_id ? productById.get(item.product_id) : null;
    const name = product?.name ?? item.product_name;
    const qty = Number(item.quantity ?? 0);
    const isDelivered = deliveredOrderIds.has(item.order_id);
    const revenue = isDelivered ? qty * Number(item.price_per_unit ?? 0) : 0;

    const existing = agg.get(key);
    if (existing) {
      existing.totalOrders += 1;
      existing.totalUnits += qty;
      if (isDelivered) {
        existing.deliveredOrders += 1;
        existing.deliveredUnits += qty;
        existing.deliveredRevenue += revenue;
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
        deliveredRevenue: revenue,
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
  // Phase 2C: Gross profit & per-product margins
  const profit = computeGrossProfit({
    deliveredOrderIds,
    deliveredRevenue: grossRevenue,
    orderItems,
    productCosts,
  });

  const productMargins: Map<string, ProductMarginRow> = computeProductMargins({
    deliveredOrderIds,
    orderItems,
    productCosts,
  });

  // Count delivered products (ones with units sold, not catalogue size)
  const deliveredProductIds = new Set<string>();
  for (const item of orderItems) {
    if (deliveredOrderIds.has(item.order_id) && item.product_id) {
      deliveredProductIds.add(item.product_id);
    }
  }
  const productsWithCogs = Array.from(deliveredProductIds).filter((id) =>
    profit.productsWithCogs.has(id)
  ).length;
  const productsMissingCogs = deliveredProductIds.size - productsWithCogs;

  // Contribution margin: count both "returned" and "to be returned" as returned.
  const returnedForCm = real.filter((o) =>
    RETURN_NUMERATOR_STATUSES.has(ns(o.status))
  ).length;
  const nonTestOrdersTotalPrice = databaseOrders.reduce(
    (sum, o) => sum + Number(o.total_price ?? 0),
    0
  );
  const cm = computeContributionMargin(
    {
      grossProfit: profit.grossProfit,
      deliveredCount: delivered.length,
      returnedCount: returnedForCm,
      nonTestOrdersTotalPrice,
      fees: {
        carrierDeliveryFee: fees.carrierDeliveryFee,
        carrierReturnFee: fees.carrierReturnFee,
        packingCostPerPackage: fees.packingCostPerPackage,
        convertyFeeRate: fees.convertyFeeRate,
      },
    },
    profit.configuredRevenue
  );

  // CPO: use the sum of per-product deliveredCogs as deliveredCogs input.
  const deliveredCogsTotal = Array.from(productMargins.values()).reduce(
    (sum, m) => sum + m.deliveredCogs,
    0
  );
  const cpoResult = computeCpo({
    deliveredCount: delivered.length,
    deliveredCogs: deliveredCogsTotal,
    deliveryFees: cm.deliveryFees,
    returnBurden: cm.returnBurden,
    packingCosts: cm.packingCosts,
    convertyFees: cm.convertyFees,
  });

  // Per-product P&L (kill/keep table)
  const productMeta = new Map(
    allProducts.map((p) => [p.productId, { name: p.name, imageUrl: p.imageUrl }])
  );
  const totalDeliveredUnits = allProducts.reduce((sum, p) => sum + p.deliveredUnits, 0);
  const productPnl = computeProductPnl({
    deliveredOrderIds,
    orderItems,
    productCosts,
    productMeta,
    totalDeliveredRevenue: grossRevenue,
    totalDeliveredUnits,
    totalOpsCost: cm.totalVariableCosts,
  }).sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);

  const topByDeliveredRevenue = [...allProducts]
    .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue)
    .slice(0, 8)
    .map(({ productId, name, imageUrl, deliveredRevenue, deliveredUnits }) => {
      const margin = productMargins.get(productId);
      return {
        productId,
        name,
        imageUrl,
        deliveredRevenue,
        deliveredUnits,
        revenueShare: grossRevenue > 0 ? (deliveredRevenue / grossRevenue) * 100 : 0,
        grossProfit: margin ? margin.grossProfit : null,
        gpmPct: margin ? margin.gpmPct : null,
      };
    });

  // Margin-driven alerts
  if (productsMissingCogs > 0 && deliveredProductIds.size > 0) {
    alerts.push({
      title: "Couts produits incomplets",
      body: `${productsMissingCogs} produit(s) livre(s) sans cout unitaire configure. La marge brute affichee ne couvre qu'une partie des ventes.`,
      tone: "watch",
    });
  }
  if (profit.configuredRevenue > 0 && cm.contributionMargin < 0) {
    alerts.push({
      title: "Marge de contribution negative",
      body: `Les couts variables depassent le profit brut de ${Math.abs(cm.contributionMargin).toFixed(0)} TND. Verifier les prix de vente et les frais logistiques.`,
      tone: "risk",
    });
  } else if (profit.configuredRevenue > 0 && cm.cmPct > 0 && cm.cmPct < 10) {
    alerts.push({
      title: "Marge de contribution faible",
      body: `CM% a ${cm.cmPct.toFixed(1)} %, en dessous du seuil critique de 10 %.`,
      tone: "risk",
    });
  }
  // CPO thresholds per CEO spec: warning > 35 TND, critical > 42 TND
  if (cpoResult.cpo >= 42) {
    alerts.push({
      title: "CPO critique",
      body: `Le cout par commande livree atteint ${cpoResult.cpo.toFixed(1)} TND. Probable cause : taux de retour eleve.`,
      tone: "risk",
    });
  } else if (cpoResult.cpo >= 35) {
    alerts.push({
      title: "CPO eleve",
      body: `Le cout par commande livree est a ${cpoResult.cpo.toFixed(1)} TND. Surveiller les retours et la logistique.`,
      tone: "watch",
    });
  }
  // Per-product kill signals
  const negativeCmProducts = productPnl.filter(
    (p) => p.deliveredRevenue > 0 && p.contributionMargin < 0
  );
  if (negativeCmProducts.length > 0) {
    const names = negativeCmProducts.slice(0, 2).map((p) => p.name).join(", ");
    const more = negativeCmProducts.length > 2 ? ` +${negativeCmProducts.length - 2}` : "";
    alerts.push({
      title: `${negativeCmProducts.length} produit(s) non rentable(s)`,
      body: `${names}${more} ont une CM negative. Envisager de suspendre ou reprendre le prix.`,
      tone: "risk",
    });
  }

  return {
    connection: { storeId, connected, lastSyncAt, syncFreshness },
    kpis: {
      totalDatabaseOrders: databaseOrders.length,
      validOrders: real.length,
      totalOrders: real.length,
      activeOrders: active.length,
      terminalOrders: terminal.length,
      deliveredOrders: delivered.length,
      returnedOrders: returned.length,
      rejectedOrders: rejected.length,
      totalProducts,
      activeProducts,
    },
    revenueMetrics: {
      grossRevenue,
      averageOrderValue,
      returnRate,
      confirmationRate,
      returnNumerator,
      returnDenominator,
      confirmationNumerator,
      confirmationDenominator,
    },
    dailyTrend,
    alerts,
    orderBreakdown: { byStatus, activeVsTerminal, deliveredVsReturnedVsRejected },
    productBreakdown: { topByTotalOrders, topByDeliveredOrders, topByDeliveredRevenue },
    margins: {
      grossProfit: profit.grossProfit,
      gpmPct: profit.gpmPct,
      configuredRevenue: profit.configuredRevenue,
      unconfiguredRevenue: profit.unconfiguredRevenue,
      productsWithCogs,
      productsMissingCogs,
      totalActiveProducts: deliveredProductIds.size,
      contributionMargin: cm.contributionMargin,
      cmPct: cm.cmPct,
      cpo: cpoResult.cpo,
      cpoTotalVariableCost: cpoResult.totalVariableCost,
      deliveredCogs: deliveredCogsTotal,
      costBreakdown: {
        deliveryFees: cm.deliveryFees,
        returnBurden: cm.returnBurden,
        packingCosts: cm.packingCosts,
        convertyFees: cm.convertyFees,
        totalVariableCosts: cm.totalVariableCosts,
      },
      fees,
    },
    productPnl: productPnl.map((p) => ({
      productId: p.productId,
      name: p.name,
      imageUrl: p.imageUrl,
      deliveredUnits: p.deliveredUnits,
      deliveredRevenue: p.deliveredRevenue,
      deliveredCogs: p.deliveredCogs,
      grossProfit: p.grossProfit,
      gpmPct: p.gpmPct,
      allocatedOpsCost: p.allocatedOpsCost,
      contributionMargin: p.contributionMargin,
      cmPct: p.cmPct,
      revenueShare: p.revenueShare,
    })),
  };
});
