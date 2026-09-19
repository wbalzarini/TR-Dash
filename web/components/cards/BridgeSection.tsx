"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Construction,
  ExternalLink,
  Settings2,
  TrafficCone,
} from "lucide-react";
import type { BridgeEvent, BridgeSpan, BridgeData, Section } from "@/lib/types";
import { Card, CardHeader } from "../ui/Card";
import { RelativeTime } from "../ui/RelativeTime";
import { StatusPill, type PillTone } from "../ui/StatusPill";
import { Unavailable } from "../ui/Unavailable";

/** Feed's event type → how we label it. Unrecognised types pass through. */
const EVENT_LABELS: Record<string, string> = {
  roadwork: "Roadwork",
  closures: "Closure",
  accidentsandincidents: "Incident",
  specialevents: "Special event",
};

function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType.toLowerCase().replace(/[^a-z]/g, "")] ?? eventType;
}

function toneFor(event: BridgeEvent): PillTone {
  if (event.isFullClosure) return "severe";
  switch ((event.severity ?? "").toLowerCase()) {
    case "major":
      return "severe";
    case "moderate":
      return "heavy";
    case "minor":
      return "caution";
    default:
      return "caution";
  }
}

function EventRow({ event }: { event: BridgeEvent }) {
  return (
    <li className="rounded-xl border border-foam/8 bg-foam/[0.02] px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={toneFor(event)}>
          {event.isFullClosure ? "Full closure" : eventLabel(event.eventType)}
        </StatusPill>
        {event.lanesAffected ? <StatusPill>{event.lanesAffected}</StatusPill> : null}
        {event.directionOfTravel ? (
          <span className="text-[11px] text-fathom">{event.directionOfTravel}</span>
        ) : null}
      </div>

      {event.description ? (
        <p className="mt-2 text-xs leading-relaxed text-mist">{event.description}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-fathom/70">
        {event.roadwayName ? <span>{event.roadwayName}</span> : null}
        {event.updatedAt ? (
          <span>
            Updated <RelativeTime epochMs={event.updatedAt} />
          </span>
        ) : null}
      </div>
    </li>
  );
}

/**
 * One span's block.
 *
 * "No events" and "we couldn't ask" are rendered very differently on purpose:
 * an unreachable feed must never read as ALL CLEAR, because a clear bridge is
 * exactly what someone checks this card to confirm before driving over.
 */
function SpanBlock({ span }: { span: BridgeSpan }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-mist">{span.label}</p>
        <a
          href={span.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[11px] text-fathom/70 transition-colors hover:text-beacon"
        >
          {span.sourceName}
          <ExternalLink className="size-2.5" aria-hidden />
        </a>
      </div>

      {span.error ? (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-dashed border-foam/12 bg-foam/[0.02] px-3.5 py-3">
          {span.needsConfiguration ? (
            <Settings2 className="mt-0.5 size-3.5 shrink-0 text-fathom" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-caution" aria-hidden />
          )}
          <p className="text-xs leading-relaxed text-fathom">
            {span.needsConfiguration ? span.error : `${span.error} Conditions unknown.`}
          </p>
        </div>
      ) : span.events.length === 0 ? (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-foam/8 bg-foam/[0.02] px-3.5 py-3">
          <CheckCircle2 className="size-3.5 shrink-0 text-calm" aria-hidden />
          <p className="text-xs text-mist">No roadwork or closures reported</p>
        </div>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {span.events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Roadwork, lane closures and incidents on the bridge itself.
 *
 * Separate from customs on purpose. The spans and the booths fail
 * independently — the Canadian span ran nightly single-lane closures through a
 * multi-year cable rehabilitation while the customs plaza was wide open, and a
 * single combined card would have shown that as a clear crossing.
 */
export function BridgeSection({ section }: { section: Section<BridgeData> }) {
  const title = "Bridge Status";
  const icon = <Construction className="size-3.5" aria-hidden />;

  if (section.status === "unavailable") {
    return (
      <Card className="p-5 sm:p-6">
        <CardHeader title={title} icon={icon} />
        <Unavailable label="Bridge conditions" detail={section.error} />
      </Card>
    );
  }

  const { spans, allClear } = section.data;
  const openEvents = spans.reduce((total, span) => total + span.events.length, 0);

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title={title}
        icon={icon}
        aside={
          allClear ? (
            <StatusPill tone="calm">
              <CheckCircle2 className="size-3" aria-hidden />
              All clear
            </StatusPill>
          ) : openEvents > 0 ? (
            <StatusPill tone="caution">
              <TrafficCone className="size-3" aria-hidden />
              {openEvents === 1 ? "1 advisory" : `${openEvents} advisories`}
            </StatusPill>
          ) : null
        }
      />

      <p className="mb-4 text-sm text-mist">
        Roadwork and closures on the spans — separate from the customs booths.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {spans.map((span) => (
          <SpanBlock key={span.span} span={span} />
        ))}
      </div>
    </Card>
  );
}
