/**
 * Display-Substantiated Results Guard
 *
 * HANDOFF §1 / Honesty Engine requirement:
 * No public surface may show a performance number (win-rate, ROI, CLV,
 * confidence claim, "proven edge", etc.) unless the claim is fully
 * substantiated with:
 *   - coverage denominator (n)
 *   - a lower confidence bound (Wilson or Clopper-Pearson)
 *   - CLV (or equivalent market-relative) backing where applicable
 *   - walk-forward / as-of provenance
 *
 * This module is the pure enforcement point. Render layers and API
 * responses must call `assertDisplaySubstantiated` (or the softer
 * `isDisplaySubstantiated`) before emitting any such number.
 *
 * Coding agent: wire into Board / Intelligence / marketing / API paths;
 * add tests; do not weaken the required fields.
 */

export type ConfidenceBoundMethod = "wilson" | "clopper-pearson" | "other-validated";

export interface SubstantiationEvidence {
  /** Number of settled trials that form the denominator */
  readonly n: number;
  /** Observed successes (or equivalent count) */
  readonly successes?: number;
  /** Observed rate in [0, 1] — optional if successes is provided */
  readonly rate?: number;
  /** Lower confidence bound already computed by a validated method */
  readonly lowerConfidenceBound: number;
  readonly boundMethod: ConfidenceBoundMethod;
  /** Confidence level of the bound (e.g. 0.95) */
  readonly boundLevel: number;
  /** Closing-line value or market-relative edge (can be 0 if N/A for the metric) */
  readonly clvOrMarketRelative?: number | null;
  /** Opaque provenance token / run id / walk-forward window hash */
  readonly provenanceId: string;
  /** Human-readable description of the walk-forward or as-of protocol used */
  readonly walkForwardProtocol: string;
  /** Optional free-form notes for audit */
  readonly notes?: string;
}

export interface DisplayClaim {
  /** What is being claimed ("win_rate", "roi", "clv", "edge", etc.) */
  readonly claimType: string;
  /** The numeric value that would be shown to the user */
  readonly value: number;
  /** Evidence that substantiates the claim */
  readonly evidence: SubstantiationEvidence;
}

export class UnsubstantiatedClaimError extends Error {
  readonly claim: DisplayClaim;
  readonly reasons: readonly string[];

  constructor(claim: DisplayClaim, reasons: readonly string[]) {
    super(`Unsubstantiated display claim (${claim.claimType}): ${reasons.join("; ")}`);
    this.name = "UnsubstantiatedClaimError";
    this.claim = claim;
    this.reasons = reasons;
  }
}

const MIN_N = 1;
const MIN_BOUND_LEVEL = 0.8;

function collectFailures(claim: DisplayClaim): string[] {
  const e = claim.evidence;
  const reasons: string[] = [];

  if (!Number.isFinite(e.n) || e.n < MIN_N) {
    reasons.push(`coverage denominator n must be >= ${MIN_N} (got ${e.n})`);
  }
  if (!Number.isFinite(e.lowerConfidenceBound)) {
    reasons.push("lowerConfidenceBound must be a finite number");
  }
  if (!Number.isFinite(e.boundLevel) || e.boundLevel < MIN_BOUND_LEVEL || e.boundLevel > 1) {
    reasons.push(`boundLevel must be in [${MIN_BOUND_LEVEL}, 1] (got ${e.boundLevel})`);
  }
  if (!e.boundMethod) {
    reasons.push("boundMethod is required");
  }
  if (!e.provenanceId || e.provenanceId.trim().length === 0) {
    reasons.push("provenanceId is required");
  }
  if (!e.walkForwardProtocol || e.walkForwardProtocol.trim().length === 0) {
    reasons.push("walkForwardProtocol is required");
  }
  // Soft but important: if a rate is claimed, the LCB should not exceed the point estimate
  // by a large margin (numerical tolerance only).
  if (typeof e.rate === "number" && Number.isFinite(e.rate)) {
    if (e.lowerConfidenceBound > e.rate + 1e-6) {
      reasons.push("lowerConfidenceBound cannot exceed the observed rate");
    }
  }

  return reasons;
}

/** Soft check — returns true only when the claim is fully substantiated. */
export function isDisplaySubstantiated(claim: DisplayClaim): boolean {
  return collectFailures(claim).length === 0;
}

/**
 * Hard enforcement. Throws UnsubstantiatedClaimError if any required
 * evidence field is missing or invalid. Call this immediately before
 * rendering or serializing a performance number to a public surface.
 */
export function assertDisplaySubstantiated(claim: DisplayClaim): void {
  const reasons = collectFailures(claim);
  if (reasons.length > 0) {
    throw new UnsubstantiatedClaimError(claim, reasons);
  }
}

/**
 * Helper for render layers: returns the value only if substantiated,
 * otherwise returns null (and optionally logs). Prefer the hard assert
 * for server-side paths.
 */
export function displayIfSubstantiated(claim: DisplayClaim): number | null {
  if (isDisplaySubstantiated(claim)) return claim.value;
  return null;
}

/** Minimal Wilson score interval lower bound (normal approximation). */
export function wilsonLowerBound(
  successes: number,
  n: number,
  z: number = 1.96,
): number {
  if (n <= 0) return 0;
  const p = successes / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return Math.max(0, (centre - margin) / denominator);
}
