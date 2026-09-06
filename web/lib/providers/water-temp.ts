/**
 * St. Lawrence River water temperature.
 *
 * Two official sources are tried in order, and the first one that returns a
 * usable reading wins:
 *
 *   1. NOAA CO-OPS station 8311062, Alexandria Bay NY (NDBC ALXN6) — about 5 km
 *      from the island, sampling every six minutes and publishing °F directly.
 *      https://tidesandcurrents.noaa.gov/stationhome.html?id=8311062
 *   2. USGS Water Services, parameter 00010 — the gauges at Alexandria Bay
 *      (04260800) and Ogdensburg (04264000), then a geographic search.
 *      https://waterservices.usgs.gov/docs/instantaneous-values/
 *
 * Neither needs a key. Two independent agencies rather than one because a
 * single river-temperature feed is a single point of failure, and a seasonal
 * sensor outage at one gauge shouldn't blank the card.
 *
 * If every source misses, this throws with what each one said, the section
 * reports unavailable, and the card prints the reason. Nothing is ever
 * estimated from air temperature or anything else.
 *
 * This is the only file that knows NOAA or USGS exist.
 */

import { config } from "../config";
import { fetchWithTimeout, HttpError, logInfo } from "../logger";
import { celsiusToFahrenheit } from "../units";
import type { Trend, WaterTemperature, WaterTempReading } from "../types";

/** USGS parameter code for water temperature, °C. */
const WATER_TEMP_PARAMETER = "00010";

/** USGS gauges on this stretch, tried by number before any area search. */
const DEFAULT_USGS_SITES = [
  "04260800", // St. Lawrence River at Alexandria Bay NY
  "04264000", // St. Lawrence River at Ogdensburg NY
];

/** Half-width of the USGS discovery box, in degrees (~65 km). */
const SEARCH_BOX_DEGREES = 0.6;

/** Below this much movement over the window, call it steady. */
const TREND_THRESHOLD_F = 0.4;

const TREND_WINDOW_HOURS = 6;

/** A river between freezing and 40 °C; outside that is a bad reading. */
const MIN_PLAUSIBLE_F = 28;
const MAX_PLAUSIBLE_F = 104;

type Candidate = {
  readings: WaterTempReading[];
  name: string;
  id: string;
  distanceKm: number | null;
  onTheRiver: boolean;
  provider: WaterTemperature["provider"];
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const plausible = (f: number) => Number.isFinite(f) && f >= MIN_PLAUSIBLE_F && f <= MAX_PLAUSIBLE_F;

const mentionsStLawrence = (name: string) => /st\.?\s*lawrence/i.test(name);

const distanceFromIsland = (lat: number | null, lon: number | null) =>
  lat == null || lon == null
    ? null
    : haversineKm(config.location.latitude, config.location.longitude, lat, lon);

// ── NOAA CO-OPS ──────────────────────────────────────────────────────────────

type CoOpsResponse = {
  error?: { message?: string };
  metadata?: { id?: string; name?: string; lat?: string; lon?: string };
  data?: Array<{ t?: string; v?: string; f?: string }>;
};

/**
 * CO-OPS reports errors as HTTP 200 with an `error` object rather than a status
 * code, so an empty result has to be detected from the body.
 */
async function fetchFromNoaa(): Promise<Candidate | null> {
  const station = config.waterTemp.noaaStationId;
  if (!station) return null;

  const url = new URL(`${config.waterTemp.noaaBaseUrl}/datagetter`);
  const q = url.searchParams;
  q.set("product", "water_temperature");
  q.set("station", station);
  // 48 hours of six-minute samples: enough for the trend and the history.
  q.set("range", "48");
  q.set("units", "english"); // °F, matching our canonical unit
  q.set("time_zone", "gmt"); // so timestamps parse without a local offset
  q.set("format", "json");
  q.set("application", "TridentIslandDashboard");

  const response = await fetchWithTimeout(url.toString(), { timeoutMs: 12_000 });
  const payload = (await response.json()) as CoOpsResponse;

  if (payload.error?.message) {
    throw new Error(`NOAA CO-OPS ${station}: ${payload.error.message.trim()}`);
  }

  const readings: WaterTempReading[] = [];
  for (const entry of payload.data ?? []) {
    if (!entry.t || entry.v == null || entry.v === "") continue;
    const fahrenheit = Number(entry.v);
    if (!plausible(fahrenheit)) continue;
    // CO-OPS formats GMT timestamps as "YYYY-MM-DD HH:mm".
    const time = Date.parse(`${entry.t.replace(" ", "T")}:00Z`);
    if (!Number.isFinite(time)) continue;
    readings.push({ time, fahrenheit });
  }

  if (readings.length === 0) return null;
  readings.sort((a, b) => a.time - b.time);

  const lat = payload.metadata?.lat ? Number(payload.metadata.lat) : null;
  const lon = payload.metadata?.lon ? Number(payload.metadata.lon) : null;

  return {
    readings,
    name: payload.metadata?.name?.trim() || "Alexandria Bay",
    id: payload.metadata?.id ?? station,
    distanceKm: distanceFromIsland(
      lat != null && Number.isFinite(lat) ? lat : null,
      lon != null && Number.isFinite(lon) ? lon : null,
    ),
    onTheRiver: true,
    provider: "noaa-coops",
  };
}

// ── USGS ─────────────────────────────────────────────────────────────────────

type UsgsTimeSeries = {
  sourceInfo?: {
    siteName?: string;
    siteCode?: Array<{ value?: string }>;
    geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
  };
  variable?: {
    variableCode?: Array<{ value?: string }>;
    noDataValue?: number;
  };
  values?: Array<{ value?: Array<{ value?: string; dateTime?: string }> }>;
};

type UsgsResponse = { value?: { timeSeries?: UsgsTimeSeries[] } };

function usgsUrls(): Array<{ label: string; url: string }> {
  const base = () => {
    const url = new URL(`${config.waterTemp.baseUrl}/iv/`);
    url.searchParams.set("format", "json");
    url.searchParams.set("parameterCd", WATER_TEMP_PARAMETER);
    url.searchParams.set("period", "P2D");
    return url;
  };

  if (config.waterTemp.stationId) {
    const url = base();
    url.searchParams.set("sites", config.waterTemp.stationId);
    return [{ label: `USGS site ${config.waterTemp.stationId}`, url: url.toString() }];
  }

  const bySite = base();
  bySite.searchParams.set("sites", DEFAULT_USGS_SITES.join(","));

  const byBox = base();
  byBox.searchParams.set("siteStatus", "active");
  const { latitude, longitude } = config.location;
  const round = (value: number) => Number(value.toFixed(5));
  byBox.searchParams.set(
    "bBox",
    [
      round(longitude - SEARCH_BOX_DEGREES),
      round(latitude - SEARCH_BOX_DEGREES),
      round(longitude + SEARCH_BOX_DEGREES),
      round(latitude + SEARCH_BOX_DEGREES),
    ].join(","),
  );

  return [
    { label: "USGS St. Lawrence gauges", url: bySite.toString() },
    { label: "USGS nearby gauges", url: byBox.toString() },
  ];
}

function usgsCandidates(payload: UsgsResponse): Candidate[] {
  const out: Candidate[] = [];

  for (const series of payload.value?.timeSeries ?? []) {
    // An area query returns every parameter a site publishes.
    const code = series.variable?.variableCode?.[0]?.value;
    if (code && code !== WATER_TEMP_PARAMETER) continue;

    // USGS marks gaps with a sentinel (conventionally -999999), not null.
    const noData = series.variable?.noDataValue ?? -999999;
    const readings: WaterTempReading[] = [];

    for (const entry of series.values?.[0]?.value ?? []) {
      if (!entry.dateTime || entry.value == null) continue;
      const celsius = Number(entry.value);
      if (!Number.isFinite(celsius) || celsius === noData) continue;
      const fahrenheit = celsiusToFahrenheit(celsius);
      if (!plausible(fahrenheit)) continue;
      const time = Date.parse(entry.dateTime);
      if (!Number.isFinite(time)) continue;
      readings.push({ time, fahrenheit });
    }

    if (readings.length === 0) continue;
    readings.sort((a, b) => a.time - b.time);

    const name = series.sourceInfo?.siteName?.trim() || "Unnamed USGS site";
    const geo = series.sourceInfo?.geoLocation?.geogLocation;

    out.push({
      readings,
      name,
      id: series.sourceInfo?.siteCode?.[0]?.value ?? "unknown",
      distanceKm: distanceFromIsland(geo?.latitude ?? null, geo?.longitude ?? null),
      onTheRiver: mentionsStLawrence(name),
      provider: "usgs",
    });
  }

  return out;
}

async function fetchFromUsgs(misses: string[]): Promise<Candidate | null> {
  for (const attempt of usgsUrls()) {
    try {
      const response = await fetchWithTimeout(attempt.url, { timeoutMs: 12_000 });
      const found = usgsCandidates((await response.json()) as UsgsResponse);
      if (found.length > 0) {
        // A gauge on the St. Lawrence beats a closer one on a tributary.
        found.sort((a, b) => {
          if (a.onTheRiver !== b.onTheRiver) return a.onTheRiver ? -1 : 1;
          return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        });
        return found[0];
      }
      misses.push(`${attempt.label}: no readings returned`);
    } catch (error) {
      // USGS answers "nothing matched" with a 400 rather than an empty result,
      // so a 4xx means try the next query, not give up.
      const message = error instanceof Error ? error.message : String(error);
      misses.push(`${attempt.label}: ${message}`);
      const fatal = !(error instanceof HttpError && error.status >= 400 && error.status < 500);
      if (fatal) logInfo("water-temp", `${attempt.label} failed — ${message}`);
    }
  }
  return null;
}

// ── The chain ────────────────────────────────────────────────────────────────

const SOURCES: Record<string, { label: string; run: (misses: string[]) => Promise<Candidate | null> }> =
  {
    noaa: { label: "NOAA CO-OPS", run: () => fetchFromNoaa() },
    usgs: { label: "USGS", run: (misses) => fetchFromUsgs(misses) },
  };

export async function fetchWaterTemperature(): Promise<WaterTemperature> {
  const misses: string[] = [];
  let chosen: Candidate | null = null;

  for (const key of config.waterTemp.sources) {
    const source = SOURCES[key];
    if (!source) continue;
    try {
      const candidate = await source.run(misses);
      if (candidate) {
        chosen = candidate;
        break;
      }
      if (key === "noaa") misses.push(`${source.label}: no readings returned`);
    } catch (error) {
      misses.push(`${source.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!chosen) {
    throw new Error(`No water temperature available. Tried ${misses.join(" | ")}`);
  }

  logInfo(
    "water-temp",
    `using ${chosen.provider} ${chosen.id} (${chosen.name})` +
      (chosen.distanceKm != null ? ` at ${chosen.distanceKm.toFixed(1)} km` : ""),
  );

  const latest = chosen.readings[chosen.readings.length - 1];
  const { trend, changeFahrenheit } = computeTrend(chosen.readings);

  return {
    fahrenheit: latest.fahrenheit,
    observedAt: latest.time,
    trend,
    changeFahrenheit,
    trendWindowHours: TREND_WINDOW_HOURS,
    history: chosen.readings,
    station: {
      id: chosen.id,
      name: chosen.name,
      distanceKm: chosen.distanceKm,
      resolvedBy:
        chosen.provider === "usgs" && !config.waterTemp.stationId ? "nearest" : "configured",
    },
    provider: chosen.provider,
  };
}

function computeTrend(readings: WaterTempReading[]): {
  trend: Trend;
  changeFahrenheit: number;
} {
  if (readings.length < 2) return { trend: "steady", changeFahrenheit: 0 };

  const latest = readings[readings.length - 1];
  const targetTime = latest.time - TREND_WINDOW_HOURS * 60 * 60 * 1000;

  let reference = readings[0];
  for (const reading of readings) {
    if (reading.time <= targetTime) reference = reading;
  }

  const changeFahrenheit = latest.fahrenheit - reference.fahrenheit;
  if (changeFahrenheit > TREND_THRESHOLD_F) return { trend: "rising", changeFahrenheit };
  if (changeFahrenheit < -TREND_THRESHOLD_F) return { trend: "falling", changeFahrenheit };
  return { trend: "steady", changeFahrenheit };
}
