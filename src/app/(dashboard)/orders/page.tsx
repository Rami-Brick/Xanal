import { Metadata } from "next";
import { getOrdersPageData } from "@/lib/data/orders";

export const metadata: Metadata = { title: "Commandes Â· Xanal" };
export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  background: "#141414",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  boxShadow: "0 12px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)",
  padding: "22px 24px",
};

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.3)",
  marginBottom: 6,
};

const bigNumber: React.CSSProperties = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: 38,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  color: "#fff",
};

const hint: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.3)",
  marginTop: 6,
  lineHeight: 1.4,
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function Bar({ value, max, accent = false }: { value: number; max: number; accent?: boolean }) {
  const w = max > 0 ? Math.max((value / max) * 100, 2) : 2;
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
      <div
        style={{
          height: "100%",
          width: `${w}%`,
          background: accent ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)",
          borderRadius: 99,
        }}
      />
    </div>
  );
}

export default async function OrdersPage() {
  const d = await getOrdersPageData();

  const maxStatus = Math.max(...d.byStatus.map((s) => s.count), 1);
  const maxCompany = Math.max(...d.byDeliveryCompany.map((c) => c.count), 1);
  const splitMax = Math.max(...d.activeVsTerminalSplit.map((s) => s.count), 1);
  const drrMax = Math.max(...d.deliveredVsReturnedVsRejected.map((s) => s.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Page title */}
      <div>
        <p style={eyebrow}>Commandes</p>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#111", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Distribution des commandes
        </h1>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "Total", value: fmt(d.totalOrders), sub: "hors tests" },
          { label: "Actives", value: fmt(d.activeOrders), sub: "pipeline en cours" },
          { label: "Terminales", value: fmt(d.terminalOrders), sub: "livrÃ©es / retournÃ©es / rejetÃ©es" },
          {
            label: "Taux terminal",
            value: d.totalOrders > 0 ? `${Math.round((d.terminalOrders / d.totalOrders) * 100)} %` : "â€”",
            sub: "commandes rÃ©solues",
          },
        ].map(({ label, value, sub }) => (
          <div key={label} style={card}>
            <p style={eyebrow}>{label}</p>
            <p style={bigNumber}>{value}</p>
            <p style={hint}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column: status breakdown + active vs terminal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Status breakdown */}
        <div style={{ ...card, padding: "24px 28px" }}>
          <p style={{ ...eyebrow, marginBottom: 20 }}>RÃ©partition par statut</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {d.byStatus.map(({ label, count }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{label}</span>
                  <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 500, color: "#fff", letterSpacing: "-0.01em" }}>
                    {fmt(count)}
                  </span>
                </div>
                <Bar value={count} max={maxStatus} />
              </div>
            ))}
          </div>
        </div>

        {/* Splits */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Active vs terminal */}
          <div style={{ ...card, padding: "24px 28px" }}>
            <p style={{ ...eyebrow, marginBottom: 16 }}>Actif vs Terminal</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {d.activeVsTerminalSplit.map(({ label, count, pct }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 500, color: "#fff" }}>{fmt(count)}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{Math.round(pct)} %</span>
                    </div>
                  </div>
                  <Bar value={count} max={splitMax} accent={label === "Actives"} />
                </div>
              ))}
            </div>
          </div>

          {/* Delivered / returned / rejected */}
          <div style={{ ...card, padding: "24px 28px" }}>
            <p style={{ ...eyebrow, marginBottom: 16 }}>LivrÃ© / RetournÃ© / RejetÃ©</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {d.deliveredVsReturnedVsRejected.map(({ label, count, pct }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 500, color: "#fff" }}>{fmt(count)}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{Math.round(pct)} %</span>
                    </div>
                  </div>
                  <Bar value={count} max={drrMax} accent={label === "LivrÃ©es"} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery company distribution */}
      {d.byDeliveryCompany.length > 0 && (
        <div style={{ ...card, padding: "24px 28px" }}>
          <p style={{ ...eyebrow, marginBottom: 20 }}>Distribution par transporteur</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {d.byDeliveryCompany.map(({ company, count }) => (
              <div key={company}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%" }}>
                    {company}
                  </span>
                  <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 500, color: "#fff", flexShrink: 0 }}>
                    {fmt(count)}
                  </span>
                </div>
                <Bar value={count} max={maxCompany} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
