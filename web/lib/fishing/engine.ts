/**
 * The fishing conditions engine.
 *
 * Pure functions: environment snapshot + species profile → a 0–100 score with
 * every contributing factor shown. No fetching, no React, no formatting.
 *
 * Two design rules matter more than the individual numbers:
 *
 *  1. Nothing is invented. A factor whose inputs are missing scores `null`,
 *     is excluded from the total, and the remaining weights are renormalised.
 *     `confidence` reports how much of the model actually had data, so a score
 *     built on half the inputs can say so instead of pretending.
 *  2. Nothing is hidden. Every factor returns its ratio, its points and a line
 *     of plain English, so the breakdown card can show why the number is what
 *     it is — and a badly chosen weight is visible rather than buried.
 */

import {
  FACTOR_LABELS,
  FACTOR_WEIGHTS,
  type FactorId,
  type FactorScore,
  type FishingInputs,
  type FishingScore,
  type DayPeriod,
  type Rating,
  type SpeciesProfile,
} from "./types";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Factors that can hold the whole score down, not merely lower the average. */
const CAPPING_FACTORS = new Set<FactorId>(["waterTemp", "wind", "water"]);

/**
 * 1 inside `ideal`, falling linearly to 0 at the edges of `tolerable`.
 */
function rangeScore(
  value: number,
  ideal: [number, number],
  tolerable: [number, number],
): number {
  const [lo, hi] = ideal;
  const [min, max] = tolerable;
  if (value >= lo && value <= hi) return 1;
  if (value < lo) return lo === min ? 0 : clamp01((value - min) / (lo - min));
  return hi === max ? 0 : clamp01((max - value) / (max - hi));
}

/** Which part of the day `at` falls in, given sunrise and sunset. */
export function dayPeriod(
  at: number,
  sunrise: number | null,
  sunset: number | null,
): DayPeriod | null {
  if (sunrise == null || sunset == null) return null;
  const hour = 60 * 60 * 1000;
  if (Math.abs(at - sunrise) <= hour) return "dawn";
  if (Math.abs(at - sunset) <= hour) return "dusk";
  if (at < sunrise || at > sunset) return "night";
  const middaySpan = (sunset - sunrise) / 2;
  return at < sunrise + middaySpan * 0.6 ? "morning" : "midday";
}

/** Neighbouring periods still fish reasonably well. */
const ADJACENT: Record<DayPeriod, DayPeriod[]> = {
  dawn: ["morning", "night"],
  morning: ["dawn", "midday"],
  midday: ["morning", "dusk"],
  dusk: ["midday", "night"],
  night: ["dusk", "dawn"],
};

// ── Individual factors ───────────────────────────────────────────────────────

function waterTempFactor(i: FishingInputs, s: SpeciesProfile) {
  if (i.waterTempF == null) return null;
  const ratio = rangeScore(i.waterTempF, s.water.ideal, s.water.tolerable);
  const [lo, hi] = s.water.ideal;
  const detail =
    ratio >= 0.95
      ? `${Math.round(i.waterTempF)}°F is in the ${lo}–${hi}°F sweet spot`
      : i.waterTempF < lo
        ? `${Math.round(i.waterTempF)}°F is below the ${lo}–${hi}°F preferred range`
        : `${Math.round(i.waterTempF)}°F is above the ${lo}–${hi}°F preferred range`;
  return { ratio, detail };
}

function pressureFactor(i: FishingInputs, s: SpeciesProfile) {
  if (i.pressureHpa == null && i.pressureChange3hHpa == null) return null;

  const change = i.pressureChange3hHpa;
  const trend = change == null ? "stable" : change <= -0.5 ? "falling" : change >= 0.5 ? "rising" : "stable";
  const trendRatio = s.pressure[trend];

  // Absolute pressure matters far less than which way it is moving.
  const absRatio = i.pressureHpa == null ? trendRatio : rangeScore(i.pressureHpa, [1008, 1022], [992, 1038]);
  const ratio = clamp01(0.7 * trendRatio + 0.3 * absRatio);

  const word = { falling: "Falling", stable: "Steady", rising: "Rising" }[trend];
  const detail =
    change == null
      ? `${word} — no recent change available`
      : `${word} ${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)} hPa over 3h`;
  return { ratio, detail };
}

function windFactor(i: FishingInputs, s: SpeciesProfile) {
  if (i.windMph == null) return null;
  let ratio = rangeScore(i.windMph, s.wind.ideal, s.wind.tolerable);

  // Hard gusts make boat control and presentation difficult whatever the fish think.
  if (i.windGustMph != null && i.windGustMph > 25) {
    ratio *= i.windGustMph > 35 ? 0.5 : 0.75;
  }

  const [lo, hi] = s.wind.ideal;
  const detail =
    ratio >= 0.9
      ? `${Math.round(i.windMph)} mph is in the ${lo}–${hi} mph range`
      : i.windMph < lo
        ? `${Math.round(i.windMph)} mph — flat and calm`
        : `${Math.round(i.windMph)} mph — above the ${lo}–${hi} mph range`;
  return { ratio, detail };
}

function cloudFactor(i: FishingInputs, s: SpeciesProfile) {
  if (i.cloudCoverPct == null) return null;
  const [lo, hi] = s.cloud.ideal;
  const ratio = rangeScore(i.cloudCoverPct, [lo, hi], [Math.max(0, lo - 45), Math.min(100, hi + 45)]);
  const pct = Math.round(i.cloudCoverPct);
  const detail =
    ratio >= 0.9
      ? `${pct}% cover suits this fish`
      : pct < lo
        ? `${pct}% — brighter than preferred`
        : `${pct}% — heavier overcast than preferred`;
  return { ratio, detail };
}

function timeOfDayFactor(i: FishingInputs, s: SpeciesProfile) {
  const period = dayPeriod(i.at, i.sunrise, i.sunset);
  if (period == null) return null;

  const ratio = s.periods.includes(period)
    ? 1
    : ADJACENT[period].some((p) => s.periods.includes(p))
      ? 0.6
      : 0.35;

  const names: Record<DayPeriod, string> = {
    dawn: "First light",
    morning: "Morning",
    midday: "Midday",
    dusk: "Last light",
    night: "After dark",
  };
  const detail =
    ratio === 1
      ? `${names[period]} — a prime feeding window`
      : ratio >= 0.6
        ? `${names[period]} — just outside the best window`
        : `${names[period]} — off-peak for this species`;
  return { ratio, detail };
}

function waterFactor(i: FishingInputs) {
  const parts: number[] = [];
  const notes: string[] = [];

  if (i.waterLevelTrend != null) {
    const byTrend = { steady: 1, rising: 0.8, falling: 0.7 } as const;
    parts.push(byTrend[i.waterLevelTrend]);
    notes.push(`level ${i.waterLevelTrend}`);
  }
  if (i.turbidityNtu != null) {
    // A little stain is an advantage; mud is not.
    parts.push(rangeScore(i.turbidityNtu, [4, 25], [0, 90]));
    notes.push(`${Math.round(i.turbidityNtu)} NTU`);
  }
  if (i.dissolvedOxygenMgL != null) {
    parts.push(rangeScore(i.dissolvedOxygenMgL, [7, 14], [3, 18]));
    notes.push(`${i.dissolvedOxygenMgL.toFixed(1)} mg/L O₂`);
  }
  if (i.flowCfs != null) notes.push(`${Math.round(i.flowCfs).toLocaleString()} cfs`);

  if (parts.length === 0) return null;
  const ratio = parts.reduce((a, b) => a + b, 0) / parts.length;
  return { ratio, detail: notes.join(" · ") };
}

function solunarFactor(i: FishingInputs) {
  if (i.solunar == null && i.moonIllumination == null) return null;

  const solunar = i.solunar ?? 0;
  // Solunar theory favours both new and full moon over the quarters.
  const phaseBonus = i.moonIllumination == null ? 0.5 : Math.abs(2 * i.moonIllumination - 1);
  const ratio = clamp01(0.7 * solunar + 0.3 * phaseBonus);

  const detail =
    solunar >= 0.95
      ? "Inside a solunar major period"
      : solunar >= 0.55
        ? "Inside a solunar minor period"
        : solunar > 0.2
          ? "Approaching a solunar period"
          : "Between solunar periods";
  return { ratio, detail };
}

// ── The score ────────────────────────────────────────────────────────────────

export function ratingFor(score: number): Rating {
  if (score >= 80) return "Excellent";
  if (score >= 62) return "Good";
  if (score >= 42) return "Fair";
  return "Poor";
}

export function scoreConditions(
  inputs: FishingInputs,
  species: SpeciesProfile,
): FishingScore {
  const computed: Record<FactorId, { ratio: number; detail: string } | null> = {
    waterTemp: waterTempFactor(inputs, species),
    pressure: pressureFactor(inputs, species),
    wind: windFactor(inputs, species),
    timeOfDay: timeOfDayFactor(inputs, species),
    cloud: cloudFactor(inputs, species),
    water: waterFactor(inputs),
    solunar: solunarFactor(inputs),
  };

  const factors: FactorScore[] = [];
  let earned = 0;
  let available = 0;
  const missing: string[] = [];

  for (const id of Object.keys(FACTOR_WEIGHTS) as FactorId[]) {
    const weight = FACTOR_WEIGHTS[id];
    const result = computed[id];
    if (result == null) {
      missing.push(FACTOR_LABELS[id]);
      factors.push({
        id,
        label: FACTOR_LABELS[id],
        ratio: null,
        points: null,
        weight,
        detail: "Data unavailable",
      });
      continue;
    }
    earned += result.ratio * weight;
    available += weight;
    factors.push({
      id,
      label: FACTOR_LABELS[id],
      ratio: result.ratio,
      points: Math.round(result.ratio * weight),
      weight,
      detail: result.detail,
    });
  }

  // Renormalise over whatever had data, rather than scoring a missing input zero.
  const mean = available === 0 ? 0 : (earned / available) * 100;

  // A weighted mean is too forgiving on its own: six good factors will outvote
  // one that makes fishing genuinely hard. Cap the score on the worst of the
  // *physical* constraints, so a gale or an iced-over river holds the day down
  // however well everything else is going.
  //
  // Only these three can cap. Time of day, cloud cover and the solunar periods
  // are preferences, not dealbreakers — letting a 10%-weighted piece of angling
  // folklore pin the whole score flattened every species to the same number.
  const scored = factors.filter((f) => f.ratio != null && CAPPING_FACTORS.has(f.id));
  const worst = scored.reduce<FactorScore | null>(
    (acc, f) => (acc == null || (f.ratio as number) < (acc.ratio as number) ? f : acc),
    null,
  );
  const worstRatio = worst?.ratio ?? 1;
  // Thresholds sit clear of round numbers on purpose: a factor averaged from
  // three sub-scores lands on 0.35000000000000003, which a `<= 0.35` test misses.
  const cap = worstRatio <= 0.2 ? 45 : worstRatio <= 0.4 ? 68 : 100;
  const score = Math.round(Math.min(mean, cap));

  const total = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);

  return {
    score,
    rating: ratingFor(score),
    factors,
    confidence: available / total,
    missing,
    limitedBy: mean > cap && worst ? worst.label : null,
  };
}
