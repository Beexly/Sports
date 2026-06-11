import { NextResponse } from "next/server";
import { readAirwaveControlPlane } from "@/lib/airwave";
import { readIntelligenceControlPlane } from "@/lib/airwave/intelligence-control-plane";

export const dynamic = "force-dynamic";

/**
 * GET /api/airwave/readiness
 *
 * Read-only base control plane + intelligence summary.
 * `data` is the original AirwaveControlPlane shape (backwards-compatible).
 * `intelligence` adds the GSE/GSN intelligence intake summary.
 *
 * NEVER exposes: secrets, local file paths, source pointers, transcript content.
 */
export async function GET(): Promise<NextResponse> {
  const env = process.env as Record<string, string | undefined>;
  const control = readAirwaveControlPlane(env);
  const intelligence = readIntelligenceControlPlane(env);

  return NextResponse.json({
    success: true,
    data: control,
    intelligence: {
      generatedAt: intelligence.generatedAt,
      sourcePolicySummary: intelligence.sourcePolicySummary,
      channel87Summary: intelligence.channel87Summary,
      gseOutputReadiness: intelligence.gseOutputReadiness,
      gsnOutputReadiness: intelligence.gsnOutputReadiness,
      operatorSurface: {
        currentWindowOpen: intelligence.operatorSurface.currentWindowOpen,
        ch87LaneStatus: intelligence.operatorSurface.ch87LaneStatus,
        ch87RequiresLegalAck: intelligence.operatorSurface.ch87RequiresLegalAck,
        legalAckGranted: intelligence.operatorSurface.legalAckGranted,
        manualImportReady: intelligence.operatorSurface.manualImportReady,
        sourcePolicyActive: intelligence.operatorSurface.sourcePolicyActive,
        sourcePolicyHeld: intelligence.operatorSurface.sourcePolicyHeld,
        legalHolds: intelligence.operatorSurface.legalHolds,
        nextOperatorActions: intelligence.operatorSurface.nextOperatorActions,
        forbiddenActions: intelligence.operatorSurface.forbiddenActions,
      },
      legalHoldSummary: intelligence.intakePlan.legalHoldSummary,
    },
  });
}
