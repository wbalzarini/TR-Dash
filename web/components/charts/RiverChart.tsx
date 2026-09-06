"use client";

/**
 * St. Lawrence water level over the last 24 hours or 7 days.
 *
 * The river moves in centimetres, so the y-axis is scaled to the data rather
 * than to zero — a zero-based axis would render every reading as the same flat
 * line. The axis labels carry the unit so that isn't misleading.
 */

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RiverReading } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { convertRiverLevel, riverUnitLabel } from "@/lib/units";
import { formatClock, formatDayMonth } from "@/lib/time";
import { AXIS_PROPS, axisWidth, CHART_COLORS, TOOLTIP_STYLE } from "./chart-theme";

type Range = "24h" | "7d";

type Props = {
  history: RiverReading[];
  settings: Settings;
  timezone: string;
  className?: string;
};

export function RiverChart({ history, settings, timezone, className = "" }: Props) {
  const [range, setRange] = useState<Range>("24h");

  const cutoff =
    Date.now() - (range === "24h" ? 24 : 24 * 7) * 60 * 60 * 1000;
  const points = history
    .filter((reading) => reading.time >= cutoff)
    .map((reading) => ({
      time: reading.time,
      level: convertRiverLevel(reading.meters, settings),
      label:
        range === "24h"
          ? formatClock(reading.time, timezone)
          : formatDayMonth(reading.time, timezone),
    }));

  const unit = riverUnitLabel(settings);
  const hasSevenDays =
    history.length > 0 && Date.now() - history[0].time > 36 * 60 * 60 * 1000;

  if (points.length < 2) {
    return (
      <div className={className}>
        <p className="py-8 text-center text-sm text-fathom">
          Not enough readings to chart this range.
        </p>
      </div>
    );
  }

  const values = points.map((point) => point.level);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A minimum span keeps a genuinely flat river from being drawn as noise.
  const minimumSpan = settings.riverUnit === "m" ? 0.05 : 0.15;
  const span = Math.max(max - min, minimumSpan);
  const middle = (max + min) / 2;
  const domain: [number, number] = [middle - span * 0.75, middle + span * 0.75];
  const tickLabel = (value: number) => value.toFixed(2);
  const yAxisWidth = axisWidth(domain.map(tickLabel));

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        {/* Named explicitly: the water-temperature block sits directly above
            this chart, and an unlabelled axis reads as whatever came last. */}
        <span className="text-[11px] text-fathom">
          Water level · {range === "24h" ? "last 24 hours" : "last 7 days"} · {unit}
        </span>
        <div className="flex gap-1 rounded-full border border-foam/10 bg-foam/[0.04] p-0.5">
          {(["24h", "7d"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              disabled={option === "7d" && !hasSevenDays}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                range === option ? "bg-foam text-abyss" : "text-mist hover:text-foam"
              }`}
            >
              {option === "24h" ? "24h" : "7d"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="river-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.beacon} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CHART_COLORS.beacon} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              {...AXIS_PROPS}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={domain}
              {...AXIS_PROPS}
              width={yAxisWidth}
              tickFormatter={tickLabel}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [`${Number(value).toFixed(2)} ${unit}`, "Level"]}
            />
            <Area
              type="monotone"
              dataKey="level"
              stroke={CHART_COLORS.beacon}
              strokeWidth={2}
              fill="url(#river-fill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: CHART_COLORS.beacon }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
