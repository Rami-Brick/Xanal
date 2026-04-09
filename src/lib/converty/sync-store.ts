import { createAdminClient } from "@/lib/supabase/admin";
import { syncProducts, type ProductSyncResult } from "@/lib/converty/sync-products";
import { syncOrders, type OrderSyncResult } from "@/lib/converty/sync-orders";
import { syncOrdersIncremental, type IncrementalSyncResult } from "@/lib/converty/sync-orders-incremental";

export interface StoreSyncResult {
  store_id: string;
  products: ProductSyncResult;
  orders: OrderSyncResult | IncrementalSyncResult;
  orders_mode: "backfill" | "incremental";
}

/**
 * Returns true if this store already has successful order sync history.
 * This avoids treating a brand-new store as "already synced" just because
 * some other store has populated the global orders table.
 */
async function hasExistingOrderHistory(storeId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("sync_log")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .in("sync_type", ["orders", "orders_incremental"])
    .eq("status", "completed");

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Unified sync for a single store:
 * 1. Syncs all products
 * 2. If no order history exists → runs full backfill (orders-all)
 *    Otherwise → runs incremental orders sync
 */
export async function syncStore(storeId?: string): Promise<StoreSyncResult> {
  const supabase = createAdminClient();

  // Resolve the store_id if not provided — use the most recently connected store
  let resolvedStoreId = storeId;
  if (!resolvedStoreId) {
    const { data, error } = await supabase
      .from("converty_tokens")
      .select("store_id")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data?.[0]) {
      throw new Error("No connected Converty store found.");
    }

    resolvedStoreId = data[0].store_id as string;
  }

  // Step 1: sync products
  const productsResult = await syncProducts({ storeId: resolvedStoreId });

  // Step 2: sync orders — backfill if no history, incremental otherwise
  const hasOrders = await hasExistingOrderHistory(resolvedStoreId);

  let ordersResult: OrderSyncResult | IncrementalSyncResult;
  let ordersMode: "backfill" | "incremental";

  if (!hasOrders) {
    ordersResult = await syncOrders({ mode: "all", storeId: resolvedStoreId });
    ordersMode = "backfill";
  } else {
    ordersResult = await syncOrdersIncremental({ storeId: resolvedStoreId });
    ordersMode = "incremental";
  }

  return {
    store_id: resolvedStoreId,
    products: productsResult,
    orders: ordersResult,
    orders_mode: ordersMode,
  };
}
