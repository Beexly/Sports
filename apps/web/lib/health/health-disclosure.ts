/**
 * Disclosure boundary for /api/health.
 *
 * WHY THIS EXISTS. `/api/health` is anonymous, unauthenticated and
 * `force-dynamic` — `curl https://www.galaxysportsedge.com/api/health | jq`
 * from anywhere on the internet. It returned the full operator payload:
 * `checks[].detail`, `capabilities[].reason`, `capabilityGraph` and
 * `schedulerLiveness`. Those free-text fields are a live map of the
 * deployment's money-path misconfiguration and internal failure text:
 *
 *   • "Stripe secret present; no STRIPE_*_PRICE_ID envs — checkout depends on
 *      lookup_key resolution"                      (checkout probe, degraded)
 *   • "Stripe secret present but webhook secret missing — sessions may create
 *      without entitlements"                (revenue-checkout probe, degraded)
 *      ^ that one tells an anonymous caller the ENTITLEMENT GRANT PATH IS
 *        BROKEN — i.e. that a subscription can be paid for and not delivered.
 *   • `currency probe threw: ${err.message}` — RAW upstream error text, which
 *      routinely carries the upstream URL/host of the nflverse fetch.
 *
 * And these are not confined to `capabilities[].reason`: `provenanceReasons()`
 * in @sports/epistemic-twin's `op003ToOwnEvidence` pushes each leaf `reason`
 * verbatim into the composed evidence, so every one of those strings ALSO
 * surfaced in `capabilityGraph[].reasons`. Redacting one without the other
 * would have left the leak fully open.
 *
 * The pattern was already understood one file over: `live-capability-probes.ts`
 * deliberately downgrades a DB failure to the static string
 * `"database unreachable"` *"because its message discloses the internal
 * database host/port"*, and `capability-state.ts`'s `CapabilityState.reason`
 * doc says in as many words: "NEVER interpolate errors, hostnames, connection
 * strings, or other runtime values here — this module (like /api/health) is on
 * a public, unauthenticated surface." Stripe posture and the nflverse probe
 * error simply never got that treatment. Rather than police every future probe
 * author, this module makes the WIRE the boundary: free-text never crosses it
 * for an anonymous caller, whatever a probe decides to write.
 *
 * WHAT STAYS PUBLIC, and why exactly that:
 *   • `ok`, `status`, HTTP 200/503 — the entire uptime-monitor contract
 *     (post-deploy-smoke.mjs, synthetic-monitoring-runner.mjs, Sentinel).
 *   • `deployment.sha` — already public in `/api/ops/public-surface-truth`'s
 *     anonymous branch, and launch-preflight/impeccable-probe compare against it.
 *   • `checks[].status` / `.ageMinutes` / `.lastSuccessAt` — the black-box
 *     freshness contract `scripts/prod-probe.mjs`'s `validateIngestionFreshness`
 *     asserts (`status === "ok"`, numeric `ageMinutes`, string `lastSuccessAt`)
 *     and `scripts/ops/impeccable-probe.mjs`'s ingestion-age invariant. These
 *     are bounded scalars, not free text.
 *   • `capabilities[].status` / `.observedAt` / `.evidence` — `launch-preflight.mjs`
 *     reads the settlement capability's status anonymously. A bare enum is a far
 *     smaller disclosure than the sentence explaining it, and it keeps the
 *     existing external contract intact.
 *
 * ALLOWLIST, NOT DENYLIST. Both functions rebuild the object field by field
 * from a fixed list of known-safe keys. A field added to `HealthCheck` or
 * `CapabilityState` tomorrow is therefore NOT disclosed until someone
 * deliberately adds it here — the failure mode of forgetting is silence, not a
 * leak. `delete obj.detail` would have had the opposite failure mode.
 */

import type { CapabilityState } from "./capability-state";
import type { HealthCheck } from "./live-capability-probes";

/** `HealthCheck` minus the free-text `detail`. */
export type PublicHealthCheck = {
  readonly status: HealthCheck["status"];
  readonly lastSuccessAt?: string;
  readonly ageMinutes?: number;
};

/** `CapabilityState` minus the free-text `reason`. */
export type PublicCapabilityState = {
  readonly capabilityId: string;
  readonly status: CapabilityState["status"];
  readonly observedAt: string;
  readonly evidence: CapabilityState["evidence"];
};

/** Marker echoed on the response so an operator can see which payload they got. */
export type HealthDisclosureLevel = "public" | "operator";

/**
 * Strip `detail` from every check, keeping only the scalar freshness fields the
 * external black-box probes contract on. Optional keys are omitted rather than
 * set to `undefined` so the JSON shape matches what callers already parse.
 */
export function redactHealthChecks(
  checks: Readonly<Record<string, HealthCheck>>,
): Record<string, PublicHealthCheck> {
  const out: Record<string, PublicHealthCheck> = {};
  for (const [key, check] of Object.entries(checks)) {
    out[key] = {
      status: check.status,
      ...(check.lastSuccessAt !== undefined ? { lastSuccessAt: check.lastSuccessAt } : {}),
      ...(check.ageMinutes !== undefined ? { ageMinutes: check.ageMinutes } : {}),
    };
  }
  return out;
}

/** Strip `reason` from every capability, keeping the status enum + provenance. */
export function redactCapabilities(
  capabilities: readonly CapabilityState[],
): PublicCapabilityState[] {
  return capabilities.map((capability) => ({
    capabilityId: capability.capabilityId,
    status: capability.status,
    observedAt: capability.observedAt,
    evidence: capability.evidence,
  }));
}
