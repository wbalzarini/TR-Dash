"use client";

import { BarChart3 } from "lucide-react";
import type { FishingScore, SpeciesProfile } from "@/lib/fishing/types";
import { Card, CardHeader } from "../ui/Card";

/**
 * Historical conditions match.
 *
 * The honest version. A real match score needs a catch log to compare against,
 * and this app has none — so rather than invent a percentage, this shows how
 * closely today sits inside the species' *published* preferred ranges, says
 * plainly what it is, and leaves the shape in place for a real log later.
 *
 * When a fishing log exists, this card swaps its input and nothing else moves.
 */
export function HistoricalMatchCard({
  score,
  species,
}: {
  score: FishingScore;
  species: SpeciesProfile;
}) {
  // Share of the scored factors sitting in their favourable band.
  const scored = score.factors.filter((f) => f.ratio != null);
  const strong = scored.filter((f) => (f.ratio as number) >= 0.75);
  const match = scored.length === 0 ? 0 : Math.round((strong.length / scored.length) * 100);

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Conditions Match"
        icon={<BarChart3 className="size-3.5" aria-hidden />}
      />

      <div className="flex flex-wrap items-baseline gap-x-3">
        <p className="readout text-4xl font-semibold text-foam">{match}%</p>
        <p className="text-sm text-mist">
          of factors are in {species.name.toLowerCase()}&rsquo;s preferred range
        </p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foam/10">
        <div className="h-full rounded-full bg-beacon" style={{ width: `${match}%` }} />
      </div>

      <ul className="mt-4 space-y-1.5">
        {scored.map((factor) => (
          <li key={factor.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-mist">{factor.label}</span>
            <span
              className={
                (factor.ratio as number) >= 0.75 ? "text-calm" : "text-fathom"
              }
            >
              {(factor.ratio as number) >= 0.75 ? "in range" : "outside"}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-foam/8 pt-3 text-[11px] leading-relaxed text-fathom/70">
        Measured against this species&rsquo; published preferred ranges — not
        against past catches. There is no fishing log yet; when there is, this
        card will compare today against what actually worked.
      </p>
    </Card>
  );
}
