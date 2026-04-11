export const ALWAYS_TERMINAL_STATUSES = ["delivered", "returned"] as const;

export type AlwaysTerminalStatus = (typeof ALWAYS_TERMINAL_STATUSES)[number];

const REJECTED_TERMINAL_DELAY_MS = 24 * 60 * 60 * 1000;

// History entries from Converty can look like:
//   { status: "rejected", date: "2026-04-08T10:00:00.000Z" }
//   { status: "rejected", createdAt: "2026-04-08T10:00:00.000Z" }
//   { state: "rejected", date: "..." }
// We handle all known shapes defensively.
interface HistoryEntry {
  status?: string;
  state?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Given a Converty order's history array, returns the timestamp when
 * the order last transitioned INTO "rejected" status, or null if not found.
 */
export function getRejectedEnteredAt(history: unknown): Date | null {
  if (!Array.isArray(history) || history.length === 0) {
    return null;
  }

  // Walk entries in reverse to find the most recent rejection entry
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i] as HistoryEntry;
    if (!entry || typeof entry !== "object") continue;

    const entryStatus = entry.status ?? entry.state ?? "";
    if (entryStatus !== "rejected") continue;

    const rawDate = entry.date ?? entry.createdAt ?? entry.updatedAt ?? null;
    if (!rawDate) continue;

    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/**
 * Returns true if a "rejected" order has been in that status
 * for at least 24 hours, making it terminal.
 */
export function isRejectedTerminal(
  rejectedAt: Date | null,
  now = new Date()
): boolean {
  if (!rejectedAt) return false;
  return now.getTime() - rejectedAt.getTime() >= REJECTED_TERMINAL_DELAY_MS;
}

/**
 * The single source of truth for whether an order is terminal.
 *
 * Terminal orders:
 * - "delivered" or "returned" (always terminal)
 * - "rejected" that entered that status >= 24 hours ago
 *
 * Non-terminal orders:
 * - everything else
 * - "rejected" if it entered rejected < 24 hours ago
 */
export function isTerminalOrder(
  status: string,
  history: unknown,
  now = new Date()
): boolean {
  if (status === "delivered" || status === "returned") return true;
  if (status !== "rejected") return false;

  return isRejectedTerminal(getRejectedEnteredAt(history), now);
}

/**
 * Returns the list of non-terminal statuses that incremental sync
 * must always re-check. Note: "rejected" is handled separately via
 * the 24h rule and is not in this static list.
 */
export const NON_TERMINAL_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "shipped",
  "processing",
  "on_hold",
  "draft",
] as const;
