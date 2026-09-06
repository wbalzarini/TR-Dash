/**
 * St. Lawrence River water temperature, from the U.S. Geological Survey.
 *
 * Source: USGS Water Services "instantaneous values" service. Parameter 00010
 * is water temperature in °C. No key required.
 *   https://waterservices.usgs.gov/docs/instantaneous-values/
 *
 * Station selection mirrors the water-level provider: pin one with
 * WATER_TEMP_STATION_ID, or let the app discover it. Discovery asks USGS for
 * every active site inside a box around the property that is currently
 * reporting water temperature, then prefers a site whose name says
 * "St. Lawrence" before falling back to whichever is closest. That matters —
 * the nearest thermometer might be on a creek, and a creek's temperature is
 * not the river's.
 *
 * For the default coordinates the site this lands on is 04260800,
 * "St. Lawrence River at Alexandria Bay NY", about 5 km from the island.
 *
 * The card names whichever station it used, and if USGS returns nothing usable
 * this throws so the section reports unavailable. We never estimate a water
 * temperature from air temperature or anything else.
 *
 * This is the only file that knows USGS exists.
 */

import { config } from "../config";
import { fetchWithTimeout, HttpError, logInfo } from "../logger";
import { celsiusToFahrenheit } from "../units";
import type { Trend, WaterTemperature, WaterTempReading } from "../types";

/** USGS parameter code for water temperature, °C. */
const WATER_TEMP_PARAMETER = "00010";

/** Half-width of the discovery box, in degrees (~65 km). */
const SEARCH_BOX_DEGREES = 0.6;

/** Below this much movement over the window, call it steady. */
const TREND_THRESHOLD_F = 0.4;

const TREND_WINDOW_HOURS = 6;

type UsgsValue = {
  value?: string;
  dateTime?: string;
  qualifiers?: string[];
};

type UsgsTimeSeries = {
  sourceInfo?: {
    siteName?: string;
    siteCode?: Array<{ value?: string }>;
    geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
  };
  variable?: {
    variableCode?: Array<{ value?: string }>;
    unit?: { unitCode?: string };
    noDataValue?: number;
  };
  values?: Array<{ value?: UsgsValue[] }>;
};

type UsgsResponse = {
  value?: { timeSeries?: UsgsTimeSeries[] };
};

/**
 * USGS site numbers to try before falling back to a geographic search.
 *
 * These are the two USGS gauges on this stretch of the St. Lawrence. Asking for
 * them by number is both cheaper and more reliable than a bounding-box search,
 * which has to come back through a much larger result set and is the query most
 * likely to trip a service limit.
 */
const DEFAULT_RIVER_SITES = [
  "04260800", // St. Lawrence River at Alexandria Bay NY — ~6 km from the island
  "04264000", // St. Lawrence River at Ogdensburg NY — downriver
];

type Attempt = { label: string; url: string };

/**
 * The queries to try, in order. The first one that yields a usable reading
 * wins; a query that returns nothing is not an error, it's just a miss.
 *
 * USGS allows exactly one "major filter" per request, so a site list and a
 * bounding box can never be combined — they have to be separate attempts.
 */
function buildAttempts(): Attempt[] {
  const base = () => {
    const url = new URL(`${config.waterTemp.baseUrl}/iv/`);
    url.searchParams.set("format", "json");
    url.searchParams.set("parameterCd", WATER_TEMP_PARAMETER);
    // Two days of readings gives us a trend and a sparkline.
    url.searchParams.set("period", "P2D");
    return url;
  };

  // An explicitly pinned station is the only thing we try.
  if (config.waterTemp.stationId) {
    const url = base();
    url.searchParams.set("sites", config.waterTemp.stationId);
    return [{ label: `site ${config.waterTemp.stationId}`, url: url.toString() }];
  }

  const bySite = base();
  bySite.searchParams.set("sites", DEFAULT_RIVER_SITES.join(","));

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
    { label: "St. Lawrence gauges", url: bySite.toString() },
    { label: "nearby gauges", url: byBox.toString() },
  ];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Pulls the usable readings out of one USGS time series, oldest first. */
function readingsFrom(series: UsgsTimeSeries): WaterTempReading[] {
  // USGS marks gaps with a sentinel (conventionally -999999) rather than null.
  const noData = series.variable?.noDataValue ?? -999999;
  const entries = series.values?.[0]?.value ?? [];
  const readings: WaterTempReading[] = [];

  for (const entry of entries) {
    if (!entry.dateTime || entry.value == null) continue;
    const celsius = Number(entry.value);
    if (!Number.isFinite(celsius) || celsius === noData) continue;
    // A river between freezing and 40 °C; anything else is a bad reading.
    if (celsius < -2 || celsius > 40) continue;
    const time = Date.parse(entry.dateTime);
    if (!Number.isFinite(time)) continue;
    readings.push({ time, fahrenheit: celsiusToFahrenheit(celsius) });
  }

  return readings.sort((a, b) => a.time - b.time);
}

const mentionsStLawrence = (name: string) => /st\.?\s*lawrence/i.test(name);

type Candidate = {
  readings: WaterTempReading[];
  name: string;
  id: string;
  distanceKm: number | null;
  onTheRiver: boolean;
};

/** Turns one USGS response into the sites it usefully describes. */
function candidatesFrom(payload: UsgsResponse): Candidate[] {
  const { latitude, longitude } = config.location;
  const out: Candidate[] = [];

  for (const series of payload.value?.timeSeries ?? []) {
    // A bounding-box query returns every parameter a site publishes.
    const code = series.variable?.variableCode?.[0]?.value;
    if (code && code !== WATER_TEMP_PARAMETER) continue;

    const readings = readingsFrom(series);
    if (readings.length === 0) continue;

    const name = series.sourceInfo?.siteName?.trim() || "Unnamed USGS site";
    const geo = series.sourceInfo?.geoLocation?.geogLocation;

    out.push({
      readings,
      name,
      id: series.sourceInfo?.siteCode?.[0]?.value ?? "unknown",
      distanceKm:
        geo?.latitude != null && geo?.longitude != null
          ? haversineKm(latitude, longitude, geo.latitude, geo.longitude)
          : null,
      onTheRiver: mentionsStLawrence(name),
    });
  }

  return out;
}

export async function fetchWaterTemperature(): Promise<WaterTemperature> {
  const attempts = buildAttempts();
  const misses: string[] = [];
  let candidates: Candidate[] = [];

  for (const attempt of attempts) {
    try {
      const response = await fetchWithTimeout(attempt.url, { timeoutMs: 12_000 });
      const found = candidatesFrom((await response.json()) as UsgsResponse);
      if (found.length > 0) {
        candidates = found;
        break;
      }
      misses.push(`${attempt.label}: no readings returned`);
    } catch (error) {
      // USGS answers "nothing matched your criteria" with a 400 rather than an
      // empty result, so a 4xx here means try the next query, not give up.
      const isNoData = error instanceof HttpError && error.status >= 400 && error.status < 500;
      const message = error instanceof Error ? error.message : String(error);
      misses.push(`${attempt.label}: ${message}`);
      if (!isNoData) logInfo("water-temp", `${attempt.label} failed — ${message}`);
    }
  }

  if (candidates.length === 0) {
    throw new Error(`USGS returned no usable water temperature. Tried ${misses.join(" | ")}`);
  }

  // A gauge actually on the St. Lawrence beats a closer one on a tributary.
  candidates.sort((a, b) => {
    if (a.onTheRiver !== b.onTheRiver) return a.onTheRiver ? -1 : 1;
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  const chosen = candidates[0];
  logInfo(
    "water-temp",
    `using USGS ${chosen.id} (${chosen.name})` +
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
      resolvedBy: config.waterTemp.stationId ? "configured" : "nearest",
    },
    provider: "usgs",
  };
}

function computeTrend(
  readings: WaterTempReading[],
): { trend: Trend; changeFahrenheit: number } {
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
