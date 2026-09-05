"use client";

import {
  AlertTriangle,
  Car,
  CloudRain,
  Thermometer,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Alert } from "@/lib/alerts";

const ICONS: Record<string, LucideIcon> = {
  wind: Wind,
  rain: CloudRain,
  thermometer: Thermometer,
  waves: Waves,
  car: Car,
  alert: AlertTriangle,
};

const TONES = {
  severe: "border-severe/40 bg-severe/10 text-severe",
  warning: "border-caution/35 bg-caution/10 text-caution",
  info: "border-beacon/30 bg-beacon/10 text-beacon",
} as const;

/**
 * Rendered from `lib/alerts.ts`, which is a pure function of the dashboard
 * payload. Push notifications would evaluate the same rules server-side and
 * render nothing here.
 */
export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2" role="status" aria-live="polite">
      {alerts.map((alert) => {
        const Icon = ICONS[alert.icon] ?? AlertTriangle;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${TONES[alert.severity]}`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="text-sm">
              <span className="font-semibold">{alert.title}</span>
              <span className="text-foam/75"> — {alert.detail}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
