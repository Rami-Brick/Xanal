import { NextRequest, NextResponse } from "next/server";
import {
  getSettlementsWithReconciliation,
  upsertSettlement,
  deleteSettlement,
  computeExpectedForRange,
} from "@/lib/data/settlements";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get("preview");

    if (preview === "1") {
      const from = searchParams.get("period_from");
      const to = searchParams.get("period_to");
      if (!isValidDate(from) || !isValidDate(to)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "period_from and period_to required (YYYY-MM-DD)." },
          { status: 400 }
        );
      }
      const calc = await computeExpectedForRange(from, to);
      return NextResponse.json<ApiResponse>({ success: true, data: calc });
    }

    const settlements = await getSettlementsWithReconciliation();
    return NextResponse.json<ApiResponse>({ success: true, data: { settlements } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settlements.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      period_from,
      period_to,
      settlement_date,
      actual_amount,
      note,
    } = body as {
      id?: string;
      period_from?: string;
      period_to?: string;
      settlement_date?: string;
      actual_amount?: number | string;
      note?: string | null;
    };

    if (!isValidDate(period_from) || !isValidDate(period_to) || !isValidDate(settlement_date)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Dates invalides (format YYYY-MM-DD requis)." },
        { status: 400 }
      );
    }
    if (period_to < period_from) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "period_to doit etre >= period_from." },
        { status: 400 }
      );
    }

    const actualNum = Number(actual_amount);
    if (!Number.isFinite(actualNum) || actualNum < 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Montant invalide." },
        { status: 400 }
      );
    }

    const savedId = await upsertSettlement({
      id,
      period_from,
      period_to,
      settlement_date,
      actual_amount: actualNum,
      note: note ?? null,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { id: savedId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save settlement.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Missing id." },
        { status: 400 }
      );
    }
    await deleteSettlement(id);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
