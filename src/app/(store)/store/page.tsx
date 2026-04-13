import { Metadata } from "next";
import { DailyPulse } from "@/components/store/DailyPulse";
import { getDailyPulse } from "@/lib/data/daily-pulse";
import { getConnectionStatus } from "@/lib/data/connection";
import { PageShell } from "../_shared/PageShell";

export const metadata: Metadata = { title: "Aujourd'hui · Xanal" };
export const dynamic = "force-dynamic";

export default async function StoreHomePage() {
  const [connection, dailyPulse] = await Promise.all([
    getConnectionStatus(),
    getDailyPulse(),
  ]);

  return (
    <PageShell
      title="Aujourd'hui"
      eyebrow="Pouls du jour"
      storeId={connection.storeId}
      notConnected={!connection.connected}
    >
      <DailyPulse data={dailyPulse} />
    </PageShell>
  );
}
