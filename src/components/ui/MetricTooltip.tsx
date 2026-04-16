"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Props {
  /** Plain-language explanation of what the metric means. */
  meaning: string;
  /** Optional formula in pseudo-code. Rendered in a monospace block. */
  formula?: string;
  /** Optional thresholds / notes appended below the formula. */
  notes?: string;
  /** Visual variant — dark for store surface, light for dashboard. */
  variant?: "dark" | "light";
}

/**
 * Small "?" icon that reveals a metric reference popover on hover (desktop)
 * or tap (mobile). Closes on outside click, Escape, or scroll.
 */
export function MetricTooltip({ meaning, formula, notes, variant = "dark" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const isDark = variant === "dark";
  const iconBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const iconColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const panelBg = isDark ? "#1a1a1a" : "#ffffff";
  const panelBorder = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)";
  const panelText = isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.8)";
  const panelMuted = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)";
  const codeBg = isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.04)";
  const codeColor = isDark ? "rgba(240,185,11,0.95)" : "rgba(0,0,0,0.75)";

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      <button
        type="button"
        aria-label="Voir l'explication"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(true);
        }}
        onMouseLeave={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(false);
        }}
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: iconBg,
          color: iconColor,
          border: "none",
          fontSize: 9,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          marginLeft: 6,
          lineHeight: 1,
          flexShrink: 0,
          transition: "background 0.12s, color 0.12s",
        }}
      >
        ?
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "block",
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 100,
            width: "min(320px, calc(100vw - 32px))",
            background: panelBg,
            border: panelBorder,
            borderRadius: 10,
            padding: "12px 14px",
            boxShadow: isDark
              ? "0 12px 32px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)"
              : "0 12px 32px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)",
            fontFamily: "var(--font-geist), 'Inter', system-ui, sans-serif",
            textTransform: "none",
            letterSpacing: "normal",
            fontWeight: 400,
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: 12,
              lineHeight: 1.45,
              color: panelText,
              margin: 0,
            }}
          >
            {meaning}
          </span>
          {formula && (
            <pre
              style={{
                marginTop: 10,
                marginBottom: 0,
                background: codeBg,
                border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
                borderRadius: 6,
                padding: "8px 10px",
                fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                fontSize: 11,
                lineHeight: 1.45,
                color: codeColor,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflow: "auto",
                maxHeight: 200,
              }}
            >
              {formula}
            </pre>
          )}
          {notes && (
            <span
              style={{
                display: "block",
                fontSize: 11,
                lineHeight: 1.45,
                color: panelMuted,
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              {notes}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
