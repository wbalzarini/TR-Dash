"use client";

/**
 * The next 24 hours, one metric at a time.
 *
 * A single series keeps the y-axis honest — overlaying temperature, wind and
 * pressure on one scale is how weather charts become unreadable on a phone.
 * Tapping a chip swaps the series and the axis with it.
 */

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyForecast } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import {
  hpaToInHg,
  hpaToMmHg,
  mphToKnots,
  mphToKph,
  mphToMps,
  pressureUnitLabel,
  tempUnitLabel,
  windUnitLabel,
  fahrenheitToCelsius,
} from "@/lib/units";
import { formatHour } from "@/lib/time";
import { AXIS_PROPS, axisWidth, CHART_COLORS, TOOLTIP_STYLE } from "./chart-theme";

type MetricKey = "temperature" | "wind" | "gusts" | "precipitation" | "pressure";

type Metric = {
  key: MetricKey;
  label: string;
  color: string;
  /** Bars for precipitation; an area for everything continuous. */
  shape: "area" | "bar";
  /** Canonical value → the reader's units. */
  convert: (hour: HourlyForecast, settings: Settings) => number | null;
  unit: (settings: Settings) => string;
  format: (value: number, settings: Settings) => string;
};

const METRICS: Metric[] = [
  {
    key: "temperature",
    label: "Temperature",
    color: CHART_COLORS.brass,
    shape: "area",
    convert: (hour, settings) =>
      settings.temperatureUnit === "C"
        ? fahrenheitToCelsius(hour.temperature)
        : hour.temperature,
    unit: tempUnitLabel,
    format: (value, settings) => `${Math.round(value)}${tempUnitLabel(settings)}`,
  },
  {
    key: "wind",
    label: "Wind",
    color: CHART_COLORS.beacon,
    shape: "area",
    convert: (hour, settings) => convertWind(hour.windSpeed, settings),
    unit: windUnitLabel,
    format: (value, settings) => `${Math.round(value)} ${windUnitLabel(settings)}`,
  },
  {
    key: "gusts",
    label: "Gusts",
    color: CHART_COLORS.heavy,
    shape: "area",
    convert: (hour, settings) => convertWind(hour.windGust, settings),
    unit: windUnitLabel,
    format: (value, settings) => `${Math.round(value)} ${windUnitLabel(settings)}`,
  },
  {
    key: "precipitation",
    label: "Precip",
    color: CHART_COLORS.beaconDeep,
    shape: "bar",
    convert: (hour) => hour.precipitationProbability,
    unit: () => "%",
    format: (value) => `${Math.round(value)}%`,
  },
  {
    key: "pressure",
    label: "Pressure",
    color: CHART_COLORS.calm,
    shape: "area",
    convert: (hour, settings) =>
      hour.pressureHpa == null ? null : convertPressure(hour.pressureHpa, settings),
    unit: pressureUnitLabel,
    format: (value, settings) =>
      `${settings.pressureUnit === "inHg" ? value.toFixed(2) : value.toFixed(1)} ${pressureUnitLabel(settings)}`,
  },
];

function convertWind(mph: number | null, settings: Settings): number | null {
  if (mph == null) return null;
  switch (settings.windUnit) {
    case "kph":
      return mphToKph(mph);
    case "kts":
      return mphToKnots(mph);
    case "mps":
      return mphToMps(mph);
    default:
      return mph;
  }
}

function convertPressure(hpa: number, settings: Settings): number {
  switch (settings.pressureUnit) {
    case "hPa":
      return hpa;
    case "mmHg":
      return hpaToMmHg(hpa);
    default:
      return hpaToInHg(hpa);
  }
}

type Props = {
  hourly: HourlyForecast[];
  settings: Settings;
  timezone: string;
};

export function WeatherChart({ hourly, settings, timezone }: Props) {
  const [active, setActive] = useState<MetricKey>("temperature");
  const metric = METRICS.find((entry) => entry.key === active) ?? METRICS[0];

  const data = hourly
    .slice(0, 24)
    .map((hour) => ({
      time: hour.time,
      hour: formatHour(hour.time, timezone),
      value: metric.convert(hour, settings),
    }))
    .filter((point) => point.value != null);

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-fathom">
        Not enough hourly data to chart.
      </p>
    );
  }

  const values = data.map((point) => point.value as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, metric.key === "pressure" ? 0.05 : 1);
  // Percentages and rainfall read better anchored at zero.
  const domain: [number, number] =
    metric.key === "precipitation" ? [0, 100] : [min - pad, max + pad];
  const yAxisWidth = axisWidth(domain.map((value) => shortTick(value, metric, settings)));

  return (
    <div>
      <div
        className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Chart metric"
      >
        {METRICS.map((entry) => {
          const selected = entry.key === active;
          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(entry.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                selected
                  ? "border-transparent bg-foam text-abyss"
                  : "border-foam/12 bg-foam/[0.04] text-mist hover:bg-foam/[0.09]"
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {metric.shape === "bar" ? (
            <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="hour" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={24} />
              <YAxis domain={domain} {...AXIS_PROPS} width={yAxisWidth} />
              <Tooltip
                {...TOOLTIP_STYLE}
                cursor={{ fill: "oklch(0.972 0.008 240 / 0.06)" }}
                formatter={(value) => [metric.format(Number(value), settings), metric.label]}
              />
              <Bar dataKey="value" fill={metric.color} radius={[3, 3, 0, 0]} maxBarSize={14} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`chart-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metric.color} stopOpacity={0.38} />
                  <stop offset="100%" stopColor={metric.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="hour" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={24} />
              <YAxis
                domain={domain}
                {...AXIS_PROPS}
                width={yAxisWidth}
                tickFormatter={(value: number) => shortTick(value, metric, settings)}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value) => [metric.format(Number(value), settings), metric.label]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={metric.color}
                strokeWidth={2}
                fill={`url(#chart-${metric.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: metric.color }}
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Axis labels have ~44px — keep pressure to two decimals, everything else whole. */
function shortTick(value: number, metric: Metric, settings: Settings): string {
  if (metric.key === "pressure") {
    return settings.pressureUnit === "inHg" ? value.toFixed(2) : value.toFixed(0);
  }
  return String(Math.round(value));
}
