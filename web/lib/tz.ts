/**
 * Timezone helpers.
 *
 * Needed because several upstream feeds publish a wall-clock time with no
 * offset attached, and `Date.parse` resolves those against the *runtime's*
 * timezone. Vercel runs in UTC, so an Eastern timestamp read that way lands
 * four hours in the past — which is enough to mark every fresh reading stale.
 */

/** Offset of `timeZone` from UTC at `epochMs`, in ms (positive east of UTC). */
export function tzOffsetMs(epochMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(epochMs)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - epochMs;
}

/** True when the string already carries a UTC marker or a numeric offset. */
function hasExplicitOffset(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})\s*$/i.test(value) || /\bGMT\b|\bUTC\b/i.test(value);
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/** Pulls Y/M/D/h/m/s out of the shapes these feeds actually publish. */
function parseNaiveParts(value: string): number[] | null {
  // 2026-09-19T14:30[:00]  /  2026-09-19 14:30[:00]
  const iso = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (iso) {
    return [+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], +(iso[6] ?? 0)];
  }

  // Fri Sep 19 2026 14:30:00  /  Sep 19 2026 14:30
  const wordy = value.match(
    /([A-Za-z]{3})[a-z]*\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (wordy) {
    const month = MONTHS.indexOf(wordy[1].toLowerCase());
    if (month >= 0) {
      return [+wordy[3], month, +wordy[2], +wordy[4], +wordy[5], +(wordy[6] ?? 0)];
    }
  }

  // 09/19/2026 14:30 — month first, as both agencies use North American order.
  const slashed = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})[T ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (slashed) {
    return [+slashed[3], +slashed[1] - 1, +slashed[2], +slashed[4], +slashed[5], +(slashed[6] ?? 0)];
  }

  return null;
}

/**
 * Parses a timestamp that is known to be wall-clock time in `timeZone`.
 *
 * A string carrying its own offset is trusted as-is. Otherwise the components
 * are read as if UTC and then corrected by the zone's offset — resolved twice,
 * because the offset itself depends on the instant and the first guess can land
 * on the wrong side of a daylight-saving boundary.
 *
 * Returns null rather than guessing when the shape isn't recognised.
 */
export function parseZonedTimestamp(
  raw: string | null | undefined,
  timeZone: string,
): number | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value === "") return null;

  if (hasExplicitOffset(value)) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parts = parseNaiveParts(value);
  if (!parts) return null;

  const asUtc = Date.UTC(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]);
  const firstGuess = asUtc - tzOffsetMs(asUtc, timeZone);
  return asUtc - tzOffsetMs(firstGuess, timeZone);
}
