/**
 * WMO 4677 weather interpretation codes, as used by Open-Meteo.
 *
 * `icon` names map to the Lucide set; `components/WeatherIcon.tsx` turns them
 * into components and picks the day/night variant.
 */

export type IconName =
  | "sun"
  | "moon"
  | "cloud-sun"
  | "cloud-moon"
  | "cloud"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "freezing-rain"
  | "snow"
  | "heavy-snow"
  | "sleet"
  | "showers"
  | "thunder"
  | "thunder-hail";

type Interpretation = { label: string; short: string; icon: IconName };

const CODES: Record<number, Interpretation> = {
  0: { label: "Clear", short: "Clear", icon: "sun" },
  1: { label: "Mainly Clear", short: "Mainly Clear", icon: "cloud-sun" },
  2: { label: "Partly Cloudy", short: "Partly Cloudy", icon: "cloud-sun" },
  3: { label: "Overcast", short: "Overcast", icon: "cloudy" },
  45: { label: "Fog", short: "Fog", icon: "fog" },
  48: { label: "Freezing Fog", short: "Freezing Fog", icon: "fog" },
  51: { label: "Light Drizzle", short: "Drizzle", icon: "drizzle" },
  53: { label: "Drizzle", short: "Drizzle", icon: "drizzle" },
  55: { label: "Heavy Drizzle", short: "Drizzle", icon: "drizzle" },
  56: { label: "Light Freezing Drizzle", short: "Freezing Drizzle", icon: "freezing-rain" },
  57: { label: "Freezing Drizzle", short: "Freezing Drizzle", icon: "freezing-rain" },
  61: { label: "Light Rain", short: "Light Rain", icon: "rain" },
  63: { label: "Rain", short: "Rain", icon: "rain" },
  65: { label: "Heavy Rain", short: "Heavy Rain", icon: "heavy-rain" },
  66: { label: "Light Freezing Rain", short: "Freezing Rain", icon: "freezing-rain" },
  67: { label: "Freezing Rain", short: "Freezing Rain", icon: "freezing-rain" },
  71: { label: "Light Snow", short: "Light Snow", icon: "snow" },
  73: { label: "Snow", short: "Snow", icon: "snow" },
  75: { label: "Heavy Snow", short: "Heavy Snow", icon: "heavy-snow" },
  77: { label: "Snow Grains", short: "Snow Grains", icon: "snow" },
  80: { label: "Light Showers", short: "Showers", icon: "showers" },
  81: { label: "Showers", short: "Showers", icon: "showers" },
  82: { label: "Violent Showers", short: "Heavy Showers", icon: "heavy-rain" },
  85: { label: "Light Snow Showers", short: "Snow Showers", icon: "snow" },
  86: { label: "Snow Showers", short: "Snow Showers", icon: "heavy-snow" },
  95: { label: "Thunderstorm", short: "Thunderstorm", icon: "thunder" },
  96: { label: "Thunderstorm with Hail", short: "Storm & Hail", icon: "thunder-hail" },
  99: { label: "Severe Thunderstorm", short: "Severe Storm", icon: "thunder-hail" },
};

const UNKNOWN: Interpretation = { label: "Unknown", short: "Unknown", icon: "cloud" };

export function describeWeatherCode(code: number): Interpretation {
  return CODES[code] ?? UNKNOWN;
}

export function conditionLabel(code: number): string {
  return describeWeatherCode(code).label;
}

/** Swaps in the night variant of the two icons that have one. */
export function iconForCode(code: number, isDay: boolean): IconName {
  const icon = describeWeatherCode(code).icon;
  if (isDay) return icon;
  if (icon === "sun") return "moon";
  if (icon === "cloud-sun") return "cloud-moon";
  return icon;
}

/** True for codes worth calling out as rough weather. */
export function isSevere(code: number): boolean {
  return code >= 95 || code === 65 || code === 82 || code === 75 || code === 86;
}
