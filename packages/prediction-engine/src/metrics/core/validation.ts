/**
 * Rights-clearance and evidence-strength gates for the prediction engine's
 * metric layer.
 *
 * Every metric must clear two independent checks before its output may be
 * trusted or published, and this module owns both:
 *
 * 1. *May we model on these sources at all?* — {@link rightsCleanliness},
 *    {@link sourcePoliciesAllowed}, and {@link validateSourcePolicies} score and
 *    gate each source against its rights posture. These gates **fail closed**:
 *    an empty policy list, an `"unknown"` status, or any source not cleared for
 *    modeling denies the whole set rather than assuming intent.
 * 2. *How much should we trust the estimate?* — {@link uncertaintyFromEvidence}
 *    collapses sample size, proxy reliance, and drift pressure into a coarse
 *    LOW/MEDIUM/HIGH band, again biased toward HIGH when evidence is thin or
 *    rights are unclear.
 *
 * All functions here are pure and deterministic (no clock, no I/O, no global
 * state). Cleanliness scores are unitless in [0, 1]; evidence thresholds are in
 * raw sample counts, raw proxy counts, and the canonical 0–100 drift scale.
 */
import { clampScore } from "./math.js";

/**
 * Governance lifecycle stage of a metric, in forward order:
 * `DESIGN → SHADOW → BACKTESTING → REVIEW_READY → APPROVED`, with `REJECTED` as
 * the terminal reject state. Across this package a metric ships as `"SHADOW"`
 * until it has earned promotion — SHADOW means "computed and audited but not yet
 * wired into live pricing." This type only labels the stage; the pricing gate
 * that consumes the label lives with the metric outputs, not here.
 */
export type MetricLifecycleStatus = "DESIGN" | "SHADOW" | "BACKTESTING" | "REVIEW_READY" | "APPROVED" | "REJECTED";
/**
 * Coarse trust band for a metric estimate, from most to least trustworthy:
 * `LOW` (tight, well-sampled, clean-rights evidence) → `MEDIUM` → `HIGH`
 * (thin, proxy-heavy, drifting, or rights-unclear evidence). Emitted by
 * {@link uncertaintyFromEvidence}; higher band = wider uncertainty = trust less.
 */
export type MetricUncertaintyBand = "LOW" | "MEDIUM" | "HIGH";

/**
 * Rights-clearance posture of a data source, mirroring the scraping
 * source-rights registry vocabulary. Mapped to a numeric cleanliness score by
 * {@link rightsCleanliness}: `"allowed"`/`"approved"` are fully clean (1);
 * `"benchmark_only"`/`"manual_review"`/`"restricted"` are review-tier (0.6);
 * everything else — including the fail-closed default `"unknown"` — denies (0).
 */
export type MetricSourceStatus =
  | "allowed"
  | "approved"
  | "benchmark_only"
  | "manual_review"
  | "restricted"
  | "permission_required"
  | "blocked"
  | "excluded"
  | "unknown";

/**
 * Per-source rights record. A metric must attach one policy per source it
 * consumes. Both the rights `status` and the explicit `allowedForModeling` flag
 * must clear for a source to be usable — the flag is an independent kill-switch,
 * so a source can be rights-clean yet still be held out of modeling. When
 * `attributionRequired` is set, that attribution text must propagate to every
 * derived output (a house invariant, enforced by the caller, not by this file).
 */
export interface MetricSourcePolicy {
  readonly sourceId: string;
  readonly status: MetricSourceStatus;
  readonly allowedForModeling: boolean;
  readonly attributionRequired?: string;
}

/**
 * A single finding from source-policy validation.
 *
 * `severity` is `"BLOCK"` (fail the gate closed) or `"WARN"` (advisory, does not
 * fail the gate). Today {@link validateSourcePolicies} only ever emits `"BLOCK"`
 * issues; `"WARN"` is reserved for future non-blocking source advisories.
 */
export interface MetricValidationIssue {
  readonly code: string;
  readonly severity: "WARN" | "BLOCK";
  readonly message: string;
}

/**
 * Outcome of {@link validateSourcePolicies}.
 *
 * `allowed` is the authoritative gate: `true` only when no `"BLOCK"` issue was
 * raised. `status` is the human-facing label of the same decision —
 * `"FAIL_CLOSED"` (a BLOCK was raised), `"PASS"` (no issues), or `"WARN"`
 * (issues raised but none blocking). `"WARN"` is reserved for future
 * non-blocking advisories and is currently unreachable (see
 * {@link validateSourcePolicies}).
 */
export interface MetricValidationResult {
  readonly allowed: boolean;
  readonly issues: readonly MetricValidationIssue[];
  readonly status: "PASS" | "WARN" | "FAIL_CLOSED";
}

/**
 * Map a source's rights `status` to a unitless cleanliness score in {0, 0.6, 1}.
 *
 * - `1`   — fully clean: `"allowed"` or `"approved"`.
 * - `0.6` — review-tier, usable with caveats: `"benchmark_only"`,
 *           `"manual_review"`, or `"restricted"`.
 * - `0`   — deny: every other status, including `"blocked"`, `"excluded"`,
 *           `"permission_required"`, and the fail-closed `"unknown"`.
 *
 * The gate helpers treat any score `> 0` as "clears the deny bar," so a
 * review-tier (0.6) source passes {@link sourcePoliciesAllowed} and
 * {@link validateSourcePolicies}. A score of `0` is a hard deny, not a soft
 * penalty. `1 - rightsCleanliness(status)` is used elsewhere as a rights-risk
 * term (0 clean, 0.4 review, 1 unclean).
 */
export function rightsCleanliness(status: MetricSourceStatus): number {
  if (status === "allowed" || status === "approved") return 1;
  if (status === "benchmark_only" || status === "manual_review" || status === "restricted") return 0.6;
  return 0;
}

/**
 * Bare boolean gate: may we model on this whole set of sources?
 *
 * Returns `true` only when the list is non-empty AND *every* policy is both
 * `allowedForModeling` and has `rightsCleanliness(status) > 0` (i.e. clean or
 * review-tier). Fails closed: an empty list returns `false` (absence of a policy
 * is treated as "not cleared," never as "no objection"). One denied source
 * denies the whole set.
 *
 * This is the terse counterpart to {@link validateSourcePolicies}: for any
 * input, `sourcePoliciesAllowed(p) === validateSourcePolicies(p).allowed`. Use
 * this when you only need the yes/no; use the other when you need the reasoned,
 * auditable issue trail.
 */
export function sourcePoliciesAllowed(policies: readonly MetricSourcePolicy[]): boolean {
  return policies.length > 0 && policies.every((policy) => policy.allowedForModeling && rightsCleanliness(policy.status) > 0);
}

/**
 * Reasoned, auditable version of {@link sourcePoliciesAllowed}: apply the same
 * fail-closed rights gate but return the individual reasons for a denial.
 *
 * Emits one `"BLOCK"` issue for an empty policy list (`missing_source_policy`)
 * and one per source that is either not `allowedForModeling` or has zero rights
 * cleanliness (`source_policy_block`). `allowed` is `true` only when no issue is
 * raised. `status` labels the same decision: `"FAIL_CLOSED"` when blocked, else
 * `"PASS"`.
 *
 * @remarks
 * Review-tier sources (rights cleanliness 0.6) are NOT blocked here — only a
 * hard-deny status (cleanliness 0) or a cleared-off `allowedForModeling` flag
 * raises `source_policy_block`.
 */
export function validateSourcePolicies(policies: readonly MetricSourcePolicy[]): MetricValidationResult {
  const issues: MetricValidationIssue[] = [];
  if (policies.length === 0) {
    issues.push({ code: "missing_source_policy", message: "Metric has no source policy.", severity: "BLOCK" });
  }
  for (const policy of policies) {
    if (!policy.allowedForModeling || rightsCleanliness(policy.status) === 0) {
      issues.push({ code: "source_policy_block", message: `Source ${policy.sourceId} does not clear for modeling.`, severity: "BLOCK" });
    }
  }
  const blocked = issues.some((issue) => issue.severity === "BLOCK");
  // Every issue emitted above is severity "BLOCK", so `issues.length > 0` currently
  // implies `blocked === true` and the "WARN" status branch is unreachable today.
  // "WARN" (and the "WARN" issue severity) is reserved for future non-blocking
  // source advisories — e.g. a missing-attribution or soft-review note — that should
  // surface without failing the gate closed. The branch is kept so that adding a
  // WARN-severity issue lights up "WARN" automatically, with no change to this line.
  return { allowed: !blocked, issues, status: blocked ? "FAIL_CLOSED" : issues.length > 0 ? "WARN" : "PASS" };
}

/**
 * Collapse the strength of a metric's evidence into a LOW/MEDIUM/HIGH trust band.
 *
 * Inputs (all optional except the source policy):
 * - `sampleSize`   — raw observation count (not clamped); defaults to `0`.
 * - `sourcePolicy` — the source rights policies, gated via
 *                    {@link sourcePoliciesAllowed}.
 * - `proxyCount`   — number of proxy/derived (non-direct) inputs relied on;
 *                    defaults to `0`.
 * - `driftPressure`— market/model drift on the canonical 0–100 scale, clamped
 *                    with {@link clampScore}; defaults to `0`.
 *
 * Band logic (first match wins):
 * - `HIGH`   — sources not allowed (incl. an empty policy) OR `sampleSize < 50`
 *              OR `proxyCount > 2` OR `driftPressure >= 70`.
 * - `MEDIUM` — otherwise if `sampleSize < 250` OR `proxyCount > 0` OR
 *              `driftPressure >= 35`.
 * - `LOW`    — otherwise (well-sampled, no proxies, low drift, clean rights).
 *
 * Honesty gate: every default sits at the pessimistic end, so *absent* evidence
 * degrades trust rather than flattering it — a call with no `sampleSize` (→ 0)
 * or an empty `sourcePolicy` returns `HIGH`. The bands are a coarse triage
 * signal, not a calibrated variance; treat them as ordinal, not numeric.
 */
export function uncertaintyFromEvidence(input: {
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
  readonly proxyCount?: number;
  readonly driftPressure?: number;
}): MetricUncertaintyBand {
  const sampleSize = input.sampleSize ?? 0;
  const driftPressure = clampScore(input.driftPressure ?? 0);
  const proxyCount = input.proxyCount ?? 0;
  if (!sourcePoliciesAllowed(input.sourcePolicy) || sampleSize < 50 || proxyCount > 2 || driftPressure >= 70) return "HIGH";
  if (sampleSize < 250 || proxyCount > 0 || driftPressure >= 35) return "MEDIUM";
  return "LOW";
}
