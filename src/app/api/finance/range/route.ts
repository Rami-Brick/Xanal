import { NextRequest, NextResponse } from "next/server";
import { getFinanceRange } from "@/lib/data/finance";

export const dynamic = "force-dynamic";

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildLabel(from: string, to: string): string {
  const f = new Date(from + "T00:00:00.000Z");
  const t = new Date(to + "T00:00:00.000Z");
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const fmtShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  if (f.getUTCFullYear() === t.getUTCFullYear()) {
    return `${fmtShort.format(f)} au ${fmt.format(t)}`;
  }
  return `${fmt.format(f)} au ${fmt.format(t)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  if (!from || !to) {
    return NextResponse.json(
      { success: false, error: "Paramètres 'from' et 'to' requis (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  if (!isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json(
      { success: false, error: "Dates invalides. Format attendu : YYYY-MM-DD." },
      { status: 400 }
    );
  }

  if (from > to) {
    return NextResponse.json(
      { success: false, error: "'from' doit être antérieur ou égal à 'to'." },
      { status: 400 }
    );
  }

  try {
    const fromIso = from + "T00:00:00.000Z";
    const toExclusiveIso = addOneDay(to) + "T00:00:00.000Z";
    const label = buildLabel(from, to);

    const data = await getFinanceRange({ fromIso, toExclusiveIso, label });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
