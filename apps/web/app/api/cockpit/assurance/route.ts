import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAssuranceReport, isAssuranceEnabled } from "@/lib/assurance";
import { findRepoRoot } from "@/lib/ops/repo-root";

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

  // The report's evidence is file-based. On a runtime that cannot reach the
  // repository tree, emitting a report would invert every fs claim (absence
  // reported as fact) — so it refuses honestly instead. Not an error state:
  // run the report in CI or dev, where the checkout exists.
  const repoRoot = findRepoRoot();
  if (repoRoot === null) {
    return NextResponse.json(
      {
        success: false,
        runtimeLimited: true,
        error:
          "This runtime cannot reach the repository tree, so file-based evidence is uninspectable. Run the assurance report in CI or dev. This is a runtime limitation, not a verdict.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ success: true, data: buildAssuranceReport({ repoRoot }) });
}
