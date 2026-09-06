"use client";

import { Clock } from "lucide-react";
import type { HourScore, FishingWindow } from "@/lib/fishing/windows";
import type { Rating } from "@/lib/fishing/types";
import { formatClock, formatHour } from "@/lib/time";
import { Card, CardHeader } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";
import { RATING_BAR, RATING_TONE } from "./tone";

const ORDER: Rating[] = ["Excellent", "Good", "Fair", "Poor"];

/**
 * The next 24 hours, scored hour by hour by the same engine that produces the
 * headline number — so the timeline can never disagree with the score above it.
 */
export function BestTimesCard({
  hours,
  windows,
  timezone,
}: {
  hours: HourScore[];
  windows: FishingWindow[];
  timezone: string;
}) {
  if (hours.length === 0) {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader title="Best Times" icon={<Clock className="size-3.5" aria-hidden />} />
        <p className="py-6 text-center text-sm text-fathom">
          Hourly forecast unavailable — cannot score the day ahead.
        </p>
      </Card>
    );
  }

  const max = Math.max(...hours.map((h) => h.score), 1);

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Best Times"
        icon={<Clock className="size-3.5" aria-hidden />}
        aside={<span className="text-[11px] text-fathom">Next 24 hours</span>}
      />

      {/* Hour columns: height is the score, colour is the rating. */}
      <div className="-mx-1 flex h-24 items-end gap-[3px] overflow-x-auto px-1">
        {hours.map((hour, index) => (
          <div key={hour.at} className="flex min-w-[13px] flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-sm ${RATING_BAR[hour.rating]}`}
              style={{ height: `${Math.max(6, (hour.score / max) * 74)}px` }}
              title={`${formatClock(hour.at, timezone)} — ${hour.score}/100 ${hour.rating}`}
            />
            <span className="text-[9px] whitespace-nowrap text-fathom">
              {index % 3 === 0 ? formatHour(hour.at, timezone) : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-foam/8 pt-3">
        {ORDER.map((rating) => (
          <span key={rating} className="flex items-center gap-1.5 text-[10px] text-fathom">
            <span className={`size-2 rounded-full ${RATING_BAR[rating]}`} aria-hidden />
            {rating}
          </span>
        ))}
      </div>

      {windows.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {windows.map((window) => (
            <li
              key={window.start}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-foam/8 bg-foam/[0.03] px-3.5 py-2.5"
            >
              <span className="tabular text-sm font-medium text-foam">
                {formatClock(window.start, timezone)} – {formatClock(window.end, timezone)}
              </span>
              <StatusPill tone={RATING_TONE[window.rating]}>
                {window.rating} · {window.peak}
              </StatusPill>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-fathom">
          No standout window in the next 24 hours.
        </p>
      )}
    </Card>
  );
}
