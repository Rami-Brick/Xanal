/**
 * Builds Converty date-range query parameters.
 *
 * Converty supports: range[from]=<ISO> and range[to]=<ISO>
 * Verified from Api.txt: range[from]=2026-04-06T23:00:00.000Z&range[to]=2026-04-07T23:00:00.000Z
 */
export function buildDateRangeParams(
  from: Date,
  to: Date
): Record<string, string> {
  return {
    "range[from]": from.toISOString(),
    "range[to]": to.toISOString(),
  };
}

/**
 * Returns a Date that is `hours` hours before `now`.
 */
export function hoursAgo(hours: number, now = new Date()): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

/**
 * Returns a Date that is `days` days before `now`.
 */
export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
