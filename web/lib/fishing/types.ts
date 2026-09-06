/**
 * Types for the fishing conditions engine.
 *
 * The engine is deliberately free of React, fetching and formatting: it takes a
 * plain snapshot of the environment plus a species profile and returns numbers.
 * That keeps the scoring tunable — and testable — without touching the UI.
 */

import type { Trend } from "../types";

/** Everything the engine can reason about at one instant. Any of it may be missing. */
export type FishingInputs = {
  /** Epoch ms this snapshot describes. */
  at: number;
  airTempF: number | null;
  waterTempF: number | null;
  pressureHpa: number | null;
  /** hPa change over the previous three hours. Negative is falling. */
  pressureChange3hHpa: number | null;
  windMph: number | null;
  windGustMph: number | null;
  windDirectionDeg: number | null;
  cloudCoverPct: number | null;
  precipProbabilityPct: number | null;
  precipInches: number | null;
  humidityPct: number | null;
  visibilityMiles: number | null;
  waterLevelTrend: Trend | null;
  waterLevelChangeFt: number | null;
  flowCfs: number | null;
  turbidityNtu: number | null;
  dissolvedOxygenMgL: number | null;
  sunrise: number | null;
  sunset: number | null;
  /** Illuminated fraction of the moon, 0–1. */
  moonIllumination: number | null;
  /** Solunar favourability at `at`, 0–1. */
  solunar: number | null;
};

export type FactorId =
  | "waterTemp"
  | "pressure"
  | "wind"
  | "cloud"
  | "timeOfDay"
  | "water"
  | "solunar";

export type FactorScore = {
  id: FactorId;
  label: string;
  /** How favourable this factor is, 0–1. Null when its inputs were missing. */
  ratio: number | null;
  /** `ratio × weight`, rounded. Null when unavailable. */
  points: number | null;
  /** Maximum points this factor can contribute. */
  weight: number;
  /** One line explaining the number, for the breakdown card. */
  detail: string;
};

export type Rating = "Excellent" | "Good" | "Fair" | "Poor";

export type FishingScore = {
  /** 0–100, computed only from the factors that had data. */
  score: number;
  rating: Rating;
  factors: FactorScore[];
  /** Share of the total weight that had data, 0–1. */
  confidence: number;
  /** Labels of the factors that could not be scored. */
  missing: string[];
  /**
   * The factor holding the score down, when one is bad enough to cap it.
   * A weighted mean lets six good factors outvote one dealbreaker — but a gale
   * is a gale whatever the water temperature is doing.
   */
  limitedBy: string | null;
};

export type DayPeriod = "dawn" | "morning" | "midday" | "dusk" | "night";

export type SpeciesProfile = {
  id: string;
  name: string;
  /** °F. Ideal is the sweet spot; outside tolerable scores zero. */
  water: { ideal: [number, number]; tolerable: [number, number] };
  /** mph at the surface. */
  wind: { ideal: [number, number]; tolerable: [number, number] };
  /** Percent cloud cover this species feeds best under. */
  cloud: { ideal: [number, number] };
  /** When it feeds hardest. */
  periods: DayPeriod[];
  /** Response to a falling, steady or rising glass, 0–1. */
  pressure: { falling: number; stable: number; rising: number };
  /** Plain-language guidance surfaced in the recommendation card. */
  strategy: { location: string; presentation: string };
  /** Anything worth saying about this fish that the numbers don't carry. */
  note: string;
};

/**
 * Weight given to each factor, in points out of 100.
 *
 * These are an angling-consensus starting point, not a measured result. They
 * live here so they can be tuned without touching the scoring maths, and the
 * UI shows every factor's contribution so a bad weight is visible rather than
 * hidden inside one number.
 */
export const FACTOR_WEIGHTS: Record<FactorId, number> = {
  waterTemp: 25,
  pressure: 15,
  wind: 15,
  timeOfDay: 15,
  cloud: 10,
  water: 10,
  solunar: 10,
};

export const FACTOR_LABELS: Record<FactorId, string> = {
  waterTemp: "Water temperature",
  pressure: "Barometric pressure",
  wind: "Wind",
  timeOfDay: "Time of day",
  cloud: "Cloud cover",
  water: "Water conditions",
  solunar: "Sun & moon",
};
