import { NextResponse } from "next/server";
import { getBridgeSection } from "@/lib/dashboard";

/**
 * Bridge roadwork and closures, from Ontario 511 and 511NY.
 *
 * The 511NY developer key is read server-side in lib/config.ts and never
 * reaches the browser — the client only ever calls this route. Both feeds are
 * throttled at ten calls a minute, which the in-process cache stays well under.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const payload = await getBridgeSection();
  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}
