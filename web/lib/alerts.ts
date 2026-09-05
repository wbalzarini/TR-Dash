/**
 * Alert rules.
 *
 * Version 1 evaluates these in the browser and shows a banner. Nothing here
 * touches the DOM or React, so the same rules can later run in a cron job or a
 * server route and be pushed as notifications — that's the point of keeping the
 * evaluation a pure function of the dashboard payload plus thresholds.
 *
 * To add an alert: add a `Rule` to `RULES`. Nothing else changes.
 */

import type { AlertThresholds } from "./settings";
import type { BorderData, DashboardResponse, RiverData, WeatherData } from "./types";
import { isSevere } from "./weather-codes";
import { metersToFeet } from "./units";

export type AlertSeverity = "info" | "warning" | "severe";

export type Alert = {
  id: string;
  severity: AlertSeverity;
  icon: string;
  title: string;
  detail: string;
};

type Input = {
  weather: WeatherData | null;
  river: RiverData | null;
  border: BorderData | null;
  thresholds: AlertThresholds;
};

type Rule = (input: Input) => Alert | null;

const highWind: Rule = ({ weather, thresholds }) => {
  if (!weather) return null;
  const gust = weather.current.windGust;
  if (gust < thresholds.windGustMph) return null;
  return {
    id: "high-wind",
    severity: gust >= thresholds.windGustMph * 1.5 ? "severe" : "warning",
    icon: "wind",
    title: "High wind",
    detail: `Gusting to ${Math.round(gust)} mph — above your ${thresholds.windGustMph} mph threshold.`,
  };
};

const heavyRain: Rule = ({ weather, thresholds }) => {
  if (!weather) return null;
  const next24h = weather.hourly.reduce(
    (total, hour) => total + (hour.precipitation ?? 0),
    0,
  );
  if (next24h < thresholds.precipitationInches) return null;
  return {
    id: "heavy-rain",
    severity: "warning",
    icon: "rain",
    title: "Heavy rain expected",
    detail: `${next24h.toFixed(2)}" forecast over the next 24 hours.`,
  };
};

const temperatureExtreme: Rule = ({ weather, thresholds }) => {
  if (!weather) return null;
  const today = weather.daily[0];
  if (!today) return null;
  if (today.high >= thresholds.highTempF) {
    return {
      id: "high-temp",
      severity: "warning",
      icon: "thermometer",
      title: "Hot today",
      detail: `High of ${Math.round(today.high)}°F.`,
    };
  }
  if (today.low <= thresholds.lowTempF) {
    return {
      id: "low-temp",
      severity: "warning",
      icon: "thermometer",
      title: "Cold today",
      detail: `Low of ${Math.round(today.low)}°F.`,
    };
  }
  return null;
};

const riverChange: Rule = ({ river, thresholds }) => {
  if (!river) return null;
  const changeFeet = Math.abs(metersToFeet(river.changeMeters));
  if (changeFeet < thresholds.riverChangeFeet) return null;
  return {
    id: "river-change",
    severity: "warning",
    icon: "waves",
    title: `River ${river.trend} quickly`,
    detail: `${changeFeet.toFixed(2)} ft change over the last ${river.trendWindowHours} hours.`,
  };
};

const borderWait: Rule = ({ border, thresholds }) => {
  if (!border) return null;
  const waits = [
    { label: "U.S. → Canada", minutes: border.usToCanada?.waitMinutes ?? null },
    { label: "Canada → U.S.", minutes: border.canadaToUs?.waitMinutes ?? null },
  ].filter((entry): entry is { label: string; minutes: number } => entry.minutes != null);

  const worst = waits.sort((a, b) => b.minutes - a.minutes)[0];
  if (!worst || worst.minutes < thresholds.borderWaitMinutes) return null;

  return {
    id: "border-wait",
    severity: worst.minutes >= thresholds.borderWaitMinutes * 2 ? "severe" : "warning",
    icon: "car",
    title: "Border delay",
    detail: `${worst.label} is ${worst.minutes} min at the Thousand Islands Bridge.`,
  };
};

const severeWeather: Rule = ({ weather }) => {
  if (!weather) return null;
  if (!isSevere(weather.current.weatherCode)) return null;
  return {
    id: "severe-weather",
    severity: "severe",
    icon: "alert",
    title: "Severe weather",
    detail: weather.current.condition,
  };
};

const RULES: Rule[] = [
  severeWeather,
  highWind,
  heavyRain,
  riverChange,
  borderWait,
  temperatureExtreme,
];

const SEVERITY_ORDER: Record<AlertSeverity, number> = { severe: 0, warning: 1, info: 2 };

export function evaluateAlerts(
  dashboard: DashboardResponse | null,
  thresholds: AlertThresholds,
): Alert[] {
  if (!dashboard) return [];

  const input: Input = {
    weather: dashboard.weather.status === "ok" ? dashboard.weather.data : null,
    river: dashboard.river.status === "ok" ? dashboard.river.data : null,
    border: dashboard.border.status === "ok" ? dashboard.border.data : null,
    thresholds,
  };

  return RULES.map((rule) => rule(input))
    .filter((alert): alert is Alert => alert !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
