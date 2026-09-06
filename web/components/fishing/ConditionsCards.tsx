"use client";

import { Gauge, Moon, Waves, Wind } from "lucide-react";
import type { AstroData, DashboardResponse } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import type { FishingInputs } from "@/lib/fishing/types";
import { pressureChange } from "@/lib/fishing/inputs";
import {
  cardinal,
  formatPressure,
  formatTemp,
  formatWind,
  pressureUnitLabel,
  windUnitLabel,
} from "@/lib/units";
import { formatClock } from "@/lib/time";
import { Card, CardHeader } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";
import { Stat } from "./Stat";

const one = (n: number | null | undefined, digits = 0) =>
  n == null ? null : n.toFixed(digits);

/** Weather as the fishing engine sees it. */
export function CurrentConditionsCard({
  inputs,
  settings,
}: {
  inputs: FishingInputs;
  settings: Settings;
}) {
  const windUnit = windUnitLabel(settings);
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader title="Current Conditions" icon={<Wind className="size-3.5" aria-hidden />} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        <Stat
          label="Air"
          value={inputs.airTempF == null ? null : formatTemp(inputs.airTempF, settings)}
        />
        <Stat
          label="Wind"
          value={inputs.windMph == null ? null : `${formatWind(inputs.windMph, settings)} ${windUnit}`}
          hint={inputs.windDirectionDeg == null ? null : `from the ${cardinal(inputs.windDirectionDeg)}`}
        />
        <Stat
          label="Gusts"
          value={inputs.windGustMph == null ? null : `${formatWind(inputs.windGustMph, settings)} ${windUnit}`}
        />
        <Stat
          label="Cloud cover"
          value={inputs.cloudCoverPct == null ? null : `${Math.round(inputs.cloudCoverPct)}%`}
        />
        <Stat
          label="Chance of rain"
          value={
            inputs.precipProbabilityPct == null
              ? null
              : `${Math.round(inputs.precipProbabilityPct)}%`
          }
        />
        <Stat
          label="Humidity"
          value={inputs.humidityPct == null ? null : `${Math.round(inputs.humidityPct)}%`}
        />
        <Stat
          label="Visibility"
          value={inputs.visibilityMiles == null ? null : `${one(inputs.visibilityMiles, 1)} mi`}
        />
        <Stat
          label="Precip (1h)"
          value={inputs.precipInches == null ? null : `${inputs.precipInches.toFixed(2)}"`}
        />
      </dl>
    </Card>
  );
}

/** Pressure now, plus how far it has moved across four windows. */
export function PressureTrendCard({
  dashboard,
  inputs,
  settings,
}: {
  dashboard: DashboardResponse;
  inputs: FishingInputs;
  settings: Settings;
}) {
  const weather = dashboard.weather.status === "ok" ? dashboard.weather.data : null;
  const windows = [3, 6, 12, 24] as const;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Barometric Trend"
        icon={<Gauge className="size-3.5" aria-hidden />}
        aside={
          weather ? (
            <StatusPill
              tone={
                weather.pressureTrend === "rising"
                  ? "calm"
                  : weather.pressureTrend === "falling"
                    ? "caution"
                    : "neutral"
              }
            >
              {weather.pressureTrend}
            </StatusPill>
          ) : null
        }
      />

      <p className="readout text-4xl font-semibold">
        {inputs.pressureHpa == null ? (
          <span className="text-lg text-fathom/70">Unavailable</span>
        ) : (
          <>
            {formatPressure(inputs.pressureHpa, settings)}
            <span className="ml-2 text-base font-normal text-fathom">
              {pressureUnitLabel(settings)}
            </span>
          </>
        )}
      </p>

      <dl className="mt-5 grid grid-cols-4 gap-3">
        {windows.map((hours) => {
          const change = weather
            ? pressureChange(weather.pressureHistory, inputs.at, hours)
            : null;
          return (
            <div key={hours}>
              <dt className="text-[11px] text-fathom">{hours}h</dt>
              <dd
                className={`tabular mt-1 text-sm font-semibold ${
                  change == null
                    ? "text-fathom/70"
                    : change <= -0.5
                      ? "text-caution"
                      : change >= 0.5
                        ? "text-calm"
                        : "text-mist"
                }`}
              >
                {change == null
                  ? "—"
                  : `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}`}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-[10px] text-fathom">Change in hPa over each window.</p>
    </Card>
  );
}

/** Water temperature, level, flow, clarity and oxygen. */
export function WaterCard({
  dashboard,
  inputs,
  settings,
}: {
  dashboard: DashboardResponse;
  inputs: FishingInputs;
  settings: Settings;
}) {
  const river = dashboard.river.status === "ok" ? dashboard.river.data : null;
  const quality = dashboard.waterQuality;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader title="Water" icon={<Waves className="size-3.5" aria-hidden />} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        <Stat
          label="Temperature"
          value={inputs.waterTempF == null ? null : formatTemp(inputs.waterTempF, settings)}
        />
        <Stat
          label="Level"
          value={
            river == null
              ? null
              : `${(settings.riverUnit === "m" ? river.levelMeters : river.levelMeters * 3.280839895).toFixed(2)} ${settings.riverUnit === "m" ? "m" : "ft"}`
          }
          hint={river?.trend ?? null}
        />
        <Stat
          label="Level change"
          value={
            inputs.waterLevelChangeFt == null
              ? null
              : `${inputs.waterLevelChangeFt >= 0 ? "+" : "−"}${Math.abs(inputs.waterLevelChangeFt).toFixed(2)} ft`
          }
          hint={river ? `over ${river.trendWindowHours}h` : null}
        />
        <Stat
          label="Flow"
          value={inputs.flowCfs == null ? null : `${Math.round(inputs.flowCfs).toLocaleString()} cfs`}
        />
        <Stat
          label="Clarity"
          value={inputs.turbidityNtu == null ? null : `${one(inputs.turbidityNtu, 1)} NTU`}
          hint={
            inputs.turbidityNtu == null
              ? null
              : inputs.turbidityNtu < 5
                ? "clear"
                : inputs.turbidityNtu < 25
                  ? "lightly stained"
                  : "murky"
          }
        />
        <Stat
          label="Dissolved O₂"
          value={
            inputs.dissolvedOxygenMgL == null ? null : `${one(inputs.dissolvedOxygenMgL, 1)} mg/L`
          }
        />
      </dl>

      {quality.status === "unavailable" ? (
        <p className="mt-4 border-t border-foam/8 pt-3 text-[11px] leading-relaxed text-fathom/70">
          Flow, clarity and oxygen come from USGS and are not reported at every gauge.
        </p>
      ) : null}
    </Card>
  );
}

/** Sun, moon and the solunar periods derived from the moon's position. */
export function SunMoonCard({
  astro,
  timezone,
  now,
}: {
  astro: AstroData;
  timezone: string;
  now: number;
}) {
  const time = (value: number | null) => (value == null ? null : formatClock(value, timezone));
  const active = astro.solunar.find((p) => now >= p.start && now <= p.end) ?? null;
  const next = astro.solunar.find((p) => p.start > now) ?? null;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Sun & Moon"
        icon={<Moon className="size-3.5" aria-hidden />}
        aside={
          <span className="text-[11px] text-fathom">
            {astro.moonPhaseName} · {Math.round(astro.moonIllumination * 100)}%
          </span>
        }
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        <Stat label="Sunrise" value={time(astro.sunrise)} />
        <Stat label="Sunset" value={time(astro.sunset)} />
        <Stat label="Moonrise" value={time(astro.moonrise)} />
        <Stat label="Moonset" value={time(astro.moonset)} />
      </dl>

      <div className="mt-5 border-t border-foam/8 pt-4">
        <p className="eyebrow mb-3">Solunar Periods</p>
        <ul className="space-y-1.5">
          {astro.solunar.map((period) => {
            const isActive = now >= period.start && now <= period.end;
            return (
              <li
                key={`${period.kind}-${period.start}`}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                  isActive
                    ? "border-calm/30 bg-calm/8 text-foam"
                    : "border-foam/8 bg-foam/[0.02] text-mist"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`size-1.5 rounded-full ${period.kind === "major" ? "bg-calm" : "bg-beacon"}`}
                    aria-hidden
                  />
                  {period.label}
                  <span className="text-[10px] text-fathom uppercase">{period.kind}</span>
                </span>
                <span className="tabular text-xs">
                  {formatClock(period.start, timezone)} – {formatClock(period.end, timezone)}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-fathom">
          {active
            ? `In a ${active.kind} period now — ${active.label.toLowerCase()}.`
            : next
              ? `Next period at ${formatClock(next.start, timezone)}.`
              : "No further periods today."}
        </p>
      </div>
    </Card>
  );
}
