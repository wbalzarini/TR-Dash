"use client";

/**
 * Reader preferences. Client-side only — they live in localStorage, there are no
 * accounts, and nothing here is ever sent to the server.
 */

import { useCallback, useEffect, useState } from "react";

export type TemperatureUnit = "F" | "C";
export type WindUnit = "mph" | "kph" | "kts" | "mps";
export type PressureUnit = "inHg" | "hPa" | "mmHg";
export type RiverUnit = "ft" | "m";
export type BorderDirectionPreference = "usToCanada" | "canadaToUs";

export type AlertThresholds = {
  windGustMph: number;
  precipitationInches: number;
  highTempF: number;
  lowTempF: number;
  riverChangeFeet: number;
  borderWaitMinutes: number;
};

export type Settings = {
  temperatureUnit: TemperatureUnit;
  windUnit: WindUnit;
  pressureUnit: PressureUnit;
  riverUnit: RiverUnit;
  preferredBorderDirection: BorderDirectionPreference;
  /** Seconds between dashboard refreshes. */
  refreshIntervalSeconds: number;
  alertThresholds: AlertThresholds;
};

export const DEFAULT_SETTINGS: Settings = {
  temperatureUnit: "F",
  windUnit: "mph",
  pressureUnit: "inHg",
  riverUnit: "ft",
  preferredBorderDirection: "usToCanada",
  refreshIntervalSeconds: 300,
  alertThresholds: {
    windGustMph: 25,
    precipitationInches: 0.5,
    highTempF: 90,
    lowTempF: 20,
    riverChangeFeet: 0.5,
    borderWaitMinutes: 30,
  },
};

const STORAGE_KEY = "trident.settings.v1";

function readStored(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      alertThresholds: {
        ...DEFAULT_SETTINGS.alertThresholds,
        ...(parsed.alertThresholds ?? {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Starts from the defaults so the server and the first client render agree,
 * then swaps in the stored values after mount.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(readStored());
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // A full or disabled localStorage shouldn't break the dashboard.
      }
      return next;
    });
  }, []);

  const updateThresholds = useCallback((patch: Partial<AlertThresholds>) => {
    setSettings((previous) => {
      const next = {
        ...previous,
        alertThresholds: { ...previous.alertThresholds, ...patch },
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, updateThresholds, reset, loaded };
}
