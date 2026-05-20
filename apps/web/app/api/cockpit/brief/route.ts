import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BRIEF_RESPONSIBLE_GAMING_NOTE } from "@/lib/brief/compose";

/**
 * Internal cockpit brief API — stub-safe. Admin-gated.
 *
 * Preserves source-level invariants:
 *   - imports auth() helper
 *   - rejects requests where role !== "ADMIN" with a 401
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "rebuilding",
    responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
  });
}
