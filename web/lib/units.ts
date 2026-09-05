/**
 * Unit conversion and formatting.
 *
 * The API routes speak one canonical unit per quantity (°F, mph, hPa, metres,
 * inches) and the UI converts at the edge according to the reader's settings.
 * Keeping the conversions here means the settings page and the cards can't
 * drift apart.
 */

import type { Settings } from "./settings";
import type { Trend } from "./types";

// ── Conversions ──────────────────────────────────────────────────────────────

export const fahrenheitToCelsius = (f: number) => ((f - 32) * 5) / 9;
export const hpaToInHg = (hpa: number) => hpa * 0.0295299830714;
export const hpaToMmHg = (hpa: number) => hpa * 0.750061683;
export const metersToFeet = (m: number) => m * 3.280839895;
export const mphToKph = (mph: number) => mph * 1.609344;
export const mphToKnots = (mph: number) => mph * 0.868976;
export const mphToMps = (mph: number) => mph * 0.44704;

// ── Wind direction ───────────────────────────────────────────────────────────

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

/** Degrees the wind blows *from* → 16-point compass label. */
export function cardinal(degrees: number): string {
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return COMPASS[index];
}

/** The long form, for screen readers and the expanded forecast rows. */
export function cardinalLong(degrees: number): string {
  const short = cardinal(degrees);
  const words: Record<string, string> = { N: "north", E: "east", S: "south", W: "west" };
  return short
    .split("")
    .map((letter) => words[letter] ?? letter)
    .join("-");
}

// ── Formatters, driven by settings ───────────────────────────────────────────

const round = (value: number, places = 0) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function formatTemp(fahrenheit: number, settings: Settings, withUnit = false): string {
  const value = settings.temperatureUnit === "C" ? fahrenheitToCelsius(fahrenheit) : fahrenheit;
  return `${round(value)}°${withUnit ? settings.temperatureUnit : ""}`;
}

export function tempUnitLabel(settings: Settings): string {
  return `°${settings.temperatureUnit}`;
}

export function formatWind(mph: number, settings: Settings): string {
  switch (settings.windUnit) {
    case "kph":
      return String(round(mphToKph(mph)));
    case "kts":
      return String(round(mphToKnots(mph)));
    case "mps":
      return String(round(mphToMps(mph), 1));
    default:
      return String(round(mph));
  }
}

export function windUnitLabel(settings: Settings): string {
  return { mph: "mph", kph: "km/h", kts: "kts", mps: "m/s" }[settings.windUnit];
}

export function formatPressure(hpa: number, settings: Settings): string {
  switch (settings.pressureUnit) {
    case "hPa":
      return String(round(hpa, 1));
    case "mmHg":
      return String(round(hpaToMmHg(hpa), 1));
    default:
      return round(hpaToInHg(hpa), 2).toFixed(2);
  }
}

export function pressureUnitLabel(settings: Settings): string {
  return settings.pressureUnit;
}

export function formatRiverLevel(meters: number, settings: Settings): string {
  const value = settings.riverUnit === "m" ? meters : metersToFeet(meters);
  return value.toFixed(2);
}

export function riverUnitLabel(settings: Settings): string {
  return settings.riverUnit === "m" ? "m" : "ft";
}

export function convertRiverLevel(meters: number, settings: Settings): number {
  return settings.riverUnit === "m" ? meters : metersToFeet(meters);
}

export function formatVisibility(miles: number, settings: Settings): string {
  if (settings.windUnit === "kph" || settings.windUnit === "mps") {
    return `${round(miles * 1.609344, 1)} km`;
  }
  return `${round(miles, 1)} mi`;
}

// ── Trend presentation ───────────────────────────────────────────────────────

export const TREND_ARROW: Record<Trend, string> = {
  rising: "↑",
  falling: "↓",
  steady: "→",
};

export const TREND_LABEL: Record<Trend, string> = {
  rising: "Rising",
  falling: "Falling",
  steady: "Steady",
};
