import { NextResponse } from "next/server";
import { getWaterQualitySection } from "@/lib/dashboard";

/** One source at a time, for debugging. See app/api/dashboard/route.ts. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(await getWaterQualitySection(), {
    headers: { "cache-control": "no-store" },
  });
}
