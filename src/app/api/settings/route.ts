import { NextRequest, NextResponse } from "next/server";
import {
  getBusinessSettings,
  updateBusinessSettings,
  getProductCosts,
  upsertProductCosts,
} from "@/lib/data/settings";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function GET() {
  try {
    const [settings, productCosts] = await Promise.all([
      getBusinessSettings(),
      getProductCosts(),
    ]);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { settings, productCosts },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load settings.";
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

    if (type === "fees") {
      const { cosmos_delivery_fee, cosmos_return_fee, packing_cost_per_package, converty_fee_rate } =
        body as {
          cosmos_delivery_fee: number;
          cosmos_return_fee: number;
          packing_cost_per_package: number;
          converty_fee_rate: number;
        };

      await updateBusinessSettings({
        cosmos_delivery_fee,
        cosmos_return_fee,
        packing_cost_per_package,
        converty_fee_rate,
      });

      return NextResponse.json<ApiResponse>({ success: true });
    }

    if (type === "product_costs") {
      const { entries } = body as {
        entries: { product_id: string; unit_cogs: number }[];
      };

      await upsertProductCosts(entries);

      return NextResponse.json<ApiResponse>({ success: true });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unknown settings type." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update settings.";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
