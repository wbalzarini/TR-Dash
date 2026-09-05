"use client";

import { Gauge } from "lucide-react";
import type { Section, WeatherData } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import {
  formatPressure,
  hpaToInHg,
  pressureUnitLabel,
  TREND_ARROW,
  TREND_LABEL,
} from "@/lib/units";
import { Card, CardHeader } from "../ui/Card";
import { PressureSparkline } from "../charts/PressureSparkline";
import { StaleBadge } from "../ui/StaleBadge";
import { StatusPill, type PillTone } from "../ui/StatusPill";
import { Unavailable } from "../ui/Unavailable";

type Props = {
  section: Section<WeatherData>;
  settings: Settings;
};

const TREND_TONE: Record<string, PillTone> = {
  rising: "calm",
  falling: "caution",
  steady: "neutral",
};

export function PressureCard({ section, settings }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5">
        <CardHeader title="Barometric Pressure" icon={<Gauge className="size-3.5" aria-hidden />} />
        <Unavailable label="Pressure" />
      </Card>
    );
  }

  const { current, pressureHistory, pressureTrend, pressureChangeHpa } = section.data;
  const secondary =
    settings.pressureUnit === "inHg"
      ? `${current.pressureHpa.toFixed(0)} hPa`
      : `${hpaToInHg(current.pressureHpa).toFixed(2)} inHg`;

  return (
    <Card className="flex flex-col p-5">
      <CardHeader
        title="Barometric Pressure"
        icon={<Gauge className="size-3.5" aria-hidden />}
        aside={<StaleBadge observedAt={current.observedAt} stale={section.stale} />}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="readout text-5xl font-semibold">
            {formatPressure(current.pressureHpa, settings)}
            <span className="ml-2 text-base font-normal text-fathom">
              {pressureUnitLabel(settings)}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-fathom tabular">{secondary}</p>
        </div>

        <StatusPill tone={TREND_TONE[pressureTrend]}>
          <span aria-hidden>{TREND_ARROW[pressureTrend]}</span>
          {TREND_LABEL[pressureTrend]}
        </StatusPill>
      </div>

      <div className="mt-4 flex-1">
        <PressureSparkline history={pressureHistory} tone={pressureTrend} />
      </div>

      <p className="mt-1 border-t border-foam/8 pt-3 text-xs text-fathom">
        {pressureHistory.length > 2 ? (
          <>
            Last 24 hours ·{" "}
            <span className="tabular">
              {pressureChangeHpa >= 0 ? "+" : "−"}
              {Math.abs(pressureChangeHpa).toFixed(1)} hPa
            </span>{" "}
            over 3 hours
          </>
        ) : (
          "Building pressure history"
        )}
      </p>
    </Card>
  );
}
