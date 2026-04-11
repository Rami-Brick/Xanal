import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStore } from "@/lib/converty/sync-store";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AllSyncResult {
  stores_synced: number;
  results: Array<
    | { store_id: string; success: true; data: Awaited<ReturnType<typeof syncStore>> }
    | { store_id: string; success: false; error: string }
  >;
}

export async function POST() {
  try {
    const supabase = createAdminClient();

    const { data: tokens, error: tokensError } = await supabase
      .from("converty_tokens")
      .select("store_id")
      .order("updated_at", { ascending: false });

    if (tokensError) {
      throw new Error(`Failed to read connected stores: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json<ApiResponse<AllSyncResult>>({
        success: true,
        data: { stores_synced: 0, results: [] },
      });
    }

    const results: AllSyncResult["results"] = [];

    for (const token of tokens) {
      const storeId = token.store_id as string;
      try {
        const data = await syncStore(storeId);
        results.push({ store_id: storeId, success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed.";
        results.push({ store_id: storeId, success: false, error: message });
      }
    }

    return NextResponse.json<ApiResponse<AllSyncResult>>({
      success: true,
      data: {
        stores_synced: results.filter((r) => r.success).length,
        results,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Multi-store sync failed.";

    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
