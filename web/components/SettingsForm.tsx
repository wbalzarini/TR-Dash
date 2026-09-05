"use client";

/**
 * Settings.
 *
 * Everything here is a display preference stored in this browser — units, how
 * often the dashboard polls, and the thresholds the alert rules in
 * `lib/alerts.ts` compare against. Nothing is sent to the server, and nothing
 * here changes what we fetch: the API always speaks °F, mph, hPa and metres, and
 * the UI converts.
 *
 * Location and data-source configuration is deliberately *not* here — it lives
 * in environment variables (see .env.example) so a stray tap can't point the
 * dashboard at the wrong river.
 */

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  useSettings,
  type AlertThresholds,
  type Settings,
} from "@/lib/settings";
import { Card, CardHeader } from "./ui/Card";

type Choice<T extends string> = { value: T; label: string };

function ChoiceRow<K extends keyof Settings>({
  label,
  description,
  value,
  choices,
  onChange,
}: {
  label: string;
  description?: string;
  value: Settings[K];
  choices: Array<Choice<string>>;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foam">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-fathom">{description}</p> : null}
      </div>
      <div className="flex gap-1 rounded-full border border-foam/10 bg-foam/[0.04] p-0.5">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            aria-pressed={choice.value === value}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              choice.value === value
                ? "bg-foam text-abyss"
                : "text-mist hover:text-foam"
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberRow({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <label className="text-sm text-mist" htmlFor={`threshold-${label}`}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`threshold-${label}`}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="tabular w-20 rounded-lg border border-foam/12 bg-abyss/60 px-3 py-1.5 text-right text-sm text-foam focus:border-beacon/50 focus:outline-none"
        />
        <span className="w-10 text-xs text-fathom">{unit}</span>
      </div>
    </div>
  );
}

const REFRESH_CHOICES: Array<Choice<string>> = [
  { value: "60", label: "1m" },
  { value: "300", label: "5m" },
  { value: "600", label: "10m" },
  { value: "1800", label: "30m" },
];

export function SettingsForm() {
  const { settings, update, updateThresholds, reset, loaded } = useSettings();

  const thresholdRows: Array<{
    key: keyof AlertThresholds;
    label: string;
    unit: string;
    min: number;
    max: number;
    step?: number;
  }> = [
    { key: "windGustMph", label: "High wind gusts above", unit: "mph", min: 5, max: 80 },
    {
      key: "precipitationInches",
      label: "Rain in 24h above",
      unit: "in",
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    { key: "highTempF", label: "Hot above", unit: "°F", min: 60, max: 120 },
    { key: "lowTempF", label: "Cold below", unit: "°F", min: -30, max: 50 },
    {
      key: "riverChangeFeet",
      label: "River change in 3h above",
      unit: "ft",
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    { key: "borderWaitMinutes", label: "Border wait above", unit: "min", min: 5, max: 180, step: 5 },
  ];

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-7 pb-16 sm:px-6 sm:pt-10">
      <header className="mb-7">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-mist transition-colors hover:text-beacon"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-[0.16em] uppercase">Settings</h1>
        <p className="mt-2 text-sm text-fathom">
          Saved in this browser only. {loaded ? "" : "Loading…"}
        </p>
      </header>

      <div className="space-y-4">
        <Card className="px-5 py-2">
          <div className="divide-y divide-foam/6">
            <ChoiceRow<"temperatureUnit">
              label="Temperature"
              value={settings.temperatureUnit}
              choices={[
                { value: "F", label: "°F" },
                { value: "C", label: "°C" },
              ]}
              onChange={(next) => update({ temperatureUnit: next as Settings["temperatureUnit"] })}
            />
            <ChoiceRow<"windUnit">
              label="Wind speed"
              value={settings.windUnit}
              choices={[
                { value: "mph", label: "mph" },
                { value: "kph", label: "km/h" },
                { value: "kts", label: "kts" },
                { value: "mps", label: "m/s" },
              ]}
              onChange={(next) => update({ windUnit: next as Settings["windUnit"] })}
            />
            <ChoiceRow<"pressureUnit">
              label="Pressure"
              value={settings.pressureUnit}
              choices={[
                { value: "inHg", label: "inHg" },
                { value: "hPa", label: "hPa" },
                { value: "mmHg", label: "mmHg" },
              ]}
              onChange={(next) => update({ pressureUnit: next as Settings["pressureUnit"] })}
            />
            <ChoiceRow<"riverUnit">
              label="River level"
              description="IWLS publishes metres; feet is a conversion."
              value={settings.riverUnit}
              choices={[
                { value: "ft", label: "feet" },
                { value: "m", label: "metres" },
              ]}
              onChange={(next) => update({ riverUnit: next as Settings["riverUnit"] })}
            />
          </div>
        </Card>

        <Card className="px-5 py-2">
          <div className="divide-y divide-foam/6">
            <ChoiceRow<"preferredBorderDirection">
              label="Preferred border direction"
              description="Highlighted first when you're heading to the island."
              value={settings.preferredBorderDirection}
              choices={[
                { value: "usToCanada", label: "US → CA" },
                { value: "canadaToUs", label: "CA → US" },
              ]}
              onChange={(next) =>
                update({
                  preferredBorderDirection: next as Settings["preferredBorderDirection"],
                })
              }
            />
            <ChoiceRow<"refreshIntervalSeconds">
              label="Refresh interval"
              description="How often this page re-checks. Upstream caching is separate."
              value={String(settings.refreshIntervalSeconds) as never}
              choices={REFRESH_CHOICES}
              onChange={(next) => update({ refreshIntervalSeconds: Number(next) })}
            />
          </div>
        </Card>

        <Card className="p-5">
          <CardHeader title="Alert thresholds" />
          <p className="mb-2 -mt-2 text-xs text-fathom">
            Shown as a banner on the dashboard. Thresholds are in the source units
            regardless of the display units above.
          </p>
          <div className="divide-y divide-foam/6">
            {thresholdRows.map((row) => (
              <NumberRow
                key={row.key}
                label={row.label}
                unit={row.unit}
                value={settings.alertThresholds[row.key]}
                min={row.min}
                max={row.max}
                step={row.step}
                onChange={(next) => updateThresholds({ [row.key]: next } as Partial<AlertThresholds>)}
              />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <CardHeader title="Location & data sources" />
          <p className="text-sm leading-relaxed text-mist">
            The property coordinates, the river station and the border crossing are set
            with environment variables, not here — see{" "}
            <code className="rounded bg-foam/8 px-1.5 py-0.5 text-xs text-foam">
              .env.example
            </code>{" "}
            in the repository.
          </p>
        </Card>

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full border border-foam/12 bg-foam/[0.04] px-4 py-2.5 text-sm text-mist transition-colors hover:text-foam"
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset to defaults ({DEFAULT_SETTINGS.temperatureUnit === "F" ? "°F" : "°C"}, mph,
          inHg, feet)
        </button>
      </div>
    </main>
  );
}
