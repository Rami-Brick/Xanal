import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONVERTY_PRODUCTS_PAGE_SIZE,
  getProductsPage,
  mapProductToRow,
} from "@/lib/converty/products";

export interface ProductSyncResult {
  synced: number;
  created: number;
  updated: number;
}

interface SyncProductsOptions {
  storeId?: string;
}

export async function syncProducts({
  storeId,
}: SyncProductsOptions = {}): Promise<ProductSyncResult> {
  const supabase = createAdminClient();
  let syncLogId: string | null = null;

  try {
    const { data: syncLog, error: syncLogError } = await supabase
      .from("sync_log")
      .insert({
        sync_type: "products",
        status: "started",
        triggered_by: "manual",
        store_id: storeId ?? null,
      })
      .select("id")
      .single();

    if (syncLogError || !syncLog) {
      throw new Error(
        syncLogError?.message || "Failed to create the products sync log entry."
      );
    }

    syncLogId = syncLog.id;

    let page = 1;
    let recordsSynced = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    while (true) {
      const pagePayload = await getProductsPage(
        page,
        CONVERTY_PRODUCTS_PAGE_SIZE,
        storeId
      );
      const products = pagePayload.data;

      if (products.length === 0) break;

      const syncedAt = new Date().toISOString();
      const rows = products.map((product) => mapProductToRow(product, syncedAt));
      const convertyIds = rows.map((row) => row.converty_id);

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("products")
        .select("converty_id")
        .in("converty_id", convertyIds);

      if (existingRowsError) {
        throw new Error(
          `Failed to inspect existing products: ${existingRowsError.message}`
        );
      }

      const existingIds = new Set(
        (existingRows ?? []).map((row) => row.converty_id as string)
      );

      for (const row of rows) {
        if (existingIds.has(row.converty_id)) {
          recordsUpdated += 1;
        } else {
          recordsCreated += 1;
        }
      }

      const { error: upsertError } = await supabase
        .from("products")
        .upsert(rows, { onConflict: "converty_id" });

      if (upsertError) {
        throw new Error(`Failed to upsert products: ${upsertError.message}`);
      }

      recordsSynced += rows.length;

      if (products.length < CONVERTY_PRODUCTS_PAGE_SIZE) break;
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
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Products sync failed.";

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
