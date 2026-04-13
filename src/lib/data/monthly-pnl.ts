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
import { getSpendSummary } from "@/lib/data/campaigns";

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

function periodBounds(period: string): { from: string; to: string; label: string } {
  // period is "YYYY-MM-01"
  const normalized = normalizePeriod(period);
  const [y, m] = normalized.split("-").map((x) => parseInt(x, 10));
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1)); // first day of next month, exclusive
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(from);
  return { from: from.toISOString(), to: to.toISOString(), label };
}

export interface MonthlyPnlData {
  period: string;
  periodLabel: string;
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
  // CM after ad spend (closer to CEO spec's real CM)
  contributionMarginAfterAds: number;
  cmPctAfterAds: number;
  // Overhead
  overhead: {
    category: string;
    label: string;
    amount: number;
  }[];
  totalOverhead: number;
  // Net profit (CM after ads - overhead)
  netProfit: number;
  npmPct: number;
  // Diagnostics
  configured: boolean; // any settings present?
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

/**
 * First-time delivered customers in a given period.
 * A customer (identified by customer_phone) is "new" in this period if their
 * FIRST-EVER delivered order has a converty_created_at inside [from, to).
 *
 * To compute this correctly we need to check each in-period delivered customer
 * against ALL their previous delivered orders. We do this by:
 *  1. Collecting distinct phones from delivered orders in the period
 *  2. For those phones, fetching all earlier delivered orders
 *  3. Filtering out phones that had delivered orders before `from`
 */
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
  // Fetch any delivered order BEFORE `from` from these phones.
  // Chunk phones to keep the URL manageable.
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
      .limit(CHUNK * 50); // enough to capture at least one prior per phone
    if (error) throw new Error(`orders (prior deliveries): ${error.message}`);
    for (const row of data ?? []) {
      if (row.customer_phone) priorPhones.add(row.customer_phone as string);
    }
  }

  // Count phones whose FIRST delivered order is in this period (no prior delivery)
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

export const getMonthlyPnl = cache(
  async (period: string): Promise<MonthlyPnlData> => {
    const supabase = createAdminClient();
    const { from, to, label } = periodBounds(period);

    const [
      orders,
      productCostsResult,
      settingsResult,
      overheadResult,
      spendSummary,
      productsResult,
    ] = await Promise.all([
      fetchOrdersInRange(from, to),
      supabase.from("product_costs").select("product_id, unit_cogs"),
      supabase
        .from("business_settings")
        .select("cosmos_delivery_fee, cosmos_return_fee, packing_cost_per_package, converty_fee_rate")
        .limit(1)
        .maybeSingle(),
      getOverheadForPeriod(period),
      getSpendSummary(period),
      supabase.from("products").select("id, name"),
    ]);

    // Filter business-relevant orders
    const real = orders.filter(
      (o) => !o.is_test && ns(o.status) !== "deleted"
    );
    const databaseOrders = orders.filter((o) => !o.is_test);
    const delivered = real.filter((o) => ns(o.status) === "delivered");
    const returnedForCm = real.filter((o) =>
      RETURN_NUMERATOR_STATUSES.has(ns(o.status))
    );

    // Fetch all order_items once, then filter to this month's orders.
    // This avoids many sequential .in() queries that can fail under load.
    const realOrderIds = new Set(real.map((o) => o.id));
    const allOrderItems = await fetchAllOrderItems();
    const orderItems = allOrderItems.filter((item) => realOrderIds.has(item.order_id));

    const productCosts = (productCostsResult.data ?? []).map((row) => ({
      product_id: row.product_id as string,
      unit_cogs: Number(row.unit_cogs ?? 0),
    }));

    const settings = settingsResult.data;
    const fees = {
      cosmosDeliveryFee: Number(settings?.cosmos_delivery_fee ?? 0),
      cosmosReturnFee: Number(settings?.cosmos_return_fee ?? 0),
      packingCostPerPackage: Number(settings?.packing_cost_per_package ?? 0),
      convertyFeeRate: Number(settings?.converty_fee_rate ?? 0.003),
    };

    // Revenue
    const grossRevenue = delivered.reduce(
      (sum, o) => sum + Number(o.total_price ?? 0),
      0
    );
    const nonTestOrdersTotalPrice = databaseOrders.reduce(
      (sum, o) => sum + Number(o.total_price ?? 0),
      0
    );

    // Gross profit
    const deliveredOrderIds = new Set(delivered.map((o) => o.id));
    const profit = computeGrossProfit({
      deliveredOrderIds,
      deliveredRevenue: grossRevenue,
      orderItems,
      productCosts,
    });

    // Per-product COGS sum on delivered (for CPO)
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

    // CM
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

    // CPO
    const cpoResult = computeCpo({
      deliveredCount: delivered.length,
      deliveredCogs,
      deliveryFees: cm.deliveryFees,
      returnBurden: cm.returnBurden,
      packingCosts: cm.packingCosts,
      convertyFees: cm.convertyFees,
    });

    // Per-product delivered revenue (for ROAS)
    const revenueByProduct = new Map<string, number>();
    for (const item of orderItems) {
      if (!deliveredOrderIds.has(item.order_id)) continue;
      if (!item.product_id) continue;
      const qty = Number(item.quantity ?? 0);
      const unitPrice = Number(item.price_per_unit ?? 0);
      const itemRevenue = qty * unitPrice;
      revenueByProduct.set(
        item.product_id,
        (revenueByProduct.get(item.product_id) ?? 0) + itemRevenue
      );
    }

    // ROAS
    const roasResult = computeRoas({
      deliveredRevenueByProduct: revenueByProduct,
      spendByProduct: spendSummary.spendByProduct,
      totalDeliveredRevenue: grossRevenue,
      totalSpend: spendSummary.totalSpend,
    });

    // CAC
    const totalDeliveredCustomers = new Set(
      delivered
        .map((o) => (o.customer_phone ?? "").trim())
        .filter((p) => p.length > 0)
    ).size;
    const newCustomers = await countFirstTimeDeliveredCustomers(delivered, from);
    const cacResult = computeCac({
      totalSpend: spendSummary.totalSpend,
      newCustomerCount: newCustomers,
    });

    // CM after ads (closer to CEO spec's "real" CM)
    const contributionMarginAfterAds = cm.contributionMargin - spendSummary.totalSpend;
    const cmPctAfterAds =
      profit.configuredRevenue > 0
        ? (contributionMarginAfterAds / profit.configuredRevenue) * 100
        : 0;

    // Product name lookup for ROAS rows
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

    // Overhead: keep only categories with > 0
    const overheadEntries = overheadResult.entries
      .filter((e) => e.amount > 0)
      .map((e) => ({
        category: e.category,
        label: OVERHEAD_LABELS[e.category] ?? e.category,
        amount: e.amount,
      }));

    // Net profit now subtracts ad spend AND overhead
    const netProfit = contributionMarginAfterAds - overheadResult.total;
    const npmPct =
      profit.configuredRevenue > 0
        ? (netProfit / profit.configuredRevenue) * 100
        : 0;

    return {
      period: normalizePeriod(period),
      periodLabel: label,
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
      overhead: overheadEntries,
      totalOverhead: overheadResult.total,
      netProfit,
      npmPct,
      configured: !!settings,
    };
  }
);
