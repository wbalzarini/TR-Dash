"use client";

import { Droplets } from "lucide-react";
import type { Section, WeatherData } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { formatTemp, formatVisibility } from "@/lib/units";
import { Card, CardHeader } from "../ui/Card";
import { StaleBadge } from "../ui/StaleBadge";
import { Unavailable } from "../ui/Unavailable";

type Props = {
  section: Section<WeatherData>;
  settings: Settings;
};

/** One label/value pair. Values that the provider omitted render as an em dash. */
function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-fathom">{label}</dt>
      <dd className="readout mt-1 text-xl font-semibold text-foam">{value ?? "—"}</dd>
    </div>
  );
}

export function ConditionsCard({ section, settings }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5">
        <CardHeader title="Conditions" icon={<Droplets className="size-3.5" aria-hidden />} />
        <Unavailable label="Conditions" />
      </Card>
    );
  }

  const { current } = section.data;

  return (
    <Card className="p-5">
      <CardHeader
        title="Conditions"
        icon={<Droplets className="size-3.5" aria-hidden />}
        aside={<StaleBadge observedAt={current.observedAt} stale={section.stale} />}
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        <Stat label="Humidity" value={`${Math.round(current.humidity)}%`} />
        <Stat
          label="Dew point"
          value={current.dewPoint == null ? null : formatTemp(current.dewPoint, settings)}
        />
        <Stat
          label="Chance of rain"
          value={
            current.precipitationProbability == null
              ? null
              : `${Math.round(current.precipitationProbability)}%`
          }
        />
        <Stat label="Cloud cover" value={`${Math.round(current.cloudCover)}%`} />
        <Stat
          label="Visibility"
          value={
            current.visibility == null ? null : formatVisibility(current.visibility, settings)
          }
        />
        <Stat label="Precip (1h)" value={`${current.precipitation.toFixed(2)}"`} />
      </dl>
    </Card>
  );
}
