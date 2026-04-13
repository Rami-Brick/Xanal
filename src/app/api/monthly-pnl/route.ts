import { NextRequest, NextResponse } from "next/server";
import { getMonthlyPnl } from "@/lib/data/monthly-pnl";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    if (!period) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Missing 'period' query param." },
        { status: 400 }
      );
    }

    const data = await getMonthlyPnl(period);
    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load monthly P&L.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
