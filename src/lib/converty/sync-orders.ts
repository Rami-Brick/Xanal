import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONVERTY_ALL_ORDERS_PAGE_SIZE,
  CONVERTY_ORDERS_PAGE_SIZE,
  getOrdersPage,
  mapOrderItems,
  mapOrderToRow,
} from "@/lib/converty/orders";

export interface OrderSyncResult {
  synced: number;
  created: number;
  updated: number;
  mode: OrderSyncMode;
}

export type OrderSyncMode = "default" | "archived" | "all";

interface SyncOrdersOptions {
  mode: OrderSyncMode;
}

export async function syncOrders({
  mode,
}: SyncOrdersOptions): Promise<OrderSyncResult> {
  const supabase = createAdminClient();
  let syncLogId: string | null = null;

  try {
    const { data: syncLog, error: syncLogError } = await supabase
      .from("sync_log")
      .insert({
        sync_type: "orders",
        status: "started",
        triggered_by: mode === "default" ? "manual" : `manual-${mode}`,
      })
      .select("id")
      .single();

    if (syncLogError || !syncLog) {
      throw new Error(
        syncLogError?.message || "Failed to create the orders sync log entry."
      );
    }

    syncLogId = syncLog.id;

    let recordsSynced = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    let page = 1;

    while (true) {
      const pagePayload = await getOrdersPage(
        page,
        mode === "all" ? CONVERTY_ALL_ORDERS_PAGE_SIZE : CONVERTY_ORDERS_PAGE_SIZE,
        mode === "archived"
          ? { archived: true }
          : mode === "all"
            ? { includeAllOrders: true }
            : undefined
      );
      const orders = pagePayload.data;

      if (orders.length === 0) {
        break;
      }

      const syncedAt = new Date().toISOString();
      const rows = orders.map((order) => mapOrderToRow(order, syncedAt));
      const convertyIds = rows.map((row) => row.converty_id);

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("orders")
        .select("id, converty_id")
        .in("converty_id", convertyIds);

      if (existingRowsError) {
        throw new Error(
          `Failed to inspect existing orders: ${existingRowsError.message}`
        );
      }

      const existingIds = new Map(
        (existingRows ?? []).map((row) => [
          row.converty_id as string,
          row.id as string,
        ])
      );

      for (const row of rows) {
        if (existingIds.has(row.converty_id)) {
          recordsUpdated += 1;
        } else {
          recordsCreated += 1;
        }
      }

      const { error: upsertError } = await supabase.from("orders").upsert(rows, {
        onConflict: "converty_id",
      });

      if (upsertError) {
        throw new Error(`Failed to upsert orders: ${upsertError.message}`);
      }

      const { data: syncedOrders, error: syncedOrdersError } = await supabase
        .from("orders")
        .select("id, converty_id")
        .in("converty_id", convertyIds);

      if (syncedOrdersError) {
        throw new Error(
          `Failed to fetch synced orders: ${syncedOrdersError.message}`
        );
      }

      const orderIdMap = new Map(
        (syncedOrders ?? []).map((row) => [
          row.converty_id as string,
          row.id as string,
        ])
      );

      const productIds = new Set<string>();
      for (const order of orders) {
        for (const item of order.cart ?? []) {
          if (item.product?._id) {
            productIds.add(item.product._id);
          }
        }
      }

      let productIdMap = new Map<string, string>();
      if (productIds.size > 0) {
        const { data: matchedProducts, error: matchedProductsError } =
          await supabase
            .from("products")
            .select("id, converty_id")
            .in("converty_id", Array.from(productIds));

        if (matchedProductsError) {
          throw new Error(
            `Failed to match products for order items: ${matchedProductsError.message}`
          );
        }

        productIdMap = new Map(
          (matchedProducts ?? []).map((product) => [
            product.converty_id as string,
            product.id as string,
          ])
        );
      }

      const orderIds = Array.from(orderIdMap.values());
      if (orderIds.length > 0) {
        const { error: deleteItemsError } = await supabase
          .from("order_items")
          .delete()
          .in("order_id", orderIds);

        if (deleteItemsError) {
          throw new Error(
            `Failed to replace existing order items: ${deleteItemsError.message}`
          );
        }
      }

      const orderItems = orders.flatMap((order) => {
        const localOrderId = orderIdMap.get(order._id);

        if (!localOrderId) {
          return [];
        }

        return mapOrderItems(localOrderId, order.cart, productIdMap);
      });

      if (orderItems.length > 0) {
        const { error: insertItemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (insertItemsError) {
          throw new Error(
            `Failed to insert order items: ${insertItemsError.message}`
          );
        }
      }

      recordsSynced += rows.length;

      const currentPageSize =
        mode === "all" ? CONVERTY_ALL_ORDERS_PAGE_SIZE : CONVERTY_ORDERS_PAGE_SIZE;

      if (orders.length < currentPageSize) {
        break;
      }

      page += 1;
    }

    await supabase
      .from("sync_log")
      .update({
        status: "completed",
        records_synced: recordsSynced,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLogId);

    return {
      synced: recordsSynced,
      created: recordsCreated,
      updated: recordsUpdated,
      mode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orders sync failed.";

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
