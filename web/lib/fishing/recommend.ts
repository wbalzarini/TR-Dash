/**
 * Turns a score plus conditions into plain-language advice.
 *
 * Deliberately hedged. The engine knows the weather and the water; it does not
 * know where the fish are, and this app has no catch history to learn from. So
 * everything here is phrased as a suggestion, and the location line comes from
 * the species profile — general structure to look for — rather than claiming
 * knowledge of any particular spot.
 */

import { cardinal } from "../units";
import type { FishingInputs, FishingScore, SpeciesProfile } from "./types";
import type { FishingWindow } from "./windows";

export type Recommendation = {
  headline: string;
  bestTime: string | null;
  /** "Fishing now" when the window covers the present, else "Best window". */
  bestTimeLabel: string;
  conditions: string;
  location: string;
  presentation: string;
  /** Short observations that pushed the score up or down. */
  notes: string[];
};

export function buildRecommendation(
  score: FishingScore,
  inputs: FishingInputs,
  species: SpeciesProfile,
  window: FishingWindow | null,
  formatWindow: (w: FishingWindow) => string,
): Recommendation {
  // Saying "best window" about a merely-good one you happen to be inside is a
  // small lie; label it for what it is.
  const insideNow = window != null && inputs.at >= window.start && inputs.at < window.end;
  const headline =
    score.rating === "Excellent"
      ? `Conditions strongly favour ${species.name.toLowerCase()} right now`
      : score.rating === "Good"
        ? `A solid window for ${species.name.toLowerCase()}`
        : score.rating === "Fair"
          ? `Workable, but not the day's best for ${species.name.toLowerCase()}`
          : `Tough conditions for ${species.name.toLowerCase()}`;

  const notes: string[] = [];

  const strongest = [...score.factors]
    .filter((f) => f.ratio != null)
    .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))[0];
  const weakest = [...score.factors]
    .filter((f) => f.ratio != null)
    .sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0))[0];

  if (strongest && (strongest.ratio ?? 0) >= 0.75) {
    notes.push(`${strongest.label} is working for you — ${strongest.detail.toLowerCase()}.`);
  }
  if (weakest && (weakest.ratio ?? 1) <= 0.45) {
    notes.push(`${weakest.label} is the limiting factor — ${weakest.detail.toLowerCase()}.`);
  }
  if (inputs.windDirectionDeg != null && inputs.windMph != null && inputs.windMph >= 5) {
    notes.push(
      `Wind is out of the ${cardinal(inputs.windDirectionDeg)} — the far shore will be the calm one.`,
    );
  }
  if (inputs.precipProbabilityPct != null && inputs.precipProbabilityPct >= 50) {
    notes.push(`${Math.round(inputs.precipProbabilityPct)}% chance of rain; take the shell.`);
  }
  if (score.confidence < 0.85) {
    notes.push(
      `Score uses ${Math.round(score.confidence * 100)}% of the model — ${score.missing.join(" and ").toLowerCase()} unavailable.`,
    );
  }
  notes.push(species.note);

  return {
    headline,
    bestTime: window ? formatWindow(window) : null,
    bestTimeLabel: insideNow ? "Fishing now" : "Best window",
    conditions: `${score.score}/100 — ${score.rating}`,
    location: species.strategy.location,
    presentation: species.strategy.presentation,
    notes,
  };
}
