/**
 * World-class readiness snapshot for operator cockpit.
 * Auth: same as other cockpit APIs (session) — or cron-style if extended later.
 * Law: oddsApiRequired=false · no public ROI · draft-only agents.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildWorldClassReadiness } from "@/lib/platform/world-class-readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Admin role required for cockpit endpoints" },
      { status: 403 },
    );
  }

  
  const readiness = buildWorldClassReadiness();
  return NextResponse.json({ ok: true, oddsApiRequired: false as const, readiness });
}
