"use client";

import { MapPin, Thermometer, Waves } from "lucide-react";
import type { Section, RiverData, WaterTemperature } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import {
  convertRiverLevel,
  fahrenheitToCelsius,
  formatRiverLevel,
  formatTemp,
  metersToFeet,
  riverUnitLabel,
  TREND_ARROW,
  TREND_LABEL,
} from "@/lib/units";
import { Card, CardHeader } from "../ui/Card";
import { RiverChart } from "../charts/RiverChart";
import { RelativeTime } from "../ui/RelativeTime";
import { StaleBadge } from "../ui/StaleBadge";
import { StatusPill, type PillTone } from "../ui/StatusPill";
import { Unavailable } from "../ui/Unavailable";

type Props = {
  section: Section<RiverData>;
  /** Comes from a different agency than the level, so it fails on its own. */
  waterTemp: Section<WaterTemperature>;
  settings: Settings;
  timezone: string;
};

const TREND_TONE: Record<string, PillTone> = {
  rising: "beacon",
  falling: "caution",
  steady: "neutral",
};

const TEMP_TREND_TONE: Record<string, PillTone> = {
  rising: "caution",
  falling: "beacon",
  steady: "neutral",
};

/**
 * Water temperature, sitting under the level inside the same card.
 *
 * It belongs here rather than in its own card — it's the same river — but it
 * comes from NOAA or USGS rather than the Canadian Hydrographic Service, so it
 * carries
 * its own timestamp, its own station name and its own failure state. A dead
 * thermometer must never make the level look stale, or vice versa.
 */
function WaterTempRow({
  section,
  settings,
}: {
  section: Section<WaterTemperature>;
  settings: Settings;
}) {
  if (section.status === "unavailable") {
    return (
      <div className="mt-5 border-t border-foam/8 pt-4">
        <p className="flex items-center gap-2 text-xs text-fathom">
          <Thermometer className="size-3.5 shrink-0" aria-hidden />
          Water temperature temporarily unavailable
        </p>
        {/* The upstream reason, verbatim. A gauge can be offline for a season,
            which is worth telling apart from the service being down. */}
        {section.error ? (
          <p className="mt-1.5 pl-5 text-[11px] leading-relaxed break-words text-fathom/70">
            {section.error}
          </p>
        ) : null}
      </div>
    );
  }

  const { fahrenheit, observedAt, trend, changeFahrenheit, trendWindowHours, station, provider } =
    section.data;
  // Two agencies publish this depending on which one answered; say which.
  const agency = provider === "noaa-coops" ? "NOAA" : "USGS";
  const secondary =
    settings.temperatureUnit === "F"
      ? `${fahrenheitToCelsius(fahrenheit).toFixed(1)} °C`
      : `${Math.round(fahrenheit)} °F`;
  const change = Math.abs(changeFahrenheit);

  return (
    <div className="mt-5 border-t border-foam/8 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] tracking-wide text-fathom">
            <Thermometer className="size-3.5" aria-hidden />
            Water temperature
          </p>
          <p className="readout mt-1.5 text-4xl font-semibold">
            {formatTemp(fahrenheit, settings)}
            <span className="ml-1.5 text-base font-normal text-fathom">
              {settings.temperatureUnit}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-fathom tabular">{secondary}</p>
        </div>

        <div className="mb-1 flex flex-col items-start gap-2 sm:items-end">
          <StatusPill tone={TEMP_TREND_TONE[trend]}>
            <span aria-hidden>{TREND_ARROW[trend]}</span>
            {TREND_LABEL[trend]}
          </StatusPill>
          <p className="text-xs text-fathom tabular">
            {change < 0.1 ? "No change" : `${change.toFixed(1)}°`} over {trendWindowHours}h
          </p>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fathom">
        {section.stale ? (
          <span className="text-caution">Data may be stale ·</span>
        ) : (
          <span>Updated</span>
        )}
        <RelativeTime epochMs={observedAt} />
        <span>
          · {agency} {station.id}
        </span>
        <span className="text-fathom/80">{station.name}</span>
      </p>
    </div>
  );
}

/**
 * Water level from the Canadian Hydrographic Service.
 *
 * The station is named on the card on purpose: the nearest official gauge can be
 * tens of kilometres from the dock, and a level is only meaningful if you know
 * where it was measured.
 */
export function RiverCard({ section, waterTemp, settings, timezone }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="St. Lawrence River"
          icon={<Waves className="size-3.5" aria-hidden />}
        />
        <Unavailable label="River level" detail={section.error} />
        <WaterTempRow section={waterTemp} settings={settings} />
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

      <WaterTempRow section={waterTemp} settings={settings} />

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
