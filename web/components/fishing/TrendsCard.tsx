"use client";

import { ArrowDown, ArrowRight, ArrowUp, TrendingUp } from "lucide-react";
import type { DashboardResponse } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { pressureChange } from "@/lib/fishing/inputs";
import { cardinal, metersToFeet } from "@/lib/units";
import { Card, CardHeader } from "../ui/Card";

type Row = {
  label: string;
  value: string;
  direction: "up" | "down" | "flat";
  hint?: string;
};

/**
 * What has changed, rather than what things are.
 *
 * Fish respond to change more reliably than to absolutes — a falling glass or a
 * two-degree warm-up moves fish in ways a steady reading does not. Every row is
 * measured against history the dashboard already holds; nothing is estimated.
 */
export function TrendsCard({
  dashboard,
  settings,
}: {
  dashboard: DashboardResponse;
  settings: Settings;
}) {
  const weather = dashboard.weather.status === "ok" ? dashboard.weather.data : null;
  const river = dashboard.river.status === "ok" ? dashboard.river.data : null;
  const temp = dashboard.waterTemperature.status === "ok" ? dashboard.waterTemperature.data : null;
  const now = dashboard.fetchedAt;

  const rows: Row[] = [];

  if (temp) {
    const dayAgo = temp.history.find((r) => r.time >= now - 24 * 60 * 60 * 1000);
    const latest = temp.history[temp.history.length - 1];
    if (dayAgo && latest && dayAgo !== latest) {
      const delta = latest.fahrenheit - dayAgo.fahrenheit;
      rows.push({
        label: "Water temperature",
        value: `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}°F`,
        direction: Math.abs(delta) < 0.2 ? "flat" : delta > 0 ? "up" : "down",
      });
    }
  }

  if (weather) {
    const delta = pressureChange(weather.pressureHistory, now, 24);
    if (delta != null) {
      rows.push({
        label: "Barometric pressure",
        value: `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} hPa`,
        direction: Math.abs(delta) < 0.5 ? "flat" : delta > 0 ? "up" : "down",
      });
    }
  }

  if (river) {
    const dayAgo = river.history.find((r) => r.time >= now - 24 * 60 * 60 * 1000);
    const latest = river.history[river.history.length - 1];
    if (dayAgo && latest && dayAgo !== latest) {
      const delta = metersToFeet(latest.meters - dayAgo.meters);
      const unit = settings.riverUnit === "m" ? "m" : "ft";
      const shown = settings.riverUnit === "m" ? latest.meters - dayAgo.meters : delta;
      rows.push({
        label: "Water level",
        value: `${shown >= 0 ? "+" : "−"}${Math.abs(shown).toFixed(2)} ${unit}`,
        direction: Math.abs(delta) < 0.02 ? "flat" : delta > 0 ? "up" : "down",
      });
    }
  }

  if (weather) {
    // The hourly series starts an hour behind now, so its first entry with a
    // direction is the closest thing to "what the wind was doing before".
    const earlierHour = weather.hourly.find((h) => h.windDirection != null);
    if (weather.current.windDirection != null && earlierHour?.windDirection != null) {
      const then = cardinal(earlierHour.windDirection);
      const nowDir = cardinal(weather.current.windDirection);
      rows.push({
        label: "Wind direction",
        value: then === nowDir ? `${nowDir} — holding` : `${then} → ${nowDir}`,
        direction: "flat",
      });
    }

    const rain = weather.hourly
      .filter((h) => h.time <= now)
      .reduce((total, h) => total + (h.precipitation ?? 0), 0);
    rows.push({
      label: "Rainfall",
      value: `${rain.toFixed(2)}"`,
      direction: rain > 0.05 ? "up" : "flat",
      hint: "since the forecast window opened",
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="What's Changing"
        icon={<TrendingUp className="size-3.5" aria-hidden />}
        aside={<span className="text-[11px] text-fathom">Last 24 hours</span>}
      />

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-fathom">
          Not enough history yet to show what has changed.
        </p>
      ) : (
        <ul className="divide-y divide-foam/6">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm text-mist">{row.label}</p>
                {row.hint ? <p className="text-[10px] text-fathom">{row.hint}</p> : null}
              </div>
              <span
                className={`tabular flex shrink-0 items-center gap-1.5 text-sm font-semibold ${
                  row.direction === "up"
                    ? "text-calm"
                    : row.direction === "down"
                      ? "text-caution"
                      : "text-mist"
                }`}
              >
                {row.direction === "up" ? (
                  <ArrowUp className="size-3.5" aria-hidden />
                ) : row.direction === "down" ? (
                  <ArrowDown className="size-3.5" aria-hidden />
                ) : (
                  <ArrowRight className="size-3.5" aria-hidden />
                )}
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
