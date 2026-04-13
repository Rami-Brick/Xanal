import { Metadata } from "next";
import { MonthlyPnl } from "@/components/store/MonthlyPnl";
import { CashPositionCards } from "@/components/store/CashPositionCards";
import { InvestorsSummaryCards } from "@/components/store/InvestorsSummaryCards";
import { getCashPosition } from "@/lib/data/settlements";
import { getInvestorSummary } from "@/lib/data/investors";
import { getConnectionStatus } from "@/lib/data/connection";
import { PageShell } from "../../_shared/PageShell";
import { eyebrow } from "../../_shared/styles";

export const metadata: Metadata = { title: "Finance · Xanal" };
export const dynamic = "force-dynamic";

function currentMonthIso(): string {
  const dt = new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function FinancePage() {
  const [connection, cashPosition, investorSummary] = await Promise.all([
    getConnectionStatus(),
    getCashPosition(),
    getInvestorSummary(),
  ]);

  return (
    <PageShell
      title="Finance"
      eyebrow="Bilan et tresorerie"
      storeId={connection.storeId}
      notConnected={!connection.connected}
    >
      {/* Bilan mensuel */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Bilan mensuel</p>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Cascade complete avec frais fixes
          </span>
        </div>
        <MonthlyPnl initialPeriod={currentMonthIso()} />
      </section>

      {/* Tresorerie */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 0 }}>Tresorerie</p>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Position globale Cosmos
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
