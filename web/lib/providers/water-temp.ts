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
import { fetchWithTimeout, logInfo } from "../logger";
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

function buildUrl(): string {
  const url = new URL(`${config.waterTemp.baseUrl}/iv/`);
  const q = url.searchParams;
  q.set("format", "json");
  q.set("parameterCd", WATER_TEMP_PARAMETER);
  q.set("siteStatus", "active");
  // Two days of readings gives us a trend and a sparkline.
  q.set("period", "P2D");

  // USGS allows exactly one "major filter", so it's either the pinned site or
  // the bounding box — never both.
  if (config.waterTemp.stationId) {
    q.set("sites", config.waterTemp.stationId);
  } else {
    const { latitude, longitude } = config.location;
    const round = (value: number) => Number(value.toFixed(5));
    q.set(
      "bBox",
      [
        round(longitude - SEARCH_BOX_DEGREES),
        round(latitude - SEARCH_BOX_DEGREES),
        round(longitude + SEARCH_BOX_DEGREES),
        round(latitude + SEARCH_BOX_DEGREES),
      ].join(","),
    );
  }

  return url.toString();
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

export async function fetchWaterTemperature(): Promise<WaterTemperature> {
  const response = await fetchWithTimeout(buildUrl(), { timeoutMs: 12_000 });
  const payload = (await response.json()) as UsgsResponse;
  const allSeries = payload.value?.timeSeries ?? [];

  if (allSeries.length === 0) {
    throw new Error("USGS reported no water-temperature sites near the island");
  }

  const { latitude, longitude } = config.location;

  type Candidate = {
    series: UsgsTimeSeries;
    readings: WaterTempReading[];
    name: string;
    id: string;
    distanceKm: number | null;
    onTheRiver: boolean;
  };

  const candidates: Candidate[] = [];
  for (const series of allSeries) {
    // A bounding-box query returns every parameter the site publishes.
    const code = series.variable?.variableCode?.[0]?.value;
    if (code && code !== WATER_TEMP_PARAMETER) continue;

    const readings = readingsFrom(series);
    if (readings.length === 0) continue;

    const name = series.sourceInfo?.siteName?.trim() || "Unnamed USGS site";
    const geo = series.sourceInfo?.geoLocation?.geogLocation;
    const distanceKm =
      geo?.latitude != null && geo?.longitude != null
        ? haversineKm(latitude, longitude, geo.latitude, geo.longitude)
        : null;

    candidates.push({
      series,
      readings,
      name,
      id: series.sourceInfo?.siteCode?.[0]?.value ?? "unknown",
      distanceKm,
      onTheRiver: mentionsStLawrence(name),
    });
  }

  if (candidates.length === 0) {
    throw new Error("USGS returned no usable water-temperature readings");
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
