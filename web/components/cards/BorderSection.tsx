"use client";

import { AlertTriangle, ArrowRight, Car, ExternalLink } from "lucide-react";
import type { BorderData, BorderDirection, BorderStatus, Section } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { Card, CardHeader } from "../ui/Card";
import { RelativeTime } from "../ui/RelativeTime";
import { StatusPill, type PillTone } from "../ui/StatusPill";
import { Unavailable } from "../ui/Unavailable";

type Props = {
  section: Section<BorderData>;
  settings: Settings;
};

/** Anything older than this and we stop calling the number current. */
const STALE_AFTER_MS = 90 * 60 * 1000;

const STATUS_META: Record<
  BorderStatus,
  { label: string; tone: PillTone; ring: string; text: string }
> = {
  minimal: {
    label: "Minimal wait",
    tone: "calm",
    ring: "border-calm/35 bg-calm/8",
    text: "text-calm",
  },
  moderate: {
    label: "Moderate wait",
    tone: "caution",
    ring: "border-caution/35 bg-caution/8",
    text: "text-caution",
  },
  significant: {
    label: "Significant wait",
    tone: "heavy",
    ring: "border-heavy/35 bg-heavy/8",
    text: "text-heavy",
  },
  heavy: {
    label: "Heavy delay",
    tone: "severe",
    ring: "border-severe/40 bg-severe/8",
    text: "text-severe",
  },
  unknown: {
    label: "No wait reported",
    tone: "neutral",
    ring: "border-foam/10 bg-foam/[0.03]",
    text: "text-mist",
  },
};

type LaneProps = {
  fromFlag: string;
  toFlag: string;
  title: string;
  direction: BorderDirection | null;
  /** The reader's preferred direction gets a brighter frame. */
  emphasised: boolean;
};

function Lane({ fromFlag, toFlag, title, direction, emphasised }: LaneProps) {
  if (!direction) {
    return (
      <div className="rounded-xl border border-dashed border-foam/12 bg-foam/[0.02] p-4">
        <p className="text-sm font-medium text-mist">{title}</p>
        <p className="mt-2 text-sm text-fathom">Wait time temporarily unavailable</p>
      </div>
    );
  }

  const meta = STATUS_META[direction.status];
  const isStale =
    direction.updatedAt != null && Date.now() - direction.updatedAt > STALE_AFTER_MS;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${meta.ring} ${
        emphasised ? "ring-1 ring-foam/10" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden>
          {fromFlag}
        </span>
        <ArrowRight className="size-3.5 text-fathom" aria-hidden />
        <span className="text-base leading-none" aria-hidden>
          {toFlag}
        </span>
        <p className="ml-1 text-sm font-medium text-foam">{title}</p>
      </div>

      <div className="mt-3 flex items-end gap-2">
        {direction.waitMinutes == null ? (
          <p className="text-2xl font-semibold text-mist">
            {direction.portStatus ?? "Not reported"}
          </p>
        ) : (
          <>
            <p className={`readout text-5xl font-semibold ${meta.text}`}>
              {direction.waitMinutes}
            </p>
            <p className="mb-1.5 text-sm text-fathom">min</p>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
        {direction.portStatus && direction.waitMinutes != null ? (
          <StatusPill>{direction.portStatus}</StatusPill>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] text-fathom">
        {isStale ? (
          <span className="inline-flex items-center gap-1 text-caution">
            <AlertTriangle className="size-3" aria-hidden />
            Data may be stale · <RelativeTime epochMs={direction.updatedAt} />
          </span>
        ) : direction.updatedAt ? (
          <>
            Updated <RelativeTime epochMs={direction.updatedAt} />
          </>
        ) : (
          "Source did not report an update time"
        )}
      </p>

      {direction.note ? (
        <p className="mt-2 text-[11px] leading-relaxed text-caution/80">{direction.note}</p>
      ) : null}

      <p className="mt-2 text-[11px] text-fathom/70">{direction.sourceName}</p>
    </div>
  );
}

/**
 * "Getting to the Island" — both directions of the Thousand Islands Bridge.
 *
 * The two directions come from two different governments' feeds, so they are
 * timestamped and sourced independently. One being down never hides the other.
 */
export function BorderSection({ section, settings }: Props) {
  if (section.status === "unavailable") {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Getting to the Island"
          icon={<Car className="size-3.5" aria-hidden />}
        />
        <Unavailable label="Border wait times" detail={section.error} />
      </Card>
    );
  }

  const { crossing, usToCanada, canadaToUs } = section.data;
  const preferUsToCanada = settings.preferredBorderDirection === "usToCanada";

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Getting to the Island"
        icon={<Car className="size-3.5" aria-hidden />}
        aside={
          <a
            href="https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11px] text-fathom transition-colors hover:text-beacon"
          >
            Official sources
            <ExternalLink className="size-3" aria-hidden />
          </a>
        }
      />

      <p className="mb-4 text-sm text-mist">{crossing}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Lane
          fromFlag="🇺🇸"
          toFlag="🇨🇦"
          title="U.S. → Canada"
          direction={usToCanada}
          emphasised={preferUsToCanada}
        />
        <Lane
          fromFlag="🇨🇦"
          toFlag="🇺🇸"
          title="Canada → U.S."
          direction={canadaToUs}
          emphasised={!preferUsToCanada}
        />
      </div>
    </Card>
  );
}
