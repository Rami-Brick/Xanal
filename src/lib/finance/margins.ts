// Financial calculation layer for Phase 2C.
// Resolves COGS per product, computes gross profit on delivered orders.
// Products missing COGS are excluded from margin metrics (not counted as zero).

export interface ProductCogsEntry {
  product_id: string;
  unit_cogs: number;
}

export interface OrderItemForMargin {
  order_id: string;
  product_id: string | null;
  quantity: number | null;
  price_per_unit: number | string | null;
}

export interface GrossProfitInput {
  deliveredOrderIds: Set<string>;
  deliveredRevenue: number;
  orderItems: OrderItemForMargin[];
  productCosts: ProductCogsEntry[];
}

export interface GrossProfitResult {
  grossProfit: number;
  gpmPct: number;
  configuredRevenue: number;
  unconfiguredRevenue: number;
  deliveredRevenueWithCogs: number;
  productsWithCogs: Set<string>;
}

/**
 * Build a lookup of product_id -> unit_cogs (only for products with COGS > 0).
 */
export function buildCogsMap(entries: ProductCogsEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    const cogs = Number(e.unit_cogs);
    if (cogs > 0) map.set(e.product_id, cogs);
  }
  return map;
}

/**
 * Compute gross profit and GPM on delivered orders.
 *
 * Rules:
 * - Only counts items belonging to delivered orders
 * - Only counts items whose product has a configured COGS (> 0)
 * - GP per item = quantity * (price_per_unit - unit_cogs)
 * - GPM% = gross_profit / revenue_on_configured_products * 100
 *
 * We compute GPM against the configured revenue (not total delivered revenue)
 * so the percentage reflects actual product margin, not a mix of configured
 * and unconfigured products that would underestimate it.
 */
export function computeGrossProfit(input: GrossProfitInput): GrossProfitResult {
  const cogsMap = buildCogsMap(input.productCosts);
  const productsWithCogs = new Set(cogsMap.keys());

  let grossProfit = 0;
  let configuredRevenue = 0;
  let unconfiguredRevenue = 0;

  for (const item of input.orderItems) {
    if (!input.deliveredOrderIds.has(item.order_id)) continue;

    const qty = Number(item.quantity ?? 0);
    const unitPrice = Number(item.price_per_unit ?? 0);
    const itemRevenue = qty * unitPrice;

    if (item.product_id && cogsMap.has(item.product_id)) {
      const unitCogs = cogsMap.get(item.product_id) ?? 0;
      grossProfit += qty * (unitPrice - unitCogs);
      configuredRevenue += itemRevenue;
    } else {
      unconfiguredRevenue += itemRevenue;
    }
  }

  const gpmPct =
    configuredRevenue > 0 ? (grossProfit / configuredRevenue) * 100 : 0;

  return {
    grossProfit,
    gpmPct,
    configuredRevenue,
    unconfiguredRevenue,
    deliveredRevenueWithCogs: configuredRevenue,
    productsWithCogs,
  };
}

export interface FeeConfig {
  cosmosDeliveryFee: number;
  cosmosReturnFee: number;
  packingCostPerPackage: number;
  convertyFeeRate: number;
}

export interface CostBreakdown {
  deliveryFees: number;
  returnBurden: number;
  packingCosts: number;
  convertyFees: number;
  totalVariableCosts: number;
}

export interface ContributionMarginInput {
  grossProfit: number;
  deliveredCount: number;
  returnedCount: number;
  nonTestOrdersTotalPrice: number;
  fees: FeeConfig;
}

export interface ContributionMarginResult extends CostBreakdown {
  contributionMargin: number;
  cmPct: number;
  configuredRevenue: number;
}

/**
 * Compute contribution margin from gross profit and operational costs.
 *
 * Rules per CEO spec:
 * - Delivery fees accrue on delivered orders (cosmos pickup triggers at deposit,
 *   but we charge against delivered since returns have their own line)
 * - Return burden = wasted delivery fee + return fee on returned orders
 * - Packing cost applies to delivered + returned (both left the warehouse)
 * - Converty fee (0.3% default) applies to all non-test orders' total_price
 *
 * CM% is computed against configuredRevenue (delivered revenue with COGS set)
 * to stay consistent with GPM%.
 */
export function computeContributionMargin(
  input: ContributionMarginInput,
  configuredRevenue: number
): ContributionMarginResult {
  const { fees } = input;

  const deliveryFees = input.deliveredCount * fees.cosmosDeliveryFee;
  const returnBurden =
    input.returnedCount * (fees.cosmosDeliveryFee + fees.cosmosReturnFee);
  const packingCosts =
    (input.deliveredCount + input.returnedCount) * fees.packingCostPerPackage;
  const convertyFees = input.nonTestOrdersTotalPrice * fees.convertyFeeRate;

  const totalVariableCosts =
    deliveryFees + returnBurden + packingCosts + convertyFees;

  const contributionMargin = input.grossProfit - totalVariableCosts;
  const cmPct =
    configuredRevenue > 0 ? (contributionMargin / configuredRevenue) * 100 : 0;

  return {
    deliveryFees,
    returnBurden,
    packingCosts,
    convertyFees,
    totalVariableCosts,
    contributionMargin,
    cmPct,
    configuredRevenue,
  };
}

/**
 * Compute ROAS per product and blended ROAS per CEO spec.
 *
 * Per-product formula:
 *   roas = SUM(delivered_revenue WHERE product_id=X) / SUM(spend WHERE product_id=X)
 *
 * Blended formula (for overall business ROAS):
 *   roas = total_delivered_revenue / total_spend
 *
 * Products with no spend mapped get roas = null (cannot compute).
 * Spend with no product mapped contributes only to blended ROAS.
 */
export interface RoasInput {
  deliveredRevenueByProduct: Map<string, number>;
  spendByProduct: Map<string, number>;
  totalDeliveredRevenue: number;
  totalSpend: number;
}

export interface ProductRoas {
  productId: string;
  revenue: number;
  spend: number;
  roas: number; // revenue / spend
}

export interface RoasResult {
  blendedRoas: number | null; // null if totalSpend === 0
  totalSpend: number;
  perProduct: Map<string, ProductRoas>;
}

export function computeRoas(input: RoasInput): RoasResult {
  const perProduct = new Map<string, ProductRoas>();

  // Union of keys from revenue and spend
  const keys = new Set<string>();
  for (const k of input.deliveredRevenueByProduct.keys()) keys.add(k);
  for (const k of input.spendByProduct.keys()) keys.add(k);

  for (const productId of keys) {
    const revenue = input.deliveredRevenueByProduct.get(productId) ?? 0;
    const spend = input.spendByProduct.get(productId) ?? 0;
    if (spend <= 0) continue; // skip products with no spend (ROAS undefined)
    perProduct.set(productId, {
      productId,
      revenue,
      spend,
      roas: revenue / spend,
    });
  }

  const blendedRoas =
    input.totalSpend > 0 ? input.totalDeliveredRevenue / input.totalSpend : null;

  return { blendedRoas, totalSpend: input.totalSpend, perProduct };
}

/**
 * CAC = total_spend / first_time_delivered_customers
 *
 * The caller is responsible for deduping customers by stable identity (phone)
 * and filtering to those whose first-ever delivered order falls in this period.
 */
export interface CacInput {
  totalSpend: number;
  newCustomerCount: number;
}

export interface CacResult {
  cac: number | null; // null if no customers
  totalSpend: number;
  newCustomerCount: number;
}

export function computeCac(input: CacInput): CacResult {
  const cac = input.newCustomerCount > 0 ? input.totalSpend / input.newCustomerCount : null;
  return { cac, totalSpend: input.totalSpend, newCustomerCount: input.newCustomerCount };
}

/**
 * Compute CPO (Cost Per Delivered Order) per CEO spec.
 *
 * Formula:
 *   total_var_cost = COGS + delivery_fee + return_fee + packing + converty_fee
 *                    on ALL orders that reached deposit status
 *   cpo = total_var_cost / delivered_count
 *
 * The denominator is delivered only — returns inflate CPO honestly.
 *
 * We pass the already-computed cost breakdown (deliveryFees, returnBurden,
 * packingCosts, convertyFees) plus the COGS for deposited-or-later orders.
 */
export interface CpoInput {
  deliveredCount: number;
  deliveredCogs: number;     // COGS for delivered orders (subset of deposit+)
  deliveryFees: number;       // already computed in CM step
  returnBurden: number;       // already computed in CM step
  packingCosts: number;       // already computed in CM step
  convertyFees: number;       // already computed in CM step
}

export interface CpoResult {
  cpo: number;
  totalVariableCost: number;
  deliveredCount: number;
}

export function computeCpo(input: CpoInput): CpoResult {
  const totalVariableCost =
    input.deliveredCogs +
    input.deliveryFees +
    input.returnBurden +
    input.packingCosts +
    input.convertyFees;

  const cpo = input.deliveredCount > 0 ? totalVariableCost / input.deliveredCount : 0;

  return {
    cpo,
    totalVariableCost,
    deliveredCount: input.deliveredCount,
  };
}

/**
 * Compute per-product delivered gross profit, revenue, and margin.
 * Only includes products with configured COGS.
 */
export interface ProductMarginRow {
  productId: string;
  unitCogs: number;
  deliveredUnits: number;
  deliveredRevenue: number;
  deliveredCogs: number;
  grossProfit: number;
  gpmPct: number;
}

/**
 * Per-product P&L row. Includes allocated operational costs so each product
 * has a real contribution margin that can drive kill/keep decisions.
 */
export interface ProductPnlRow extends ProductMarginRow {
  name: string;
  imageUrl: string | null;
  allocatedOpsCost: number;    // delivery + return + packing + converty (allocated)
  contributionMargin: number;  // grossProfit - allocatedOpsCost
  cmPct: number;
  revenueShare: number;
}

export function computeProductPnl(input: {
  deliveredOrderIds: Set<string>;
  orderItems: OrderItemForMargin[];
  productCosts: ProductCogsEntry[];
  productMeta: Map<string, { name: string; imageUrl: string | null }>;
  totalDeliveredRevenue: number;
  totalDeliveredUnits: number;
  totalOpsCost: number; // sum of cosmos delivery + return burden + packing + converty fees
}): ProductPnlRow[] {
  const margins = computeProductMargins(input);
  const rows: ProductPnlRow[] = [];

  for (const [productId, margin] of margins.entries()) {
    const meta = input.productMeta.get(productId);
    const allocationBase =
      input.totalDeliveredUnits > 0 ? margin.deliveredUnits / input.totalDeliveredUnits : 0;
    const allocatedOpsCost = input.totalOpsCost * allocationBase;
    const contributionMargin = margin.grossProfit - allocatedOpsCost;
    const cmPct =
      margin.deliveredRevenue > 0
        ? (contributionMargin / margin.deliveredRevenue) * 100
        : 0;
    const revenueShare =
      input.totalDeliveredRevenue > 0
        ? (margin.deliveredRevenue / input.totalDeliveredRevenue) * 100
        : 0;

    rows.push({
      ...margin,
      name: meta?.name ?? productId,
      imageUrl: meta?.imageUrl ?? null,
      allocatedOpsCost,
      contributionMargin,
      cmPct,
      revenueShare,
    });
  }

  return rows;
}

export function computeProductMargins(input: {
  deliveredOrderIds: Set<string>;
  orderItems: OrderItemForMargin[];
  productCosts: ProductCogsEntry[];
}): Map<string, ProductMarginRow> {
  const cogsMap = buildCogsMap(input.productCosts);
  const rows = new Map<string, ProductMarginRow>();

  for (const item of input.orderItems) {
    if (!input.deliveredOrderIds.has(item.order_id)) continue;
    if (!item.product_id || !cogsMap.has(item.product_id)) continue;

    const unitCogs = cogsMap.get(item.product_id) ?? 0;
    const qty = Number(item.quantity ?? 0);
    const unitPrice = Number(item.price_per_unit ?? 0);
    const revenue = qty * unitPrice;
    const itemCogs = qty * unitCogs;
    const gp = revenue - itemCogs;

    const existing = rows.get(item.product_id);
    if (existing) {
      existing.deliveredUnits += qty;
      existing.deliveredRevenue += revenue;
      existing.deliveredCogs += itemCogs;
      existing.grossProfit += gp;
      existing.gpmPct =
        existing.deliveredRevenue > 0
          ? (existing.grossProfit / existing.deliveredRevenue) * 100
          : 0;
    } else {
      rows.set(item.product_id, {
        productId: item.product_id,
        unitCogs,
        deliveredUnits: qty,
        deliveredRevenue: revenue,
        deliveredCogs: itemCogs,
        grossProfit: gp,
        gpmPct: revenue > 0 ? (gp / revenue) * 100 : 0,
      });
    }
  }

  return rows;
}
