"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Fish, RefreshCw, Settings as SettingsIcon, Ship } from "lucide-react";
import { formatClock, formatDate } from "@/lib/time";
import { RelativeTime } from "./ui/RelativeTime";
import { TridentMark } from "./ui/TridentMark";

type Props = {
  placeName: string;
  timezone: string;
  /** Epoch ms of the last successful dashboard fetch. */
  fetchedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  boatMode: boolean;
  onToggleBoatMode: () => void;
  fishingMode: boolean;
  onToggleFishingMode: () => void;
};

/**
 * The masthead. The wordmark is set wide and light over a hairline rule, the way
 * a chart title sits above a plate — the one place the nautical reference is
 * allowed to be explicit.
 */
export function DashboardHeader({
  placeName,
  timezone,
  fetchedAt,
  refreshing,
  onRefresh,
  boatMode,
  onToggleBoatMode,
  fishingMode,
  onToggleFishingMode,
}: Props) {
  const [now, setNow] = useState<number | null>(null);

  // Rendered only after mount: the server has no idea what minute it is by the
  // time the page reaches the phone.
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="on-photo mb-6 sm:mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {/* The mark carries the name, so it isn't decorative here. */}
          <TridentMark
            className="mt-0.5 h-11 shrink-0 sm:h-14"
            title="Trident Island"
          />
          <div className="min-w-0">
            <h1 className="font-wordmark text-[1.62rem] leading-[1.04] font-extrabold tracking-[0.08em] text-foam uppercase sm:text-[2.3rem] sm:tracking-[0.12em]">
              Trident Island
            </h1>
            <div className="mt-2.5 flex items-center gap-2.5">
              <span className="h-px w-8 bg-gradient-to-r from-beacon to-transparent" aria-hidden />
              <p className="text-[10px] tracking-[0.08em] whitespace-nowrap text-beacon uppercase sm:text-xs sm:tracking-[0.14em]">
                The Island Command Center
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleBoatMode}
            aria-pressed={boatMode}
            title="Boat mode"
            className={`inline-flex size-9 items-center justify-center rounded-full border transition-colors ${
              boatMode
                ? "border-transparent bg-beacon text-abyss"
                : "border-foam/20 bg-abyss/55 text-mist backdrop-blur-md hover:text-foam"
            }`}
          >
            <Ship className="size-4" aria-hidden />
            <span className="sr-only">Toggle boat mode</span>
          </button>

          <button
            type="button"
            onClick={onToggleFishingMode}
            aria-pressed={fishingMode}
            title="Fishing"
            className={`inline-flex size-9 items-center justify-center rounded-full border transition-colors ${
              fishingMode
                ? "border-transparent bg-beacon text-abyss"
                : "border-foam/20 bg-abyss/55 text-mist backdrop-blur-md hover:text-foam"
            }`}
          >
            <Fish className="size-4" aria-hidden />
            <span className="sr-only">Toggle fishing mode</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh"
            className="inline-flex size-9 items-center justify-center rounded-full border border-foam/20 bg-abyss/55 text-mist backdrop-blur-md transition-colors hover:text-foam disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            <span className="sr-only">Refresh dashboard</span>
          </button>

          <Link
            href="/settings"
            title="Settings"
            className="inline-flex size-9 items-center justify-center rounded-full border border-foam/20 bg-abyss/55 text-mist backdrop-blur-md transition-colors hover:text-foam"
          >
            <SettingsIcon className="size-4" aria-hidden />
            <span className="sr-only">Settings</span>
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mist">
        {now != null ? (
          <>
            <span suppressHydrationWarning className="text-mist">
              {formatDate(now, timezone)}
            </span>
            <span aria-hidden>·</span>
            <span suppressHydrationWarning className="tabular text-mist">
              {formatClock(now, timezone)}
            </span>
          </>
        ) : null}
        {fetchedAt != null ? (
          <>
            <span aria-hidden>·</span>
            <span>
              Updated <RelativeTime epochMs={fetchedAt} />
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-mist/80">{placeName}</p>
    </header>
  );
}
