import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeContributionMargin,
  computeInvestorWaterfall,
  type InvestorWaterfallResult,
} from "@/lib/finance/margins";
import { getBusinessSettings } from "@/lib/data/settings";
import { getSpendSummary } from "@/lib/data/campaigns";

const PAGE_SIZE = 1000;

export type DealStatus = "active" | "closed";
export type PayoutType = "capital_return" | "profit_share";

export interface InvestorDeal {
  id: string;
  investor_name: string;
  product_id: string | null;
  product_name: string | null;
  capital_deployed: number;
  profit_share_pct: number;
  loss_share_pct: number;
  status: DealStatus;
  started_at: string;
  closed_at: string | null;
  note: string | null;
  updated_at: string | null;
}

export interface InvestorPayout {
  id: string;
  deal_id: string;
  payout_date: string;
  amount: number;
  payout_type: PayoutType;
  note: string | null;
}

export interface DealWaterfall extends InvestorDeal {
  // Scoped P&L (since deal started, for the mapped product if any)
  scopeDeliveredCount: number;
  scopeDeliveredRevenue: number;
  scopeCogs: number;
  scopeGrossProfit: number;
  scopeAdSpend: number;
  scopeOpsCosts: number;
  scopeNetProfit: number;
  // Payouts
  capitalReturnedTotal: number;
  profitSharePaidTotal: number;
  // Waterfall
  waterfall: InvestorWaterfallResult;
}

interface OrderRow {
  id: string;
  status: string | null;
  is_test: boolean | null;
  total_price: number | string | null;
  converty_created_at: string | null;
  converty_updated_at: string | null;
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

export async function getInvestorDeals(): Promise<InvestorDeal[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("investor_deals")
    .select(
      "id, investor_name, product_id, capital_deployed, profit_share_pct, loss_share_pct, status, started_at, closed_at, note, updated_at, products(name)"
    )
    .order("status", { ascending: true })  // 'active' before 'closed'
    .order("started_at", { ascending: false });

  if (error) throw new Error(`investor_deals: ${error.message}`);

  return (data ?? []).map((row) => {
    const productRel = (row as unknown as { products: { name: string } | null }).products;
    return {
      id: row.id as string,
      investor_name: row.investor_name as string,
      product_id: row.product_id as string | null,
      product_name: productRel?.name ?? null,
      capital_deployed: Number(row.capital_deployed),
      profit_share_pct: Number(row.profit_share_pct),
      loss_share_pct: Number(row.loss_share_pct),
      status: row.status as DealStatus,
      started_at: row.started_at as string,
      closed_at: row.closed_at as string | null,
      note: row.note as string | null,
      updated_at: row.updated_at as string | null,
    };
  });
}

export async function upsertInvestorDeal(input: {
  id?: string;
  investor_name: string;
  product_id: string | null;
  capital_deployed: number;
  profit_share_pct: number;
  loss_share_pct: number;
  status: DealStatus;
  started_at: string;
  closed_at?: string | null;
  note?: string | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (input.id) {
    const { error } = await supabase
      .from("investor_deals")
      .update({
        investor_name: input.investor_name,
        product_id: input.product_id,
        capital_deployed: input.capital_deployed,
        profit_share_pct: input.profit_share_pct,
        loss_share_pct: input.loss_share_pct,
        status: input.status,
        started_at: input.started_at,
        closed_at: input.closed_at ?? null,
        note: input.note ?? null,
        updated_at: now,
      })
      .eq("id", input.id);
    if (error) throw new Error(`update deal: ${error.message}`);
    return input.id;
  }

  const { data, error } = await supabase
    .from("investor_deals")
    .insert({
      investor_name: input.investor_name,
      product_id: input.product_id,
      capital_deployed: input.capital_deployed,
      profit_share_pct: input.profit_share_pct,
      loss_share_pct: input.loss_share_pct,
      status: input.status,
      started_at: input.started_at,
      closed_at: input.closed_at ?? null,
      note: input.note ?? null,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert deal: ${error.message}`);
  return data.id as string;
}

export async function deleteInvestorDeal(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("investor_deals").delete().eq("id", id);
  if (error) throw new Error(`delete deal: ${error.message}`);
}

export async function getInvestorPayouts(dealId: string): Promise<InvestorPayout[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("investor_payouts")
    .select("id, deal_id, payout_date, amount, payout_type, note")
    .eq("deal_id", dealId)
    .order("payout_date", { ascending: false });
  if (error) throw new Error(`investor_payouts: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    deal_id: row.deal_id as string,
    payout_date: row.payout_date as string,
    amount: Number(row.amount),
    payout_type: row.payout_type as PayoutType,
    note: row.note as string | null,
  }));
}

export async function insertInvestorPayout(input: {
  deal_id: string;
  payout_date: string;
  amount: number;
  payout_type: PayoutType;
  note?: string | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("investor_payouts")
    .insert({
      deal_id: input.deal_id,
      payout_date: input.payout_date,
      amount: input.amount,
      payout_type: input.payout_type,
      note: input.note ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert payout: ${error.message}`);
  return data.id as string;
}

export async function deleteInvestorPayout(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("investor_payouts").delete().eq("id", id);
  if (error) throw new Error(`delete payout: ${error.message}`);
}

/**
 * Compute scope P&L for one deal: net profit attributed to the deal.
 *
 * Rules:
 *  - Scope = orders created since `started_at` (and closed_at if set)
 *  - Mapped product → only that product's revenue/COGS counts; ad spend = mapped campaigns spend
 *  - No mapped product → all sales count (general deal)
 *  - Operational costs (delivery, return, packing, Converty) are scoped to delivered orders in scope
 *  - Overhead is NOT allocated to investor scope (overhead is monthly business-wide; deal scope is product-specific)
 */
async function computeDealScopePnl(deal: InvestorDeal): Promise<{
  deliveredCount: number;
  deliveredRevenue: number;
  cogs: number;
  grossProfit: number;
  adSpend: number;
  opsCosts: number;
  netProfit: number;
}> {
  const supabase = createAdminClient();

  // Date bounds
  const fromIso = deal.started_at; // "YYYY-MM-DD"
  const toExclusive = deal.closed_at
    ? (() => {
        const d = new Date(deal.closed_at + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  // Fetch orders in range
  const orders: OrderRow[] = [];
  let page = 0;
  while (true) {
    let query = supabase
      .from("orders")
      .select("id, status, is_test, total_price, converty_created_at, converty_updated_at")
      .gte("converty_created_at", fromIso)
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (toExclusive) query = query.lt("converty_created_at", toExclusive);
    const { data, error } = await query;
    if (error) throw new Error(`orders (deal scope): ${error.message}`);
    const batch = (data ?? []) as OrderRow[];
    orders.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  const real = orders.filter((o) => !o.is_test && ns(o.status) !== "deleted");
  const delivered = real.filter((o) => ns(o.status) === "delivered");
  const returned = real.filter((o) => RETURN_NUMERATOR_STATUSES.has(ns(o.status)));
  const deliveredOrderIds = new Set(delivered.map((o) => o.id));

  // Fetch order items for these orders
  const orderItems: OrderItemRow[] = [];
  if (delivered.length > 0) {
    const ids = delivered.map((o) => o.id);
    const CHUNK = 200;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, product_id, quantity, price_per_unit")
        .in("order_id", chunk);
      if (error) throw new Error(`order_items (deal): ${error.message}`);
      orderItems.push(...((data ?? []) as OrderItemRow[]));
    }
  }

  // Filter to product if mapped
  const items = deal.product_id
    ? orderItems.filter((i) => i.product_id === deal.product_id)
    : orderItems;

  // Delivered revenue (for this scope: product-only or all)
  let deliveredRevenue = 0;
  let deliveredUnits = 0;
  let deliveredCount = 0;
  if (deal.product_id) {
    const orderIdsWithProduct = new Set(items.map((i) => i.order_id));
    deliveredCount = orderIdsWithProduct.size;
    for (const item of items) {
      if (!deliveredOrderIds.has(item.order_id)) continue;
      const qty = Number(item.quantity ?? 0);
      const unit = Number(item.price_per_unit ?? 0);
      deliveredRevenue += qty * unit;
      deliveredUnits += qty;
    }
  } else {
    deliveredCount = delivered.length;
    deliveredRevenue = delivered.reduce(
      (sum, o) => sum + Number(o.total_price ?? 0),
      0
    );
    for (const item of items) {
      if (!deliveredOrderIds.has(item.order_id)) continue;
      deliveredUnits += Number(item.quantity ?? 0);
    }
  }

  // COGS for this product (or all)
  let unitCogs = 0;
  if (deal.product_id) {
    const { data: pcData } = await supabase
      .from("product_costs")
      .select("unit_cogs")
      .eq("product_id", deal.product_id)
      .maybeSingle();
    unitCogs = Number(pcData?.unit_cogs ?? 0);
  }

  let cogs = 0;
  if (deal.product_id) {
    cogs = deliveredUnits * unitCogs;
  } else {
    // General deal: sum cogs across all delivered items
    const { data: allCosts } = await supabase
      .from("product_costs")
      .select("product_id, unit_cogs");
    const cogsMap = new Map<string, number>();
    for (const c of allCosts ?? []) {
      cogsMap.set(c.product_id as string, Number(c.unit_cogs ?? 0));
    }
    for (const item of items) {
      if (!deliveredOrderIds.has(item.order_id)) continue;
      if (!item.product_id) continue;
      const u = cogsMap.get(item.product_id) ?? 0;
      cogs += Number(item.quantity ?? 0) * u;
    }
  }

  const grossProfit = deliveredRevenue - cogs;

  // Operational costs from settings
  const settings = await getBusinessSettings();
  const fees = {
    carrierDeliveryFee: Number(settings?.cosmos_delivery_fee ?? 0),
    carrierReturnFee: Number(settings?.cosmos_return_fee ?? 0),
    packingCostPerPackage: Number(settings?.packing_cost_per_package ?? 0),
    convertyFeeRate: Number(settings?.converty_fee_rate ?? 0.003),
  };

  // For Converty fee, scope is total non-test order revenue in range (whole bucket, not per-product)
  // For product-mapped deals, this overcounts; but Converty fee is small so we use product revenue as a fair scope.
  const convertyFeeScopeRevenue = deal.product_id
    ? deliveredRevenue
    : real.reduce((sum, o) => sum + Number(o.total_price ?? 0), 0);

  const cm = computeContributionMargin(
    {
      grossProfit,
      deliveredCount,
      returnedCount: returned.length,
      nonTestOrdersTotalPrice: convertyFeeScopeRevenue,
      fees,
    },
    deliveredRevenue
  );

  // Ad spend: sum of campaign spend for the mapped product since deal start
  let adSpend = 0;
  if (deal.product_id) {
    // Sum spend by product across all months from started_at onward.
    const { data: spendData } = await supabase
      .from("campaign_spend")
      .select("amount, spend_date, campaigns!inner(product_id)")
      .gte("spend_date", fromIso)
      .lt("spend_date", toExclusive ?? "9999-12-31");
    for (const row of spendData ?? []) {
      const rel = (row as unknown as { campaigns: { product_id: string | null } }).campaigns;
      if (rel?.product_id === deal.product_id) {
        adSpend += Number(row.amount ?? 0);
      }
    }
  } else {
    // General deal: sum all spend in range
    let curMonth = new Date(fromIso + "T00:00:00Z");
    const today = new Date();
    const endMonth = toExclusive
      ? new Date(toExclusive + "T00:00:00Z")
      : new Date(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);
    while (curMonth < endMonth) {
      const periodIso = `${curMonth.getUTCFullYear()}-${String(curMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;
      const summary = await getSpendSummary(periodIso);
      adSpend += summary.totalSpend;
      curMonth = new Date(Date.UTC(curMonth.getUTCFullYear(), curMonth.getUTCMonth() + 1, 1));
    }
  }

  const opsCosts = cm.totalVariableCosts;
  const netProfit = grossProfit - opsCosts - adSpend;

  return {
    deliveredCount,
    deliveredRevenue,
    cogs,
    grossProfit,
    adSpend,
    opsCosts,
    netProfit,
  };
}

export async function getDealWaterfall(deal: InvestorDeal): Promise<DealWaterfall> {
  const [scope, payouts] = await Promise.all([
    computeDealScopePnl(deal),
    getInvestorPayouts(deal.id),
  ]);

  const capitalReturnedTotal = payouts
    .filter((p) => p.payout_type === "capital_return")
    .reduce((s, p) => s + p.amount, 0);
  const profitSharePaidTotal = payouts
    .filter((p) => p.payout_type === "profit_share")
    .reduce((s, p) => s + p.amount, 0);

  const waterfall = computeInvestorWaterfall({
    capitalDeployed: deal.capital_deployed,
    profitSharePct: deal.profit_share_pct,
    lossSharePct: deal.loss_share_pct,
    scopeNetProfit: scope.netProfit,
    capitalReturnedTotal,
    profitShareTotal: profitSharePaidTotal,
  });

  return {
    ...deal,
    scopeDeliveredCount: scope.deliveredCount,
    scopeDeliveredRevenue: scope.deliveredRevenue,
    scopeCogs: scope.cogs,
    scopeGrossProfit: scope.grossProfit,
    scopeAdSpend: scope.adSpend,
    scopeOpsCosts: scope.opsCosts,
    scopeNetProfit: scope.netProfit,
    capitalReturnedTotal,
    profitSharePaidTotal,
    waterfall,
  };
}

export interface InvestorSummary {
  activeDealsCount: number;
  totalCapitalDeployed: number;
  totalCapitalOutstanding: number;
  totalProfitShareOwing: number;
  totalOwedNow: number;
  deals: DealWaterfall[];
}

export async function getInvestorSummary(): Promise<InvestorSummary> {
  const deals = await getInvestorDeals();
  const waterfalls: DealWaterfall[] = [];
  for (const d of deals) {
    waterfalls.push(await getDealWaterfall(d));
  }

  const active = waterfalls.filter((d) => d.status === "active");
  const totalCapitalDeployed = active.reduce((s, d) => s + d.capital_deployed, 0);
  const totalCapitalOutstanding = active.reduce(
    (s, d) => s + d.waterfall.capitalOutstanding,
    0
  );
  const totalProfitShareOwing = active.reduce(
    (s, d) => s + d.waterfall.profitShareOwing,
    0
  );
  const totalOwedNow = totalCapitalOutstanding + totalProfitShareOwing;

  return {
    activeDealsCount: active.length,
    totalCapitalDeployed,
    totalCapitalOutstanding,
    totalProfitShareOwing,
    totalOwedNow,
    deals: waterfalls,
  };
}
