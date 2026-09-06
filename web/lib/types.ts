/**
 * The shape of everything that crosses the wire between our API routes and the
 * browser. The browser never talks to an external provider, so these types are
 * the whole contract.
 */

/** Wraps any section of the dashboard so a single failure can't take the page down. */
export type Section<T> =
  | { status: "ok"; data: T; fetchedAt: number; stale: boolean }
  | { status: "unavailable"; error: string; fetchedAt: number };

export type Trend = "rising" | "falling" | "steady";

// ── Weather ──────────────────────────────────────────────────────────────────

export type CurrentWeather = {
  /** °F */
  temperature: number;
  /** °F */
  feelsLike: number;
  /** WMO weather interpretation code. */
  weatherCode: number;
  condition: string;
  isDay: boolean;
  /** % */
  humidity: number;
  /** °F, taken from the hourly series at the current hour. */
  dewPoint: number | null;
  /** hPa at mean sea level. */
  pressureHpa: number;
  /** mph */
  windSpeed: number;
  /** Degrees the wind is coming from. */
  windDirection: number;
  /** mph */
  windGust: number;
  /** % */
  cloudCover: number;
  /** Statute miles, from the hourly series. */
  visibility: number | null;
  /** % chance of precipitation this hour, from the hourly series. */
  precipitationProbability: number | null;
  /** inches in the last hour */
  precipitation: number;
  /** Epoch ms of the observation itself, not of our fetch. */
  observedAt: number;
};

export type DailyForecast = {
  /** Epoch ms at local midnight of the forecast day. */
  date: number;
  weatherCode: number;
  condition: string;
  high: number;
  low: number;
  feelsLikeHigh: number | null;
  feelsLikeLow: number | null;
  precipitationProbability: number | null;
  /** inches */
  precipitationSum: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDirection: number | null;
  uvIndexMax: number | null;
  /** Epoch ms, null if the provider omitted it. */
  sunrise: number | null;
  sunset: number | null;
};

export type HourlyForecast = {
  /** Epoch ms. */
  time: number;
  temperature: number;
  feelsLike: number | null;
  weatherCode: number;
  precipitationProbability: number | null;
  /** inches */
  precipitation: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDirection: number | null;
  pressureHpa: number | null;
  humidity: number | null;
  cloudCover: number | null;
};

/** A past pressure reading, for the trend and the sparkline. */
export type PressurePoint = { time: number; pressureHpa: number };

export type WeatherData = {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  /** Roughly the last 24 hours, oldest first. */
  pressureHistory: PressurePoint[];
  pressureTrend: Trend;
  /** hPa change over the trend window. */
  pressureChangeHpa: number;
  sunrise: number | null;
  sunset: number | null;
  timezone: string;
  provider: "open-meteo";
};

// ── River ────────────────────────────────────────────────────────────────────

export type RiverStation = {
  id: string;
  code: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
  /** Kilometres from the configured property location, when both are known. */
  distanceKm: number | null;
  /** How this station was chosen, so the UI can be honest about it. */
  resolvedBy: "configured-id" | "configured-code" | "nearest";
};

export type RiverReading = {
  /** Epoch ms. */
  time: number;
  /** Metres, as published by IWLS. */
  meters: number;
};

export type RiverData = {
  station: RiverStation;
  /** Metres — the UI converts to the reader's preferred unit. */
  levelMeters: number;
  /** Epoch ms of the reading itself. */
  observedAt: number;
  trend: Trend;
  /** Metres of change across the trend window. */
  changeMeters: number;
  /** Hours the trend was measured over. */
  trendWindowHours: number;
  /** Oldest first. Up to 7 days. */
  history: RiverReading[];
  provider: "chs-iwls";
};

// ── Water temperature ────────────────────────────────────────────────────────

/** One temperature reading. °F, matching the air temperature elsewhere. */
export type WaterTempReading = { time: number; fahrenheit: number };

export type WaterTemperature = {
  /** °F. NOAA publishes °F directly; USGS publishes °C and is converted. */
  fahrenheit: number;
  /** Epoch ms of the reading itself. */
  observedAt: number;
  trend: Trend;
  changeFahrenheit: number;
  trendWindowHours: number;
  /** Oldest first, roughly the last 48 hours. */
  history: WaterTempReading[];
  station: {
    /** NOAA CO-OPS station id or USGS site number, depending on provider. */
    id: string;
    name: string;
    distanceKm: number | null;
    resolvedBy: "configured" | "nearest";
  };
  provider: "usgs" | "noaa-coops";
};

// ── Border ───────────────────────────────────────────────────────────────────

export type BorderStatus = "minimal" | "moderate" | "significant" | "heavy" | "unknown";

export type BorderDirection = {
  waitMinutes: number | null;
  status: BorderStatus;
  /** Epoch ms the source says it last updated, or null if it didn't say. */
  updatedAt: number | null;
  /** e.g. "Open", "Closed", "No delay". Whatever the source reported. */
  portStatus: string | null;
  /** Set when we reached the source but it had nothing usable for this crossing. */
  note: string | null;
  source: "cbsa" | "cbp";
  sourceName: string;
  sourceUrl: string;
};

export type BorderData = {
  crossing: string;
  usToCanada: BorderDirection | null;
  canadaToUs: BorderDirection | null;
};

// ── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardResponse = {
  location: {
    latitude: number;
    longitude: number;
    placeName: string;
    timezone: string;
  };
  weather: Section<WeatherData>;
  river: Section<RiverData>;
  waterTemperature: Section<WaterTemperature>;
  border: Section<BorderData>;
  fetchedAt: number;
};
