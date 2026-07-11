import { NextRequest, NextResponse } from "next/server";
import { resolve } from "node:path";
import { auth } from "@/lib/auth";
import { buildAssuranceReport, isAssuranceEnabled } from "@/lib/assurance";

export const dynamic = "force-dynamic";

/**
 * AI Setup Assurance report — admin-only, read-only, flag-gated.
 * Deterministic from the deployed checkout; the verdict is INCOMPLETE until
 * runtime/production evidence collectors raise coverage past the threshold.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 },
    );
  }

  if (!isAssuranceEnabled()) {
    return NextResponse.json(
      { success: false, disabled: true, error: "AI_SETUP_ASSURANCE_ENABLED is not set" },
      { status: 404 },
    );
  }

  const repoRoot = resolve(process.cwd(), "..", "..");
  return NextResponse.json({ success: true, data: buildAssuranceReport({ repoRoot }) });
}
