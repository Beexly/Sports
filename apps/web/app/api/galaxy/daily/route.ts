import { NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { claimDaily } from "@/lib/galaxy/daily";

export const dynamic = "force-dynamic";

/** Claim the daily streak reward (streak insurance applies). */
export async function POST(): Promise<NextResponse> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Create your Galaxy Profile to start a daily streak." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await claimDaily(profileId)) });
}
