/**
 * A tiny in-memory TTL cache that also keeps the last successful value.
 *
 * Two jobs:
 *   1. Stop us hammering Open-Meteo, IWLS, CBSA and CBP on every page load.
 *   2. When a refresh fails, hand back the last good value flagged as stale
 *      rather than showing nothing. The UI is responsible for saying so.
 *
 * This lives in the module scope of a serverless function, so it is per-instance
 * and disappears on cold start. That is fine — a cold start just means one
 * upstream call, and the dashboard is correct either way.
 */

import { logFailure } from "./logger";

type Entry<T> = {
  value: T;
  /** Epoch ms the upstream fetch succeeded. */
  fetchedAt: number;
};

const store = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export type CacheResult<T> =
  | { status: "ok"; value: T; fetchedAt: number; stale: boolean }
  | { status: "error"; error: string; fetchedAt: number };

/**
 * Returns the cached value when it is younger than `ttlMs`, otherwise refetches.
 *
 * If the refetch throws we fall back to whatever we last had, marked stale. Only
 * when there is nothing at all to fall back on does this report an error.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<CacheResult<T>> {
  const now = Date.now();
  const entry = store.get(key) as Entry<T> | undefined;

  if (entry && now - entry.fetchedAt < ttlMs) {
    return { status: "ok", value: entry.value, fetchedAt: entry.fetchedAt, stale: false };
  }

  // Collapse concurrent misses onto one upstream request.
  let pending = inFlight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = fetcher();
    inFlight.set(key, pending);
    pending.finally(() => {
      if (inFlight.get(key) === pending) inFlight.delete(key);
    });
  }

  try {
    const value = await pending;
    const fetchedAt = Date.now();
    store.set(key, { value, fetchedAt });
    return { status: "ok", value, fetchedAt, stale: false };
  } catch (error) {
    logFailure(key, error);
    if (entry) {
      // Better to show the old number and say it's old than to show nothing.
      return { status: "ok", value: entry.value, fetchedAt: entry.fetchedAt, stale: true };
    }
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      fetchedAt: now,
    };
  }
}

/** Only for tests and local debugging. */
export function clearCache(): void {
  store.clear();
  inFlight.clear();
}
