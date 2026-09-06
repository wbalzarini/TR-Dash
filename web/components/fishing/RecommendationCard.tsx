"use client";

import { Compass, Fish, MapPin, Target } from "lucide-react";
import type { Recommendation } from "@/lib/fishing/recommend";
import { Card, CardHeader } from "../ui/Card";

/**
 * The advice card.
 *
 * Everything here is phrased as a suggestion. The engine knows the weather and
 * the water; it does not know where the fish are, and this app has no catch
 * history to learn from — so the location line describes the kind of structure
 * worth trying, never a specific spot.
 */
export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const rows = [
    {
      icon: Target,
      label: recommendation.bestTimeLabel,
      value: recommendation.bestTime ?? "No standout window today",
    },
    { icon: MapPin, label: "Where to look", value: recommendation.location },
    { icon: Fish, label: "Presentation", value: recommendation.presentation },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Recommendation"
        icon={<Compass className="size-3.5" aria-hidden />}
        aside={<span className="text-[11px] text-fathom">{recommendation.conditions}</span>}
      />

      <p className="text-base leading-relaxed font-medium text-foam">
        {recommendation.headline}.
      </p>

      <dl className="mt-5 space-y-3.5">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-beacon" aria-hidden />
            <div className="min-w-0">
              <dt className="text-[11px] tracking-wide text-fathom">{label}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-mist">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {recommendation.notes.length > 0 ? (
        <ul className="mt-5 space-y-1.5 border-t border-foam/8 pt-4">
          {recommendation.notes.map((note) => (
            <li key={note} className="text-[11px] leading-relaxed text-fathom">
              {note}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 text-[10px] leading-relaxed text-fathom/70">
        Suggestions from current conditions, not a forecast of what will bite.
      </p>
    </Card>
  );
}
