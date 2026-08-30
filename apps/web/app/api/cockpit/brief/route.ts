import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { composeDailyBrief } from "@/lib/brief/compose";

/**
 * Internal cockpit brief API — admin-gated, DRAFT-only.
 *
 * Source-level invariants:
 *   - imports auth() helper
 *   - rejects requests where role !== "ADMIN" with a 401
 *   - status is always DRAFT (composer constant — no publish transition)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(composeDailyBrief({ date: new Date() }));
}
