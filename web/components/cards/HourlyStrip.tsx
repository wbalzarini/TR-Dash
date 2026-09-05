"use client";

import { Clock } from "lucide-react";
import type { Section, WeatherData } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { cardinal, formatTemp, formatWind, windUnitLabel } from "@/lib/units";
import { formatHour } from "@/lib/time";
import { Card, CardHeader } from "../ui/Card";
import { Unavailable } from "../ui/Unavailable";
import { WeatherIcon } from "../ui/WeatherIcon";

type Props = {
  section: Section<WeatherData>;
  settings: Settings;
  timezone: string;
};

/** The next 24 hours as a horizontally scrolling strip — the phone-first view. */
export function HourlyStrip({ section, settings, timezone }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5">
        <CardHeader title="Hourly" icon={<Clock className="size-3.5" aria-hidden />} />
        <Unavailable label="Hourly forecast" />
      </Card>
    );
  }

  const hours = section.data.hourly.slice(0, 24);
  const unit = windUnitLabel(settings);

  return (
    <Card className="p-5">
      <CardHeader
        title="Hourly"
        icon={<Clock className="size-3.5" aria-hidden />}
        aside={<span className="text-[11px] text-fathom">Next 24 hours · swipe</span>}
      />

      <ul className="-mx-5 flex snap-x snap-mandatory gap-1 overflow-x-auto px-5 pb-1">
        {hours.map((hour, index) => (
          <li
            key={hour.time}
            className="flex w-16 shrink-0 snap-start flex-col items-center gap-2 rounded-xl px-1 py-2 text-center hover:bg-foam/[0.04]"
          >
            <span className="text-[11px] text-fathom">
              {index === 0 ? "Now" : formatHour(hour.time, timezone)}
            </span>
            <WeatherIcon code={hour.weatherCode} className="size-5" />
            <span className="readout text-base font-semibold">
              {formatTemp(hour.temperature, settings)}
            </span>
            <span className="text-[10px] text-beacon tabular">
              {hour.precipitationProbability != null && hour.precipitationProbability > 0
                ? `${Math.round(hour.precipitationProbability)}%`
                : " "}
            </span>
            <span className="text-[10px] text-fathom tabular">
              {hour.windSpeed != null ? `${formatWind(hour.windSpeed, settings)} ${unit}` : " "}
            </span>
            <span className="text-[10px] text-fathom">
              {hour.windDirection != null ? cardinal(hour.windDirection) : " "}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
