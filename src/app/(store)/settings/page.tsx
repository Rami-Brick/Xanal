import { Metadata } from "next";
import Link from "next/link";
import {
  getBusinessSettings,
  getProductCosts,
  getOverheadForPeriod,
} from "@/lib/data/settings";
import { SettingsForm } from "./settings-form";
import { CampaignsSection } from "./campaigns-section";

export const metadata: Metadata = { title: "Parametres · Xanal" };
export const dynamic = "force-dynamic";

const YELLOW = "#F0B90B";

function currentMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function SettingsPage() {
  const initialPeriod = currentMonthIso();
  const [settings, productCosts, initialOverhead] = await Promise.all([
    getBusinessSettings(),
    getProductCosts(),
    getOverheadForPeriod(initialPeriod),
  ]);

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#111111",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: YELLOW,
                display: "grid",
                placeItems: "center",
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#000",
                textTransform: "uppercase",
              }}
            >
              XA
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.22)",
              }}
            >
              Xanal
            </span>
          </div>

          <Link
            href="/store"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(255,255,255,0.38)",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            ← Ma boutique
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px 96px",
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
              marginBottom: 12,
            }}
          >
            Configuration
          </p>
          <h1
            style={{
              fontFamily: "var(--font-geist), system-ui, sans-serif",
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#fff",
            }}
          >
            Parametres
          </h1>
        </div>

        <SettingsForm
          initialSettings={settings}
          initialProductCosts={productCosts}
          initialOverhead={initialOverhead}
        />

        <CampaignsSection initialPeriod={initialPeriod} products={productCosts} />
      </main>
    </>
  );
}
