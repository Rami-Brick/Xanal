import { NextRequest, NextResponse } from "next/server";
import { syncOrdersIncremental } from "@/lib/converty/sync-orders-incremental";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    let storeId: string | undefined;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { store_id?: string };
      storeId = body.store_id || undefined;
    }

    const result = await syncOrdersIncremental({ storeId });

    return NextResponse.json<ApiResponse<{
      synced: number;
      created: number;
      updated: number;
      rechecked: number;
    }>>({
      success: true,
      data: {
        synced: result.synced,
        created: result.created,
        updated: result.updated,
        rechecked: result.rechecked,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Incremental orders sync failed.";

    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
