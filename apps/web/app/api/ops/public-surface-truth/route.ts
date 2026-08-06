import { NextResponse } from "next/server";
import { isContestsPublic, isStatsPublic, PUBLIC_NAV_POLICY } from "@/lib/launch/public-surface-gate";
import { resolveContestStorageMode } from "@/lib/contests/store";
import { isStubMode } from "@sports/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Operator truth snapshot — what public gates actually resolve to on this host.
 * No secrets. Safe to hit from cockpit/ops. Not a public marketing surface.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    stubMode: isStubMode(),
    vercel: process.env.VERCEL === "1",
    gates: {
      statsPublic: isStatsPublic(),
      contestsPublic: isContestsPublic(),
    },
    contestStorage: resolveContestStorageMode(),
    policy: PUBLIC_NAV_POLICY,
    law: {
      liveBoardDefault: "off",
      statsDefault: "dark",
      contestsDefault: "public free paper skill",
      refuseEphemeralWrites: true,
    },
  });
}
