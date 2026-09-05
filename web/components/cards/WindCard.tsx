"use client";

import { Wind } from "lucide-react";
import type { Section, WeatherData } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { cardinal, formatWind, windUnitLabel } from "@/lib/units";
import { Card, CardHeader } from "../ui/Card";
import { Compass } from "../ui/Compass";
import { StaleBadge } from "../ui/StaleBadge";
import { Unavailable } from "../ui/Unavailable";

type Props = {
  section: Section<WeatherData>;
  settings: Settings;
};

export function WindCard({ section, settings }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5">
        <CardHeader title="Wind" icon={<Wind className="size-3.5" aria-hidden />} />
        <Unavailable label="Wind" />
      </Card>
    );
  }

  const { current } = section.data;
  const unit = windUnitLabel(settings);

  return (
    <Card className="flex flex-col p-5">
      <CardHeader
        title="Wind"
        icon={<Wind className="size-3.5" aria-hidden />}
        aside={<StaleBadge observedAt={current.observedAt} stale={section.stale} />}
      />

      <div className="flex flex-1 items-center gap-5">
        <Compass
          direction={current.windDirection}
          label={cardinal(current.windDirection)}
          sublabel={`${Math.round(current.windDirection)}°`}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-[11px] tracking-wide text-fathom">Sustained</p>
            <p className="readout mt-0.5 text-4xl font-semibold">
              {formatWind(current.windSpeed, settings)}
              <span className="ml-1.5 text-sm font-normal text-fathom">{unit}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wide text-fathom">Gusts</p>
            <p className="readout mt-0.5 text-2xl font-semibold text-heavy">
              {formatWind(current.windGust, settings)}
              <span className="ml-1.5 text-sm font-normal text-fathom">{unit}</span>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-foam/8 pt-3 text-xs text-fathom">
        From the {cardinal(current.windDirection)} · arrow shows where it&rsquo;s blowing to
      </p>
    </Card>
  );
}
