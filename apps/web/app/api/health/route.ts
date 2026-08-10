import { NextResponse } from "next/server";
import { deploymentSha } from "@/lib/health/capability-state";
import { computeLiveCapabilityProbes } from "@/lib/health/live-capability-probes";
import { composeCapabilityGraph, projectCapabilityGraph } from "@/lib/health/capability-graph";
import { assessSchedulerLiveness } from "@/lib/ops/scheduler-liveness";

// A no-arg GET handler is statically cached by Next 14 unless it opts out —
// which served hours-old "healthy" snapshots from the Vercel edge (observed
// x-vercel-cache: HIT, age ~3h). A health check must reflect live state.
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Probes (DB ping, ingestion freshness, settlement health, nflverse cache
  // stats, money-path env posture) live in live-capability-probes.ts, shared
  // with the epistemic-twin cron/agent guard (capability-graph.ts's
  // fetchLiveCapabilityGraph) so both callers read the same evidence instead
  // of two implementations that could drift apart.
  const { checks, capabilities } = await computeLiveCapabilityProbes();

  // Readiness (DB + ingestion) — Sentinel / uptime still use ok + HTTP.
  const allOk = Object.values(checks).every((c) => c.status === "ok");

  // Settlement band is capability-only (not a check). Surface DEGRADED/CRITICAL
  // on top-level status so operators never see "healthy" while settle is behind.
  // Keep `ok` true when checks pass so Sentinel does not page on settlement lag.
  const settlement = capabilities.find((c) => c.capabilityId === "settlement");
  const settlementImpaired =
    settlement?.status === "degraded" || settlement?.status === "unavailable";
  const status: "healthy" | "degraded" =
    !allOk || settlementImpaired ? "degraded" : "healthy";

  // ── Capability dependency graph (epistemic-twin, P2) ─────────────────────
  // Purely additive/observability, same as `capabilities` (OP-003) above:
  // composes leaf observations plus the 2 real founder feature-gate reads
  // through the frozen composition law over the full 15-node seed registry,
  // so dependent capabilities with no direct probe (routes, reports, the
  // proof surface) get honest dependency-derived truth instead of no answer
  // at all. Money path (route:/checkout, revenue:checkout) now has env-only
  // leaf probes. Never influences `ok`/`allOk`/HTTP status — a capability
  // being non-healthy must not flip this route's readiness semantics, which
  // other consumers (the Nightly Sentinel) depend on as-is.
  const capabilityGraph = projectCapabilityGraph(composeCapabilityGraph(capabilities));

  // Diagnostic-only, same rule as capabilityGraph above: never influences
  // ok/allOk/HTTP status (the `ingestion` check already governs that). This
  // exists to answer the question `ingestion: error` cannot — is the platform
  // cron scheduler actually dead, or did every job just find nothing to do?
  // See lib/ops/scheduler-liveness.ts for the incident this is for.
  const schedulerLiveness = await assessSchedulerLiveness().catch(() => null);

  return NextResponse.json(
    {
      ok: allOk,
      status,
      checks,
      capabilities,
      capabilityGraph,
      schedulerLiveness,
      deployment: { sha: deploymentSha(), observedAt: new Date().toISOString() },
    },
    { status: allOk ? 200 : 503 },
  );
}
