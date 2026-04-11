"use client";

import { useState } from "react";

const YELLOW = "#F0B90B";
const GREEN = "#0ECB81";

const RANGE_OPTIONS = [
  { label: "7 j", days: 7 },
  { label: "14 j", days: 14 },
  { label: "30 j", days: 30 },
] as const;

interface TrendPoint {
  date: string;
  label: string;
  orders: number;
  deliveredOrders: number;
  deliveredRevenue: number;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: n >= 1000 ? 0 : 1,
  }).format(n);
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const [range, setRange] = useState(14);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const visible = data.slice(-range);

  const W = 720;
  const H = 200;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 30;
  const PAD_LEFT = 4;
  const PAD_RIGHT = 4;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const barCount = visible.length;
  const barGap = Math.max(range <= 14 ? 6 : 3, 2);
  const barWidth = Math.max((chartW - barGap * (barCount - 1)) / barCount, 4);

  const maxOrders = Math.max(...visible.map((d) => d.orders), 1);
  const maxRevenue = Math.max(...visible.map((d) => d.deliveredRevenue), 1);

  const revenuePoints = visible
    .map((d, i) => {
      const x = PAD_LEFT + i * (barWidth + barGap) + barWidth / 2;
      const y = PAD_TOP + chartH - (maxRevenue > 0 ? (d.deliveredRevenue / maxRevenue) * chartH : 0);
      return `${x},${y}`;
    })
    .join(" ");

  const hovered = hoveredIdx !== null ? visible[hoveredIdx] : null;

  return (
    <div>
      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: "rgba(240,185,11,0.25)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Commandes</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 12,
                height: 2,
                borderRadius: 1,
                background: GREEN,
                display: "inline-block",
                opacity: 0.7,
              }}
            />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Revenu livre</span>
          </span>
        </div>

        {/* Range selector */}
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => { setRange(opt.days); setHoveredIdx(null); }}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-geist), system-ui, sans-serif",
                background: range === opt.days ? "rgba(255,255,255,0.1)" : "transparent",
                color: range === opt.days ? "#fff" : "rgba(255,255,255,0.3)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart card */}
      <div
        style={{
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: "16px 16px 8px",
          position: "relative",
        }}
      >
        {/* Tooltip */}
        {hovered && hoveredIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 16,
              background: "rgba(20,20,20,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 14px",
              zIndex: 10,
              pointerEvents: "none",
              minWidth: 160,
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              {hovered.label}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Commandes</span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 13,
                    fontWeight: 500,
                    color: YELLOW,
                  }}
                >
                  {hovered.orders}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Livrees</span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#fff",
                  }}
                >
                  {hovered.deliveredOrders}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Revenu</span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
                    fontSize: 13,
                    fontWeight: 500,
                    color: GREEN,
                  }}
                >
                  {fmtCurrency(hovered.deliveredRevenue)}
                </span>
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {visible.map((d, i) => {
            const x = PAD_LEFT + i * (barWidth + barGap);
            const barH = maxOrders > 0 ? (d.orders / maxOrders) * chartH : 0;
            const y = PAD_TOP + chartH - barH;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredIdx(i)}
                style={{ cursor: "pointer" }}
              >
                {/* Invisible hit area (full column height) */}
                <rect
                  x={x - barGap / 2}
                  y={0}
                  width={barWidth + barGap}
                  height={H}
                  fill="transparent"
                />
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill={isHovered ? "rgba(240,185,11,0.5)" : "rgba(240,185,11,0.25)"}
                  style={{ transition: "fill 0.1s" }}
                />
                {/* Date label */}
                <text
                  x={x + barWidth / 2}
                  y={H - 4}
                  textAnchor="middle"
                  fill={isHovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)"}
                  fontSize={range <= 14 ? 9 : 7}
                  fontFamily="var(--font-geist), system-ui, sans-serif"
                >
                  {d.label.split(" ")[0]}
                </text>
                {/* Order count above bar (only on hover or when range <= 14) */}
                {d.orders > 0 && (isHovered || range <= 14) && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fill={isHovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)"}
                    fontSize={9}
                    fontFamily="var(--font-geist-mono), monospace"
                    fontWeight={isHovered ? 600 : 400}
                  >
                    {d.orders}
                  </text>
                )}
              </g>
            );
          })}

          {/* Revenue line */}
          {maxRevenue > 0 && (
            <polyline
              points={revenuePoints}
              fill="none"
              stroke={GREEN}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}

          {/* Revenue dots on hover */}
          {hoveredIdx !== null && visible[hoveredIdx] && (
            <circle
              cx={PAD_LEFT + hoveredIdx * (barWidth + barGap) + barWidth / 2}
              cy={
                PAD_TOP +
                chartH -
                (maxRevenue > 0
                  ? (visible[hoveredIdx].deliveredRevenue / maxRevenue) * chartH
                  : 0)
              }
              r={4}
              fill={GREEN}
              stroke="#141414"
              strokeWidth={2}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
