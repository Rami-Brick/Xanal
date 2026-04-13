import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 1000;

interface OrderRow {
  status: string | null;
  is_test: boolean | null;
  total_price: number | string | null;
  converty_created_at: string | null;
}

const RETURN_NUMERATOR_STATUSES = new Set(["returned", "to be returned"]);
const RETURN_ELIGIBLE_STATUSES = new Set([
  "deposit",
  "in transit",
  "delivered",
  "returned",
  "to be returned",
]);

function ns(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/_/g, " ");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function dayPlus(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function fetchOrdersInRange(from: string, toExclusive: string): Promise<OrderRow[]> {
  const supabase = createAdminClient();
  const rows: OrderRow[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("status, is_test, total_price, converty_created_at")
      .gte("converty_created_at", from)
      .lt("converty_created_at", toExclusive)
      .order("converty_created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`orders (daily-pulse range): ${error.message}`);
    const batch = (data ?? []) as OrderRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }
  return rows;
}

async function fetchSpendForDate(dateIso: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_spend")
    .select("amount")
    .eq("spend_date", dateIso);
  if (error) throw new Error(`campaign_spend (date): ${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

async function fetchSpendByCampaignForDate(dateIso: string): Promise<{
  campaign_id: string;
  amount: number;
}[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_spend")
    .select("campaign_id, amount")
    .eq("spend_date", dateIso);
  if (error) throw new Error(`campaign_spend (by campaign): ${error.message}`);
  return (data ?? []).map((row) => ({
    campaign_id: row.campaign_id as string,
    amount: Number(row.amount ?? 0),
  }));
}

interface PipelineCounts {
  pending: number;
  confirmed: number;
  deposit: number;
  inTransit: number;
  delivered: number;
  returned: number;
  rejected: number;
  total: number;
  totalRevenuePotential: number;
  deliveredRevenue: number;
}

function bucketize(rows: OrderRow[]): PipelineCounts {
  const counts: PipelineCounts = {
    pending: 0,
    confirmed: 0,
    deposit: 0,
    inTransit: 0,
    delivered: 0,
    returned: 0,
    rejected: 0,
    total: 0,
    totalRevenuePotential: 0,
    deliveredRevenue: 0,
  };
  for (const o of rows) {
    if (o.is_test) continue;
    const s = ns(o.status);
    if (s === "deleted") continue;
    counts.total += 1;
    counts.totalRevenuePotential += Number(o.total_price ?? 0);
    switch (s) {
      case "pending":
        counts.pending += 1;
        break;
      case "confirmed":
        counts.confirmed += 1;
        break;
      case "deposit":
        counts.deposit += 1;
        break;
      case "in transit":
        counts.inTransit += 1;
        break;
      case "delivered":
        counts.delivered += 1;
        counts.deliveredRevenue += Number(o.total_price ?? 0);
        break;
      case "returned":
      case "to be returned":
        counts.returned += 1;
        break;
      case "rejected":
        counts.rejected += 1;
        break;
    }
  }
  return counts;
}

export interface DailyPulseAlert {
  title: string;
  body: string;
  tone: "stable" | "watch" | "risk";
}

export interface DailyPulseCampaign {
  campaignId: string;
  name: string;
  productName: string | null;
  spend: number;
  // ROAS computed against today's delivered revenue for the mapped product (if any)
  todayProductRevenue: number | null;
  roas: number | null;
}

export interface DailyPulseData {
  todayLabel: string;
  // Today's pipeline (from orders created today)
  today: PipelineCounts;
  yesterday: PipelineCounts;
  // Rolling 7-day return rate (today's returns alone are usually 0)
  rollingReturnRate: number;
  rollingReturnNumerator: number;
  rollingReturnDenominator: number;
  // Ad spend
  todayAdSpend: number;
  yesterdayAdSpend: number;
  todayCampaigns: DailyPulseCampaign[];
  // Alerts
  alerts: DailyPulseAlert[];
}

export const getDailyPulse = cache(async (): Promise<DailyPulseData> => {
  const supabase = createAdminClient();
  const today = todayIso();
  const yesterday = daysAgoIso(1);
  const tomorrow = dayPlus(today, 1);
  const sevenDaysAgo = daysAgoIso(7);

  const [todayRows, yesterdayRows, rollingRows, todaySpend, yesterdaySpend, todaySpendByCampaign, campaignsResult] =
    await Promise.all([
      fetchOrdersInRange(today, tomorrow),
      fetchOrdersInRange(yesterday, today),
      fetchOrdersInRange(sevenDaysAgo, tomorrow),
      fetchSpendForDate(today),
      fetchSpendForDate(yesterday),
      fetchSpendByCampaignForDate(today),
      supabase.from("campaigns").select("id, name, product_id, products(name)"),
    ]);

  const todayCounts = bucketize(todayRows);
  const yesterdayCounts = bucketize(yesterdayRows);

  // Rolling 7-day return rate
  let rollNumerator = 0;
  let rollDenominator = 0;
  for (const o of rollingRows) {
    if (o.is_test) continue;
    const s = ns(o.status);
    if (s === "deleted") continue;
    if (RETURN_NUMERATOR_STATUSES.has(s)) rollNumerator += 1;
    if (RETURN_ELIGIBLE_STATUSES.has(s)) rollDenominator += 1;
  }
  const rollingReturnRate =
    rollDenominator > 0 ? (rollNumerator / rollDenominator) * 100 : 0;

  // Per-product delivered revenue today (for ROAS)
  // We need order_items for delivered orders today
  const { data: deliveredTodayIds, error: deliveredErr } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "delivered")
    .eq("is_test", false)
    .gte("converty_created_at", today)
    .lt("converty_created_at", tomorrow);
  if (deliveredErr) throw new Error(`orders delivered today: ${deliveredErr.message}`);

  const orderIds = (deliveredTodayIds ?? []).map((r) => r.id as string);
  const revenueByProduct = new Map<string, number>();
  if (orderIds.length > 0) {
    // Chunk in clauses
    const CHUNK = 200;
    for (let i = 0; i < orderIds.length; i += CHUNK) {
      const chunk = orderIds.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("order_items")
        .select("product_id, quantity, price_per_unit")
        .in("order_id", chunk);
      if (error) throw new Error(`order_items today: ${error.message}`);
      for (const item of data ?? []) {
        if (!item.product_id) continue;
        const qty = Number(item.quantity ?? 0);
        const unit = Number(item.price_per_unit ?? 0);
        revenueByProduct.set(
          item.product_id as string,
          (revenueByProduct.get(item.product_id as string) ?? 0) + qty * unit
        );
      }
    }
  }

  // Per-campaign ROAS today
  const campaignMeta = new Map<string, { name: string; product_id: string | null; productName: string | null }>();
  for (const c of campaignsResult.data ?? []) {
    const productRel = (c as unknown as { products: { name: string } | null }).products;
    campaignMeta.set(c.id as string, {
      name: c.name as string,
      product_id: c.product_id as string | null,
      productName: productRel?.name ?? null,
    });
  }
  const todayCampaigns: DailyPulseCampaign[] = todaySpendByCampaign
    .filter((s) => s.amount > 0)
    .map((s) => {
      const meta = campaignMeta.get(s.campaign_id);
      const productRevenue =
        meta?.product_id ? revenueByProduct.get(meta.product_id) ?? 0 : null;
      const roas =
        productRevenue !== null && s.amount > 0 ? productRevenue / s.amount : null;
      return {
        campaignId: s.campaign_id,
        name: meta?.name ?? "Campagne inconnue",
        productName: meta?.productName ?? null,
        spend: s.amount,
        todayProductRevenue: productRevenue,
        roas,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  // Alerts
  const alerts: DailyPulseAlert[] = [];
  if (rollingReturnRate >= 28) {
    alerts.push({
      title: "Taux de retour critique (7j)",
      body: `${rollingReturnRate.toFixed(1)} % sur les 7 derniers jours. Audit produit / wilaya / agent requis.`,
      tone: "risk",
    });
  } else if (rollingReturnRate >= 20) {
    alerts.push({
      title: "Taux de retour eleve (7j)",
      body: `${rollingReturnRate.toFixed(1)} %, au-dessus du seuil de 15 %.`,
      tone: "watch",
    });
  }
  // Per-campaign ROAS alerts
  for (const c of todayCampaigns) {
    if (c.roas === null) continue;
    if (c.roas < 2.0) {
      alerts.push({
        title: `${c.name} : ROAS critique`,
        body: `${c.roas.toFixed(2)}x aujourd'hui. Pause ou reduction immediate recommandee.`,
        tone: "risk",
      });
    } else if (c.roas < 2.5) {
      alerts.push({
        title: `${c.name} : ROAS faible`,
        body: `${c.roas.toFixed(2)}x aujourd'hui. Surveiller.`,
        tone: "watch",
      });
    }
  }
  // Empty pipeline early warning
  if (todayCounts.total === 0) {
    alerts.push({
      title: "Aucune commande aujourd'hui",
      body: "Aucune nouvelle commande recue. Verifier le tracking publicitaire et la disponibilite du site.",
      tone: "watch",
    });
  }

  return {
    todayLabel: new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(new Date()),
    today: todayCounts,
    yesterday: yesterdayCounts,
    rollingReturnRate,
    rollingReturnNumerator: rollNumerator,
    rollingReturnDenominator: rollDenominator,
    todayAdSpend: todaySpend,
    yesterdayAdSpend: yesterdaySpend,
    todayCampaigns,
    alerts,
  };
});
