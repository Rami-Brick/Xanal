import { Metadata } from "next";
import { PerformancePeriod } from "@/components/store/PerformancePeriod";
import { MonthlyNetProfit } from "@/components/store/MonthlyNetProfit";
import { CashPositionCards } from "@/components/store/CashPositionCards";
import { InvestorsSummaryCards } from "@/components/store/InvestorsSummaryCards";
import { getCashPosition } from "@/lib/data/settlements";
import { getInvestorSummary } from "@/lib/data/investors";
import { getConnectionStatus } from "@/lib/data/connection";
import { PageShell } from "../../_shared/PageShell";
import { eyebrow } from "../../_shared/styles";

export const metadata: Metadata = { title: "Finance · Xanal" };
export const dynamic = "force-dynamic";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function FinancePage() {
  const [connection, cashPosition, investorSummary] = await Promise.all([
    getConnectionStatus(),
    getCashPosition(),
    getInvestorSummary(),
  ]);

  const initialFrom = firstOfCurrentMonth();
  const initialTo = todayIso();
  const initialPeriod = firstOfCurrentMonth();

  return (
    <PageShell
      title="Finance"
      eyebrow="Bilan et tresorerie"
      storeId={connection.storeId}
      notConnected={!connection.connected}
    >
      {/* Performance periode */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Performance periode</p>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Cascade jusqu'a la CM apres pub
          </span>
        </div>
        <PerformancePeriod initialFrom={initialFrom} initialTo={initialTo} />
      </section>

      {/* Profit net mensuel */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Profit net mensuel</p>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            CM du mois moins frais fixes
          </span>
        </div>
        <MonthlyNetProfit initialPeriod={initialPeriod} />
      </section>

      {/* Tresorerie */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Tresorerie</p>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Position globale transporteur
          </span>
        </div>
        <CashPositionCards data={cashPosition} />
      </section>

      {/* Capital investisseurs */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Capital investisseurs</p>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Position globale par deal
          </span>
        </div>
        <InvestorsSummaryCards data={investorSummary} />
      </section>
    </PageShell>
  );
}
