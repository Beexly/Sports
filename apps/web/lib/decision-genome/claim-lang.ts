/**
 * ClaimLang / TruthCompiler — typed claims with proof obligations.
 *
 * Decision Genome build step A. Before there is a pick there are claims: "the line is
 * stale", "this source is independent", "the market overreacted", "we beat the close".
 * ClaimLang makes every claim a typed object that must satisfy explicit proof
 * obligations before it can be relied on (internal) or rendered (public). Copy stops
 * being persuasion and becomes something that compiles — or doesn't.
 *
 * COMPOSITION, not reinvention: the public-facing gate for `performance`/`pricing`
 * claims delegates to the existing `compilePublicClaim` (the single source of truth for
 * banned phrases, settled-sample floors, CLV coverage, calibration readiness, model
 * stamping, and freshness). ClaimLang adds the typed-claim layer and the obligation
 * grammar around it. Pure, no I/O.
 */

import { compilePublicClaim, type ClaimContext, type CompiledClaim } from "@/lib/claims/public-claim-compiler";

export type ClaimType =
  | "fact"
  | "market"
  | "source"
  | "causal"
  | "forecast"
  | "decision"
  | "performance"
  | "pricing"
  | "legal";

/** A single thing a claim of a given type must carry to be compilable. */
export type ProofObligation =
  | "as-of-timestamp" // when was this true / measured?
  | "evidence-ref" // at least one source/evidence pointer
  | "source-independence" // independence verified (source claims)
  | "rights-clearance" // cleared for the stated visibility
  | "uncertainty-band" // forecasts must carry a band, not a point
  | "model-version" // model-derived claims must be stamped
  | "calibration-context" // confidence must come with calibration health
  | "falsifier" // causal/forecast claims must state what would refute them
  | "public-claim-gate"; // performance/pricing must pass the public claim compiler

/** Required obligations per claim type — the grammar of provable claims. */
export const OBLIGATIONS_BY_TYPE: Readonly<Record<ClaimType, readonly ProofObligation[]>> = {
  fact: ["as-of-timestamp", "evidence-ref"],
  market: ["as-of-timestamp", "evidence-ref"],
  source: ["as-of-timestamp", "evidence-ref", "source-independence", "rights-clearance"],
  causal: ["evidence-ref", "falsifier"],
  forecast: ["as-of-timestamp", "uncertainty-band", "model-version", "calibration-context", "falsifier"],
  decision: ["as-of-timestamp", "evidence-ref"],
  performance: ["as-of-timestamp", "model-version", "calibration-context", "public-claim-gate"],
  pricing: ["evidence-ref", "public-claim-gate"],
  legal: ["rights-clearance", "evidence-ref"],
};

export type ClaimVisibility = "internal" | "public";

export interface TypedClaim {
  readonly id: string;
  readonly type: ClaimType;
  /** Human-readable statement (the would-be copy). */
  readonly statement: string;
  readonly visibility: ClaimVisibility;
  /** Which obligations this claim asserts it satisfies. The compiler checks them against
   *  the type's required set; anything required-but-absent blocks the claim. */
  readonly satisfied: readonly ProofObligation[];
  /** Optional public-claim context, REQUIRED when `public-claim-gate` is in scope. */
  readonly publicClaim?: ClaimContext;
}

export interface ClaimCompileResult {
  readonly claimId: string;
  readonly ok: boolean;
  /** Required obligations the claim failed to satisfy. */
  readonly unmet: readonly ProofObligation[];
  /** When a public-claim-gate applies, the underlying compiler verdict. */
  readonly publicCompile?: CompiledClaim;
  /** The statement, echoed back only when ok (and, if public, when the gate ALLOWs). */
  readonly compiledStatement: string | null;
  readonly reasons: readonly string[];
}

/**
 * Compile a typed claim against its proof obligations. Pure. A claim is `ok` only when
 * every required obligation is satisfied AND (when a public-claim-gate applies) the
 * existing public claim compiler returns ALLOW.
 */
export function compileClaim(claim: TypedClaim): ClaimCompileResult {
  const required = OBLIGATIONS_BY_TYPE[claim.type];
  const satisfied = new Set(claim.satisfied);
  const reasons: string[] = [];

  const unmet = required.filter((ob) => {
    // The public-claim-gate is satisfied by the compiler verdict, checked separately below.
    if (ob === "public-claim-gate") return false;
    return !satisfied.has(ob);
  });
  for (const ob of unmet) reasons.push(`Missing proof obligation: ${ob}.`);

  let publicCompile: CompiledClaim | undefined;
  const needsPublicGate = required.includes("public-claim-gate") || claim.visibility === "public";
  if (needsPublicGate) {
    if (!claim.publicClaim) {
      reasons.push("Public/performance/pricing claim is missing its public-claim context.");
      return {
        claimId: claim.id,
        ok: false,
        unmet: [...unmet, "public-claim-gate"],
        compiledStatement: null,
        reasons,
      };
    }
    publicCompile = compilePublicClaim(claim.publicClaim);
    if (publicCompile.verdict === "BLOCK") {
      for (const b of publicCompile.blockers) reasons.push(`Public claim blocked (${b.code}): ${b.message}`);
    }
  }

  const gateOk = !needsPublicGate || publicCompile?.verdict === "ALLOW";
  const ok = unmet.length === 0 && gateOk;

  return {
    claimId: claim.id,
    ok,
    unmet: gateOk ? unmet : [...unmet, "public-claim-gate"],
    publicCompile,
    compiledStatement: ok ? claim.statement : null,
    reasons,
  };
}

/** Compile a batch; returns only the claims that pass (the rest are dropped, not rendered). */
export function compilableClaims(claims: readonly TypedClaim[]): TypedClaim[] {
  return claims.filter((c) => compileClaim(c).ok);
}
