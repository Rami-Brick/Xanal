import { NextRequest, NextResponse } from "next/server";
import { getMonthlyNetProfit } from "@/lib/data/finance";
import { normalizePeriod } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") ?? "";

  if (!period) {
    return NextResponse.json(
      { success: false, error: "Paramètre 'period' requis (YYYY-MM-01 ou YYYY-MM)." },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}(-01)?$/.test(period)) {
    return NextResponse.json(
      { success: false, error: "Format invalide. Attendu : YYYY-MM-01 ou YYYY-MM." },
      { status: 400 }
    );
  }

  try {
    const normalized = normalizePeriod(period);
    const data = await getMonthlyNetProfit(normalized);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
