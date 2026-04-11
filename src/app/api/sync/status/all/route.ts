import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTerminalOrder } from "@/lib/converty/order-status";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface StoreStatus {
  store_id: string;
  last_sync: string | null;
  last_sync_type: string | null;
  last_sync_status: string | null;
}

// Semantics:
// - per-store fields describe the latest sync log entry for each connected store
// - total_orders / total_products / active_orders are global dataset counts
//   because business tables do not carry store_id
interface AllStoresStatus {
  stores: StoreStatus[];
  total_orders: number;
  total_products: number;
  active_orders: number;
}

const SUPABASE_PAGE_SIZE = 1000;

async function countActiveOrders(
  supabase: ReturnType<typeof createAdminClient>
): Promise<number> {
  const now = new Date();
  let activeCount = 0;
  let page = 0;

  while (true) {
    const { data: batch, error } = await supabase
      .from("orders")
      .select("status, history")
      .not("status", "in", '("delivered","returned")')
      .range(page * SUPABASE_PAGE_SIZE, (page + 1) * SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to count active orders: ${error.message}`);
    }

    for (const order of batch ?? []) {
      if (!isTerminalOrder(order.status, order.history, now)) {
        activeCount += 1;
      }
    }

    if (!batch || batch.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return activeCount;
}

async function getLatestSyncByStore(
  supabase: ReturnType<typeof createAdminClient>,
  storeIds: string[]
): Promise<Map<string, StoreStatus>> {
  const lastSyncByStore = new Map<string, StoreStatus>();

  if (storeIds.length === 0) {
    return lastSyncByStore;
  }

  let page = 0;
  while (lastSyncByStore.size < storeIds.length) {
    const { data: batch, error } = await supabase
      .from("sync_log")
      .select("store_id, started_at, sync_type, status")
      .in("store_id", storeIds)
      .order("started_at", { ascending: false })
      .range(page * SUPABASE_PAGE_SIZE, (page + 1) * SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to read sync logs: ${error.message}`);
    }

    for (const log of batch ?? []) {
      if (!log.store_id || lastSyncByStore.has(log.store_id)) {
        continue;
      }

      lastSyncByStore.set(log.store_id, {
        store_id: log.store_id,
        last_sync: log.started_at ?? null,
        last_sync_type: log.sync_type ?? null,
        last_sync_status: log.status ?? null,
      });
    }

    if (!batch || batch.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return lastSyncByStore;
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: tokens, error: tokensError } = await supabase
      .from("converty_tokens")
      .select("store_id")
      .order("updated_at", { ascending: false });

    if (tokensError) {
      throw new Error(`Failed to read stores: ${tokensError.message}`);
    }

    const storeIds = (tokens ?? []).map((token) => token.store_id as string);
    const lastSyncByStore = await getLatestSyncByStore(supabase, storeIds);

    const stores: StoreStatus[] = storeIds.map((storeId) => {
      return (
        lastSyncByStore.get(storeId) ?? {
          store_id: storeId,
          last_sync: null,
          last_sync_type: null,
          last_sync_status: null,
        }
      );
    });

    const [ordersCount, productsCount, activeOrders] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      countActiveOrders(supabase),
    ]);

    return NextResponse.json<ApiResponse<AllStoresStatus>>({
      success: true,
      data: {
        stores,
        total_orders: ordersCount.count ?? 0,
        total_products: productsCount.count ?? 0,
        active_orders: activeOrders,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch all stores status.";

    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
