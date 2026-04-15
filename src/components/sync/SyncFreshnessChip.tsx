"use client";

import { useEffect, useState } from "react";
import { useSyncStatus } from "./SyncStatusContext";

const YELLOW = "#F0B90B";
const GREEN = "#0ECB81";
const MUTED = "rgba(255,255,255,0.5)";
const TICK_INTERVAL_MS = 30_000;

function formatAge(lastSyncAt: string | null, now: number): string {
  if (!lastSyncAt) return "Jamais synchronisé";
  const ageSec = Math.max(0, Math.floor((now - new Date(lastSyncAt).getTime()) / 1000));
  if (ageSec < 60) return "Sync. à l'instant";
  const mins = Math.floor(ageSec / 60);
  if (mins < 60) return `Sync. il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Sync. il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Sync. il y a ${days} j`;
}

interface Props {
  variant?: "dark" | "light";
}

export function SyncFreshnessChip({ variant = "dark" }: Props) {
  const { lastSyncAt, phase } = useSyncStatus();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const isDark = variant === "dark";
  const baseBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const baseBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
  const baseColor = isDark ? MUTED : "rgba(0,0,0,0.55)";

  let label: string;
  let dotColor: string;
  let pulse = false;

  if (phase === "syncing" || phase === "checking") {
    label = "Synchronisation…";
    dotColor = YELLOW;
    pulse = true;
  } else if (phase === "just-updated") {
    label = "Actualisé";
    dotColor = GREEN;
  } else {
    label = formatAge(lastSyncAt, now);
    dotColor = lastSyncAt ? GREEN : MUTED;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: baseBg,
        border: baseBorder,
        borderRadius: 999,
        padding: "5px 10px 5px 9px",
        fontSize: 11,
        fontWeight: 500,
        color: baseColor,
        fontFamily: "var(--font-geist), system-ui, sans-serif",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
      title={lastSyncAt ? `Dernière synchronisation: ${new Date(lastSyncAt).toLocaleString("fr-FR")}` : "Aucune synchronisation enregistrée"}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
          animation: pulse ? "xanal-sync-pulse 1.2s ease-in-out infinite" : undefined,
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
      <style>{`
        @keyframes xanal-sync-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
