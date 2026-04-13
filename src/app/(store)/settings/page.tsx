import { Metadata } from "next";
import {
  getBusinessSettings,
  getProductCosts,
  getOverheadForPeriod,
} from "@/lib/data/settings";
import { getConnectionStatus } from "@/lib/data/connection";
import { PageShell } from "../_shared/PageShell";
import { SettingsForm } from "./settings-form";
import { CampaignsSection } from "./campaigns-section";
import { SettlementsSection } from "./settlements-section";
import { InvestorsSection } from "./investors-section";

export const metadata: Metadata = { title: "Parametres · Xanal" };
export const dynamic = "force-dynamic";

function currentMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function SettingsPage() {
  const initialPeriod = currentMonthIso();
  const [connection, settings, productCosts, initialOverhead] = await Promise.all([
    getConnectionStatus(),
    getBusinessSettings(),
    getProductCosts(),
    getOverheadForPeriod(initialPeriod),
  ]);

  return (
    <PageShell
      title="Parametres"
      eyebrow="Configuration"
      storeId={connection.storeId}
    >
      <SettingsForm
        initialSettings={settings}
        initialProductCosts={productCosts}
        initialOverhead={initialOverhead}
      />

      <CampaignsSection initialPeriod={initialPeriod} products={productCosts} />

      <SettlementsSection />

      <InvestorsSection products={productCosts} />
    </PageShell>
  );
}
