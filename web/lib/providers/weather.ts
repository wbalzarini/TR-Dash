/**
 * Open-Meteo weather provider.
 *
 * This is the only file in the app that knows Open-Meteo's request or response
 * shape. Swapping weather providers means rewriting `fetchWeather` to return the
 * same `WeatherData` and changing nothing else.
 *
 * Open-Meteo's standard API needs no key. We ask for `timeformat=unixtime` so
 * every timestamp comes back as an unambiguous UTC epoch instead of a local
 * string we'd have to reconstruct an offset for.
 *
 * Docs: https://open-meteo.com/en/docs
 */

import { config } from "../config";
import { fetchWithTimeout } from "../logger";
import { conditionLabel } from "../weather-codes";
import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  PressurePoint,
  Trend,
  WeatherData,
} from "../types";

const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
];

const HOURLY_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "dew_point_2m",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "pressure_msl",
  "cloud_cover",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
];

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
];

/** Only the fields we actually read. Everything optional — the parser is defensive. */
type OpenMeteoResponse = {
  timezone?: string;
  utc_offset_seconds?: number;
  current?: Record<string, number | undefined> & { time?: number };
  hourly?: Record<string, Array<number | null> | undefined> & { time?: number[] };
  hourly_units?: Record<string, string | undefined>;
  daily?: Record<string, Array<number | null> | undefined> & { time?: number[] };
};

function buildUrl(): string {
  const url = new URL(config.weather.baseUrl);
  const q = url.searchParams;
  q.set("latitude", String(config.location.latitude));
  q.set("longitude", String(config.location.longitude));
  q.set("current", CURRENT_FIELDS.join(","));
  q.set("hourly", HOURLY_FIELDS.join(","));
  q.set("daily", DAILY_FIELDS.join(","));
  q.set("temperature_unit", "fahrenheit");
  q.set("wind_speed_unit", "mph");
  q.set("precipitation_unit", "inch");
  q.set("timeformat", "unixtime");
  q.set("timezone", config.location.timezone ?? "auto");
  // Two past days guarantees a full 24 hours of pressure history whatever the
  // local hour, and gives the hourly chart something to anchor against.
  q.set("past_days", "2");
  q.set("forecast_days", "7");
  return url.toString();
}

/** Epoch seconds → ms, tolerating nulls. */
const toMs = (seconds: number | null | undefined): number | null =>
  seconds == null || !Number.isFinite(seconds) ? null : seconds * 1000;

const numberAt = (
  series: Array<number | null> | undefined,
  index: number,
): number | null => {
  const value = series?.[index];
  return value == null || !Number.isFinite(value) ? null : value;
};

export async function fetchWeather(): Promise<WeatherData> {
  const response = await fetchWithTimeout(buildUrl(), { timeoutMs: 10_000 });
  const raw = (await response.json()) as OpenMeteoResponse;

  const current = raw.current;
  if (!current || current.time == null) {
    throw new Error("Open-Meteo returned no current conditions");
  }

  const observedAt = current.time * 1000;
  const hourlyTimes = raw.hourly?.time ?? [];

  // Several values we want for "now" (dew point, visibility, chance of rain)
  // only exist in the hourly series, so find the hour covering the observation.
  const nowIndex = nearestIndex(hourlyTimes, current.time);

  // Open-Meteo reports visibility in feet under imperial units and metres
  // otherwise. Read the unit it actually sent rather than assuming.
  const visibilityUnit = raw.hourly_units?.visibility ?? "m";
  const rawVisibility = nowIndex == null ? null : numberAt(raw.hourly?.visibility, nowIndex);
  const visibilityMiles =
    rawVisibility == null
      ? null
      : visibilityUnit === "ft"
        ? rawVisibility / 5280
        : rawVisibility / 1609.344;

  const weatherCode = current.weather_code ?? 0;

  const currentWeather: CurrentWeather = {
    temperature: current.temperature_2m ?? 0,
    feelsLike: current.apparent_temperature ?? current.temperature_2m ?? 0,
    weatherCode,
    condition: conditionLabel(weatherCode),
    isDay: (current.is_day ?? 1) === 1,
    humidity: current.relative_humidity_2m ?? 0,
    dewPoint: nowIndex == null ? null : numberAt(raw.hourly?.dew_point_2m, nowIndex),
    pressureHpa: current.pressure_msl ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
    windDirection: current.wind_direction_10m ?? 0,
    windGust: current.wind_gusts_10m ?? current.wind_speed_10m ?? 0,
    cloudCover: current.cloud_cover ?? 0,
    visibility: visibilityMiles,
    precipitationProbability:
      nowIndex == null ? null : numberAt(raw.hourly?.precipitation_probability, nowIndex),
    precipitation: current.precipitation ?? 0,
    observedAt,
  };

  const hourly = buildHourly(raw, observedAt);
  const daily = buildDaily(raw);
  const pressureHistory = buildPressureHistory(raw, observedAt);
  const { trend, changeHpa } = pressureTrend(pressureHistory, currentWeather.pressureHpa);

  // Today's sunrise/sunset is the first daily entry whose sunset is still ahead
  // of us, falling back to the first day we were given.
  const today = daily.find((day) => day.sunset != null && day.sunset >= observedAt) ?? daily[0];

  return {
    current: currentWeather,
    daily,
    hourly,
    pressureHistory,
    pressureTrend: trend,
    pressureChangeHpa: changeHpa,
    sunrise: today?.sunrise ?? null,
    sunset: today?.sunset ?? null,
    timezone: config.location.timezone ?? raw.timezone ?? "America/New_York",
    provider: "open-meteo",
  };
}

/** Index of the entry closest to `target` (epoch seconds), or null if empty. */
function nearestIndex(times: number[], target: number): number | null {
  if (times.length === 0) return null;
  let best = 0;
  let bestDistance = Math.abs(times[0] - target);
  for (let i = 1; i < times.length; i += 1) {
    const distance = Math.abs(times[i] - target);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

/** The next 24 hours from the observation onward. */
function buildHourly(raw: OpenMeteoResponse, observedAt: number): HourlyForecast[] {
  const times = raw.hourly?.time ?? [];
  const hours: HourlyForecast[] = [];

  for (let i = 0; i < times.length; i += 1) {
    const time = times[i] * 1000;
    // Keep the hour we're currently inside, then the next 24.
    if (time < observedAt - 60 * 60 * 1000) continue;
    if (hours.length >= 25) break;

    const code = numberAt(raw.hourly?.weather_code, i) ?? 0;
    hours.push({
      time,
      temperature: numberAt(raw.hourly?.temperature_2m, i) ?? 0,
      feelsLike: numberAt(raw.hourly?.apparent_temperature, i),
      weatherCode: code,
      precipitationProbability: numberAt(raw.hourly?.precipitation_probability, i),
      precipitation: numberAt(raw.hourly?.precipitation, i),
      windSpeed: numberAt(raw.hourly?.wind_speed_10m, i),
      windGust: numberAt(raw.hourly?.wind_gusts_10m, i),
      windDirection: numberAt(raw.hourly?.wind_direction_10m, i),
      pressureHpa: numberAt(raw.hourly?.pressure_msl, i),
      humidity: numberAt(raw.hourly?.relative_humidity_2m, i),
      cloudCover: numberAt(raw.hourly?.cloud_cover, i),
    });
  }

  return hours;
}

function buildDaily(raw: OpenMeteoResponse): DailyForecast[] {
  const times = raw.daily?.time ?? [];
  const days: DailyForecast[] = [];
  const todayKey = localDateKey(Date.now());

  for (let i = 0; i < times.length; i += 1) {
    const date = times[i] * 1000;
    // past_days=2 means the response starts two days behind us. The forecast
    // begins at today.
    if (localDateKey(date) < todayKey) continue;
    if (days.length >= 7) break;

    const code = numberAt(raw.daily?.weather_code, i) ?? 0;
    days.push({
      date,
      weatherCode: code,
      condition: conditionLabel(code),
      high: numberAt(raw.daily?.temperature_2m_max, i) ?? 0,
      low: numberAt(raw.daily?.temperature_2m_min, i) ?? 0,
      feelsLikeHigh: numberAt(raw.daily?.apparent_temperature_max, i),
      feelsLikeLow: numberAt(raw.daily?.apparent_temperature_min, i),
      precipitationProbability: numberAt(raw.daily?.precipitation_probability_max, i),
      precipitationSum: numberAt(raw.daily?.precipitation_sum, i),
      windSpeed: numberAt(raw.daily?.wind_speed_10m_max, i),
      windGust: numberAt(raw.daily?.wind_gusts_10m_max, i),
      windDirection: numberAt(raw.daily?.wind_direction_10m_dominant, i),
      uvIndexMax: numberAt(raw.daily?.uv_index_max, i),
      sunrise: toMs(numberAt(raw.daily?.sunrise, i)),
      sunset: toMs(numberAt(raw.daily?.sunset, i)),
    });
  }

  return days;
}

/**
 * The local calendar date of an instant, as YYYY-MM-DD.
 *
 * Comparing these strings is exact. Comparing raw timestamps is not: with
 * `timezone=America/New_York` Open-Meteo puts each day at local midnight, which
 * is 04:00 or 05:00 UTC depending on daylight saving, so any UTC-midnight
 * comparison is off by a variable few hours.
 */
function localDateKey(epochMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.location.timezone ?? "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(epochMs);
}

/** Observed pressure over roughly the last 24 hours, oldest first. */
function buildPressureHistory(raw: OpenMeteoResponse, observedAt: number): PressurePoint[] {
  const times = raw.hourly?.time ?? [];
  const series = raw.hourly?.pressure_msl;
  const cutoff = observedAt - 24 * 60 * 60 * 1000;
  const points: PressurePoint[] = [];

  for (let i = 0; i < times.length; i += 1) {
    const time = times[i] * 1000;
    if (time < cutoff || time > observedAt) continue;
    const pressure = numberAt(series, i);
    if (pressure == null) continue;
    points.push({ time, pressureHpa: pressure });
  }

  return points;
}

/**
 * Standard three-hour pressure tendency. ±0.5 hPa over three hours is the
 * conventional line between "steady" and a real trend.
 */
function pressureTrend(
  history: PressurePoint[],
  currentHpa: number,
): { trend: Trend; changeHpa: number } {
  if (history.length < 2) return { trend: "steady", changeHpa: 0 };

  const latest = history[history.length - 1];
  const targetTime = latest.time - 3 * 60 * 60 * 1000;

  let reference = history[0];
  for (const point of history) {
    if (point.time <= targetTime) reference = point;
  }

  const changeHpa = currentHpa - reference.pressureHpa;
  if (changeHpa >= 0.5) return { trend: "rising", changeHpa };
  if (changeHpa <= -0.5) return { trend: "falling", changeHpa };
  return { trend: "steady", changeHpa };
}
