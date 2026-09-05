import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Cloudy,
  Moon,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { iconForCode, type IconName } from "@/lib/weather-codes";

const ICONS: Record<IconName, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  cloud: Cloud,
  cloudy: Cloudy,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  "heavy-rain": CloudRainWind,
  "freezing-rain": CloudRainWind,
  snow: CloudSnow,
  "heavy-snow": Snowflake,
  sleet: CloudSnow,
  showers: CloudRain,
  thunder: CloudLightning,
  "thunder-hail": CloudLightning,
};

/**
 * Tints follow the sky rather than the palette's accent: warm for sun, cold for
 * precipitation, neutral for cloud. It keeps a column of forecast icons legible
 * at a glance.
 */
const TINTS: Partial<Record<IconName, string>> = {
  sun: "text-brass",
  moon: "text-mist",
  "cloud-sun": "text-brass",
  "cloud-moon": "text-mist",
  drizzle: "text-beacon",
  rain: "text-beacon",
  "heavy-rain": "text-beacon",
  showers: "text-beacon",
  "freezing-rain": "text-beacon",
  snow: "text-foam",
  "heavy-snow": "text-foam",
  sleet: "text-foam",
  thunder: "text-caution",
  "thunder-hail": "text-caution",
};

type Props = {
  code: number;
  isDay?: boolean;
  className?: string;
};

export function WeatherIcon({ code, isDay = true, className = "size-6" }: Props) {
  const name = iconForCode(code, isDay);
  const Icon = ICONS[name];
  const tint = TINTS[name] ?? "text-mist";
  return <Icon className={`${tint} ${className}`} strokeWidth={1.6} aria-hidden />;
}
