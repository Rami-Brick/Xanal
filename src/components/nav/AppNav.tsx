"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SyncFreshnessChip } from "@/components/sync/SyncFreshnessChip";

const NAV_ITEMS = [
  { href: "/store", label: "Ma boutique" },
  { href: "/dashboard", label: "Vue d'ensemble" },
  { href: "/orders", label: "Commandes" },
  { href: "/products", label: "Produits" },
  { href: "/sync", label: "Sync" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header
      className="app-nav-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "#111111",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @media (max-width: 767px) {
          .app-nav-header {
            position: fixed !important;
            left: 0;
            right: 0;
            top: 0;
          }
        }
      `}</style>
      <div
        className="app-nav-row"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <style>{`
          .app-nav-row {
            padding: 0 24px;
            height: 52px;
          }
          .app-nav-links {
            display: flex;
            align-items: center;
            gap: 2px;
            min-width: 0;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .app-nav-links::-webkit-scrollbar { display: none; }
          @media (max-width: 767px) {
            .app-nav-row {
              padding: 8px 14px;
              height: auto;
              flex-wrap: wrap;
              gap: 10px;
            }
            .app-nav-links {
              order: 3;
              width: 100%;
              padding-bottom: 2px;
            }
            .app-nav-brand { flex-shrink: 0; }
            .app-nav-trailing { margin-left: auto; }
          }
        `}</style>
        {/* Brand */}
        <div className="app-nav-brand" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: "#fff",
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
              color: "rgba(255,255,255,0.25)",
            }}
          >
            Xanal
          </span>
        </div>

        {/* Nav links */}
        <nav className="app-nav-links">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  letterSpacing: "0.01em",
                  color: active ? "#fff" : "rgba(255,255,255,0.38)",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  borderRadius: 6,
                  padding: "4px 10px",
                  textDecoration: "none",
                  transition: "color 0.12s, background 0.12s",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Freshness + logout */}
        <div className="app-nav-trailing" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <SyncFreshnessChip variant="dark" />
          <LogoutButton variant="nav" />
        </div>
      </div>
    </header>
  );
}
