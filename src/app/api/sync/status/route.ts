import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTerminalOrder } from "@/lib/converty/order-status";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Semantics (Option A):
// - last_sync / last_sync_type / last_sync_status are store-specific when store_id is provided
// - total_orders / total_products / active_orders are always global dataset counts
//   (the business tables have no store_id column, so per-store counts are not available)
interface SyncStatus {
  store_id: string | null;
  last_sync: string | null;
  last_sync_type: string | null;
  last_sync_status: string | null;
  // Global dataset counts
  total_orders: number;
  total_products: number;
  active_orders: number;
}

const SUPABASE_PAGE_SIZE = 1000;

/**
 * Fetches all non-always-terminal orders across pages and returns
 * the count that are truly non-terminal (applying the 24h rejected rule).
 */
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

    if (error) throw new Error(`Failed to count active orders: ${error.message}`);

    for (const o of batch ?? []) {
      if (!isTerminalOrder(o.status, o.history, now)) activeCount += 1;
    }

    if (!batch || batch.length < SUPABASE_PAGE_SIZE) break;
    page += 1;
  }

  return activeCount;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const storeId = request.nextUrl.searchParams.get("store_id") || undefined;

    // Last sync log entry for this store (or global if no store_id given)
    const syncQuery = supabase
      .from("sync_log")
      .select("started_at, sync_type, status, store_id")
      .order("started_at", { ascending: false })
      .limit(1);

    const { data: syncData } = storeId
      ? await syncQuery.eq("store_id", storeId)
      : await syncQuery;

    const lastSync = syncData?.[0] ?? null;

    // Total counts use count: "exact" with head:true — no row fetch, no 1000-row cap
    const [ordersCount, productsCount, activeCount] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      countActiveOrders(supabase),
    ]);

    const status: SyncStatus = {
      store_id: storeId ?? lastSync?.store_id ?? null,
      last_sync: lastSync?.started_at ?? null,
      last_sync_type: lastSync?.sync_type ?? null,
      last_sync_status: lastSync?.status ?? null,
      total_orders: ordersCount.count ?? 0,
      total_products: productsCount.count ?? 0,
      active_orders: activeCount,
    };

    return NextResponse.json<ApiResponse<SyncStatus>>({
      success: true,
      data: status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch sync status.";

    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
