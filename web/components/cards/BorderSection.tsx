"use client";

import { AlertTriangle, ArrowRight, Car, ExternalLink, Home } from "lucide-react";
import type { BorderData, BorderDirection, BorderStatus, Section } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import { Card, CardHeader } from "../ui/Card";
import { RelativeTime } from "../ui/RelativeTime";
import { StatusPill, type PillTone } from "../ui/StatusPill";
import { Unavailable } from "../ui/Unavailable";

/** Matches STALE_AFTER_MS.border on the server. */
const STALE_AFTER_MS = 150 * 60 * 1000;

const STATUS_META: Record<
  BorderStatus,
  { label: string; tone: PillTone; text: string }
> = {
  minimal: { label: "Minimal wait", tone: "calm", text: "text-calm" },
  moderate: { label: "Moderate wait", tone: "caution", text: "text-caution" },
  significant: { label: "Significant wait", tone: "heavy", text: "text-heavy" },
  heavy: { label: "Heavy delay", tone: "severe", text: "text-severe" },
  unknown: { label: "No wait reported", tone: "neutral", text: "text-mist" },
};

/**
 * One direction of the crossing, as its own card.
 *
 * The two directions come from two different governments — CBSA northbound,
 * CBP southbound — so each carries its own wait, its own timestamp and its own
 * failure state. One agency going quiet must never make the other look stale.
 */
function DirectionCard({
  title,
  subtitle,
  fromFlag,
  toFlag,
  icon,
  direction,
  sourceUrl,
}: {
  title: string;
  subtitle: string;
  fromFlag: string;
  toFlag: string;
  icon: React.ReactNode;
  direction: BorderDirection | null;
  sourceUrl: string;
}) {
  if (!direction) {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader title={title} icon={icon} />
        <p className="mb-4 text-sm text-mist">{subtitle}</p>
        <Unavailable label="Wait time" />
      </Card>
    );
  }

  const meta = STATUS_META[direction.status];
  const isStale =
    direction.updatedAt != null && Date.now() - direction.updatedAt > STALE_AFTER_MS;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title={title}
        icon={icon}
        aside={
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11px] text-fathom transition-colors hover:text-beacon"
          >
            {direction.source.toUpperCase()}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {fromFlag}
        </span>
        <ArrowRight className="size-4 text-fathom" aria-hidden />
        <span className="text-lg leading-none" aria-hidden>
          {toFlag}
        </span>
        <p className="ml-1 text-sm text-mist">{subtitle}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-2">
        {direction.waitMinutes == null ? (
          <p className="text-3xl font-semibold text-mist">
            {direction.portStatus ?? "Not reported"}
          </p>
        ) : (
          <>
            <p className={`readout text-6xl font-semibold sm:text-7xl ${meta.text}`}>
              {direction.waitMinutes}
            </p>
            <p className="mb-2 text-lg text-fathom">min</p>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
        {direction.portStatus && direction.waitMinutes != null ? (
          <StatusPill>{direction.portStatus}</StatusPill>
        ) : null}
      </div>

      <div className="mt-4 border-t border-foam/8 pt-3">
        <p className="text-[11px] text-fathom">
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
        <p className="mt-1.5 text-[11px] text-fathom/70">{direction.sourceName}</p>
      </div>
    </Card>
  );
}

/**
 * Getting to the island, and back again.
 *
 * Northbound leads because that is the direction you use arriving, and it gets
 * its own card rather than sharing one — the number you want on the drive up
 * should not be half a tile.
 */
export function BorderSection({
  section,
  settings,
}: {
  section: Section<BorderData>;
  settings: Settings;
}) {
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

  const { usToCanada, canadaToUs } = section.data;
  const northFirst = settings.preferredBorderDirection === "usToCanada";

  const north = (
    <DirectionCard
      key="north"
      title="Entering Canada"
      subtitle="Thousand Islands Bridge · U.S. → Canada"
      fromFlag="🇺🇸"
      toFlag="🇨🇦"
      icon={<Car className="size-3.5" aria-hidden />}
      direction={usToCanada}
      sourceUrl="https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html"
    />
  );

  const south = (
    <DirectionCard
      key="south"
      title="Returning to the U.S."
      subtitle="Thousand Islands Bridge · Canada → U.S."
      fromFlag="🇨🇦"
      toFlag="🇺🇸"
      icon={<Home className="size-3.5" aria-hidden />}
      direction={canadaToUs}
      sourceUrl="https://bwt.cbp.gov/"
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {northFirst ? [north, south] : [south, north]}
    </div>
  );
}
