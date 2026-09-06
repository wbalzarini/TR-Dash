"use client";

import { X } from "lucide-react";
import type { DashboardResponse } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import {
  cardinal,
  formatPressure,
  formatRiverLevel,
  formatTemp,
  formatWind,
  pressureUnitLabel,
  riverUnitLabel,
  TREND_ARROW,
  TREND_LABEL,
  windUnitLabel,
} from "@/lib/units";
import { Compass } from "./ui/Compass";
import { WeatherIcon } from "./ui/WeatherIcon";
import { RelativeTime } from "./ui/RelativeTime";
import { TridentMark } from "./ui/TridentMark";

type Props = {
  dashboard: DashboardResponse | null;
  settings: Settings;
  onExit: () => void;
};

/**
 * Boat mode: the six numbers that matter on the water, at a size you can read in
 * sunlight with wet hands.
 *
 * Everything here is deliberately bigger and higher-contrast than the dashboard
 * — solid backgrounds instead of glass, no charts, no chrome. It's a different
 * reading distance, not a different colour scheme.
 */
export function BoatMode({ dashboard, settings, onExit }: Props) {
  const weather = dashboard?.weather.status === "ok" ? dashboard.weather.data : null;
  const river = dashboard?.river.status === "ok" ? dashboard.river.data : null;
  const waterTemp =
    dashboard?.waterTemperature.status === "ok" ? dashboard.waterTemperature.data : null;
  const current = weather?.current;

  const tile = "rounded-2xl border border-foam/15 bg-foam/[0.07] p-4";
  const label = "text-xs font-semibold tracking-[0.14em] text-mist uppercase";
  const value = "readout mt-2 text-5xl font-bold text-foam";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-abyss">
      <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-12">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TridentMark className="h-9 shrink-0" />
            <div>
            <p className="text-sm font-bold tracking-[0.2em] text-beacon uppercase">
              Boat Mode
            </p>
            {dashboard ? (
              <p className="mt-1 text-xs text-fathom">
                Updated <RelativeTime epochMs={dashboard.fetchedAt} />
              </p>
            ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 rounded-full border border-foam/20 bg-foam/10 px-4 py-2.5 text-sm font-semibold text-foam"
          >
            <X className="size-4" aria-hidden />
            Exit
          </button>
        </div>

        {current ? (
          <>
            <div className={`${tile} mb-3 flex items-center justify-between gap-4`}>
              <div>
                <p className={label}>Wind</p>
                <p className="readout mt-2 text-7xl font-bold text-foam">
                  {formatWind(current.windSpeed, settings)}
                  <span className="ml-2 text-2xl font-semibold text-mist">
                    {windUnitLabel(settings)}
                  </span>
                </p>
                <p className="mt-2 text-2xl font-bold text-beacon">
                  {cardinal(current.windDirection)}
                </p>
                <p className="mt-3 text-lg font-semibold text-heavy">
                  Gusts {formatWind(current.windGust, settings)} {windUnitLabel(settings)}
                </p>
              </div>
              <Compass direction={current.windDirection} size={130} />
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className={tile}>
                <p className={label}>Temp</p>
                <p className={value}>
                  {formatTemp(current.temperature, settings)}
                  <span className="text-2xl font-semibold text-mist">
                    {settings.temperatureUnit}
                  </span>
                </p>
                <p className="mt-2 text-sm text-mist">
                  Feels {formatTemp(current.feelsLike, settings)}
                </p>
              </div>

              <div className={tile}>
                <p className={label}>Pressure</p>
                <p className="readout mt-2 text-4xl font-bold text-foam">
                  {formatPressure(current.pressureHpa, settings)}
                </p>
                <p className="mt-2 text-sm font-semibold text-mist">
                  {pressureUnitLabel(settings)} ·{" "}
                  <span aria-hidden>{TREND_ARROW[weather.pressureTrend]}</span>{" "}
                  {TREND_LABEL[weather.pressureTrend]}
                </p>
              </div>

              <div className={tile}>
                <p className={label}>River level</p>
                {river ? (
                  <>
                    <p className={value}>{formatRiverLevel(river.levelMeters, settings)}</p>
                    <p className="mt-2 text-sm font-semibold text-mist">
                      {riverUnitLabel(settings)} ·{" "}
                      <span aria-hidden>{TREND_ARROW[river.trend]}</span>{" "}
                      {TREND_LABEL[river.trend]}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-lg font-semibold text-mist">Unavailable</p>
                )}
              </div>

              <div className={tile}>
                <p className={label}>Water temp</p>
                {waterTemp ? (
                  <>
                    <p className={value}>
                      {formatTemp(waterTemp.fahrenheit, settings)}
                      <span className="text-2xl font-semibold text-mist">
                        {settings.temperatureUnit}
                      </span>
                    </p>
                    <p className="mt-2 text-sm font-semibold text-mist">
                      <span aria-hidden>{TREND_ARROW[waterTemp.trend]}</span>{" "}
                      {TREND_LABEL[waterTemp.trend]}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-lg font-semibold text-mist">Unavailable</p>
                )}
              </div>

              <div className={`${tile} col-span-2`}>
                <p className={label}>Rain</p>
                <p className={value}>
                  {current.precipitationProbability == null
                    ? "—"
                    : `${Math.round(current.precipitationProbability)}%`}
                </p>
                <p className="mt-2 text-sm text-mist">
                  {current.precipitation.toFixed(2)}&quot; last hour
                </p>
              </div>
            </div>

            <div className={`${tile} flex items-center justify-between gap-4`}>
              <div>
                <p className={label}>Conditions</p>
                <p className="mt-2 text-3xl font-bold text-foam">{current.condition}</p>
                <p className="mt-2 text-sm text-mist">
                  {Math.round(current.humidity)}% humidity
                </p>
              </div>
              <WeatherIcon
                code={current.weatherCode}
                isDay={current.isDay}
                className="size-16 shrink-0"
              />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-foam/15 bg-foam/[0.07] p-8 text-center">
            <p className="text-lg font-semibold text-mist">
              Conditions temporarily unavailable
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
