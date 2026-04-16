import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeGrossProfit,
  computeContributionMargin,
  computeCpo,
  computeRoas,
  computeCac,
} from "@/lib/finance/margins";
import { getOverheadForPeriod, normalizePeriod } from "@/lib/data/settings";
import { getSpendSummaryForRange } from "@/lib/data/campaigns";

const PAGE_SIZE = 1000;

interface OrderRow {
  id: string;
  status: string | null;
  is_test: boolean | null;
  total_price: number | string | null;
  converty_created_at: string | null;
  customer_phone: string | null;
}

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  quantity: number | null;
  price_per_unit: number | string | null;
}

const RETURN_NUMERATOR_STATUSES = new Set(["returned", "to be returned"]);

function ns(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/_/g, " ");
}

/**
 * Export the month bounds helper so API routes and other callers can reuse it.
 */
export function monthBoundsIso(period: string): {
  fromIso: string;
  toExclusiveIso: string;
  label: string;
} {
  const normalized = normalizePeriod(period);
  const [y, m] = normalized.split("-").map((x) => parseInt(x, 10));
  const from = new Date(Date.UTC(y, m - 1, 1));
  const toExclusive = new Date(Date.UTC(y, m, 1));
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(from);
  return {
    fromIso: from.toISOString(),
    toExclusiveIso: toExclusive.toISOString(),
    label,
  };
}

export interface FinanceRangeData {
  fromIso: string;
  toExclusiveIso: string;
  label: string;
  // Counts
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  // Revenue
  grossRevenue: number;
  nonTestOrdersTotalPrice: number;
  // Margins
  grossProfit: number;
  gpmPct: number;
  configuredRevenue: number;
  unconfiguredRevenue: number;
  productsMissingCogs: number;
  // Variable costs
  deliveredCogs: number;
  deliveryFees: number;
  returnBurden: number;
  packingCosts: number;
  convertyFees: number;
  totalVariableCosts: number;
  // CM (pre-ad-spend)
  contributionMargin: number;
  cmPct: number;
  // CPO
  cpo: number;
  cpoTotalVariableCost: number;
  // Ad spend + ROAS/CAC
  adSpend: number;
  adSpendNoProduct: number;
  blendedRoas: number | null;
  cac: number | null;
  newCustomers: number;
  totalDeliveredCustomers: number;
  roasPerProduct: {
    productId: string;
    productName: string | null;
    revenue: number;
    spend: number;
    roas: number;
  }[];
  // CM after ad spend
  contributionMarginAfterAds: number;
  cmPctAfterAds: number;
  // Diagnostics
  configured: boolean;
}

export interface MonthlyNetProfitData {
  period: string;
  periodLabel: string;
  configuredRevenue: number;
  contributionMarginAfterAds: number;
  cmPctAfterAds: number;
  overhead: { category: string; label: string; amount: number }[];
  totalOverhead: number;
  netProfit: number;
  npmPct: number;
  deliveredOrders: number;
  totalOrders: number;
  hasAnyData: boolean;
}

const OVERHEAD_LABELS: Record<string, string> = {
  salaries: "Salaires",
  rent: "Loyer",
  phone_internet: "Telephone / Internet",
  subscriptions: "Abonnements",
  tax: "Declaration fiscale",
  daily_pickup: "Frais journaliers",
  other: "Autres",
};

async function fetchOrdersInRange(from: string, to: string): Promise<OrderRow[]> {
  const supabase = createAdminClient();
  const rows: OrderRow[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, is_test, total_price, converty_created_at, customer_phone")
      .gte("converty_created_at", from)
      .lt("converty_created_at", to)
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`orders (range): ${error.message}`);
    const batch = (data ?? []) as OrderRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }
  return rows;
}

async function countFirstTimeDeliveredCustomers(
  deliveredOrdersInPeriod: OrderRow[],
  from: string
): Promise<number> {
  const phones = new Set<string>();
  for (const o of deliveredOrdersInPeriod) {
    const phone = (o.customer_phone ?? "").trim();
    if (phone) phones.add(phone);
  }
  if (phones.size === 0) return 0;

  const supabase = createAdminClient();
  const CHUNK = 100;
  const phoneList = Array.from(phones);
  const priorPhones = new Set<string>();

  for (let i = 0; i < phoneList.length; i += CHUNK) {
    const chunk = phoneList.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("orders")
      .select("customer_phone")
      .eq("status", "delivered")
      .eq("is_test", false)
      .in("customer_phone", chunk)
      .lt("converty_created_at", from)
      .limit(CHUNK * 50);
    if (error) throw new Error(`orders (prior deliveries): ${error.message}`);
    for (const row of data ?? []) {
      if (row.customer_phone) priorPhones.add(row.customer_phone as string);
    }
  }

  let newCustomers = 0;
  for (const phone of phones) {
    if (!priorPhones.has(phone)) newCustomers += 1;
  }
  return newCustomers;
}

async function fetchAllOrderItems(): Promise<OrderItemRow[]> {
  const supabase = createAdminClient();
  const rows: OrderItemRow[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, price_per_unit")
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`order_items (page ${page}): ${error.message}`);
    const batch = (data ?? []) as OrderItemRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }
  return rows;
}

export const getFinanceRange = cache(
  async (input: {
    fromIso: string;
    toExclusiveIso: string;
    label: string;
  }): Promise<FinanceRangeData> => {
    const { fromIso, toExclusiveIso, label } = input;
    const supabase = createAdminClient();

    const [
      orders,
      productCostsResult,
      settingsResult,
      spendSummary,
      productsResult,
    ] = await Promise.all([
      fetchOrdersInRange(fromIso, toExclusiveIso),
      supabase.from("product_costs").select("product_id, unit_cogs"),
      supabase
        .from("business_settings")
        .select("cosmos_delivery_fee, cosmos_return_fee, packing_cost_per_package, converty_fee_rate")
        .limit(1)
        .maybeSingle(),
      getSpendSummaryForRange({ from: fromIso.slice(0, 10), to: toExclusiveIso.slice(0, 10) }),
      supabase.from("products").select("id, name"),
    ]);

    const real = orders.filter(
      (o) => !o.is_test && ns(o.status) !== "deleted"
    );
    const databaseOrders = orders.filter((o) => !o.is_test);
    const delivered = real.filter((o) => ns(o.status) === "delivered");
    const returnedForCm = real.filter((o) =>
      RETURN_NUMERATOR_STATUSES.has(ns(o.status))
    );

    const realOrderIds = new Set(real.map((o) => o.id));
    const allOrderItems = await fetchAllOrderItems();
    const orderItems = allOrderItems.filter((item) => realOrderIds.has(item.order_id));

    const productCosts = (productCostsResult.data ?? []).map((row) => ({
      product_id: row.product_id as string,
      unit_cogs: Number(row.unit_cogs ?? 0),
    }));

    const settings = settingsResult.data;
    const fees = {
      carrierDeliveryFee: Number(settings?.cosmos_delivery_fee ?? 0),
      carrierReturnFee: Number(settings?.cosmos_return_fee ?? 0),
      packingCostPerPackage: Number(settings?.packing_cost_per_package ?? 0),
      convertyFeeRate: Number(settings?.converty_fee_rate ?? 0.003),
    };

    const grossRevenue = delivered.reduce(
      (sum, o) => sum + Number(o.total_price ?? 0),
      0
    );
    const nonTestOrdersTotalPrice = databaseOrders.reduce(
      (sum, o) => sum + Number(o.total_price ?? 0),
      0
    );

    const deliveredOrderIds = new Set(delivered.map((o) => o.id));
    const profit = computeGrossProfit({
      deliveredOrderIds,
      deliveredRevenue: grossRevenue,
      orderItems,
      productCosts,
    });

    let deliveredCogs = 0;
    const cogsMap = new Map<string, number>();
    for (const c of productCosts) {
      if (c.unit_cogs > 0) cogsMap.set(c.product_id, c.unit_cogs);
    }
    const deliveredProductIds = new Set<string>();
    for (const item of orderItems) {
      if (!deliveredOrderIds.has(item.order_id)) continue;
      if (item.product_id) deliveredProductIds.add(item.product_id);
      if (item.product_id && cogsMap.has(item.product_id)) {
        deliveredCogs +=
          Number(item.quantity ?? 0) * (cogsMap.get(item.product_id) ?? 0);
      }
    }
    const productsWithCogs = Array.from(deliveredProductIds).filter((id) =>
      cogsMap.has(id)
    ).length;
    const productsMissingCogs = deliveredProductIds.size - productsWithCogs;

    const cm = computeContributionMargin(
      {
        grossProfit: profit.grossProfit,
        deliveredCount: delivered.length,
        returnedCount: returnedForCm.length,
        nonTestOrdersTotalPrice,
        fees,
      },
      profit.configuredRevenue
    );

    const cpoResult = computeCpo({
      deliveredCount: delivered.length,
      deliveredCogs,
      deliveryFees: cm.deliveryFees,
      returnBurden: cm.returnBurden,
      packingCosts: cm.packingCosts,
      convertyFees: cm.convertyFees,
    });

    const revenueByProduct = new Map<string, number>();
    for (const item of orderItems) {
      if (!deliveredOrderIds.has(item.order_id)) continue;
      if (!item.product_id) continue;
      const qty = Number(item.quantity ?? 0);
      const unitPrice = Number(item.price_per_unit ?? 0);
      revenueByProduct.set(
        item.product_id,
        (revenueByProduct.get(item.product_id) ?? 0) + qty * unitPrice
      );
    }

    const roasResult = computeRoas({
      deliveredRevenueByProduct: revenueByProduct,
      spendByProduct: spendSummary.spendByProduct,
      totalDeliveredRevenue: grossRevenue,
      totalSpend: spendSummary.totalSpend,
    });

    const totalDeliveredCustomers = new Set(
      delivered
        .map((o) => (o.customer_phone ?? "").trim())
        .filter((p) => p.length > 0)
    ).size;
    const newCustomers = await countFirstTimeDeliveredCustomers(delivered, fromIso);
    const cacResult = computeCac({
      totalSpend: spendSummary.totalSpend,
      newCustomerCount: newCustomers,
    });

    const contributionMarginAfterAds = cm.contributionMargin - spendSummary.totalSpend;
    const cmPctAfterAds =
      profit.configuredRevenue > 0
        ? (contributionMarginAfterAds / profit.configuredRevenue) * 100
        : 0;

    const productNameById = new Map<string, string>();
    for (const p of productsResult.data ?? []) {
      productNameById.set(p.id as string, p.name as string);
    }
    const roasPerProduct = Array.from(roasResult.perProduct.values())
      .map((r) => ({
        productId: r.productId,
        productName: productNameById.get(r.productId) ?? null,
        revenue: r.revenue,
        spend: r.spend,
        roas: r.roas,
      }))
      .sort((a, b) => b.spend - a.spend);

    return {
      fromIso,
      toExclusiveIso,
      label,
      totalOrders: real.length,
      deliveredOrders: delivered.length,
      returnedOrders: returnedForCm.length,
      grossRevenue,
      nonTestOrdersTotalPrice,
      grossProfit: profit.grossProfit,
      gpmPct: profit.gpmPct,
      configuredRevenue: profit.configuredRevenue,
      unconfiguredRevenue: profit.unconfiguredRevenue,
      productsMissingCogs,
      deliveredCogs,
      deliveryFees: cm.deliveryFees,
      returnBurden: cm.returnBurden,
      packingCosts: cm.packingCosts,
      convertyFees: cm.convertyFees,
      totalVariableCosts: cm.totalVariableCosts,
      contributionMargin: cm.contributionMargin,
      cmPct: cm.cmPct,
      cpo: cpoResult.cpo,
      cpoTotalVariableCost: cpoResult.totalVariableCost,
      adSpend: spendSummary.totalSpend,
      adSpendNoProduct: spendSummary.spendNoProduct,
      blendedRoas: roasResult.blendedRoas,
      cac: cacResult.cac,
      newCustomers,
      totalDeliveredCustomers,
      roasPerProduct,
      contributionMarginAfterAds,
      cmPctAfterAds,
      configured: !!settings,
    };
  }
);

export const getMonthlyNetProfit = cache(
  async (period: string): Promise<MonthlyNetProfitData> => {
    const { fromIso, toExclusiveIso, label } = monthBoundsIso(period);
    const [range, overhead] = await Promise.all([
      getFinanceRange({ fromIso, toExclusiveIso, label }),
      getOverheadForPeriod(period),
    ]);

    const overheadEntries = overhead.entries
      .filter((e) => e.amount > 0)
      .map((e) => ({
        category: e.category,
        label: OVERHEAD_LABELS[e.category] ?? e.category,
        amount: e.amount,
      }));

    const netProfit = range.contributionMarginAfterAds - overhead.total;
    const npmPct =
      range.configuredRevenue > 0
        ? (netProfit / range.configuredRevenue) * 100
        : 0;

    return {
      period: normalizePeriod(period),
      periodLabel: label,
      configuredRevenue: range.configuredRevenue,
      contributionMarginAfterAds: range.contributionMarginAfterAds,
      cmPctAfterAds: range.cmPctAfterAds,
      overhead: overheadEntries,
      totalOverhead: overhead.total,
      netProfit,
      npmPct,
      deliveredOrders: range.deliveredOrders,
      totalOrders: range.totalOrders,
      hasAnyData: range.totalOrders > 0,
    };
  }
);
