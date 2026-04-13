import Link from "next/link";
import { SidebarNavLink } from "./SidebarNavLink";
import { SidebarSyncActions } from "./SidebarSyncActions";
import { getConnectionStatus } from "@/lib/data/connection";

const YELLOW = "#F0B90B";

const groupLabel: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.3)",
  padding: "0 14px",
  marginBottom: 6,
  marginTop: 18,
};

const divider: React.CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.06)",
  margin: "18px 14px",
};

const NAV_GROUPS: {
  label: string;
  showLabel?: boolean;
  links: { href: string; label: string; exact?: boolean }[];
}[] = [
  {
    label: "Apercu",
    showLabel: false,
    links: [
      { href: "/store", label: "Aujourd'hui", exact: true },
      { href: "/store/performance", label: "Performance" },
    ],
  },
  {
    label: "Finance",
    showLabel: false,
    links: [
      { href: "/store/finance", label: "Finance" },
    ],
  },
  {
    label: "Operations",
    showLabel: false,
    links: [
      { href: "/store/operations", label: "Operations" },
    ],
  },
  {
    label: "Configuration",
    showLabel: true,
    links: [
      { href: "/settings", label: "Parametres" },
    ],
  },
];

export async function StoreSidebar() {
  const connection = await getConnectionStatus();

  return (
    <aside
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: 220,
        flexShrink: 0,
        background: "#111111",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Logo + wordmark */}
      <div
        style={{
          padding: "18px 18px 6px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 5,
            background: YELLOW,
            display: "grid",
            placeItems: "center",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "#000",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          XA
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Xanal
        </span>
      </div>

      {connection.storeId && (
        <div
          style={{
            padding: "4px 18px 10px",
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={connection.storeId}
        >
          {connection.storeId}
        </div>
      )}

      <div style={divider} />

      {/* Nav groups */}
      <nav
        style={{
          flex: 1,
          padding: "0 6px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {group.showLabel ? (
              <p style={groupLabel}>{group.label}</p>
            ) : (
              <div style={{ height: 6 }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.links.map((link) => (
                <SidebarNavLink
                  key={link.href}
                  href={link.href}
                  exact={link.exact}
                >
                  {link.label}
                </SidebarNavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sync actions footer */}
      <div
        style={{
          padding: "14px 12px 10px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            padding: "0 2px 8px",
          }}
        >
          Synchronisation
        </p>
        <SidebarSyncActions connected={connection.connected} />
      </div>

      {/* Legacy dashboard link */}
      <div
        style={{
          padding: "10px 12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "block",
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          Tableau de bord (legacy) →
        </Link>
      </div>
    </aside>
  );
}
