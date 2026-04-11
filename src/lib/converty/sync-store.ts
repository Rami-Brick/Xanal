import { createAdminClient } from "@/lib/supabase/admin";
import { syncProducts, type ProductSyncResult } from "@/lib/converty/sync-products";
import { syncOrders, type OrderSyncResult } from "@/lib/converty/sync-orders";

export interface StoreSyncResult {
  store_id: string;
  products: ProductSyncResult;
  orders: OrderSyncResult;
  orders_mode: "full";
}

/**
 * Unified sync for the single connected store:
 * 1. Sync all products
 * 2. Sync the full order history every time
 *
 * The app currently operates in single-store mode, so favoring a full
 * all-orders backfill keeps the local database aligned with Converty and
 * avoids historical gaps that partial or incremental syncs can leave behind.
 */
export async function syncStore(storeId?: string): Promise<StoreSyncResult> {
  const supabase = createAdminClient();

  // Resolve the store_id if not provided - use the most recently connected store.
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

  const productsResult = await syncProducts({ storeId: resolvedStoreId });
  const ordersResult = await syncOrders({ mode: "all", storeId: resolvedStoreId });

  return {
    store_id: resolvedStoreId,
    products: productsResult,
    orders: ordersResult,
    orders_mode: "full",
  };
}
