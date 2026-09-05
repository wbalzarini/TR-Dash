import { NextResponse } from "next/server";
import { getWeatherSection } from "@/lib/dashboard";

/**
 * The browser never calls Open-Meteo, IWLS, CBSA or CBP directly — it calls
 * this. That keeps CORS, rate limiting and any future API key on the server.
 *
 * Upstream responses are cached in-process (see lib/cache.ts), so this route
 * itself must not be cached: it has to be able to hand back a fresher value
 * the moment the cache refreshes.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const payload = await getWeatherSection();
  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
