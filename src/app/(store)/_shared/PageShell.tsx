import { formatSyncAge, FRESHNESS, YELLOW } from "./styles";
import type { ReactNode } from "react";

interface Props {
  title: string;
  eyebrow: string;
  /** Optional — if provided, renders a freshness indicator under the title. */
  freshness?: {
    tone: "stable" | "watch" | "risk";
    lastSyncAt: string | null;
  };
  /** Optional — show a small "not connected" call-to-action. */
  notConnected?: boolean;
  /** Optional store identifier to show above the title. */
  storeId?: string | null;
  children: ReactNode;
}

export function PageShell({
  title,
  eyebrow,
  freshness,
  notConnected,
  storeId,
  children,
}: Props) {
  const f = freshness ? FRESHNESS[freshness.tone] : null;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 40px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 40,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 32,
          flexWrap: "wrap",
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
              marginBottom: 10,
            }}
          >
            {eyebrow}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-geist), system-ui, sans-serif",
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: freshness || storeId ? 14 : 0,
            }}
          >
            {title}
          </h1>

          {(freshness || storeId) && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {storeId && (
                <>
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.45)",
                      fontWeight: 500,
                    }}
                  >
                    {storeId}
                  </span>
                  {f && (
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>·</span>
                  )}
                </>
              )}
              {f && freshness && (
                <>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: f.dot,
                      boxShadow: `0 0 8px ${f.glow}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>·</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
                    {formatSyncAge(freshness.lastSyncAt)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {notConnected && (
          <div
            style={{
              background: "rgba(240,185,11,0.06)",
              border: "1px solid rgba(240,185,11,0.2)",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: YELLOW,
                marginBottom: 10,
                opacity: 0.8,
              }}
            >
              Aucune boutique connectee
            </p>
            <a
              href="/api/auth/converty/start"
              style={{
                display: "inline-block",
                background: YELLOW,
                color: "#000",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "var(--font-geist), system-ui, sans-serif",
              }}
            >
              Connecter Converty
            </a>
          </div>
        )}
      </header>

      {children}
    </div>
  );
}
