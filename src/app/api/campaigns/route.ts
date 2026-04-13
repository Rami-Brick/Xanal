import { NextRequest, NextResponse } from "next/server";
import {
  getCampaigns,
  upsertCampaign,
  deleteCampaign,
  getSpendForPeriod,
  upsertCampaignSpend,
  type CampaignPlatform,
} from "@/lib/data/campaigns";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const VALID_PLATFORMS: CampaignPlatform[] = ["meta", "tiktok", "google", "other"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");

    if (period) {
      const rows = await getSpendForPeriod(period);
      return NextResponse.json<ApiResponse>({ success: true, data: { rows } });
    }

    const campaigns = await getCampaigns();
    return NextResponse.json<ApiResponse>({ success: true, data: { campaigns } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns.";
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

    if (type === "campaign") {
      const { id, name, platform, product_id, active } = body as {
        id?: string;
        name?: string;
        platform?: string;
        product_id?: string | null;
        active?: boolean;
      };

      if (!name || !name.trim()) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Le nom est requis." },
          { status: 400 }
        );
      }
      const validPlatform = VALID_PLATFORMS.includes(platform as CampaignPlatform)
        ? (platform as CampaignPlatform)
        : "meta";

      const savedId = await upsertCampaign({
        id,
        name: name.trim(),
        platform: validPlatform,
        product_id: product_id ?? null,
        active: active ?? true,
      });

      return NextResponse.json<ApiResponse>({ success: true, data: { id: savedId } });
    }

    if (type === "spend") {
      const { entries } = body as {
        entries: { campaign_id: string; spend_date: string; amount: number }[];
      };
      const cleaned = (entries ?? [])
        .filter((e) => e.campaign_id && /^\d{4}-\d{2}-\d{2}$/.test(e.spend_date))
        .map((e) => ({
          campaign_id: e.campaign_id,
          spend_date: e.spend_date,
          amount: Number(e.amount) || 0,
        }));
      await upsertCampaignSpend(cleaned);
      return NextResponse.json<ApiResponse>({ success: true });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unknown type." },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update.";
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
    await deleteCampaign(id);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
