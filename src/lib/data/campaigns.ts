import { createAdminClient } from "@/lib/supabase/admin";

export type CampaignPlatform = "meta" | "tiktok" | "google" | "other";

export interface Campaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  product_id: string | null;
  active: boolean;
  updated_at: string | null;
}

export interface CampaignWithProduct extends Campaign {
  product_name: string | null;
}

export interface DailySpend {
  spend_date: string; // "YYYY-MM-DD"
  amount: number;
}

export interface CampaignSpendForPeriod {
  campaign_id: string;
  name: string;
  platform: CampaignPlatform;
  product_id: string | null;
  totalSpend: number;
  dailySpend: DailySpend[];
}

/**
 * Return month bounds for a "YYYY-MM-01" (or "YYYY-MM") period.
 * from is inclusive, to is exclusive.
 */
function monthRange(period: string): { from: string; to: string } {
  const normalized = /^\d{4}-\d{2}$/.test(period) ? `${period}-01` : period;
  const [y, m] = normalized.split("-").map((x) => parseInt(x, 10));
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const toDate = new Date(Date.UTC(y, m, 1));
  const to = `${toDate.getUTCFullYear()}-${String(toDate.getUTCMonth() + 1).padStart(2, "0")}-${String(toDate.getUTCDate()).padStart(2, "0")}`;
  return { from, to };
}

export async function getCampaigns(): Promise<CampaignWithProduct[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, platform, product_id, active, updated_at, products(name)")
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new Error(`campaigns: ${error.message}`);

  return (data ?? []).map((row) => {
    // Supabase returns the joined relation as products: { name } | null
    const productRelation = (row as unknown as { products: { name: string } | null }).products;
    return {
      id: row.id as string,
      name: row.name as string,
      platform: row.platform as CampaignPlatform,
      product_id: row.product_id as string | null,
      active: row.active as boolean,
      updated_at: row.updated_at as string | null,
      product_name: productRelation?.name ?? null,
    };
  });
}

export async function upsertCampaign(input: {
  id?: string;
  name: string;
  platform: CampaignPlatform;
  product_id: string | null;
  active: boolean;
}): Promise<string> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (input.id) {
    const { error } = await supabase
      .from("campaigns")
      .update({
        name: input.name,
        platform: input.platform,
        product_id: input.product_id,
        active: input.active,
        updated_at: now,
      })
      .eq("id", input.id);
    if (error) throw new Error(`update campaign: ${error.message}`);
    return input.id;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: input.name,
      platform: input.platform,
      product_id: input.product_id,
      active: input.active,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) throw new Error(`insert campaign: ${error.message}`);
  return data.id as string;
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(`delete campaign: ${error.message}`);
}

/**
 * Get all daily spend for a given month, grouped by campaign.
 * Returns one row per campaign, even campaigns with no spend in the period
 * (with totalSpend = 0 and dailySpend = []). This keeps the settings grid stable.
 */
export async function getSpendForPeriod(
  period: string
): Promise<CampaignSpendForPeriod[]> {
  const { from, to } = monthRange(period);
  const supabase = createAdminClient();

  const [campaignsResult, spendResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, platform, product_id, active")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("campaign_spend")
      .select("campaign_id, spend_date, amount")
      .gte("spend_date", from)
      .lt("spend_date", to),
  ]);

  if (campaignsResult.error) throw new Error(`campaigns: ${campaignsResult.error.message}`);
  if (spendResult.error) throw new Error(`campaign_spend: ${spendResult.error.message}`);

  const spendByCampaign = new Map<string, DailySpend[]>();
  for (const row of spendResult.data ?? []) {
    const list = spendByCampaign.get(row.campaign_id as string) ?? [];
    list.push({
      spend_date: row.spend_date as string,
      amount: Number(row.amount ?? 0),
    });
    spendByCampaign.set(row.campaign_id as string, list);
  }

  return (campaignsResult.data ?? []).map((c) => {
    const rows = spendByCampaign.get(c.id as string) ?? [];
    const totalSpend = rows.reduce((sum, r) => sum + r.amount, 0);
    return {
      campaign_id: c.id as string,
      name: c.name as string,
      platform: c.platform as CampaignPlatform,
      product_id: c.product_id as string | null,
      totalSpend,
      dailySpend: rows.sort((a, b) => a.spend_date.localeCompare(b.spend_date)),
    };
  });
}

/**
 * Upsert a single (campaign, date, amount) row. Amount 0 is stored (not deleted).
 */
export async function upsertCampaignSpend(
  entries: { campaign_id: string; spend_date: string; amount: number }[]
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const rows = entries.map((e) => ({
    campaign_id: e.campaign_id,
    spend_date: e.spend_date,
    amount: e.amount,
    updated_at: now,
  }));
  const { error } = await supabase
    .from("campaign_spend")
    .upsert(rows, { onConflict: "campaign_id,spend_date" });
  if (error) throw new Error(`upsert campaign_spend: ${error.message}`);
}

/**
 * Sum total spend for a period + spend per product (product_id -> amount).
 * Used by the finance engine for monthly ROAS/CAC.
 */
export interface SpendSummary {
  totalSpend: number;
  spendByProduct: Map<string, number>;
  spendNoProduct: number; // campaigns not mapped to any product
}

export async function getSpendSummary(period: string): Promise<SpendSummary> {
  const rows = await getSpendForPeriod(period);
  const spendByProduct = new Map<string, number>();
  let totalSpend = 0;
  let spendNoProduct = 0;

  for (const row of rows) {
    totalSpend += row.totalSpend;
    if (row.product_id) {
      spendByProduct.set(
        row.product_id,
        (spendByProduct.get(row.product_id) ?? 0) + row.totalSpend
      );
    } else {
      spendNoProduct += row.totalSpend;
    }
  }

  return { totalSpend, spendByProduct, spendNoProduct };
}
