/**
 * Best-fishing-times timeline.
 *
 * Runs the same scoring engine over each of the next 24 hours and merges
 * neighbouring hours of equal rating into windows. Nothing here is a separate
 * model — if the engine's weights change, the timeline changes with it, which
 * is the point of keeping the scoring in one place.
 */

import { ratingFor, scoreConditions } from "./engine";
import type { FishingInputs, Rating, SpeciesProfile } from "./types";

export type HourScore = {
  at: number;
  score: number;
  rating: Rating;
};

export type FishingWindow = {
  start: number;
  /** Exclusive — the start of the hour after the window. */
  end: number;
  rating: Rating;
  /** Best hourly score inside the window. */
  peak: number;
};

export function scoreHours(
  hours: FishingInputs[],
  species: SpeciesProfile,
): HourScore[] {
  return hours.map((inputs) => {
    const { score } = scoreConditions(inputs, species);
    return { at: inputs.at, score, rating: ratingFor(score) };
  });
}

/** Merges consecutive hours of the same rating into windows. */
export function buildWindows(hours: HourScore[]): FishingWindow[] {
  if (hours.length === 0) return [];
  const hourMs = 60 * 60 * 1000;
  const windows: FishingWindow[] = [];

  let current: FishingWindow = {
    start: hours[0].at,
    end: hours[0].at + hourMs,
    rating: hours[0].rating,
    peak: hours[0].score,
  };

  for (const hour of hours.slice(1)) {
    // A gap in the hourly data ends the window as surely as a rating change.
    const contiguous = hour.at - current.end <= hourMs / 2;
    if (hour.rating === current.rating && contiguous) {
      current.end = hour.at + hourMs;
      current.peak = Math.max(current.peak, hour.score);
    } else {
      windows.push(current);
      current = {
        start: hour.at,
        end: hour.at + hourMs,
        rating: hour.rating,
        peak: hour.score,
      };
    }
  }
  windows.push(current);
  return windows;
}

const RANK: Record<Rating, number> = { Excellent: 3, Good: 2, Fair: 1, Poor: 0 };

/** The windows actually worth going out for, best first. */
export function bestWindows(windows: FishingWindow[], limit = 3): FishingWindow[] {
  return windows
    .filter((w) => RANK[w.rating] >= 2)
    .sort((a, b) => b.peak - a.peak || a.start - b.start)
    .slice(0, limit)
    .sort((a, b) => a.start - b.start);
}

/**
 * The window to actually recommend.
 *
 * If you are already inside a good one, that is the answer — go now. Otherwise
 * it is the strongest window still ahead, not merely the next one, since the
 * card calls it the best window and should mean it.
 */
export function recommendedWindow(
  windows: FishingWindow[],
  now: number,
): FishingWindow | null {
  const good = windows.filter((w) => RANK[w.rating] >= 2);
  const inside = good.find((w) => now >= w.start && now < w.end);
  if (inside) return inside;

  const ahead = good.filter((w) => w.start > now);
  if (ahead.length === 0) return null;
  return ahead.reduce((best, w) => (w.peak > best.peak ? w : best), ahead[0]);
}
