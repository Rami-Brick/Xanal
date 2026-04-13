"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const YELLOW = "#F0B90B";

interface Props {
  href: string;
  children: React.ReactNode;
  /**
   * If true, only highlight when pathname is exactly `href`.
   * Default: highlight also when pathname starts with `href`.
   */
  exact?: boolean;
  icon?: React.ReactNode;
}

export function SidebarNavLink({ href, children, exact, icon }: Props) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
        textDecoration: "none",
        borderRadius: 8,
        background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
        borderLeft: isActive
          ? `2px solid ${YELLOW}`
          : "2px solid transparent",
        paddingLeft: isActive ? 12 : 14,
        transition: "background 0.12s, color 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {icon && (
        <span
          style={{
            display: "inline-flex",
            opacity: isActive ? 1 : 0.5,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </Link>
  );
}
