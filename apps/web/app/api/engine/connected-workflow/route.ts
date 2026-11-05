/**
 * apps/web/app/api/engine/connected-workflow/route.ts
 *
 * Next.js App Router GET endpoint exposing the cryptographically verified
 * 6-Stage Connected Game Workflow, Live Books & PDFs Executable Engine,
 * 87-Domain TypeScript Engine telemetry, and 39-Subpackage Python Intelligence telemetry.
 */

import { NextResponse } from "next/server";
import { loadVerifiedConnectedWorkflowBundle } from "../../../../lib/engine/connected-workflow-loader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = loadVerifiedConnectedWorkflowBundle();
    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "CONNECTED_WORKFLOW_ERROR",
        error: message,
      },
      { status: 500 },
    );
  }
}
