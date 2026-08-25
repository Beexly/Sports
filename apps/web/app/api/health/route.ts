import { NextResponse } from "next/server";
import { deploymentSha } from "@/lib/health/capability-state";
import { computeLiveCapabilityProbes } from "@/lib/health/live-capability-probes";
import { composeCapabilityGraph, projectCapabilityGraph } from "@/lib/health/capability-graph";
import { assessSchedulerLiveness } from "@/lib/ops/scheduler-liveness";
import { maybeRunTrafficHeartbeat } from "@/lib/ops/traffic-heartbeat";
import {
  redactCapabilities,
  redactHealthChecks,
  type HealthDisclosureLevel,
} from "@/lib/health/health-disclosure";
import { authorizeCronRequest } from "@/lib/cron/authorize";
import { isAdminSession } from "@/lib/auth/require-admin";

// A no-arg GET handler is statically cached by Next 14 unless it opts out —
// which served hours-old "healthy" snapshots from the Vercel edge (observed
// x-vercel-cache: HIT, age ~3h). A health check must reflect live state.
export const dynamic = "force-dynamic";

/**
 * Is this caller entitled to the OPERATOR payload (free-text probe details,
 * the capability graph, scheduler liveness)?
 *
 * Same posture as /api/ops/daily-truth and the operator branch of
 * /api/ops/public-surface-truth: Bearer CRON_SECRET, plus an ADMIN session for
 * a human in the cockpit. Delegated to `authorizeCronRequest` (bearer_only) so
 * the comparison is the repo's one timing-safe, rotation-aware implementation
 * rather than a fifth hand-rolled copy — it also refuses when CRON_SECRET is
 * unset, which is the fail-closed answer.
 *
 * FAILS CLOSED at every branch. No request object, a throwing authorizer, a
 * throwing/misconfigured `auth()` — every one of them returns false and the
 * caller gets the PUBLIC payload. An unresolvable privilege must disclose less,
 * never more.
 *
 * NextAuth is imported dynamically and only when the caller actually presents a
 * Cookie header. `/api/health` is the most-hit route in production (uptime
 * monitors, Sentinel, the Vercel platform), and none of those callers carry a
 * cookie — there is no reason to pull NextAuth + the Prisma adapter into every
 * anonymous probe just to conclude "not an admin". A cookie-less caller cannot
 * have a session by definition, so short-circuiting discloses nothing extra.
 */
async function isOperatorCaller(request?: Request | null): Promise<boolean> {
  if (!request) return false;

  try {
    if (authorizeCronRequest(request, { mode: "bearer_only" }).ok) return true;
  } catch {
    // fall through to the session check — never throw out of the gate
  }

  if (!request.headers.get("cookie")) return false;

  try {
    const { auth } = await import("@/lib/auth");
    return isAdminSession(await auth());
  } catch {
    return false;
  }
}

export async function GET(request?: Request): Promise<NextResponse> {
  // Probes (DB ping, ingestion freshness, settlement health, nflverse cache
  // stats, money-path env posture) live in live-capability-probes.ts, shared
  // with the epistemic-twin cron/agent guard (capability-graph.ts's
  // fetchLiveCapabilityGraph) so both callers read the same evidence instead
  // of two implementations that could drift apart.
  const { checks, capabilities } = await computeLiveCapabilityProbes();

  const operator = await isOperatorCaller(request);
  const detail: HealthDisclosureLevel = operator ? "operator" : "public";

  // Readiness (DB + ingestion) — Sentinel / uptime still use ok + HTTP.
  // Computed from the FULL probe result, never the redacted projection: what a
  // caller is allowed to read must not change what the route considers healthy.
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
  //
  // OPERATOR-ONLY: each entry's `reasons[]` carries the leaf probe reason
  // VERBATIM (see provenanceReasons in @sports/epistemic-twin's adapt-op003),
  // so this array republishes every free-text string the capability redaction
  // strips. Not computed at all for a public caller — nothing to leak, and the
  // composition work is skipped on the hot anonymous path.
  const capabilityGraph = operator
    ? projectCapabilityGraph(composeCapabilityGraph(capabilities))
    : null;

  // Diagnostic-only, same rule as capabilityGraph above: never influences
  // ok/allOk/HTTP status (the `ingestion` check already governs that). This
  // exists to answer the question `ingestion: error` cannot — is the platform
  // cron scheduler actually dead, or did every job just find nothing to do?
  // See lib/ops/scheduler-liveness.ts for the incident this is for.
  //
  // OPERATOR-ONLY: "the scheduler is dead, and has been for N minutes" plus an
  // `operatorHint` is exactly the window an attacker wants and no uptime
  // monitor needs. Skipping it for public callers also drops a DB read from
  // every anonymous hit.
  const schedulerLiveness = operator
    ? await assessSchedulerLiveness().catch(() => null)
    : null;

  // Ingestion failsafe. Fires ONLY when the spine is already past the staleness
  // SLA and no isolate has attempted within the cooldown, so a healthy system
  // never reaches the work. Deliberately NOT awaited: health must stay fast and
  // must never fail because a background repair failed. See traffic-heartbeat.ts
  // for why organic traffic is currently the only reliable trigger available.
  // Unchanged by the disclosure gate: this is the public path's whole value.
  void maybeRunTrafficHeartbeat().catch(() => undefined);

  return NextResponse.json(
    {
      ok: allOk,
      status,
      detail,
      checks: operator ? checks : redactHealthChecks(checks),
      capabilities: operator ? capabilities : redactCapabilities(capabilities),
      // Absent, not null, for public callers: an omitted key asserts less than a
      // null one. Both consumers already tolerate absence
      // (`Array.isArray(H.capabilityGraph) ? … : []` in impeccable-probe.mjs).
      ...(operator ? { capabilityGraph, schedulerLiveness } : {}),
      deployment: { sha: deploymentSha(), observedAt: new Date().toISOString() },
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        // The body now VARIES by credential. Without these a shared cache could
        // hand an operator payload to the next anonymous caller and undo the
        // whole gate. `force-dynamic` only governs Next's own static cache.
        "Cache-Control": "no-store",
        Vary: "Authorization, Cookie",
      },
    },
  );
}
