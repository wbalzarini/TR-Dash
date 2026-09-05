"use client";

import { MapPin, Waves } from "lucide-react";
import type { Section, RiverData } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import {
  convertRiverLevel,
  formatRiverLevel,
  metersToFeet,
  riverUnitLabel,
  TREND_ARROW,
  TREND_LABEL,
} from "@/lib/units";
import { Card, CardHeader } from "../ui/Card";
import { RiverChart } from "../charts/RiverChart";
import { StaleBadge } from "../ui/StaleBadge";
import { StatusPill, type PillTone } from "../ui/StatusPill";
import { Unavailable } from "../ui/Unavailable";

type Props = {
  section: Section<RiverData>;
  settings: Settings;
  timezone: string;
};

const TREND_TONE: Record<string, PillTone> = {
  rising: "beacon",
  falling: "caution",
  steady: "neutral",
};

/**
 * Water level from the Canadian Hydrographic Service.
 *
 * The station is named on the card on purpose: the nearest official gauge can be
 * tens of kilometres from the dock, and a level is only meaningful if you know
 * where it was measured.
 */
export function RiverCard({ section, settings, timezone }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="St. Lawrence River"
          icon={<Waves className="size-3.5" aria-hidden />}
        />
        <Unavailable label="River level" detail={section.error} />
      </Card>
    );
  }

  const { station, levelMeters, observedAt, trend, changeMeters, trendWindowHours, history } =
    section.data;

  const unit = riverUnitLabel(settings);
  const change = Math.abs(
    settings.riverUnit === "m" ? changeMeters : metersToFeet(changeMeters),
  );
  const secondary =
    settings.riverUnit === "ft"
      ? `${levelMeters.toFixed(2)} m`
      : `${convertRiverLevel(levelMeters, { ...settings, riverUnit: "ft" }).toFixed(2)} ft`;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="St. Lawrence River"
        icon={<Waves className="size-3.5" aria-hidden />}
        aside={<StaleBadge observedAt={observedAt} stale={section.stale} />}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-[11px] tracking-wide text-fathom">Water level</p>
          <p className="readout mt-1 text-6xl font-semibold sm:text-7xl">
            {formatRiverLevel(levelMeters, settings)}
            <span className="ml-2 text-xl font-normal text-fathom">{unit}</span>
          </p>
          <p className="mt-2 text-xs text-fathom tabular">{secondary}</p>
        </div>

        <div className="mb-1 flex flex-col items-start gap-2 sm:items-end">
          <StatusPill tone={TREND_TONE[trend]}>
            <span aria-hidden>{TREND_ARROW[trend]}</span>
            {TREND_LABEL[trend]}
          </StatusPill>
          <p className="text-xs text-fathom tabular">
            {change < 0.005 ? "No change" : `${change.toFixed(2)} ${unit}`} over{" "}
            {trendWindowHours}h
          </p>
        </div>
      </div>

      <RiverChart
        history={history}
        settings={settings}
        timezone={timezone}
        className="mt-6"
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-foam/8 pt-3 text-xs text-fathom">
        <MapPin className="size-3.5 shrink-0" aria-hidden />
        <span className="text-mist">{station.name}</span>
        {station.code ? <span>· Station {station.code}</span> : null}
        {station.distanceKm != null ? (
          <span>· {station.distanceKm.toFixed(0)} km from the island</span>
        ) : null}
        {station.resolvedBy === "nearest" ? (
          <span className="text-fathom/80">· nearest CHS gauge</span>
        ) : null}
      </div>
    </Card>
  );
}
