/**
 * Shared sync freshness thresholds.
 *
 * Two separate rules exist intentionally:
 *
 * BACKGROUND_SYNC_STALE_MS — how old data must be before the app
 *   auto-refreshes in the background on page open. Short, because
 *   we want the user to always see reasonably current data.
 *
 * STORE_WATCH_STALE_MS — how old a per-store sync must be before the
 *   /sync page shows a "À rafraîchir" warning. Longer, because this
 *   reflects a meaningful gap in the business day, not just normal
 *   browsing between syncs.
 */
export const BACKGROUND_SYNC_STALE_MS = 15 * 60 * 1000; // 15 minutes
export const STORE_WATCH_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Tab-level guard: don't re-trigger background sync within this window */
export const TAB_GUARD_MS = 5 * 60 * 1000; // 5 minutes

/** How often the background sync provider re-checks freshness while the tab is visible */
export const BACKGROUND_SYNC_POLL_MS = 60 * 1000; // 60 seconds
