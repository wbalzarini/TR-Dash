/**
 * Every tunable value for the dashboard, resolved once from the environment.
 *
 * Nothing else in the app reads `process.env` directly — change the property
 * location, the river station or a border feed here (or via the matching
 * environment variable) and the rest of the application follows.
 *
 * Server-only. Do not import this from a client component.
 */

function str(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function optionalStr(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : null;
}

/** Comma-separated list, lowercased and trimmed. Empty entries dropped. */
function csv(name: string, fallback: string): string[] {
  return str(name, fallback)
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type TridentConfig = {
  weather: {
    baseUrl: string;
  };
  location: {
    latitude: number;
    longitude: number;
    placeName: string;
    /** IANA timezone, or null to use whatever the weather provider reports. */
    timezone: string | null;
  };
  river: {
    baseUrl: string;
    /** IWLS station UUID. Wins over stationCode when both are set. */
    stationId: string | null;
    /** CHS station code, e.g. "14400" (Brockville). */
    stationCode: string | null;
  };
  waterTemp: {
    /** Which sources to try, in order. See providers/water-temp.ts. */
    sources: string[];
    /** NOAA CO-OPS station id. 8311062 is Alexandria Bay, NY. */
    noaaStationId: string | null;
    noaaBaseUrl: string;
    /** USGS Water Services base. */
    baseUrl: string;
    /** USGS site number. Blank means try the river gauges, then search. */
    stationId: string | null;
  };
  border: {
    cbsaUrl: string;
    cbsaLocation: string;
    cbpUrl: string;
    cbpPortNumber: string;
    cbpCrossingName: string | null;
    /** Timezone the agencies stamp their readings in. */
    timezone: string;
  };
  bridge: {
    /** Ontario 511 events endpoint. Open data, no key. */
    ontarioUrl: string;
    /** 511NY events endpoint. Needs a free developer key. */
    nyUrl: string;
    /** 511NY developer key. Null disables the American span. */
    nyApiKey: string | null;
    /** Substrings that mark an Ontario event as ours (case-insensitive). */
    ontarioMatch: string[];
    /** Substrings that mark a New York event as ours (case-insensitive). */
    nyMatch: string[];
  };
  cacheTtlMs: {
    weather: number;
    river: number;
    border: number;
    bridge: number;
    waterTemp: number;
    waterQuality: number;
    /** The resolved river station rarely changes; hold it for a day. */
    riverStation: number;
  };
};

export const config: TridentConfig = {
  weather: {
    baseUrl: str("WEATHER_API_BASE_URL", "https://api.open-meteo.com/v1/forecast"),
  },
  location: {
    latitude: num("TRIDENT_LATITUDE", 44.35234),
    longitude: num("TRIDENT_LONGITUDE", -75.99996),
    placeName: str("TRIDENT_PLACE_NAME", "Thousand Islands, St. Lawrence River"),
    timezone: optionalStr("TRIDENT_TIMEZONE") ?? "America/New_York",
  },
  river: {
    baseUrl: str("RIVER_API_BASE_URL", "https://api-iwls.dfo-mpo.gc.ca/api/v1"),
    stationId: optionalStr("RIVER_STATION_ID"),
    stationCode: optionalStr("RIVER_STATION_CODE"),
  },
  waterTemp: {
    sources: str("WATER_TEMP_SOURCES", "noaa,usgs")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
    noaaStationId: optionalStr("WATER_TEMP_NOAA_STATION_ID") ?? "8311062",
    noaaBaseUrl: str(
      "WATER_TEMP_NOAA_BASE_URL",
      "https://api.tidesandcurrents.noaa.gov/api/prod",
    ),
    baseUrl: str("WATER_TEMP_API_BASE_URL", "https://waterservices.usgs.gov/nwis"),
    stationId: optionalStr("WATER_TEMP_STATION_ID"),
  },
  border: {
    cbsaUrl: str("BORDER_CBSA_URL", "https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv"),
    cbsaLocation: str("BORDER_CBSA_LOCATION", "Thousand Islands Bridge"),
    cbpUrl: str("BORDER_CBP_URL", "https://bwt.cbp.gov/api/waittimes"),
    cbpPortNumber: str("BORDER_CBP_PORT_NUMBER", "0708"),
    cbpCrossingName: optionalStr("BORDER_CBP_CROSSING_NAME") ?? "Thousand Islands Bridge",
    timezone:
      optionalStr("BORDER_TIMEZONE") ??
      optionalStr("TRIDENT_TIMEZONE") ??
      "America/New_York",
  },
  bridge: {
    ontarioUrl: str("BRIDGE_ONTARIO_511_URL", "https://511on.ca/api/v2/get/event"),
    nyUrl: str("BRIDGE_NY_511_URL", "https://511ny.org/api/getevents"),
    nyApiKey: optionalStr("NY511_API_KEY"),
    ontarioMatch: csv(
      "BRIDGE_ONTARIO_MATCH",
      "137,thousand islands,lansdowne,ivy lea",
    ),
    nyMatch: csv(
      "BRIDGE_NY_MATCH",
      "thousand islands,wellesley island,alexandria bay,collins landing",
    ),
  },
  cacheTtlMs: {
    weather: num("CACHE_TTL_WEATHER", 600) * 1000,
    river: num("CACHE_TTL_RIVER", 1200) * 1000,
    border: num("CACHE_TTL_BORDER", 600) * 1000,
    bridge: num("CACHE_TTL_BRIDGE", 900) * 1000,
    // River temperature moves slowly; half an hour is plenty.
    waterTemp: num("CACHE_TTL_WATER_TEMP", 1800) * 1000,
    waterQuality: num("CACHE_TTL_WATER_QUALITY", 1800) * 1000,
    riverStation: 24 * 60 * 60 * 1000,
  },
};

/**
 * How old a reading may be before the UI calls it stale. These are generous:
 * the upstream sources genuinely publish this infrequently, and marking good
 * data stale is as misleading as marking stale data fresh.
 */
export const STALE_AFTER_MS = {
  weather: 90 * 60 * 1000,
  river: 3 * 60 * 60 * 1000,
  waterTemp: 6 * 60 * 60 * 1000,
  waterQuality: 6 * 60 * 60 * 1000,
  // Both agencies publish about once an hour, so a 90-minute window flipped to
  // "stale" for part of every cycle. This still catches a feed that has died.
  border: 150 * 60 * 1000,
  // 511 events persist until an operator clears them, so an old timestamp is
  // normal and is not a sign the feed died. This only catches a dead feed.
  bridge: 12 * 60 * 60 * 1000,
} as const;
