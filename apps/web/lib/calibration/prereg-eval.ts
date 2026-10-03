/**
 * Preregistered evaluation contract — the measurement-first discipline as code.
 *
 * Source pattern: @datasciencebrain 2026-09-11 ("Not the pipeline. The measurement."):
 * write the success criterion into code BEFORE running anything, commit it so the
 * goalposts cannot move, publish the failures anyway, exact tests not vibes,
 * validity gates that can void your own results.
 *
 * WHAT THIS IS
 * A tamper-evident preregistration record. You declare the hypothesis, metric,
 * success threshold, fixed sample size, and validity gates up front. `declare`
 * seals the record with a content hash. `evaluate` re-checks the hash (any edit
 * after declaration → VOID), checks every validity gate (any failure → VOID),
 * then compares the observed metric against the pre-declared threshold.
 *
 * WHAT THIS IS NOT
 * It does not run experiments, touch the DB, or publish anything. It is the
 * contract layer: the thing that makes "we tuned the threshold after seeing
 * the answer" structurally impossible instead of merely frowned upon.
 * Additive only; nothing here is wired into any live path.
 */

export type PreregVerdict = "MET" | "NOT MET" | "VOID";

export interface PreregDeclaration {
  /** One-sentence hypothesis. */
  readonly hypothesis: string;
  /** Primary metric name, e.g. "scaledMAE", "clvSignRate", "brierSkill". */
  readonly metric: string;
  /** Success threshold, e.g. "beats baseline by >=5% relative". Lower-is-better metrics use direction:"minimize". */
  readonly threshold: string;
  /** Fixed sample size, declared in advance. */
  readonly n: number;
  /** Validity gates; ANY failure voids the result, including a win. */
  readonly validityGates: readonly string[];
  /** "maximize" (higher observed = better) or "minimize". */
  readonly direction: "maximize" | "minimize";
  /** The observed value that counts as success, in metric units. */
  readonly successValue: number;
}

export interface PreregRecord extends PreregDeclaration {
  readonly declaredAt: string;
  /** FNV-1a hash of the canonical declaration — tamper evidence. */
  readonly seal: string;
}

export interface PreregEvaluationInput {
  /** Observed metric value. */
  readonly observed: number;
  /** Actual sample size evaluated. Must equal declared n. */
  readonly n: number;
  /** Per-gate pass/fail, keyed by the exact gate strings from the declaration. */
  readonly gateResults: Readonly<Record<string, boolean>>;
}

export interface PreregEvaluation {
  readonly verdict: PreregVerdict;
  /** Human-readable reason, including which gate voided or what was tampered. */
  readonly reason: string;
  readonly record: PreregRecord;
}

/** Deterministic FNV-1a 32-bit hash — no imports, edge-runtime safe. */
export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function canonical(d: PreregDeclaration): string {
  return JSON.stringify({
    hypothesis: d.hypothesis,
    metric: d.metric,
    threshold: d.threshold,
    n: d.n,
    validityGates: [...d.validityGates],
    direction: d.direction,
    successValue: d.successValue,
  });
}

/** Seal a declaration. Call BEFORE running anything. */
export function declarePrereg(d: PreregDeclaration, declaredAt?: string): PreregRecord {
  if (!d.hypothesis.trim()) throw new Error("prereg-eval: hypothesis is required");
  if (!d.metric.trim()) throw new Error("prereg-eval: metric is required");
  if (!Number.isFinite(d.n) || d.n <= 0) throw new Error("prereg-eval: n must be a positive integer");
  if (d.validityGates.length === 0) throw new Error("prereg-eval: at least one validity gate is required");
  if (!Number.isFinite(d.successValue)) throw new Error("prereg-eval: successValue must be finite");
  return { ...d, declaredAt: declaredAt ?? new Date().toISOString(), seal: fnv1a(canonical(d)) };
}

/** Recompute the seal — true iff the record is exactly as declared. */
export function verifySeal(record: PreregRecord): boolean {
  const { declaredAt: _d, seal: _s, ...decl } = record;
  return fnv1a(canonical(decl as PreregDeclaration)) === record.seal;
}

/** Evaluate an observed outcome against a sealed preregistration. */
export function evaluatePrereg(record: PreregRecord, input: PreregEvaluationInput): PreregEvaluation {
  if (!verifySeal(record)) {
    return { verdict: "VOID", reason: "VOID: preregistration record was modified after declaration (seal mismatch). The goalposts moved.", record };
  }
  if (input.n !== record.n) {
    return { verdict: "VOID", reason: `VOID: evaluated n=${input.n} does not match declared n=${record.n}.`, record };
  }
  for (const gate of record.validityGates) {
    if (input.gateResults[gate] !== true) {
      return { verdict: "VOID", reason: `VOID: validity gate failed: "${gate}". A voided win is still void.`, record };
    }
  }
  const success =
    record.direction === "maximize" ? input.observed >= record.successValue : input.observed <= record.successValue;
  return {
    verdict: success ? "MET" : "NOT MET",
    reason: success
      ? `MET: observed ${input.observed} ${record.direction === "maximize" ? ">=" : "<="} declared ${record.successValue} on ${record.metric} (n=${record.n}).`
      : `NOT MET: observed ${input.observed} did not reach declared ${record.successValue} on ${record.metric} (n=${record.n}). Publish it anyway.`,
    record,
  };
}
