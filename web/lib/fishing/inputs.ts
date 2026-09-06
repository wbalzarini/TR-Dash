/**
 * Builds engine inputs from the dashboard payload.
 *
 * This is the only place that knows about both shapes, which keeps the scoring
 * engine free of the API contract and the API free of fishing concepts. It also
 * means Fishing Mode adds no fetching of its own — it reads the payload the
 * dashboard already has.
 */

import { solunarStrength } from "../astro/moon";
import { celsiusToFahrenheit, metersToFeet } from "../units";
import type { DashboardResponse, HourlyForecast } from "../types";
import type { FishingInputs } from "./types";

/** hPa change across the `hours` before `at`, from the pressure history. */
export function pressureChange(
  history: Array<{ time: number; pressureHpa: number }>,
  at: number,
  hours: number,
): number | null {
  if (history.length < 2) return null;
  const target = at - hours * 60 * 60 * 1000;

  // Nearest reading at or before the target, and the latest at or before `at`.
  let before: { time: number; pressureHpa: number } | null = null;
  let current: { time: number; pressureHpa: number } | null = null;
  for (const point of history) {
    if (point.time <= target) before = point;
    if (point.time <= at) current = point;
  }
  if (!before || !current || before === current) return null;
  // Only trust the window if we actually have data reaching back far enough.
  if (current.time - before.time < hours * 0.6 * 60 * 60 * 1000) return null;
  return current.pressureHpa - before.pressureHpa;
}

const visibilityMiles = (v: number | null) => v;

/** Conditions right now. */
export function currentInputs(dashboard: DashboardResponse): FishingInputs {
  const weather = dashboard.weather.status === "ok" ? dashboard.weather.data : null;
  const river = dashboard.river.status === "ok" ? dashboard.river.data : null;
  const temp = dashboard.waterTemperature.status === "ok" ? dashboard.waterTemperature.data : null;
  const quality = dashboard.waterQuality.status === "ok" ? dashboard.waterQuality.data : null;
  const { astro } = dashboard;
  const current = weather?.current ?? null;
  const at = current?.observedAt ?? dashboard.fetchedAt;

  return {
    at,
    airTempF: current?.temperature ?? null,
    waterTempF: temp?.fahrenheit ?? null,
    pressureHpa: current?.pressureHpa ?? null,
    pressureChange3hHpa: weather ? pressureChange(weather.pressureHistory, at, 3) : null,
    windMph: current?.windSpeed ?? null,
    windGustMph: current?.windGust ?? null,
    windDirectionDeg: current?.windDirection ?? null,
    cloudCoverPct: current?.cloudCover ?? null,
    precipProbabilityPct: current?.precipitationProbability ?? null,
    precipInches: current?.precipitation ?? null,
    humidityPct: current?.humidity ?? null,
    visibilityMiles: visibilityMiles(current?.visibility ?? null),
    waterLevelTrend: river?.trend ?? null,
    waterLevelChangeFt: river ? metersToFeet(river.changeMeters) : null,
    flowCfs: quality?.flowCfs ?? null,
    turbidityNtu: quality?.turbidityNtu ?? null,
    dissolvedOxygenMgL: quality?.dissolvedOxygenMgL ?? null,
    sunrise: astro.sunrise,
    sunset: astro.sunset,
    moonIllumination: astro.moonIllumination,
    solunar: solunarStrength(at, astro.solunar),
  };
}

/**
 * One snapshot per hour for the next 24.
 *
 * Water readings are carried forward from now — the river's temperature and
 * level do not move meaningfully within a day, and pretending to forecast them
 * would be inventing data. Weather, sun and moon all vary properly.
 */
export function hourlyInputs(dashboard: DashboardResponse): FishingInputs[] {
  const base = currentInputs(dashboard);
  const weather = dashboard.weather.status === "ok" ? dashboard.weather.data : null;
  if (!weather) return [];

  return weather.hourly.slice(0, 24).map((hour: HourlyForecast) => ({
    ...base,
    at: hour.time,
    airTempF: hour.temperature,
    pressureHpa: hour.pressureHpa,
    pressureChange3hHpa: pressureChange(
      [...weather.pressureHistory, ...hourlyPressure(weather.hourly)],
      hour.time,
      3,
    ),
    windMph: hour.windSpeed,
    windGustMph: hour.windGust,
    windDirectionDeg: hour.windDirection,
    cloudCoverPct: hour.cloudCover,
    precipProbabilityPct: hour.precipitationProbability,
    precipInches: hour.precipitation,
    humidityPct: hour.humidity,
    solunar: solunarStrength(hour.time, dashboard.astro.solunar),
  }));
}

/** Forecast pressure as history-shaped points, so the 3h delta works ahead of now. */
function hourlyPressure(hours: HourlyForecast[]) {
  return hours
    .filter((h): h is HourlyForecast & { pressureHpa: number } => h.pressureHpa != null)
    .map((h) => ({ time: h.time, pressureHpa: h.pressureHpa }));
}

/** Celsius helper kept here so the engine stays unit-agnostic. */
export { celsiusToFahrenheit };
