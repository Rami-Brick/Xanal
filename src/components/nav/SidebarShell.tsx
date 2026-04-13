"use client";

import { Children, isValidElement, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const YELLOW = "#F0B90B";

/**
 * Shell that arranges a sidebar + main with responsive behavior.
 *
 * Expects exactly two children:
 *  - children[0] = the sidebar element
 *  - children[1] = the main content element
 *
 * Desktop (>=768px): horizontal flex row (sidebar + main).
 * Mobile (<768px): sticky top bar with hamburger; sidebar becomes an
 * off-canvas drawer; main takes full width.
 *
 * Uses CSS media queries (not JS) for the layout breakpoint so SSR renders
 * correctly without hydration flicker. Only drawer open/close state is JS.
 */
export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc closes drawer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const kids = Children.toArray(children).filter(isValidElement);
  const sidebar = kids[0];
  const main = kids[1];

  return (
    <>
      {/* Mobile-only top bar (hidden on desktop) */}
      <div className="xs-topbar">
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            padding: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="19" y2="6" />
            <line x1="3" y1="11" x2="19" y2="11" />
            <line x1="3" y1="16" x2="19" y2="16" />
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Xanal
          </span>
        </div>
      </div>

      {/* Backdrop (mobile only, when open) */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className="xs-backdrop"
        data-open={open ? "1" : "0"}
      />

      {/* Layout: row on desktop, sidebar overlay on mobile */}
      <div className="xs-layout">
        <div
          className="xs-sidebar"
          data-open={open ? "1" : "0"}
        >
          {sidebar}
        </div>
        <div className="xs-main">{main}</div>
      </div>

      <style>{`
        /* Mobile top bar hidden by default (desktop) */
        .xs-topbar { display: none; }

        /* Desktop: simple flex row, sidebar inline */
        .xs-layout {
          display: flex;
          align-items: flex-start;
        }
        .xs-sidebar { }
        .xs-main {
          flex: 1;
          min-width: 0;
          min-height: 100vh;
        }

        /* Backdrop hidden on desktop */
        .xs-backdrop { display: none; }

        @media (max-width: 767px) {
          .xs-topbar {
            position: sticky;
            top: 0;
            z-index: 30;
            height: 52px;
            background: #111111;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 12px;
          }

          .xs-layout {
            display: block;
          }

          .xs-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 60;
            transform: translateX(-100%);
            transition: transform 0.22s ease-out;
            box-shadow: none;
          }
          .xs-sidebar[data-open="1"] {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          }

          .xs-backdrop[data-open="1"] {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            z-index: 50;
          }

          .xs-main {
            width: 100%;
            flex: initial;
          }
        }
      `}</style>
    </>
  );
}
