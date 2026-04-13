import { createAdminClient } from "@/lib/supabase/admin";

export interface BusinessSettings {
  id: string;
  cosmos_delivery_fee: number;
  cosmos_return_fee: number;
  packing_cost_per_package: number;
  converty_fee_rate: number;
  updated_at: string | null;
}

export interface ProductCostRow {
  product_id: string;
  unit_cogs: number;
  product_name: string;
  product_price: number;
  product_image_url: string | null;
}

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_settings")
    .select("id, cosmos_delivery_fee, cosmos_return_fee, packing_cost_per_package, converty_fee_rate, updated_at")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`business_settings: ${error.message}`);
  return data as BusinessSettings | null;
}

export async function updateBusinessSettings(values: {
  cosmos_delivery_fee: number;
  cosmos_return_fee: number;
  packing_cost_per_package: number;
  converty_fee_rate: number;
}): Promise<void> {
  const supabase = createAdminClient();

  const current = await getBusinessSettings();
  if (!current) throw new Error("No business_settings row found. Run migration first.");

  const { error } = await supabase
    .from("business_settings")
    .update({
      cosmos_delivery_fee: values.cosmos_delivery_fee,
      cosmos_return_fee: values.cosmos_return_fee,
      packing_cost_per_package: values.packing_cost_per_package,
      converty_fee_rate: values.converty_fee_rate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  if (error) throw new Error(`update business_settings: ${error.message}`);
}

export async function getProductCosts(): Promise<ProductCostRow[]> {
  const supabase = createAdminClient();

  // Get all active products
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, price, image_url")
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  if (prodErr) throw new Error(`products: ${prodErr.message}`);

  // Get existing cost entries
  const { data: costs, error: costErr } = await supabase
    .from("product_costs")
    .select("product_id, unit_cogs");

  if (costErr) throw new Error(`product_costs: ${costErr.message}`);

  const costMap = new Map<string, number>();
  for (const c of costs ?? []) {
    costMap.set(c.product_id, Number(c.unit_cogs));
  }

  return (products ?? []).map((p) => ({
    product_id: p.id,
    unit_cogs: costMap.get(p.id) ?? 0,
    product_name: p.name,
    product_price: Number(p.price),
    product_image_url: p.image_url,
  }));
}

export async function upsertProductCosts(
  entries: { product_id: string; unit_cogs: number }[]
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = createAdminClient();

  const now = new Date().toISOString();
  const rows = entries.map((e) => ({
    product_id: e.product_id,
    unit_cogs: e.unit_cogs,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("product_costs")
    .upsert(rows, { onConflict: "product_id" });

  if (error) throw new Error(`upsert product_costs: ${error.message}`);
}

export const OVERHEAD_CATEGORIES = [
  "salaries",
  "rent",
  "phone_internet",
  "subscriptions",
  "tax",
  "daily_pickup",
  "other",
] as const;

export type OverheadCategory = (typeof OVERHEAD_CATEGORIES)[number];

export interface OverheadEntry {
  category: OverheadCategory;
  amount: number;
  note: string | null;
}

export interface OverheadPeriod {
  period: string; // "YYYY-MM-01"
  entries: OverheadEntry[];
  total: number;
}

/**
 * Convert a "YYYY-MM" or "YYYY-MM-DD" input to "YYYY-MM-01".
 */
export function normalizePeriod(input: string): string {
  // Accept "YYYY-MM" or "YYYY-MM-DD"
  if (/^\d{4}-\d{2}$/.test(input)) return `${input}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input.slice(0, 7) + "-01";
  throw new Error(`Invalid period format: ${input}`);
}

export async function getOverheadForPeriod(period: string): Promise<OverheadPeriod> {
  const supabase = createAdminClient();
  const normalized = normalizePeriod(period);

  const { data, error } = await supabase
    .from("overhead_entries")
    .select("category, amount, note")
    .eq("period", normalized);

  if (error) throw new Error(`overhead_entries: ${error.message}`);

  const byCategory = new Map<string, { amount: number; note: string | null }>();
  for (const row of data ?? []) {
    byCategory.set(row.category, {
      amount: Number(row.amount),
      note: row.note as string | null,
    });
  }

  const entries: OverheadEntry[] = OVERHEAD_CATEGORIES.map((cat) => {
    const existing = byCategory.get(cat);
    return {
      category: cat,
      amount: existing?.amount ?? 0,
      note: existing?.note ?? null,
    };
  });

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return { period: normalized, entries, total };
}

export async function upsertOverheadEntries(
  period: string,
  entries: { category: OverheadCategory; amount: number; note?: string | null }[]
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = createAdminClient();
  const normalized = normalizePeriod(period);

  const now = new Date().toISOString();
  const rows = entries.map((e) => ({
    period: normalized,
    category: e.category,
    amount: e.amount,
    note: e.note ?? null,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("overhead_entries")
    .upsert(rows, { onConflict: "period,category" });

  if (error) throw new Error(`upsert overhead_entries: ${error.message}`);
}

/**
 * Sum overhead for one period — used by the finance layer to compute net profit.
 */
export async function getOverheadTotalForPeriod(period: string): Promise<number> {
  const result = await getOverheadForPeriod(period);
  return result.total;
}
