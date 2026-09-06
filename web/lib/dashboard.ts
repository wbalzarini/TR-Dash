/**
 * Assembles the dashboard payload.
 *
 * Every section is fetched independently and wrapped in a `Section<T>`, so one
 * dead upstream feed degrades exactly one card. The route handlers are thin
 * wrappers around the functions here.
 *
 * Server-only.
 */

import { cached, type CacheResult } from "./cache";
import { config, STALE_AFTER_MS } from "./config";
import { fetchBorder } from "./providers/border";
import { fetchRiver } from "./providers/river";
import { fetchWaterQuality } from "./providers/water-quality";
import { fetchWaterTemperature } from "./providers/water-temp";
import { fetchWeather } from "./providers/weather";
import { moonPhase, moonTimes, solunarPeriods } from "./astro/moon";
import type {
  AstroData,
  BorderData,
  DashboardResponse,
  RiverData,
  Section,
  WaterQuality,
  WaterTemperature,
  WeatherData,
} from "./types";

/**
 * Turns a cache result into a wire `Section`.
 *
 * `stale` means either the cache is serving a value it failed to refresh, or the
 * underlying observation is older than we'd expect for that source. Both are
 * things the reader needs to see, and neither is allowed to look current.
 */
function toSection<T>(
  result: CacheResult<T>,
  observedAt: (value: T) => number | null,
  staleAfterMs: number,
): Section<T> {
  if (result.status === "error") {
    return { status: "unavailable", error: result.error, fetchedAt: result.fetchedAt };
  }

  const observation = observedAt(result.value);
  const observationIsOld =
    observation != null && Date.now() - observation > staleAfterMs;

  return {
    status: "ok",
    data: result.value,
    fetchedAt: result.fetchedAt,
    stale: result.stale || observationIsOld,
  };
}

export async function getWeatherSection(): Promise<Section<WeatherData>> {
  const result = await cached("weather", config.cacheTtlMs.weather, fetchWeather);
  return toSection(result, (data) => data.current.observedAt, STALE_AFTER_MS.weather);
}

export async function getRiverSection(): Promise<Section<RiverData>> {
  const result = await cached("river", config.cacheTtlMs.river, fetchRiver);
  return toSection(result, (data) => data.observedAt, STALE_AFTER_MS.river);
}

export async function getWaterTempSection(): Promise<Section<WaterTemperature>> {
  const result = await cached("water-temp", config.cacheTtlMs.waterTemp, fetchWaterTemperature);
  return toSection(result, (data) => data.observedAt, STALE_AFTER_MS.waterTemp);
}

export async function getWaterQualitySection(): Promise<Section<WaterQuality>> {
  const result = await cached("water-quality", config.cacheTtlMs.waterQuality, fetchWaterQuality);
  return toSection(result, (data) => data.observedAt, STALE_AFTER_MS.waterQuality);
}

/**
 * Moon and solunar data. Computed from the coordinates and the clock, so unlike
 * every other section this one cannot fail and needs no cache or Section wrapper.
 */
export function getAstro(timezone: string, sunrise: number | null, sunset: number | null): AstroData {
  const now = Date.now();
  const { latitude, longitude } = config.location;
  const times = moonTimes(now, latitude, longitude, timezone);
  const phase = moonPhase(now);

  return {
    sunrise,
    sunset,
    moonrise: times.rise,
    moonset: times.set,
    moonTransit: times.transit,
    moonUnderfoot: times.underfoot,
    moonPhase: phase.fraction,
    moonIllumination: phase.illumination,
    moonPhaseName: phase.name,
    solunar: solunarPeriods(times),
  };
}

export async function getBorderSection(): Promise<Section<BorderData>> {
  const result = await cached("border", config.cacheTtlMs.border, fetchBorder);
  return toSection(
    result,
    (data) => {
      // The freshest of the two directions — one agency lagging shouldn't mark
      // the whole card stale while the other is still reporting.
      const times = [data.usToCanada?.updatedAt, data.canadaToUs?.updatedAt].filter(
        (value): value is number => value != null,
      );
      return times.length > 0 ? Math.max(...times) : null;
    },
    STALE_AFTER_MS.border,
  );
}

export async function getDashboard(): Promise<DashboardResponse> {
  const [weather, river, waterTemperature, waterQuality, border] = await Promise.all([
    getWeatherSection(),
    getRiverSection(),
    getWaterTempSection(),
    getWaterQualitySection(),
    getBorderSection(),
  ]);

  const timezone =
    weather.status === "ok"
      ? weather.data.timezone
      : (config.location.timezone ?? "America/New_York");

  return {
    location: {
      latitude: config.location.latitude,
      longitude: config.location.longitude,
      placeName: config.location.placeName,
      timezone,
    },
    weather,
    river,
    waterTemperature,
    waterQuality,
    astro: getAstro(
      timezone,
      weather.status === "ok" ? weather.data.sunrise : null,
      weather.status === "ok" ? weather.data.sunset : null,
    ),
    border,
    fetchedAt: Date.now(),
  };
}
