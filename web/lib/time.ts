/**
 * Time formatting, always in the island's timezone rather than the reader's.
 *
 * Someone checking the dashboard from an airport in another timezone wants to
 * know what time it is *at the house*, so every formatter here takes the zone
 * explicitly.
 */

export function formatClock(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(epochMs);
}

export function formatHour(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone }).format(epochMs);
}

export function formatDate(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(epochMs);
}

export function formatWeekday(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(epochMs);
}

export function formatDayMonth(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(epochMs);
}

/** True when `epochMs` falls on today's date in `timeZone`. */
export function isToday(epochMs: number, timeZone: string, now = Date.now()): boolean {
  const day = (value: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(value);
  return day(epochMs) === day(now);
}

/**
 * "6 minutes ago" / "just now". Returns null for a missing timestamp so callers
 * can decide what to render instead.
 */
export function relativeTime(epochMs: number | null, now = Date.now()): string | null {
  if (epochMs == null || !Number.isFinite(epochMs)) return null;
  const seconds = Math.round((now - epochMs) / 1000);

  if (seconds < 0) return "just now";
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 minute ago";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
