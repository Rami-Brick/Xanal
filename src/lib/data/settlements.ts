import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessSettings } from "@/lib/data/settings";

export interface SettlementRow {
  id: string;
  period_from: string; // "YYYY-MM-DD"
  period_to: string;
  settlement_date: string;
  actual_amount: number;
  note: string | null;
  updated_at: string | null;
}

export interface SettlementWithReconciliation extends SettlementRow {
  deliveredCount: number;
  returnedCount: number;
  grossRevenue: number;
  deliveryFees: number;
  returnBurden: number;
  expectedAmount: number;
  gap: number;
  gapPct: number | null;
}

interface OrderInRange {
  total_price: number | string | null;
  status: string | null;
  is_test: boolean | null;
}

const RETURN_NUMERATOR_STATUSES = new Set(["returned", "to be returned"]);

function ns(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/_/g, " ");
}

export async function getSettlements(): Promise<SettlementRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cosmos_settlements")
    .select("id, period_from, period_to, settlement_date, actual_amount, note, updated_at")
    .order("settlement_date", { ascending: false });

  if (error) throw new Error(`cosmos_settlements: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    period_from: row.period_from as string,
    period_to: row.period_to as string,
    settlement_date: row.settlement_date as string,
    actual_amount: Number(row.actual_amount),
    note: row.note as string | null,
    updated_at: row.updated_at as string | null,
  }));
}

export async function upsertSettlement(input: {
  id?: string;
  period_from: string;
  period_to: string;
  settlement_date: string;
  actual_amount: number;
  note?: string | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (input.id) {
    const { error } = await supabase
      .from("cosmos_settlements")
      .update({
        period_from: input.period_from,
        period_to: input.period_to,
        settlement_date: input.settlement_date,
        actual_amount: input.actual_amount,
        note: input.note ?? null,
        updated_at: now,
      })
      .eq("id", input.id);
    if (error) throw new Error(`update settlement: ${error.message}`);
    return input.id;
  }

  const { data, error } = await supabase
    .from("cosmos_settlements")
    .insert({
      period_from: input.period_from,
      period_to: input.period_to,
      settlement_date: input.settlement_date,
      actual_amount: input.actual_amount,
      note: input.note ?? null,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) throw new Error(`insert settlement: ${error.message}`);
  return data.id as string;
}

export async function deleteSettlement(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("cosmos_settlements").delete().eq("id", id);
  if (error) throw new Error(`delete settlement: ${error.message}`);
}

/**
 * Compute expected settlement amount for a given date range.
 *
 * Per CEO spec:
 *   expected = SUM(totalPrice - delivery_fee) for delivered orders in range
 *            - SUM(delivery_fee + return_fee) for returned orders in range
 *
 * We use `converty_updated_at` as the event date (when the order reached its
 * current terminal state, closest to when the carrier closed the book on it).
 */
export async function computeExpectedForRange(
  periodFrom: string,
  periodTo: string
): Promise<{
  deliveredCount: number;
  returnedCount: number;
  grossRevenue: number;
  deliveryFees: number;
  returnBurden: number;
  expectedAmount: number;
}> {
  const supabase = createAdminClient();

  // period_to is inclusive in user input; for half-open range use next day
  const toNext = new Date(periodTo + "T00:00:00Z");
  toNext.setUTCDate(toNext.getUTCDate() + 1);
  const toExclusive = toNext.toISOString().slice(0, 10);

  // Fetch orders whose terminal event (updated_at) fell in range
  const PAGE_SIZE = 1000;
  const rows: OrderInRange[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("total_price, status, is_test")
      .gte("converty_updated_at", periodFrom)
      .lt("converty_updated_at", toExclusive)
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`orders (settlement range): ${error.message}`);
    const batch = (data ?? []) as OrderInRange[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  const real = rows.filter((o) => !o.is_test);
  const delivered = real.filter((o) => ns(o.status) === "delivered");
  const returned = real.filter((o) => RETURN_NUMERATOR_STATUSES.has(ns(o.status)));

  const settings = await getBusinessSettings();
  const deliveryFee = Number(settings?.cosmos_delivery_fee ?? 0);
  const returnFee = Number(settings?.cosmos_return_fee ?? 0);

  const grossRevenue = delivered.reduce(
    (sum, o) => sum + Number(o.total_price ?? 0),
    0
  );
  const deliveryFees = delivered.length * deliveryFee;
  const returnBurden = returned.length * (deliveryFee + returnFee);
  const expectedAmount = grossRevenue - deliveryFees - returnBurden;

  return {
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    grossRevenue,
    deliveryFees,
    returnBurden,
    expectedAmount,
  };
}

/**
 * Return all settlements enriched with reconciliation metrics.
 */
export async function getSettlementsWithReconciliation(): Promise<SettlementWithReconciliation[]> {
  const settlements = await getSettlements();
  const enriched: SettlementWithReconciliation[] = [];

  for (const s of settlements) {
    const calc = await computeExpectedForRange(s.period_from, s.period_to);
    const gap = calc.expectedAmount - s.actual_amount;
    const gapPct =
      calc.expectedAmount > 0 ? (gap / calc.expectedAmount) * 100 : null;
    enriched.push({
      ...s,
      ...calc,
      gap,
      gapPct,
    });
  }

  return enriched;
}

/**
 * Cash position summary.
 *
 * - totalSettled: sum of all actual_amount received
 * - cashInTransit: expected for orders AFTER the last settlement's period_to up to today
 * - lastSettlementDate: date of the most recent settlement
 * - lastGap: gap from the most recent settlement
 */
export interface CashPosition {
  totalSettled: number;
  cashInTransit: number;
  lastSettlementDate: string | null;
  lastSettlementCoveredUntil: string | null;
  lastGap: number | null;
  lastGapPct: number | null;
  settlementsCount: number;
}

export async function getCashPosition(): Promise<CashPosition> {
  const settlements = await getSettlements();
  const totalSettled = settlements.reduce((sum, s) => sum + s.actual_amount, 0);

  let cashInTransit = 0;
  let lastSettlementDate: string | null = null;
  let lastSettlementCoveredUntil: string | null = null;
  let lastGap: number | null = null;
  let lastGapPct: number | null = null;

  if (settlements.length > 0) {
    // Settlements are sorted by settlement_date DESC
    const last = settlements[0];
    lastSettlementDate = last.settlement_date;
    lastSettlementCoveredUntil = last.period_to;

    // Last gap
    const lastCalc = await computeExpectedForRange(last.period_from, last.period_to);
    lastGap = lastCalc.expectedAmount - last.actual_amount;
    lastGapPct =
      lastCalc.expectedAmount > 0 ? (lastGap / lastCalc.expectedAmount) * 100 : null;

    // Cash in transit: orders terminated AFTER last period_to up to today
    const dayAfter = new Date(last.period_to + "T00:00:00Z");
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    const from = dayAfter.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (from <= today) {
      const inTransit = await computeExpectedForRange(from, today);
      cashInTransit = inTransit.expectedAmount;
    }
  }

  return {
    totalSettled,
    cashInTransit,
    lastSettlementDate,
    lastSettlementCoveredUntil,
    lastGap,
    lastGapPct,
    settlementsCount: settlements.length,
  };
}
