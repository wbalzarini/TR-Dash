"use client";

/**
 * Fishing Mode.
 *
 * A sibling of Boat Mode: same payload, same theme, same card components — a
 * different reading of the data rather than a different application. It fetches
 * nothing of its own; every number here comes from the dashboard payload the
 * page already holds, and the scoring lives in `lib/fishing/` where it can be
 * tuned without touching any of this.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { DashboardResponse } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { scoreConditions } from "@/lib/fishing/engine";
import { currentInputs, hourlyInputs } from "@/lib/fishing/inputs";
import { buildRecommendation } from "@/lib/fishing/recommend";
import { DEFAULT_SPECIES_ID, findSpecies } from "@/lib/fishing/species";
import { bestWindows, buildWindows, recommendedWindow, scoreHours } from "@/lib/fishing/windows";
import { formatClock } from "@/lib/time";
import { RelativeTime } from "./ui/RelativeTime";
import { TridentMark } from "./ui/TridentMark";
import {
  CurrentConditionsCard,
  PressureTrendCard,
  SunMoonCard,
  WaterCard,
} from "./fishing/ConditionsCards";
import { BestTimesCard } from "./fishing/BestTimesCard";
import { FactorBreakdown } from "./fishing/FactorBreakdown";
import { HistoricalMatchCard } from "./fishing/HistoricalMatchCard";
import { RecommendationCard } from "./fishing/RecommendationCard";
import { ScoreCard } from "./fishing/ScoreCard";
import { SpeciesSelector } from "./fishing/SpeciesSelector";
import { TrendsCard } from "./fishing/TrendsCard";

const SPECIES_KEY = "trident.fishingSpecies.v1";

export function FishingMode({
  dashboard,
  settings,
  onExit,
}: {
  dashboard: DashboardResponse;
  settings: Settings;
  onExit: () => void;
}) {
  const [speciesId, setSpeciesId] = useState(DEFAULT_SPECIES_ID);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SPECIES_KEY);
      if (stored) setSpeciesId(stored);
    } catch {
      // A blocked localStorage just means the default species.
    }
  }, []);

  const chooseSpecies = useCallback((id: string) => {
    setSpeciesId(id);
    try {
      window.localStorage.setItem(SPECIES_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const { timezone } = dashboard.location;
  const species = useMemo(() => findSpecies(speciesId), [speciesId]);

  const inputs = useMemo(() => currentInputs(dashboard), [dashboard]);
  const score = useMemo(() => scoreConditions(inputs, species), [inputs, species]);

  const hours = useMemo(
    () => scoreHours(hourlyInputs(dashboard), species),
    [dashboard, species],
  );
  const windows = useMemo(() => buildWindows(hours), [hours]);
  const best = useMemo(() => bestWindows(windows), [windows]);

  const recommendation = useMemo(() => {
    const window = recommendedWindow(windows, dashboard.fetchedAt);
    return buildRecommendation(score, inputs, species, window, (w) =>
      `${formatClock(w.start, timezone)} – ${formatClock(w.end, timezone)}`,
    );
  }, [score, inputs, species, windows, dashboard.fetchedAt, timezone]);

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-7 pb-10 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <TridentMark className="h-9 shrink-0" />
          <div>
            <h1 className="font-wordmark text-xl font-extrabold tracking-[0.09em] text-foam uppercase sm:text-2xl">
              Fishing
            </h1>
            <p className="mt-1 text-xs text-fathom">
              Updated <RelativeTime epochMs={dashboard.fetchedAt} />
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-foam/20 bg-abyss/55 px-4 py-2.5 text-sm font-medium text-foam backdrop-blur-md transition-colors hover:bg-foam/10"
        >
          <X className="size-4" aria-hidden />
          Exit
        </button>
      </header>

      <div className="space-y-4">
        {/* The two things you want first: how good is it, and for what. */}
        {/* `items-start` so the short score card doesn't stretch to match the
            much taller recommendation beside it. */}
        <div className="grid items-start gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <ScoreCard score={score} species={species} />
            <div className="card p-5">
              <SpeciesSelector value={speciesId} onChange={chooseSpecies} />
              <p className="mt-3 text-[11px] leading-relaxed text-fathom">
                {species.note}
              </p>
            </div>
          </div>
          <div className="lg:col-span-3">
            <RecommendationCard recommendation={recommendation} />
          </div>
        </div>

        <BestTimesCard hours={hours} windows={best} timezone={timezone} />

        <div className="grid gap-4 lg:grid-cols-2">
          <CurrentConditionsCard inputs={inputs} settings={settings} />
          <PressureTrendCard dashboard={dashboard} inputs={inputs} settings={settings} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <WaterCard dashboard={dashboard} inputs={inputs} settings={settings} />
          <SunMoonCard
            astro={dashboard.astro}
            timezone={timezone}
            now={dashboard.fetchedAt}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FactorBreakdown score={score} />
          <div className="space-y-4">
            <TrendsCard dashboard={dashboard} settings={settings} />
            <HistoricalMatchCard score={score} species={species} />
          </div>
        </div>
      </div>
    </div>
  );
}
