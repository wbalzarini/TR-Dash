"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { PressurePoint } from "@/lib/types";
import { CHART_COLORS } from "./chart-theme";

type Props = {
  history: PressurePoint[];
  /** Colour cue matching the trend. */
  tone: "rising" | "falling" | "steady";
};

const TONE_COLOR = {
  rising: CHART_COLORS.calm,
  falling: CHART_COLORS.caution,
  steady: CHART_COLORS.beacon,
} as const;

/**
 * The last 24 hours of barometric pressure, unlabelled on purpose — it exists to
 * show the shape of the trend, and the exact number is right above it.
 */
export function PressureSparkline({ history, tone }: Props) {
  if (history.length < 3) return null;

  const color = TONE_COLOR[tone];
  const values = history.map((point) => point.pressureHpa);
  // A little headroom so the line never touches the edges of the box.
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.25, 0.4);

  return (
    <div className="h-14 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min - pad, max + pad]} hide />
          <Area
            type="monotone"
            dataKey="pressureHpa"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${tone})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
