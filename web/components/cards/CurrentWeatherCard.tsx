"use client";

import { ArrowDown, ArrowUp, Sunrise, Sunset } from "lucide-react";
import type { Section, WeatherData } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { formatTemp, tempUnitLabel } from "@/lib/units";
import { formatClock } from "@/lib/time";
import { Card } from "../ui/Card";
import { StaleBadge } from "../ui/StaleBadge";
import { Unavailable } from "../ui/Unavailable";
import { WeatherIcon } from "../ui/WeatherIcon";

type Props = {
  section: Section<WeatherData>;
  settings: Settings;
  timezone: string;
};

/**
 * The card that answers "how warm is it?" before anything else loads. The
 * temperature is the largest element on the page by a wide margin — that's the
 * whole hierarchy of the dashboard in one number.
 */
export function CurrentWeatherCard({ section, settings, timezone }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5 sm:p-6">
        <Unavailable label="Weather" detail={section.error} />
      </Card>
    );
  }

  const { current, daily, sunrise, sunset } = section.data;
  const today = daily[0];

  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Right now</p>
          <p className="mt-1 truncate text-lg font-medium text-foam">{current.condition}</p>
        </div>
        <WeatherIcon
          code={current.weatherCode}
          isDay={current.isDay}
          className="size-14 shrink-0 sm:size-16"
        />
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <p className="readout text-[5.5rem] font-semibold sm:text-[7rem]">
          {formatTemp(current.temperature, settings)}
          <span className="align-top text-2xl font-normal text-fathom sm:text-3xl">
            {settings.temperatureUnit}
          </span>
        </p>

        <div className="mb-3 space-y-1.5">
          <p className="text-sm text-mist">
            Feels like{" "}
            <span className="tabular font-medium text-foam">
              {formatTemp(current.feelsLike, settings)}
            </span>
          </p>
          {today ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-mist">
                <ArrowUp className="size-3.5 text-heavy" aria-hidden />
                <span className="sr-only">High</span>
                <span className="tabular font-medium text-foam">
                  {formatTemp(today.high, settings)}
                </span>
              </span>
              <span className="flex items-center gap-1 text-mist">
                <ArrowDown className="size-3.5 text-beacon" aria-hidden />
                <span className="sr-only">Low</span>
                <span className="tabular font-medium text-foam">
                  {formatTemp(today.low, settings)}
                </span>
              </span>
              <span className="text-xs text-fathom">{tempUnitLabel(settings)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-foam/8 pt-4">
        <div className="flex items-center gap-5 text-sm text-mist">
          {sunrise ? (
            <span className="flex items-center gap-1.5">
              <Sunrise className="size-4 text-brass" aria-hidden />
              <span className="sr-only">Sunrise</span>
              <span className="tabular">{formatClock(sunrise, timezone)}</span>
            </span>
          ) : null}
          {sunset ? (
            <span className="flex items-center gap-1.5">
              <Sunset className="size-4 text-heavy" aria-hidden />
              <span className="sr-only">Sunset</span>
              <span className="tabular">{formatClock(sunset, timezone)}</span>
            </span>
          ) : null}
        </div>
        <StaleBadge observedAt={current.observedAt} stale={section.stale} />
      </div>
    </Card>
  );
}
