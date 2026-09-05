"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, Droplet, Sunrise, Sunset, Wind } from "lucide-react";
import type { DailyForecast, Section, WeatherData } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { cardinal, formatTemp, formatWind, windUnitLabel } from "@/lib/units";
import { formatClock, formatDayMonth, formatWeekday, isToday } from "@/lib/time";
import { Card, CardHeader } from "../ui/Card";
import { Unavailable } from "../ui/Unavailable";
import { WeatherIcon } from "../ui/WeatherIcon";

type Props = {
  section: Section<WeatherData>;
  settings: Settings;
  timezone: string;
};

/**
 * Seven days, each row tappable for the detail that doesn't fit on one line.
 *
 * The temperature range bar is scaled against the whole week rather than each
 * day, so a cold day reads as a short bar sitting low — the shape of the week is
 * visible without reading a single number.
 */
export function ForecastSection({ section, settings, timezone }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (section.status === "unavailable") {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader title="7-Day Forecast" icon={<CalendarDays className="size-3.5" aria-hidden />} />
        <Unavailable label="Forecast" />
      </Card>
    );
  }

  const { daily } = section.data;
  if (daily.length === 0) {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader title="7-Day Forecast" icon={<CalendarDays className="size-3.5" aria-hidden />} />
        <Unavailable label="Forecast" />
      </Card>
    );
  }

  const weekLow = Math.min(...daily.map((day) => day.low));
  const weekHigh = Math.max(...daily.map((day) => day.high));
  const span = Math.max(weekHigh - weekLow, 1);

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="7-Day Forecast"
        icon={<CalendarDays className="size-3.5" aria-hidden />}
        aside={<span className="text-[11px] text-fathom">Tap a day for detail</span>}
      />

      <ul className="divide-y divide-foam/6">
        {daily.map((day, index) => {
          const open = expanded === index;
          const today = isToday(day.date, timezone);
          return (
            <li key={day.date}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : index)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-foam/[0.03] sm:gap-4"
              >
                <span
                  className={`w-11 shrink-0 text-sm font-medium ${
                    today ? "text-beacon" : "text-mist"
                  }`}
                >
                  {today ? "Today" : formatWeekday(day.date, timezone)}
                </span>

                <WeatherIcon code={day.weatherCode} className="size-6 shrink-0" />

                <span className="flex w-11 shrink-0 items-center gap-0.5 text-xs text-beacon tabular">
                  {day.precipitationProbability != null && day.precipitationProbability > 0 ? (
                    <>
                      <Droplet className="size-3" aria-hidden />
                      {Math.round(day.precipitationProbability)}%
                    </>
                  ) : null}
                </span>

                <span className="tabular w-9 shrink-0 text-right text-sm text-fathom">
                  {formatTemp(day.low, settings)}
                </span>

                {/* Where this day's range sits inside the week's range. */}
                <span className="h-1 min-w-8 flex-1 overflow-hidden rounded-full bg-foam/8">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-beacon to-brass"
                    style={{
                      marginLeft: `${((day.low - weekLow) / span) * 100}%`,
                      width: `${Math.max(((day.high - day.low) / span) * 100, 6)}%`,
                    }}
                  />
                </span>

                <span className="tabular w-9 shrink-0 text-sm font-medium text-foam">
                  {formatTemp(day.high, settings)}
                </span>

                <ChevronDown
                  className={`size-4 shrink-0 text-fathom transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              {open ? <DayDetail day={day} settings={settings} timezone={timezone} /> : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function DayDetail({
  day,
  settings,
  timezone,
}: {
  day: DailyForecast;
  settings: Settings;
  timezone: string;
}) {
  const unit = windUnitLabel(settings);
  const rows: Array<[string, string]> = [
    ["Conditions", day.condition],
    ["Date", formatDayMonth(day.date, timezone)],
    [
      "Feels like",
      day.feelsLikeHigh == null || day.feelsLikeLow == null
        ? "—"
        : `${formatTemp(day.feelsLikeHigh, settings)} / ${formatTemp(day.feelsLikeLow, settings)}`,
    ],
    [
      "Chance of rain",
      day.precipitationProbability == null
        ? "—"
        : `${Math.round(day.precipitationProbability)}%`,
    ],
    ["Precipitation", day.precipitationSum == null ? "—" : `${day.precipitationSum.toFixed(2)}"`],
    [
      "Wind",
      day.windSpeed == null
        ? "—"
        : `${formatWind(day.windSpeed, settings)} ${unit}${
            day.windDirection != null ? ` ${cardinal(day.windDirection)}` : ""
          }`,
    ],
    ["Gusts", day.windGust == null ? "—" : `${formatWind(day.windGust, settings)} ${unit}`],
    ["UV index", day.uvIndexMax == null ? "—" : String(Math.round(day.uvIndexMax))],
  ];

  return (
    <div className="mb-3 rounded-xl border border-foam/8 bg-foam/[0.03] p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] tracking-wide text-fathom">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-foam tabular">{value}</dd>
          </div>
        ))}
      </dl>

      {day.sunrise || day.sunset ? (
        <div className="mt-4 flex items-center gap-5 border-t border-foam/8 pt-3 text-xs text-mist">
          {day.sunrise ? (
            <span className="flex items-center gap-1.5">
              <Sunrise className="size-3.5 text-brass" aria-hidden />
              <span className="tabular">{formatClock(day.sunrise, timezone)}</span>
            </span>
          ) : null}
          {day.sunset ? (
            <span className="flex items-center gap-1.5">
              <Sunset className="size-3.5 text-heavy" aria-hidden />
              <span className="tabular">{formatClock(day.sunset, timezone)}</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1.5 text-fathom">
            <Wind className="size-3.5" aria-hidden />
            {day.windDirection != null ? `From the ${cardinal(day.windDirection)}` : "—"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
