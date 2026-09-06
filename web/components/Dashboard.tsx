"use client";

/**
 * The dashboard shell: fetches `/api/dashboard`, holds the polling loop, and
 * lays the cards out.
 *
 * It is given the first payload by the server component that renders it, so the
 * page is complete on first paint and the poll only ever replaces it. A failed
 * poll keeps the last good payload on screen rather than blanking the page —
 * the cards' own staleness badges say how old it is.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardResponse } from "@/lib/types";
import { evaluateAlerts } from "@/lib/alerts";
import { useSettings } from "@/lib/settings";
import { AlertBanner } from "./AlertBanner";
import { BoatMode } from "./BoatMode";
import { FishingMode } from "./FishingMode";
import { DashboardHeader } from "./DashboardHeader";
import { DataSourcesFooter } from "./DataSourcesFooter";
import { IslandHero } from "./IslandHero";
import { BorderSection } from "./cards/BorderSection";
import { ConditionsCard } from "./cards/ConditionsCard";
import { CurrentWeatherCard } from "./cards/CurrentWeatherCard";
import { ForecastSection } from "./cards/ForecastSection";
import { HourlyStrip } from "./cards/HourlyStrip";
import { PressureCard } from "./cards/PressureCard";
import { RiverCard } from "./cards/RiverCard";
import { WindCard } from "./cards/WindCard";
import { Card, CardHeader } from "./ui/Card";
import { WeatherChart } from "./charts/WeatherChart";
import { LineChart } from "lucide-react";

const BOAT_MODE_KEY = "trident.boatMode.v1";
const MODE_KEY = "trident.mode.v1";

/** Boat Mode and Fishing Mode are alternative readings of the same payload. */
type Mode = "dashboard" | "boat" | "fishing";

export function Dashboard({ initial }: { initial: DashboardResponse }) {
  const [dashboard, setDashboard] = useState<DashboardResponse>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<Mode>("dashboard");
  const { settings } = useSettings();

  // Guards against a slow response from a previous poll overwriting a newer one.
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as DashboardResponse;
      if (id === requestId.current) setDashboard(payload);
    } catch {
      // Keep whatever is on screen; the per-card badges already show its age.
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const intervalMs = Math.max(settings.refreshIntervalSeconds, 30) * 1000;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, intervalMs);

    // Coming back to a backgrounded tab should show current data immediately.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, settings.refreshIntervalSeconds]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MODE_KEY);
      if (stored === "boat" || stored === "fishing" || stored === "dashboard") {
        setMode(stored);
        return;
      }
      // Anyone who left Boat Mode on before this key existed keeps it.
      if (window.localStorage.getItem(BOAT_MODE_KEY) === "1") setMode("boat");
    } catch {
      // A blocked localStorage just means starting on the dashboard.
    }
  }, []);

  const selectMode = useCallback((next: Mode) => {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
      window.localStorage.setItem(BOAT_MODE_KEY, next === "boat" ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggleBoatMode = useCallback(
    () => selectMode(mode === "boat" ? "dashboard" : "boat"),
    [mode, selectMode],
  );
  const toggleFishingMode = useCallback(
    () => selectMode(mode === "fishing" ? "dashboard" : "fishing"),
    [mode, selectMode],
  );

  const alerts = useMemo(
    () => evaluateAlerts(dashboard, settings.alertThresholds),
    [dashboard, settings.alertThresholds],
  );

  const { timezone } = dashboard.location;
  const weather = dashboard.weather;

  // Read before the early returns: past them TypeScript has narrowed `mode` to
  // "dashboard", and the comparisons would be provably false.
  const inBoatMode = mode === "boat";
  const inFishingMode = mode === "fishing";

  if (mode === "boat") {
    return (
      <BoatMode
        dashboard={dashboard}
        settings={settings}
        onExit={() => selectMode("dashboard")}
      />
    );
  }

  if (mode === "fishing") {
    return (
      <FishingMode
        dashboard={dashboard}
        settings={settings}
        onExit={() => selectMode("dashboard")}
      />
    );
  }

  return (
    <div className="relative">
      <IslandHero />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-7 pb-4 sm:px-6 sm:pt-10">
      <DashboardHeader
        placeName={dashboard.location.placeName}
        timezone={timezone}
        fetchedAt={dashboard.fetchedAt}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        boatMode={inBoatMode}
        onToggleBoatMode={toggleBoatMode}
        fishingMode={inFishingMode}
        onToggleFishingMode={toggleFishingMode}
      />

      <AlertBanner alerts={alerts} />

      <div className="space-y-4">
        {/* Answers "how warm, how windy, which way, rising or falling" in one screen. */}
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CurrentWeatherCard section={weather} settings={settings} timezone={timezone} />
          </div>
          <div className="lg:col-span-2">
            <WindCard section={weather} settings={settings} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PressureCard section={weather} settings={settings} />
          <ConditionsCard section={weather} settings={settings} />
        </div>

        <RiverCard
          section={dashboard.river}
          waterTemp={dashboard.waterTemperature}
          settings={settings}
          timezone={timezone}
        />

        <BorderSection section={dashboard.border} settings={settings} />

        <HourlyStrip section={weather} settings={settings} timezone={timezone} />

        <ForecastSection section={weather} settings={settings} timezone={timezone} />

        {weather.status === "ok" ? (
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="24-Hour Trends"
              icon={<LineChart className="size-3.5" aria-hidden />}
              aside={<span className="text-[11px] text-fathom">Tap to switch metric</span>}
            />
            <WeatherChart
              hourly={weather.data.hourly}
              settings={settings}
              timezone={timezone}
            />
          </Card>
        ) : null}
      </div>

      <DataSourcesFooter />
      </div>
    </div>
  );
}
