/**
 * Thousand Islands Bridge status — roadwork, lane closures and incidents on
 * the bridge itself and its immediate approaches.
 *
 * This is deliberately NOT the customs wait time. The bridge is two spans with
 * a customs plaza in the middle, and the two things fail independently: the
 * Canadian span has been under a multi-year cable rehabilitation with nightly
 * single-lane closures while the booths ran normally.
 *
 *   Canadian span  Ontario 511 — Highway 137, Lansdowne / Ivy Lea.
 *                  https://511on.ca/  (open data, no key)
 *   American span  511NY — I-81, Wellesley Island / Alexandria Bay.
 *                  https://511ny.org/ (free developer key required)
 *
 * The Thousand Islands Bridge Authority itself publishes no machine-readable
 * feed — its own wait-time page just republishes the CBSA and CBP numbers — so
 * the two transport departments that maintain the approaches are the closest
 * official source, and both are the authority of record for closures on their
 * own span.
 *
 * Both run the same 511 traveller-information platform, so one parser reads
 * both. Fields are looked up by name and a span we can't read reports an error
 * rather than an empty list: "no events" and "we couldn't ask" must never look
 * the same, because "no events" reads as ALL CLEAR on the card.
 */

import { config } from "../config";
import { fetchWithTimeout, logFailure } from "../logger";
import type { BridgeData, BridgeEvent, BridgeSpan } from "../types";

const ONTARIO_SOURCE_URL = "https://511on.ca/";
const NY_SOURCE_URL = "https://511ny.org/";

/** The 511 platform's event object. Every field is optional in practice. */
type RawEvent = {
  ID?: string | number;
  RoadwayName?: string;
  DirectionOfTravel?: string;
  Description?: string;
  Reported?: number;
  LastUpdated?: number;
  StartDate?: number;
  PlannedEndDate?: number;
  LanesAffected?: string;
  EventType?: string;
  IsFullClosure?: boolean;
  Severity?: string;
};

/** 511 timestamps are Unix seconds. Convert, and reject obvious nonsense. */
function toEpochMs(seconds: number | undefined): number | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const ms = seconds * 1000;
  // Anything before 2000 or more than two years out is a field we misread.
  if (ms < 946_684_800_000) return null;
  if (ms > Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) return null;
  return ms;
}

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * Does this event touch our crossing?
 *
 * Matched on the roadway name and description together, because the two feeds
 * name it differently — Ontario says "HWY 137", New York says "I-81" with
 * "Thousand Islands Bridge" only in the description.
 */
function isOurs(raw: RawEvent, needles: string[]): boolean {
  const haystack = [raw.RoadwayName, raw.Description, raw.DirectionOfTravel]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();

  if (haystack === "") return false;
  return needles.some((needle) => haystack.includes(needle));
}

function toEvent(raw: RawEvent, span: "canadian" | "american", index: number): BridgeEvent {
  return {
    id: String(raw.ID ?? `${span}-${index}`),
    span,
    eventType: clean(raw.EventType) ?? "unknown",
    roadwayName: clean(raw.RoadwayName) ?? "",
    description: clean(raw.Description) ?? "",
    lanesAffected: clean(raw.LanesAffected),
    directionOfTravel: clean(raw.DirectionOfTravel),
    isFullClosure: raw.IsFullClosure === true,
    severity: clean(raw.Severity),
    startedAt: toEpochMs(raw.StartDate) ?? toEpochMs(raw.Reported),
    updatedAt: toEpochMs(raw.LastUpdated),
    plannedEndAt: toEpochMs(raw.PlannedEndDate),
  };
}

/** A full closure outranks everything, then severity, then most recent. */
const SEVERITY_RANK: Record<string, number> = {
  major: 3,
  moderate: 2,
  minor: 1,
};

function bySeverity(a: BridgeEvent, b: BridgeEvent): number {
  if (a.isFullClosure !== b.isFullClosure) return a.isFullClosure ? -1 : 1;
  const rankA = SEVERITY_RANK[(a.severity ?? "").toLowerCase()] ?? 0;
  const rankB = SEVERITY_RANK[(b.severity ?? "").toLowerCase()] ?? 0;
  if (rankA !== rankB) return rankB - rankA;
  return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
}

async function fetchSpan(
  span: "canadian" | "american",
  label: string,
  url: string,
  needles: string[],
  sourceName: string,
  sourceUrl: string,
): Promise<BridgeSpan> {
  const base = { span, label, sourceName, sourceUrl, needsConfiguration: false } as const;

  const response = await fetchWithTimeout(url, { timeoutMs: 12_000 });
  const payload: unknown = await response.json();

  // Ontario returns a bare array; 511NY has been seen wrapping it. Accept both
  // rather than assuming, since we cannot re-test against the live feed here.
  const list: unknown = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && Array.isArray((payload as { events?: unknown }).events)
      ? (payload as { events: unknown[] }).events
      : null;

  if (list == null) {
    throw new Error(`${sourceName} returned an unexpected shape (expected a list of events)`);
  }

  const events = (list as RawEvent[])
    .filter((raw) => raw != null && typeof raw === "object")
    .filter((raw) => isOurs(raw, needles))
    .map((raw, index) => toEvent(raw, span, index))
    .sort(bySeverity);

  const stamps = events
    .map((event) => event.updatedAt)
    .filter((value): value is number => value != null);

  return {
    ...base,
    events,
    error: null,
    updatedAt: stamps.length > 0 ? Math.max(...stamps) : null,
  };
}

export async function fetchBridge(): Promise<BridgeData> {
  const ontario = fetchSpan(
    "canadian",
    "Canadian span",
    config.bridge.ontarioUrl,
    config.bridge.ontarioMatch,
    "Ontario 511",
    ONTARIO_SOURCE_URL,
  );

  const newYork: Promise<BridgeSpan> = config.bridge.nyApiKey
    ? fetchSpan(
        "american",
        "American span",
        `${config.bridge.nyUrl}?key=${encodeURIComponent(config.bridge.nyApiKey)}&format=json`,
        config.bridge.nyMatch,
        "511NY",
        NY_SOURCE_URL,
      )
    : Promise.resolve<BridgeSpan>({
        span: "american",
        label: "American span",
        events: [],
        error:
          "American span not configured — add a free 511NY key (NY511_API_KEY) to show its closures.",
        needsConfiguration: true,
        sourceName: "511NY",
        sourceUrl: NY_SOURCE_URL,
        updatedAt: null,
      });

  const settled = await Promise.allSettled([ontario, newYork]);

  const spans: BridgeSpan[] = settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;

    const span = index === 0 ? "canadian" : "american";
    const sourceName = index === 0 ? "Ontario 511" : "511NY";
    logFailure(`bridge:${span}`, result.reason);

    return {
      span,
      label: index === 0 ? "Canadian span" : "American span",
      events: [],
      error: `Could not reach ${sourceName}.`,
      needsConfiguration: false,
      sourceName,
      sourceUrl: index === 0 ? ONTARIO_SOURCE_URL : NY_SOURCE_URL,
      updatedAt: null,
    };
  });

  // Both spans dead means we know nothing at all — that is a failed section,
  // not a quiet bridge.
  if (spans.every((span) => span.error != null && !span.needsConfiguration)) {
    throw new Error("Neither bridge feed could be reached");
  }

  return {
    crossing: config.border.cbsaLocation,
    // Only claim "all clear" for spans we actually read.
    allClear: spans.every((span) => span.error == null && span.events.length === 0),
    spans,
  };
}
