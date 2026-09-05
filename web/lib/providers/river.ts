/**
 * St. Lawrence River water levels from the Canadian Hydrographic Service.
 *
 * Source: the Government of Canada's Integrated Water Level System (IWLS) REST
 * API — the same service behind tides.gc.ca. No key required.
 *   Stations: GET {base}/stations
 *   Data:     GET {base}/stations/{id}/data?time-series-code=wlo&from=&to=
 * API reference: https://api-iwls.dfo-mpo.gc.ca/swagger-ui.html
 *
 * Station selection, in priority order:
 *   1. RIVER_STATION_ID   — an IWLS station UUID, used as-is.
 *   2. RIVER_STATION_CODE — a CHS station code (e.g. 14400, Brockville).
 *   3. Otherwise: the closest operating station to the configured property
 *      coordinates that publishes observed water levels.
 *
 * We never fabricate a level. If IWLS gives us nothing usable this throws, the
 * cache falls back to the last good reading, and the card says how old it is.
 *
 * This is the only file that knows IWLS exists. A different provider means
 * rewriting `fetchRiver` to return the same `RiverData`.
 */

import { config } from "../config";
import { cached } from "../cache";
import { fetchWithTimeout, logInfo } from "../logger";
import type { RiverData, RiverReading, RiverStation, Trend } from "../types";

/** Observed water level. IWLS also publishes wlp/wlf (predictions) — we want measured. */
const OBSERVED_SERIES = "wlo";

/** Don't consider a "nearest" station further away than this. */
const MAX_STATION_DISTANCE_KM = 250;

/** Below this much movement, call the river steady rather than drifting. */
const TREND_THRESHOLD_M = 0.01;

const TREND_WINDOW_HOURS = 3;

type IwlsStation = {
  id?: string;
  code?: string;
  officialName?: string;
  operating?: boolean;
  latitude?: number;
  longitude?: number;
  timeSeries?: Array<{ code?: string }>;
};

type IwlsReading = {
  eventDate?: string;
  value?: number | null;
  qcFlagCode?: string;
};

// ── Station resolution ───────────────────────────────────────────────────────

async function fetchStationList(): Promise<IwlsStation[]> {
  const response = await fetchWithTimeout(`${config.river.baseUrl}/stations`, {
    timeoutMs: 15_000,
  });
  const stations = (await response.json()) as unknown;
  if (!Array.isArray(stations)) {
    throw new Error("IWLS station list was not an array");
  }
  return stations as IwlsStation[];
}

/** Great-circle distance in kilometres. */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function publishesObservedLevels(station: IwlsStation): boolean {
  // Some IWLS responses omit timeSeries on the list endpoint. Absence isn't
  // evidence the station lacks observations, so don't rule it out.
  if (!station.timeSeries || station.timeSeries.length === 0) return true;
  return station.timeSeries.some((series) => series.code === OBSERVED_SERIES);
}

async function resolveStation(): Promise<RiverStation> {
  const { latitude, longitude } = config.location;

  if (config.river.stationId) {
    const station = await findInList((s) => s.id === config.river.stationId);
    return {
      id: config.river.stationId,
      code: station?.code ?? null,
      name: station?.officialName ?? `Station ${config.river.stationId}`,
      latitude: station?.latitude ?? null,
      longitude: station?.longitude ?? null,
      distanceKm: distanceTo(station),
      resolvedBy: "configured-id",
    };
  }

  if (config.river.stationCode) {
    const station = await findInList((s) => s.code === config.river.stationCode);
    if (!station?.id) {
      throw new Error(
        `No IWLS station found with code ${config.river.stationCode}. ` +
          `Check RIVER_STATION_CODE against https://tides.gc.ca/en/stations`,
      );
    }
    return {
      id: station.id,
      code: station.code ?? config.river.stationCode,
      name: station.officialName ?? `Station ${station.code}`,
      latitude: station.latitude ?? null,
      longitude: station.longitude ?? null,
      distanceKm: distanceTo(station),
      resolvedBy: "configured-code",
    };
  }

  const stations = await fetchStationList();
  let best: { station: IwlsStation; distanceKm: number } | null = null;

  for (const station of stations) {
    if (!station.id) continue;
    if (station.operating === false) continue;
    if (station.latitude == null || station.longitude == null) continue;
    if (!publishesObservedLevels(station)) continue;

    const distanceKm = haversineKm(latitude, longitude, station.latitude, station.longitude);
    if (distanceKm > MAX_STATION_DISTANCE_KM) continue;
    if (!best || distanceKm < best.distanceKm) best = { station, distanceKm };
  }

  if (!best) {
    throw new Error(
      `No IWLS water-level station within ${MAX_STATION_DISTANCE_KM} km of ` +
        `${latitude}, ${longitude}. Set RIVER_STATION_ID or RIVER_STATION_CODE.`,
    );
  }

  logInfo(
    "river",
    `resolved nearest station ${best.station.officialName} (${best.station.code}) ` +
      `at ${best.distanceKm.toFixed(1)} km`,
  );

  return {
    id: best.station.id as string,
    code: best.station.code ?? null,
    name: best.station.officialName ?? "Unnamed station",
    latitude: best.station.latitude ?? null,
    longitude: best.station.longitude ?? null,
    distanceKm: best.distanceKm,
    resolvedBy: "nearest",
  };

  function distanceTo(station: IwlsStation | undefined): number | null {
    if (!station || station.latitude == null || station.longitude == null) return null;
    return haversineKm(latitude, longitude, station.latitude, station.longitude);
  }

  async function findInList(
    predicate: (station: IwlsStation) => boolean,
  ): Promise<IwlsStation | undefined> {
    try {
      return (await fetchStationList()).find(predicate);
    } catch {
      // A pinned station still works without the list — we just lose its name.
      return undefined;
    }
  }
}

/** The resolved station changes about never, so hold it for a day. */
function getStation(): Promise<RiverStation> {
  return cached("river:station", config.cacheTtlMs.riverStation, resolveStation).then(
    (result) => {
      if (result.status === "error") throw new Error(result.error);
      return result.value;
    },
  );
}

// ── Readings ─────────────────────────────────────────────────────────────────

async function fetchSeries(
  stationId: string,
  fromMs: number,
  toMs: number,
  resolution: string,
): Promise<RiverReading[]> {
  const url = new URL(`${config.river.baseUrl}/stations/${stationId}/data`);
  url.searchParams.set("time-series-code", OBSERVED_SERIES);
  url.searchParams.set("from", new Date(fromMs).toISOString());
  url.searchParams.set("to", new Date(toMs).toISOString());
  url.searchParams.set("resolution", resolution);

  const response = await fetchWithTimeout(url.toString(), { timeoutMs: 15_000 });
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [];

  const readings: RiverReading[] = [];
  for (const entry of payload as IwlsReading[]) {
    if (entry.value == null || !Number.isFinite(entry.value)) continue;
    if (!entry.eventDate) continue;
    const time = Date.parse(entry.eventDate);
    if (!Number.isFinite(time)) continue;
    readings.push({ time, meters: entry.value });
  }
  return readings;
}

export async function fetchRiver(): Promise<RiverData> {
  const station = await getStation();
  const now = Date.now();

  // Two windows: a week of hourly readings for the chart, and a finer-grained
  // recent window so "current level" really is current. Either can fail on its
  // own without losing the card.
  const [weekResult, recentResult] = await Promise.allSettled([
    fetchSeries(station.id, now - 7 * 24 * 60 * 60 * 1000, now, "SIXTY_MINUTES"),
    fetchSeries(station.id, now - 12 * 60 * 60 * 1000, now, "FIFTEEN_MINUTES"),
  ]);

  const byTime = new Map<number, number>();
  if (weekResult.status === "fulfilled") {
    for (const reading of weekResult.value) byTime.set(reading.time, reading.meters);
  }
  if (recentResult.status === "fulfilled") {
    for (const reading of recentResult.value) byTime.set(reading.time, reading.meters);
  }

  if (byTime.size === 0) {
    const reason =
      weekResult.status === "rejected"
        ? weekResult.reason instanceof Error
          ? weekResult.reason.message
          : String(weekResult.reason)
        : "the station returned no observed water levels";
    throw new Error(`No water level data for ${station.name}: ${reason}`);
  }

  const history: RiverReading[] = [...byTime.entries()]
    .map(([time, meters]) => ({ time, meters }))
    .sort((a, b) => a.time - b.time);

  const latest = history[history.length - 1];
  const { trend, changeMeters } = computeTrend(history);

  return {
    station,
    levelMeters: latest.meters,
    observedAt: latest.time,
    trend,
    changeMeters,
    trendWindowHours: TREND_WINDOW_HOURS,
    history,
    provider: "chs-iwls",
  };
}

function computeTrend(history: RiverReading[]): { trend: Trend; changeMeters: number } {
  if (history.length < 2) return { trend: "steady", changeMeters: 0 };

  const latest = history[history.length - 1];
  const targetTime = latest.time - TREND_WINDOW_HOURS * 60 * 60 * 1000;

  // The oldest reading still inside the window, or the oldest we have.
  let reference = history[0];
  for (const reading of history) {
    if (reading.time <= targetTime) reference = reading;
  }

  const changeMeters = latest.meters - reference.meters;
  if (changeMeters > TREND_THRESHOLD_M) return { trend: "rising", changeMeters };
  if (changeMeters < -TREND_THRESHOLD_M) return { trend: "falling", changeMeters };
  return { trend: "steady", changeMeters };
}
