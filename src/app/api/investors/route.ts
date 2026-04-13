import { NextRequest, NextResponse } from "next/server";
import {
  getInvestorSummary,
  getDealWaterfall,
  getInvestorPayouts,
  upsertInvestorDeal,
  deleteInvestorDeal,
  insertInvestorPayout,
  deleteInvestorPayout,
  getInvestorDeals,
  type DealStatus,
  type PayoutType,
} from "@/lib/data/investors";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const VALID_STATUS: DealStatus[] = ["active", "closed"];
const VALID_PAYOUT_TYPES: PayoutType[] = ["capital_return", "profit_share"];

function isDateStr(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("deal_id");
    const payouts = searchParams.get("payouts");
    const summary = searchParams.get("summary");

    if (payouts && dealId) {
      const list = await getInvestorPayouts(dealId);
      return NextResponse.json<ApiResponse>({ success: true, data: { payouts: list } });
    }

    if (dealId) {
      // Fetch one deal's waterfall
      const deals = await getInvestorDeals();
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Deal introuvable." },
          { status: 404 }
        );
      }
      const waterfall = await getDealWaterfall(deal);
      return NextResponse.json<ApiResponse>({ success: true, data: { deal: waterfall } });
    }

    if (summary === "1") {
      const data = await getInvestorSummary();
      return NextResponse.json<ApiResponse>({ success: true, data });
    }

    const deals = await getInvestorDeals();
    return NextResponse.json<ApiResponse>({ success: true, data: { deals } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load investors.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body as { type: string };

    if (type === "deal") {
      const {
        id,
        investor_name,
        product_id,
        capital_deployed,
        profit_share_pct,
        loss_share_pct,
        status,
        started_at,
        closed_at,
        note,
      } = body as {
        id?: string;
        investor_name?: string;
        product_id?: string | null;
        capital_deployed?: number | string;
        profit_share_pct?: number | string;
        loss_share_pct?: number | string;
        status?: string;
        started_at?: string;
        closed_at?: string | null;
        note?: string | null;
      };

      if (!investor_name || !investor_name.trim()) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Le nom de l'investisseur est requis." },
          { status: 400 }
        );
      }
      if (!isDateStr(started_at)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Date de debut requise." },
          { status: 400 }
        );
      }
      if (closed_at && !isDateStr(closed_at)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Date de cloture invalide." },
          { status: 400 }
        );
      }
      const validStatus = VALID_STATUS.includes(status as DealStatus)
        ? (status as DealStatus)
        : "active";

      const savedId = await upsertInvestorDeal({
        id,
        investor_name: investor_name.trim(),
        product_id: product_id ?? null,
        capital_deployed: Number(capital_deployed) || 0,
        profit_share_pct: Number(profit_share_pct) || 0,
        loss_share_pct: Number(loss_share_pct) || 0,
        status: validStatus,
        started_at,
        closed_at: closed_at ?? null,
        note: note ?? null,
      });

      return NextResponse.json<ApiResponse>({ success: true, data: { id: savedId } });
    }

    if (type === "payout") {
      const { deal_id, payout_date, amount, payout_type, note } = body as {
        deal_id?: string;
        payout_date?: string;
        amount?: number | string;
        payout_type?: string;
        note?: string | null;
      };
      if (!deal_id) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "deal_id requis." },
          { status: 400 }
        );
      }
      if (!isDateStr(payout_date)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Date du versement invalide." },
          { status: 400 }
        );
      }
      if (!VALID_PAYOUT_TYPES.includes(payout_type as PayoutType)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Type de versement invalide." },
          { status: 400 }
        );
      }
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum < 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Montant invalide." },
          { status: 400 }
        );
      }

      const savedId = await insertInvestorPayout({
        deal_id,
        payout_date,
        amount: amountNum,
        payout_type: payout_type as PayoutType,
        note: note ?? null,
      });
      return NextResponse.json<ApiResponse>({ success: true, data: { id: savedId } });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unknown type." },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Missing id." },
        { status: 400 }
      );
    }
    if (type === "payout") {
      await deleteInvestorPayout(id);
    } else {
      await deleteInvestorDeal(id);
    }
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
