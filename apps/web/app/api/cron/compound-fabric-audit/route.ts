/**
 * Internal read-only audit cron for Wave 14 Compound Fabric + Wave 16 GSI Telemetry.
 *
 * LAWS (hard):
 * - CRON_SECRET Bearer-only auth (GSE-SEC-016)
 * - 100% read-only and idempotent under repeat firing
 * - NEVER flips LIVE_BOARD / PUBLIC_PICKS / PERFORMANCE_STATS / PUBLISH_LEDGER
 * - NEVER writes to DB or money paths
 */

import { NextResponse } from "next/server";
import { cronAuthErrorBearerOnly } from "@/lib/cron/authorize";
import { probeCompoundFabricAndGsiHealth } from "@/lib/autonomy/compound-fabric-probe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthErrorBearerOnly(request);
  if (denied) return denied;

  const probe = probeCompoundFabricAndGsiHealth();
  const status = probe.ok ? 200 : 503;

  return NextResponse.json(
    {
      ok: probe.ok,
      idempotent: true,
      path: "compound-fabric-audit",
      artifactsPresent: probe.artifactsPresent,
      compoundFabricAgeMinutes: probe.compoundFabricAgeMinutes ?? null,
      gsiRuleInDoctrineHeld: probe.gsiRuleInDoctrineHeld ?? null,
      routerBitCount: probe.routerBitCount,
      filesSwept: probe.filesSwept,
      primitivesExtractedTotal: probe.primitivesExtractedTotal,
      lessonsLedgerCount: probe.lessonsLedgerCount,
      manifest877PdfCount: probe.manifest877PdfCount,
      sarEvaluatedCompounds: probe.sarEvaluatedCompounds,
      sarDownsampled: probe.sarDownsampled,
      gfapDisorderWarningHeld: probe.gfapDisorderWarningHeld,
      progressionReportsCount: probe.progressionReportsCount,
      failureReasons: probe.failureReasons,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
