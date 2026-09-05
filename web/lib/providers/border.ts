/**
 * Thousand Islands Bridge wait times, from both governments' own feeds.
 *
 *   U.S. → Canada  Canada Border Services Agency (CBSA) wait-time feed.
 *                  https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html
 *   Canada → U.S.  U.S. Customs and Border Protection (CBP) Border Wait Times.
 *                  https://bwt.cbp.gov/
 *
 * Both are official government sources, and neither is scraped from a rendered
 * page: CBSA publishes a CSV, CBP publishes JSON.
 *
 * The crossing is Lansdowne, ON ↔ Alexandria Bay, NY (CBP port of entry 0708),
 * which is not the same as the other Thousand Islands-area crossings at Ivy Lea
 * or Wellesley Island — hence matching on both port number and crossing name.
 *
 * Neither feed is version-stable, so the parsers here look up their columns and
 * fields by name and give up loudly rather than guessing. A direction we can't
 * read comes back with `waitMinutes: null` and a note, and the UI says the wait
 * is unavailable. It never shows a number we didn't actually receive.
 */

import { config } from "../config";
import { parseCsv } from "../csv";
import { fetchWithTimeout, logFailure } from "../logger";
import type { BorderData, BorderDirection, BorderStatus } from "../types";

const CBSA_SOURCE_URL = "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html";
const CBP_SOURCE_URL = "https://bwt.cbp.gov/";

/** Minutes → the four-step colour scale the dashboard uses. */
export function classifyWait(minutes: number | null): BorderStatus {
  if (minutes == null || !Number.isFinite(minutes)) return "unknown";
  if (minutes < 10) return "minimal";
  if (minutes < 20) return "moderate";
  if (minutes < 40) return "significant";
  return "heavy";
}

/**
 * Pulls a wait in minutes out of whatever the feed put in the cell.
 * Both agencies use words as well as numbers ("No delay", "Aucun délai",
 * "Closed", "Not applicable"), so handle those before falling back to digits.
 */
function parseWaitMinutes(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  const value = raw.trim().toLowerCase();
  if (value === "") return null;
  if (/^(no delay|aucun délai|aucun delai|no wait)/.test(value)) return 0;
  if (/closed|fermé|ferme|n\/a|not applicable|unavailable|missing/.test(value)) return null;

  const match = value.match(/(\d+)/);
  if (!match) return null;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) ? minutes : null;
}

/** Date.parse, but null instead of NaN and rejecting obvious nonsense. */
function parseTimestamp(raw: string | null | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const parsed = Date.parse(raw.trim());
  if (!Number.isFinite(parsed)) return null;
  // A timestamp more than a day ahead or a month behind means we misread the
  // format; better to report no update time than a wrong one.
  const now = Date.now();
  if (parsed > now + 24 * 60 * 60 * 1000) return null;
  if (parsed < now - 30 * 24 * 60 * 60 * 1000) return null;
  return parsed;
}

// ── CBSA: U.S. → Canada ──────────────────────────────────────────────────────

const normalise = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** First column index whose header contains every one of `terms`. */
function findColumn(headers: string[], terms: string[][]): number {
  for (const group of terms) {
    const index = headers.findIndex((header) => group.every((term) => header.includes(term)));
    if (index !== -1) return index;
  }
  return -1;
}

async function fetchCbsa(): Promise<BorderDirection> {
  const base: Omit<BorderDirection, "waitMinutes" | "status" | "updatedAt" | "portStatus" | "note"> =
    {
      source: "cbsa",
      sourceName: "Canada Border Services Agency",
      sourceUrl: CBSA_SOURCE_URL,
    };

  const response = await fetchWithTimeout(config.border.cbsaUrl, { timeoutMs: 12_000 });
  const rows = parseCsv(await response.text());

  if (rows.length < 2) throw new Error("CBSA feed had no data rows");

  const headers = rows[0].map(normalise);
  const wanted = normalise(config.border.cbsaLocation);

  const row = rows.slice(1).find((cells) => cells.some((cell) => normalise(cell).includes(wanted)));

  if (!row) {
    return {
      ...base,
      waitMinutes: null,
      status: "unknown",
      updatedAt: null,
      portStatus: null,
      note: `The CBSA feed did not list "${config.border.cbsaLocation}".`,
    };
  }

  // CBSA publishes commercial and traveller (passenger) flows separately. We
  // want travellers. The feed is bilingual, so match either language.
  const waitColumn = findColumn(headers, [
    ["traveller", "wait"],
    ["travellers", "delay"],
    ["voyageurs", "attente"],
    ["passenger", "wait"],
    ["traveller"],
    ["voyageurs"],
  ]);
  const updatedColumn = findColumn(headers, [
    ["traveller", "updated"],
    ["voyageurs", "jour"],
    ["updated"],
    ["mis a jour"],
  ]);

  if (waitColumn === -1) {
    return {
      ...base,
      waitMinutes: null,
      status: "unknown",
      updatedAt: null,
      portStatus: null,
      note: "The CBSA feed's column layout changed and no traveller wait column was found.",
    };
  }

  const waitMinutes = parseWaitMinutes(row[waitColumn]);
  const rawWait = (row[waitColumn] ?? "").trim();

  return {
    ...base,
    waitMinutes,
    status: classifyWait(waitMinutes),
    updatedAt: updatedColumn === -1 ? null : parseTimestamp(row[updatedColumn]),
    portStatus: waitMinutes == null && rawWait !== "" ? rawWait : null,
    note: null,
  };
}

// ── CBP: Canada → U.S. ───────────────────────────────────────────────────────

type CbpPort = {
  port_number?: string;
  port_name?: string;
  crossing_name?: string;
  port_status?: string;
  hours?: string;
  passenger_vehicle_lanes?: CbpLaneGroup;
};

type CbpLaneGroup = {
  maximum_lanes?: string;
  standard_lanes?: CbpLane;
};

type CbpLane = {
  operational_status?: string;
  update_time?: string;
  delay_minutes?: string | number;
  lanes_open?: string;
};

async function fetchCbp(): Promise<BorderDirection> {
  const base: Omit<BorderDirection, "waitMinutes" | "status" | "updatedAt" | "portStatus" | "note"> =
    {
      source: "cbp",
      sourceName: "U.S. Customs and Border Protection",
      sourceUrl: CBP_SOURCE_URL,
    };

  const response = await fetchWithTimeout(config.border.cbpUrl, { timeoutMs: 12_000 });
  const payload = (await response.json()) as unknown;

  // The feed has shipped as both a bare array and an object wrapping one.
  const ports: CbpPort[] = Array.isArray(payload)
    ? (payload as CbpPort[])
    : Array.isArray((payload as { ports?: unknown }).ports)
      ? ((payload as { ports: CbpPort[] }).ports)
      : [];

  if (ports.length === 0) throw new Error("CBP feed contained no ports");

  const atPort = ports.filter(
    (port) => (port.port_number ?? "").trim() === config.border.cbpPortNumber,
  );

  if (atPort.length === 0) {
    return {
      ...base,
      waitMinutes: null,
      status: "unknown",
      updatedAt: null,
      portStatus: null,
      note: `The CBP feed did not list port ${config.border.cbpPortNumber}.`,
    };
  }

  // Port 0708 covers more than one crossing, so prefer the named bridge and
  // only fall back to the first entry if the name doesn't appear.
  const wanted = config.border.cbpCrossingName
    ? normalise(config.border.cbpCrossingName)
    : null;
  const port =
    (wanted && atPort.find((entry) => normalise(entry.crossing_name ?? "").includes(wanted))) ||
    atPort[0];

  const lane = port.passenger_vehicle_lanes?.standard_lanes;
  const waitMinutes = parseWaitMinutes(lane?.delay_minutes);
  const operational = lane?.operational_status?.trim() || null;

  return {
    ...base,
    waitMinutes,
    status: classifyWait(waitMinutes),
    updatedAt: parseTimestamp(lane?.update_time),
    portStatus: port.port_status?.trim() || operational,
    note:
      lane == null
        ? "The CBP feed had no passenger vehicle lane data for this crossing."
        : null,
  };
}

// ── Combined ─────────────────────────────────────────────────────────────────

export async function fetchBorder(): Promise<BorderData> {
  const [cbsa, cbp] = await Promise.allSettled([fetchCbsa(), fetchCbp()]);

  if (cbsa.status === "rejected") logFailure("border:cbsa", cbsa.reason);
  if (cbp.status === "rejected") logFailure("border:cbp", cbp.reason);

  // One government's feed being down shouldn't hide the other direction.
  if (cbsa.status === "rejected" && cbp.status === "rejected") {
    const reason = cbsa.reason instanceof Error ? cbsa.reason.message : String(cbsa.reason);
    throw new Error(`Both border feeds failed. CBSA: ${reason}`);
  }

  return {
    crossing: "Thousand Islands Bridge · Lansdowne, ON ↔ Alexandria Bay, NY",
    usToCanada: cbsa.status === "fulfilled" ? cbsa.value : null,
    canadaToUs: cbp.status === "fulfilled" ? cbp.value : null,
  };
}
