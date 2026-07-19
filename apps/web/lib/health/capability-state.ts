/**
 * Capability-level operational truth — OP-003.
 *
 * WHY: production showed `/nflverse` OOM-500s while `/api/health` reported
 * healthy. The existing health model is service-readiness only ("is the
 * process up") with no capability-level truth ("is this specific feature
 * actually working"). The repo also has 8+ incompatible status vocabularies
 * (HealthCheck "ok"|"error"; SettlementHealthBand NO_DATA|HEALTHY|DEGRADED|
 * CRITICAL; Sentinel PASS|WARN|FAIL; RefreshFreshnessStatus "ok"|"warn"|
 * "stale"; BreakerState "closed"|"degraded"|"open"; etc.).
 *
 * This module is the canonical RECONCILING layer: a single target vocabulary
 * (`CapabilityStatus`) plus pure adapters FROM each existing vocabulary. It
 * does NOT rewrite or modify any existing enum or its consumers — every
 * existing status type keeps its own meaning and its own callers; this module
 * only translates a snapshot of that status into one comparable shape for
 * cross-capability observability.
 *
 * Absence of coverage is NOT green: "unknown" (evidence "none") is a distinct,
 * honest state from "healthy" — see the separate OP-003 fix to
 * `runnerStatusFromArtifact()` in `lib/synthetic-monitoring/dashboard.ts` for
 * the exact bug class this guards against.
 */

export type CapabilityStatus =
  | "healthy" // probe/derived evidence says working
  | "degraded" // working but impaired (partial failures, elevated errors)
  | "stale" // working but data freshness violated
  | "unavailable" // confirmed not working
  | "proof_gated" // intentionally dark until a proof threshold is met
  | "owner_gated" // intentionally dark pending a founder decision
  | "unknown"; // NO evidence either way — absence of coverage is NOT green

export interface CapabilityState {
  readonly capabilityId: string; // e.g. "database", "ingestion", "settlement", "nflverse-reports"
  readonly status: CapabilityStatus;
  /**
   * Static, human-readable reason. NEVER interpolate errors, hostnames,
   * connection strings, or other runtime values here — this module (like
   * /api/health) is on a public, unauthenticated surface.
   */
  readonly reason: string;
  readonly observedAt: string; // ISO timestamp
  readonly evidence: "probe" | "derived" | "none"; // "none" <=> status "unknown"
}

function state(
  capabilityId: string,
  status: CapabilityStatus,
  reason: string,
  evidence: "probe" | "derived" | "none"
): CapabilityState {
  return { capabilityId, status, reason, observedAt: new Date().toISOString(), evidence };
}

/** Adapt the existing `HealthCheck` ("ok" | "error") vocabulary used by /api/health. */
export function fromHealthCheck(
  id: string,
  status: "ok" | "error",
  reason: string
): CapabilityState {
  switch (status) {
    case "ok":
      return state(id, "healthy", reason, "probe");
    case "error":
      return state(id, "unavailable", reason, "probe");
  }
}

/** Adapt the existing `SettlementHealthBand` vocabulary (lib/performance/settlement-health.ts). */
export function fromSettlementBand(
  band: "NO_DATA" | "HEALTHY" | "DEGRADED" | "CRITICAL"
): CapabilityState {
  switch (band) {
    case "NO_DATA":
      return state(
        "settlement",
        "unknown",
        "no commenced picks yet — settlement health is not measurable",
        "none"
      );
    case "HEALTHY":
      return state("settlement", "healthy", "settlement is keeping up with commenced picks", "derived");
    case "DEGRADED":
      return state(
        "settlement",
        "degraded",
        "some commenced picks are overdue to settle",
        "derived"
      );
    case "CRITICAL":
      return state(
        "settlement",
        "unavailable",
        "settlement is critically behind on commenced picks",
        "derived"
      );
  }
}

/** Adapt the existing `RefreshFreshnessStatus` vocabulary (lib/data-reliability/refresh-sla.ts). */
export function fromFreshness(id: string, status: "ok" | "warn" | "stale"): CapabilityState {
  switch (status) {
    case "ok":
      return state(id, "healthy", "data refresh is within the freshness SLA", "derived");
    case "warn":
      return state(id, "degraded", "data refresh is past the warn threshold", "derived");
    case "stale":
      return state(id, "stale", "data refresh is past the stale threshold", "derived");
  }
}

/** Adapt the existing `BreakerState` vocabulary (packages/data-ingestion/src/source-health.ts). */
export function fromBreaker(id: string, breakerState: "closed" | "degraded" | "open"): CapabilityState {
  switch (breakerState) {
    case "closed":
      return state(id, "healthy", "circuit breaker is closed — source is healthy", "derived");
    case "degraded":
      return state(id, "degraded", "circuit breaker is in the degraded band", "derived");
    case "open":
      return state(id, "unavailable", "circuit breaker is open — source is failing", "derived");
  }
}

/**
 * A capability with genuinely no evidence either way. This is the ONLY
 * constructor that yields evidence "none" — pair it with `status: "unknown"`.
 * Absence of coverage is not green.
 */
export function unknownCapability(id: string, reason: string): CapabilityState {
  return state(id, "unknown", reason, "none");
}

/**
 * Best-effort deployment SHA for correlating a capability snapshot to a
 * deploy. Never fabricate a value — returns null (not "unknown"/"dev") when
 * neither env var is set.
 */
export function deploymentSha(): string | null {
  return process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["GIT_COMMIT_SHA"] ?? null;
}
