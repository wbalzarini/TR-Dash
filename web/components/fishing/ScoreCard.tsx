"use client";

import { AlertTriangle, Fish } from "lucide-react";
import type { FishingScore, SpeciesProfile } from "@/lib/fishing/types";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";
import { RATING_BAR, RATING_RING, RATING_TEXT, RATING_TONE } from "./tone";

/**
 * The headline number. Everything else in Fishing Mode explains this.
 *
 * The confidence line is not decoration: a score built from half the model
 * should not look the same as one built from all of it.
 */
export function ScoreCard({
  score,
  species,
}: {
  score: FishingScore;
  species: SpeciesProfile;
}) {
  const pct = Math.max(0, Math.min(100, score.score));

  return (
    <Card className={`border p-5 sm:p-7 ${RATING_RING[score.rating]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2">
            <Fish className="size-3.5" aria-hidden />
            Fishing Conditions
          </p>
          <p className="mt-1 truncate text-lg font-medium text-foam">{species.name}</p>
        </div>
        <StatusPill tone={RATING_TONE[score.rating]}>{score.rating}</StatusPill>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className={`readout text-[4.5rem] font-semibold sm:text-[6rem] ${RATING_TEXT[score.rating]}`}>
          {score.score}
        </p>
        <p className="mb-4 text-xl font-normal text-fathom">/ 100</p>
      </div>

      {/* The same number as a bar, for reading at a glance. */}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foam/10">
        <div
          className={`h-full rounded-full ${RATING_BAR[score.rating]}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {score.limitedBy ? (
        <p className="mt-4 text-xs text-caution">
          Held down by {score.limitedBy.toLowerCase()}.
        </p>
      ) : null}

      {score.confidence < 0.999 ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-fathom">
          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-caution" aria-hidden />
          <span>
            Limited confidence — scored on {Math.round(score.confidence * 100)}% of the
            model. {score.missing.join(" and ")} unavailable.
          </span>
        </p>
      ) : null}
    </Card>
  );
}
