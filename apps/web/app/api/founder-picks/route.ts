/**
 * Public API — founder picks record. Open read. Decided-only win rate.
 * No paywall on the record itself: the honesty doctrine is public.
 */

import { NextResponse } from "next/server";
import { loadFounderPickRecord } from "@/lib/founder-picks/record";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const record = await loadFounderPickRecord(50);
  return NextResponse.json({
    success: true,
    data: record,
    note:
      "Founder picks are entered by the owner, sealed at publish, and graded by the same settlement path as every engine pick. Win rate is decided picks only.",
  });
}
