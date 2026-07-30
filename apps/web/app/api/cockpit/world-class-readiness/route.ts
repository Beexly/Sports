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

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const admins = (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const fake = process.env["DEV_FAKE_ADMIN"] === "true" && process.env["NODE_ENV"] !== "production";
  if (!fake && (!email || (admins.length > 0 && !admins.includes(email)))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const readiness = buildWorldClassReadiness();
  return NextResponse.json({ ok: true, oddsApiRequired: false as const, readiness });
}
