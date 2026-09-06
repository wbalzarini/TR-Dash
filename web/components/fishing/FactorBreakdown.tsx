"use client";

import { SlidersHorizontal } from "lucide-react";
import type { FishingScore } from "@/lib/fishing/types";
import { Card, CardHeader } from "../ui/Card";

/**
 * Why the score is what it is.
 *
 * Every factor is listed even when it has no data, because "we couldn't measure
 * this" is a different statement from "this scored badly" and the reader is
 * entitled to tell them apart.
 */
export function FactorBreakdown({ score }: { score: FishingScore }) {
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Score Breakdown"
        icon={<SlidersHorizontal className="size-3.5" aria-hidden />}
        aside={<span className="text-[11px] text-fathom">{score.score} / 100</span>}
      />

      <ul className="divide-y divide-foam/6">
        {score.factors.map((factor) => {
          const available = factor.ratio != null;
          const pct = available ? Math.round((factor.ratio as number) * 100) : 0;
          return (
            <li key={factor.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foam">{factor.label}</span>
                <span
                  className={`tabular shrink-0 text-sm ${available ? "text-mist" : "text-fathom/70"}`}
                >
                  {available ? `${factor.points} / ${factor.weight}` : "—"}
                </span>
              </div>

              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foam/8">
                <div
                  className={`h-full rounded-full ${
                    pct >= 80 ? "bg-calm" : pct >= 55 ? "bg-caution" : pct >= 30 ? "bg-heavy" : "bg-severe"
                  }`}
                  style={{ width: available ? `${pct}%` : "0%" }}
                />
              </div>

              <p
                className={`mt-1.5 text-[11px] leading-relaxed ${
                  available ? "text-fathom" : "text-fathom/70"
                }`}
              >
                {factor.detail}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-foam/8 pt-3 text-[11px] leading-relaxed text-fathom/70">
        Weights are an angling-consensus starting point, not a measured result.
        They live in one table and are meant to be tuned.
      </p>
    </Card>
  );
}
