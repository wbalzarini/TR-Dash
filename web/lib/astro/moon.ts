/**
 * Moon position, phase, rise/set and solunar periods.
 *
 * All computed, never fetched. None of the weather or water APIs this app uses
 * publishes lunar data, and solunar periods are derived from the moon's
 * position rather than reported anywhere — so the alternative to computing them
 * is not having them.
 *
 * Accuracy: the lunar series here is the standard low-precision truncation
 * (Meeus, *Astronomical Algorithms*, ch. 47), good to roughly 0.2°, which puts
 * rise and set times within a few minutes. That is far finer than the hour-wide
 * windows the fishing engine reasons about, and this is a fishing dashboard
 * rather than an almanac.
 */

const DEG = Math.PI / 180;
const J2000 = 2451545.0;

const sin = (deg: number) => Math.sin(deg * DEG);
const cos = (deg: number) => Math.cos(deg * DEG);
const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

const toJulian = (epochMs: number) => epochMs / 86_400_000 + 2440587.5;

// ── Timezone helpers ─────────────────────────────────────────────────────────

/** Offset of `timeZone` from UTC at `epochMs`, in ms (positive east). */
function tzOffsetMs(epochMs: number, timeZone: string): number {
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
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
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

/** Epoch ms of local midnight for the day containing `epochMs`. */
export function startOfLocalDay(epochMs: number, timeZone: string): number {
  const offset = tzOffsetMs(epochMs, timeZone);
  const shifted = new Date(epochMs + offset);
  const midnightAsUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return midnightAsUtc - offset;
}

// ── Positions ────────────────────────────────────────────────────────────────

/** Apparent ecliptic longitude of the sun, degrees. */
function sunLongitude(jd: number): number {
  const n = jd - J2000;
  const meanLon = 280.459 + 0.98564736 * n;
  const meanAnom = 357.529 + 0.98560028 * n;
  return norm360(meanLon + 1.915 * sin(meanAnom) + 0.02 * sin(2 * meanAnom));
}

type Equatorial = { ra: number; dec: number };

/** Moon right ascension and declination, degrees. */
function moonEquatorial(jd: number): Equatorial & { lambda: number } {
  const t = (jd - J2000) / 36525;

  const lp = 218.316 + 481267.8813 * t; // mean longitude
  const m = 357.529 + 35999.0503 * t; // sun mean anomaly
  const mp = 134.963 + 477198.8676 * t; // moon mean anomaly
  const d = 297.85 + 445267.1115 * t; // mean elongation
  const f = 93.272 + 483202.0175 * t; // argument of latitude

  const lambda =
    lp +
    6.289 * sin(mp) +
    1.274 * sin(2 * d - mp) +
    0.658 * sin(2 * d) +
    0.214 * sin(2 * mp) -
    0.186 * sin(m) -
    0.114 * sin(2 * f);

  const beta =
    5.128 * sin(f) +
    0.281 * sin(mp + f) -
    0.278 * sin(f - mp) +
    0.176 * sin(2 * d - f);

  const eps = 23.439 - 0.0000004 * (jd - J2000);

  const y = sin(lambda) * cos(eps) - Math.tan(beta * DEG) * sin(eps);
  const x = cos(lambda);
  const ra = norm360(Math.atan2(y, x) / DEG);
  const dec =
    Math.asin(sin(beta) * cos(eps) + cos(beta) * sin(eps) * sin(lambda)) / DEG;

  return { ra, dec, lambda: norm360(lambda) };
}

/** Moon altitude above the horizon, degrees. */
function moonAltitude(epochMs: number, latitude: number, longitude: number): number {
  const jd = toJulian(epochMs);
  const { ra, dec } = moonEquatorial(jd);
  const gmst = 280.46061837 + 360.98564736629 * (jd - J2000);
  const hourAngle = norm360(gmst + longitude - ra);
  return (
    Math.asin(
      sin(latitude) * sin(dec) + cos(latitude) * cos(dec) * cos(hourAngle),
    ) / DEG
  );
}

// ── Phase ────────────────────────────────────────────────────────────────────

export type MoonPhase = {
  /** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
  fraction: number;
  /** Illuminated fraction of the disc, 0–1. */
  illumination: number;
  name: string;
};

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
] as const;

export function moonPhase(epochMs: number): MoonPhase {
  const jd = toJulian(epochMs);
  // Elongation from the sun is the phase; deriving it this way rather than from
  // a fixed new-moon epoch keeps it correct across the whole year.
  const elongation = norm360(moonEquatorial(jd).lambda - sunLongitude(jd));
  const fraction = elongation / 360;
  const illumination = (1 - cos(elongation)) / 2;

  // Name by eighths, with the four exact phases getting a narrow band.
  const eighth = Math.floor((fraction + 1 / 16) * 8) % 8;
  return { fraction, illumination, name: PHASE_NAMES[eighth] };
}

// ── Rise, set and transit ────────────────────────────────────────────────────

/**
 * Standard altitude of moonrise/set: refraction and semidiameter, less
 * horizontal parallax. Meeus gives 0.125°.
 */
const MOONRISE_ALTITUDE = 0.125;

const STEP_MS = 5 * 60 * 1000;

export type MoonTimes = {
  rise: number | null;
  set: number | null;
  /** Moon at its highest — directly overhead. A solunar major period. */
  transit: number | null;
  /** Moon at its lowest — on the far side of the earth. The other major. */
  underfoot: number | null;
  /** True when the moon never crosses the horizon during the day. */
  alwaysUp: boolean;
  alwaysDown: boolean;
};

/** Linear interpolation for the instant altitude crosses `target`. */
function crossing(t0: number, a0: number, t1: number, a1: number, target: number) {
  return t0 + ((target - a0) / (a1 - a0)) * (t1 - t0);
}

/** Moon events for the local day containing `epochMs`. */
export function moonTimes(
  epochMs: number,
  latitude: number,
  longitude: number,
  timeZone: string,
): MoonTimes {
  const start = startOfLocalDay(epochMs, timeZone);
  const end = start + 24 * 60 * 60 * 1000;

  let rise: number | null = null;
  let set: number | null = null;
  let transit: number | null = null;
  let underfoot: number | null = null;
  let maxAlt = -Infinity;
  let minAlt = Infinity;
  let everUp = false;
  let everDown = false;

  let prevT = start;
  let prevA = moonAltitude(start, latitude, longitude);

  for (let t = start + STEP_MS; t <= end; t += STEP_MS) {
    const a = moonAltitude(t, latitude, longitude);

    if (a > MOONRISE_ALTITUDE) everUp = true;
    else everDown = true;

    if (rise === null && prevA <= MOONRISE_ALTITUDE && a > MOONRISE_ALTITUDE) {
      rise = crossing(prevT, prevA, t, a, MOONRISE_ALTITUDE);
    }
    if (set === null && prevA > MOONRISE_ALTITUDE && a <= MOONRISE_ALTITUDE) {
      set = crossing(prevT, prevA, t, a, MOONRISE_ALTITUDE);
    }
    if (a > maxAlt) {
      maxAlt = a;
      transit = t;
    }
    if (a < minAlt) {
      minAlt = a;
      underfoot = t;
    }

    prevT = t;
    prevA = a;
  }

  return {
    rise,
    set,
    transit,
    underfoot,
    alwaysUp: everUp && !everDown,
    alwaysDown: everDown && !everUp,
  };
}

// ── Solunar periods ──────────────────────────────────────────────────────────

export type SolunarPeriod = {
  kind: "major" | "minor";
  label: string;
  start: number;
  end: number;
};

/**
 * Solunar theory: fish activity peaks when the moon is overhead or underfoot
 * (major periods, taken as two hours) and again at moonrise and moonset (minor
 * periods, one hour). It is folklore with some observational support rather
 * than settled science, which is why it is one weighted input here and not the
 * whole score.
 */
export function solunarPeriods(times: MoonTimes): SolunarPeriod[] {
  const periods: SolunarPeriod[] = [];
  const push = (
    kind: SolunarPeriod["kind"],
    label: string,
    centre: number | null,
    hours: number,
  ) => {
    if (centre == null) return;
    const half = (hours / 2) * 60 * 60 * 1000;
    periods.push({ kind, label, start: centre - half, end: centre + half });
  };

  push("major", "Moon overhead", times.transit, 2);
  push("major", "Moon underfoot", times.underfoot, 2);
  push("minor", "Moonrise", times.rise, 1);
  push("minor", "Moonset", times.set, 1);

  return periods.sort((a, b) => a.start - b.start);
}

/**
 * How strongly solunar theory favours a given instant, 0–1.
 *
 * Inside a major period this is 1, inside a minor 0.6, and it falls away over
 * the hour either side rather than switching off at the boundary — fish do not
 * read clocks.
 */
export function solunarStrength(at: number, periods: SolunarPeriod[]): number {
  const taper = 60 * 60 * 1000;
  let best = 0;

  for (const p of periods) {
    const peak = p.kind === "major" ? 1 : 0.6;
    let value: number;
    if (at >= p.start && at <= p.end) {
      value = peak;
    } else {
      const distance = at < p.start ? p.start - at : at - p.end;
      value = distance >= taper ? 0 : peak * (1 - distance / taper) * 0.5;
    }
    if (value > best) best = value;
  }

  return best;
}
