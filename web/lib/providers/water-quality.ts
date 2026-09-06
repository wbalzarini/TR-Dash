/**
 * River flow, clarity and dissolved oxygen from USGS.
 *
 * These three exist only for Fishing Mode, so they are fetched as their own
 * cached section rather than being bolted onto the water-temperature chain —
 * that chain prefers NOAA and often never reaches USGS at all, which would have
 * left these permanently blank.
 *
 * One request covers all three parameters, and the whole section is optional:
 * if it fails, those fields read "unavailable", the fishing score drops the
 * water-conditions factor and renormalises, and nothing else on the dashboard
 * notices.
 *
 * USGS parameter codes:
 *   00060  discharge, cubic feet per second
 *   63680  turbidity, formazin nephelometric units
 *   00300  dissolved oxygen, mg/L
 */

import { config } from "../config";
import { fetchWithTimeout, HttpError, logInfo } from "../logger";
import type { WaterQuality } from "../types";

const PARAMETERS = { discharge: "00060", turbidity: "63680", oxygen: "00300" } as const;

/** The USGS gauges on this stretch of the St. Lawrence. */
const DEFAULT_SITES = ["04260800", "04264000"];


type UsgsSeries = {
  sourceInfo?: { siteName?: string; siteCode?: Array<{ value?: string }> };
  variable?: { variableCode?: Array<{ value?: string }>; noDataValue?: number };
  values?: Array<{ value?: Array<{ value?: string; dateTime?: string }> }>;
};

/** Latest usable reading in a series, or null. */
function latest(series: UsgsSeries): { value: number; at: number } | null {
  const noData = series.variable?.noDataValue ?? -999999;
  const entries = series.values?.[0]?.value ?? [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry?.dateTime || entry.value == null) continue;
    const value = Number(entry.value);
    if (!Number.isFinite(value) || value === noData || value < 0) continue;
    const at = Date.parse(entry.dateTime);
    if (!Number.isFinite(at)) continue;
    return { value, at };
  }
  return null;
}

export async function fetchWaterQuality(): Promise<WaterQuality> {
  const sites = config.waterTemp.stationId
    ? [config.waterTemp.stationId]
    : DEFAULT_SITES;

  const url = new URL(`${config.waterTemp.baseUrl}/iv/`);
  url.searchParams.set("format", "json");
  url.searchParams.set("sites", sites.join(","));
  url.searchParams.set("parameterCd", Object.values(PARAMETERS).join(","));
  url.searchParams.set("period", "P1D");

  let payload: { value?: { timeSeries?: UsgsSeries[] } };
  try {
    const response = await fetchWithTimeout(url.toString(), { timeoutMs: 12_000 });
    payload = await response.json();
  } catch (error) {
    // USGS answers "nothing matched" with a 400, which is an empty result rather
    // than an outage. Either way this section is optional.
    if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
      throw new Error(`USGS has no flow, clarity or oxygen for ${sites.join(", ")}`);
    }
    throw error;
  }

  const all = payload.value?.timeSeries ?? [];
  if (all.length === 0) throw new Error("USGS returned no water-quality series");

  const found: Partial<Record<keyof typeof PARAMETERS, { value: number; at: number }>> = {};
  let station: WaterQuality["station"] = null;

  for (const series of all) {
    const code = series.variable?.variableCode?.[0]?.value;
    const key = (Object.keys(PARAMETERS) as Array<keyof typeof PARAMETERS>).find(
      (k) => PARAMETERS[k] === code,
    );
    if (!key || found[key]) continue;

    const reading = latest(series);
    if (!reading) continue;
    found[key] = reading;

    station ??= {
      id: series.sourceInfo?.siteCode?.[0]?.value ?? sites[0],
      name: series.sourceInfo?.siteName?.trim() ?? "USGS gauge",
    };
  }

  const times = Object.values(found).map((r) => r.at);
  if (times.length === 0) throw new Error("USGS returned no usable water-quality readings");

  logInfo("water-quality", `got ${Object.keys(found).join(", ")} from ${station?.id}`);

  return {
    flowCfs: found.discharge?.value ?? null,
    turbidityNtu: found.turbidity?.value ?? null,
    dissolvedOxygenMgL: found.oxygen?.value ?? null,
    observedAt: Math.max(...times),
    station,
    provider: "usgs",
  };
}
