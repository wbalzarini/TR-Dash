"use client";

import { AlertTriangle, ArrowRight, Car, ExternalLink } from "lucide-react";
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
 * One direction inside the customs card.
 *
 * The two directions come from two different governments — CBSA northbound,
 * CBP southbound — so each keeps its own timestamp, staleness flag and source
 * line even though they now share a card. One agency going quiet must never
 * make the other's number look stale.
 */
function Direction({
  title,
  fromFlag,
  toFlag,
  direction,
  sourceUrl,
}: {
  title: string;
  fromFlag: string;
  toFlag: string;
  direction: BorderDirection | null;
  sourceUrl: string;
}) {
  const header = (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none" aria-hidden>
        {fromFlag}
      </span>
      <ArrowRight className="size-3.5 text-fathom" aria-hidden />
      <span className="text-base leading-none" aria-hidden>
        {toFlag}
      </span>
      <p className="ml-1 text-xs font-medium uppercase tracking-wider text-mist">{title}</p>
    </div>
  );

  if (!direction) {
    return (
      <div>
        {header}
        <div className="mt-3">
          <Unavailable label="Wait time" />
        </div>
      </div>
    );
  }

  const meta = STATUS_META[direction.status];
  const isStale =
    direction.updatedAt != null && Date.now() - direction.updatedAt > STALE_AFTER_MS;

  return (
    <div>
      {header}

      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
        {direction.waitMinutes == null ? (
          <p className="text-2xl font-semibold text-mist">
            {direction.portStatus ?? "Not reported"}
          </p>
        ) : (
          <>
            <p className={`readout text-5xl font-semibold sm:text-6xl ${meta.text}`}>
              {direction.waitMinutes}
            </p>
            <p className="mb-1.5 text-base text-fathom">min</p>
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

      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-fathom/70 transition-colors hover:text-beacon"
      >
        {direction.sourceName}
        <ExternalLink className="size-2.5" aria-hidden />
      </a>
    </div>
  );
}

/**
 * Customs wait times at the bridge, both directions in one card.
 *
 * This is the booths only. Roadwork and lane closures on the spans themselves
 * are a different feed and a different card (BridgeSection) — the two fail
 * independently and conflating them once hid a nightly lane closure behind a
 * green "minimal wait".
 */
export function BorderSection({
  section,
  settings,
}: {
  section: Section<BorderData>;
  settings: Settings;
}) {
  const title = "Customs Wait Times";
  const icon = <Car className="size-3.5" aria-hidden />;

  if (section.status === "unavailable") {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader title={title} icon={icon} />
        <Unavailable label="Border wait times" detail={section.error} />
      </Card>
    );
  }

  const { usToCanada, canadaToUs } = section.data;
  const northFirst = settings.preferredBorderDirection === "usToCanada";

  const north = (
    <Direction
      key="north"
      title="Entering Canada"
      fromFlag="🇺🇸"
      toFlag="🇨🇦"
      direction={usToCanada}
      sourceUrl="https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html"
    />
  );

  const south = (
    <Direction
      key="south"
      title="Returning to the U.S."
      fromFlag="🇨🇦"
      toFlag="🇺🇸"
      direction={canadaToUs}
      sourceUrl="https://bwt.cbp.gov/"
    />
  );

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title={title}
        icon={icon}
        aside={<span className="text-[11px] text-fathom">{section.data.crossing}</span>}
      />

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
        {northFirst ? [north, south] : [south, north]}
      </div>
    </Card>
  );
}
