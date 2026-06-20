import { NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { claimSeasonRewards } from "@/lib/galaxy/season-program";

export const dynamic = "force-dynamic";

/** Claim any unclaimed Season Cup tier rewards (idempotent, earn-only). */
export async function POST(): Promise<NextResponse> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Create your Galaxy Profile to join the Season Cup." }, { status: 401 });
  }
  const result = await claimSeasonRewards(profileId);
  return NextResponse.json({ ok: true, ...result });
}
