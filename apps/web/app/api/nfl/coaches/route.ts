import { NextResponse } from "next/server";
import { NFL_COACHES, COACHES_AS_OF, coachesDataAgeDays } from "@/lib/nfl/coaches";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    asOf: COACHES_AS_OF,
    ageDays: coachesDataAgeDays(),
    stale: coachesDataAgeDays() > 180,
    count: NFL_COACHES.length,
    coaches: NFL_COACHES,
  });
}
