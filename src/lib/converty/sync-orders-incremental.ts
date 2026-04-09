import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONVERTY_ORDERS_PAGE_SIZE,
  getOrdersPage,
  mapOrderItems,
  mapOrderToRow,
} from "@/lib/converty/orders";
import { isTerminalOrder } from "@/lib/converty/order-status";
import { daysAgo } from "@/lib/converty/filters";

export interface IncrementalSyncResult {
  synced: number;
  created: number;
  updated: number;
  rechecked: number;
}

interface SyncIncrementalOrdersOptions {
  storeId?: string;
}

/**
 * Resolves the start date for Part A (date-range fetch).
 * Uses the started_at of the last successful orders sync for this store,
 * with a 48-hour fallback to avoid missing anything near the boundary.
 */
async function resolveIncrementalFrom(
  supabase: ReturnType<typeof createAdminClient>,
  storeId: string | undefined
): Promise<Date> {
  const query = supabase
    .from("sync_log")
    .select("started_at")
    .in("sync_type", ["orders", "orders_incremental"])
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1);

  const { data } = storeId
    ? await query.eq("store_id", storeId)
    : await query;

  if (data?.[0]?.started_at) {
    // Subtract 30 minutes as a safety overlap to catch any orders
    // that arrived just before the last sync boundary
    const lastSync = new Date(data[0].started_at);
    return new Date(lastSync.getTime() - 30 * 60 * 1000);
  }

  // No previous sync found — default to 48 hours ago
  return daysAgo(2);
}

/**
 * Upserts a batch of orders and their items into Supabase.
 * Returns created/updated counts.
 */
async function upsertOrderBatch(
  supabase: ReturnType<typeof createAdminClient>,
  orders: Awaited<ReturnType<typeof getOrdersPage>>["data"],
  syncedAt: string
): Promise<{ created: number; updated: number; synced: number }> {
  if (orders.length === 0) return { created: 0, updated: 0, synced: 0 };

  const rows = orders.map((order) => mapOrderToRow(order, syncedAt));
  const convertyIds = rows.map((r) => r.converty_id);

  const { data: existingRows, error: existingError } = await supabase
    .from("orders")
    .select("id, converty_id")
    .in("converty_id", convertyIds);

  if (existingError) {
    throw new Error(`Failed to inspect existing orders: ${existingError.message}`);
  }

  const existingMap = new Map(
    (existingRows ?? []).map((r) => [r.converty_id as string, r.id as string])
  );

  let created = 0;
  let updated = 0;
  for (const row of rows) {
    if (existingMap.has(row.converty_id)) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  const { error: upsertError } = await supabase
    .from("orders")
    .upsert(rows, { onConflict: "converty_id" });

  if (upsertError) {
    throw new Error(`Failed to upsert orders: ${upsertError.message}`);
  }

  // Reload order IDs (some may be newly inserted)
  const { data: syncedOrders, error: syncedError } = await supabase
    .from("orders")
    .select("id, converty_id")
    .in("converty_id", convertyIds);

  if (syncedError) {
    throw new Error(`Failed to fetch synced orders: ${syncedError.message}`);
  }

  const orderIdMap = new Map(
    (syncedOrders ?? []).map((r) => [r.converty_id as string, r.id as string])
  );

  // Resolve product IDs for order items
  const productIds = new Set<string>();
  for (const order of orders) {
    for (const item of order.cart ?? []) {
      if (item.product?._id) productIds.add(item.product._id);
    }
  }

  let productIdMap = new Map<string, string>();
  if (productIds.size > 0) {
    const { data: matchedProducts, error: productError } = await supabase
      .from("products")
      .select("id, converty_id")
      .in("converty_id", Array.from(productIds));

    if (productError) {
      throw new Error(`Failed to match products: ${productError.message}`);
    }

    productIdMap = new Map(
      (matchedProducts ?? []).map((p) => [p.converty_id as string, p.id as string])
    );
  }

  // Replace order items for all affected orders
  const orderIds = Array.from(orderIdMap.values());
  if (orderIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .in("order_id", orderIds);

    if (deleteError) {
      throw new Error(`Failed to replace order items: ${deleteError.message}`);
    }
  }

  const orderItems = orders.flatMap((order) => {
    const localOrderId = orderIdMap.get(order._id);
    if (!localOrderId) return [];
    return mapOrderItems(localOrderId, order.cart, productIdMap);
  });

  if (orderItems.length > 0) {
    const { error: insertError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (insertError) {
      throw new Error(`Failed to insert order items: ${insertError.message}`);
    }
  }

  return { created, updated, synced: rows.length };
}

export async function syncOrdersIncremental({
  storeId,
}: SyncIncrementalOrdersOptions = {}): Promise<IncrementalSyncResult> {
  const supabase = createAdminClient();
  let syncLogId: string | null = null;

  try {
    const { data: syncLog, error: syncLogError } = await supabase
      .from("sync_log")
      .insert({
        sync_type: "orders_incremental",
        status: "started",
        triggered_by: "manual",
        store_id: storeId ?? null,
      })
      .select("id")
      .single();

    if (syncLogError || !syncLog) {
      throw new Error(
        syncLogError?.message || "Failed to create incremental sync log entry."
      );
    }

    syncLogId = syncLog.id;

    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalRechecked = 0;

    const now = new Date();
    const syncedAt = now.toISOString();

    // ----------------------------------------------------------------
    // Part A: Fetch newly created or recently changed orders by date range
    // ----------------------------------------------------------------
    const from = await resolveIncrementalFrom(supabase, storeId);

    let page = 1;
    while (true) {
      const pagePayload = await getOrdersPage(
        page,
        CONVERTY_ORDERS_PAGE_SIZE,
        { from, to: now, storeId }
      );
      const orders = pagePayload.data;

      if (orders.length === 0) break;

      const batch = await upsertOrderBatch(supabase, orders, syncedAt);
      totalSynced += batch.synced;
      totalCreated += batch.created;
      totalUpdated += batch.updated;

      if (orders.length < CONVERTY_ORDERS_PAGE_SIZE) break;
      page += 1;
    }

    // ----------------------------------------------------------------
    // Part B: Re-check active (non-terminal) orders from Supabase
    // ----------------------------------------------------------------
    // Supabase returns at most 1000 rows per request. Paginate to get all rows.
    const PAGE_SIZE = 1000;
    const allNonTerminalOrders: Array<{
      converty_id: string;
      status: string;
      history: unknown;
      converty_updated_at: string | null;
    }> = [];

    let fetchPage = 0;
    while (true) {
      const { data: batch, error: activeError } = await supabase
        .from("orders")
        .select("converty_id, status, history, converty_updated_at")
        .not("status", "in", '("delivered","returned")')
        .order("converty_updated_at", { ascending: false })
        .range(fetchPage * PAGE_SIZE, (fetchPage + 1) * PAGE_SIZE - 1);

      if (activeError) {
        throw new Error(`Failed to query active orders: ${activeError.message}`);
      }

      allNonTerminalOrders.push(...(batch ?? []));

      if (!batch || batch.length < PAGE_SIZE) break;
      fetchPage += 1;
    }

    // Filter out rejected orders that are already terminal per the 24h rule
    const recheckIds = allNonTerminalOrders
      .filter((o) => !isTerminalOrder(o.status, o.history, now))
      .map((o) => o.converty_id as string);
    const recheckIdSet = new Set(recheckIds);

    // Re-fetch active orders using a date window that covers when they were last updated.
    // Strategy: fetch recent N pages with includeAllOrders to catch status changes.
    // For small active sets this is fine; if volume grows, a per-ID endpoint can be used.
    if (recheckIds.length > 0) {
      // Use a rolling 30-day window to find recently updated active orders
      const recheckFrom = daysAgo(30, now);
      let recheckPage = 1;

      // Track which IDs we've successfully re-fetched from Converty
      const recheckedSet = new Set<string>();

      while (recheckedSet.size < recheckIds.length) {
        const pagePayload = await getOrdersPage(
          recheckPage,
          CONVERTY_ORDERS_PAGE_SIZE,
          { from: recheckFrom, to: now, storeId }
        );
        const orders = pagePayload.data;

        if (orders.length === 0) break;

        // Only process orders that are in our active recheck list
        const relevantOrders = orders.filter((o) => recheckIdSet.has(o._id));

        if (relevantOrders.length > 0) {
          const batch = await upsertOrderBatch(supabase, relevantOrders, syncedAt);
          totalSynced += batch.synced;
          // Don't double-count creates/updates for already-counted orders from Part A
          for (const o of relevantOrders) recheckedSet.add(o._id);
        }

        if (orders.length < CONVERTY_ORDERS_PAGE_SIZE) break;
        recheckPage += 1;
      }

      totalRechecked = recheckedSet.size;
    }

    await supabase
      .from("sync_log")
      .update({
        status: "completed",
        records_synced: totalSynced,
        records_created: totalCreated,
        records_updated: totalUpdated,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLogId);

    return {
      synced: totalSynced,
      created: totalCreated,
      updated: totalUpdated,
      rechecked: totalRechecked,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Incremental orders sync failed.";

    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    throw error;
  }
}
