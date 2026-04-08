import { NextResponse } from "next/server";
import { syncOrders } from "@/lib/converty/sync-orders";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function POST() {
  try {
    const result = await syncOrders({ mode: "archived" });

    return NextResponse.json<ApiResponse<{
      synced: number;
      created: number;
      updated: number;
      mode: string;
    }>>({
      success: true,
      data: {
        synced: result.synced,
        created: result.created,
        updated: result.updated,
        mode: result.mode,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Archived orders sync failed.";

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
