/**
 * Deterministic evidence weighting.
 *
 * No RNG, no time, no I/O: the same input set always produces the same weights,
 * so a projection computed today can be reproduced from the same corpus.
 */
import {
  LANE_PRIORITY,
  MIN_CONFIDENCE,
  isFiniteNumber,
  type ResearchEvidence,
  type WeightedEvidence,
} from "./types.js";

/**
 * A paper is usable only when it is explicitly enabled AND its match confidence
 * clears the acceptance floor. Disabled or low-confidence papers are excluded
 * rather than down-weighted: a half-trusted paper is still an untrusted paper.
 */
export function isUsable(e: ResearchEvidence): boolean {
  return (
    e.enabled === true &&
    isFiniteNumber(e.confidence) &&
    e.confidence >= MIN_CONFIDENCE &&
    (e.lane === "calibration" ||
      e.lane === "modeling" ||
      e.lane === "feature" ||
      e.lane === "evaluation" ||
      e.lane === "unknown")
  );
}

/**
 * rawScore = lanePriority(evidence type) x match confidence.
 *
 * Multiplication, not addition, because the two failures are independent: a
 * perfectly-matched evaluation paper is still worth little to a projection, and a
 * calibration paper with a weak title match is still weakly matched.
 */
export function scoreEvidence(e: ResearchEvidence): number {
  if (!isUsable(e)) return 0;
  const lane = LANE_PRIORITY[e.lane] ?? LANE_PRIORITY.unknown;
  const score = lane * e.confidence;
  return isFiniteNumber(score) ? score : 0;
}

/**
 * Weights across the whole set, normalized so the usable papers sum to exactly 1.
 * Returns weights of 0 when nothing is usable: callers must treat that as "no
 * evidence", not as a uniform prior over an empty set.
 */
export function computeWeights(evidence: readonly ResearchEvidence[]): WeightedEvidence[] {
  const scored = evidence.map((e) => ({ ...e, rawScore: scoreEvidence(e), weight: 0 }));
  const total = scored.reduce((sum, e) => sum + e.rawScore, 0);
  if (!isFiniteNumber(total) || total <= 0) return scored;
  return scored.map((e) => ({ ...e, weight: e.rawScore / total }));
}

/**
 * Combine one named parameter across the weighted set.
 *
 * Returns `prior` untouched when no usable paper states the parameter, which is
 * the fail-closed behaviour: absence of evidence never silently moves a number.
 * Otherwise returns the weight-normalized mean of the stated values, restricted
 * to papers that actually state this parameter (re-normalized among them).
 */
export function combineParameter(
  weighted: readonly WeightedEvidence[],
  name: string,
  prior: number,
): { value: number; contributors: number; weight: number } {
  if (!isFiniteNumber(prior)) throw new RangeError(`prior must be finite, got ${String(prior)}`);
  let sum = 0;
  let wsum = 0;
  let contributors = 0;
  for (const e of weighted) {
    if (e.weight <= 0) continue;
    for (const p of e.parameters) {
      if (p.name !== name || !isFiniteNumber(p.value)) continue;
      sum += p.value * e.weight;
      wsum += e.weight;
      contributors += 1;
    }
  }
  if (contributors === 0 || wsum <= 0) return { value: prior, contributors: 0, weight: 0 };
  return { value: sum / wsum, contributors, weight: wsum };
}

/**
 * Blend a paper-derived value into a prior by evidence mass.
 *
 * `strength` in [0, 1] is the caller's confidence that the corpus speaks to this
 * specific slot. At 0 the prior is returned exactly, which keeps the wiring
 * inspectable and reversible; at 1 the evidence value is adopted outright.
 */
export function blendTowardEvidence(prior: number, evidence: number, strength: number): number {
  if (!isFiniteNumber(prior) || !isFiniteNumber(evidence) || !isFiniteNumber(strength)) {
    return prior;
  }
  const s = Math.min(1, Math.max(0, strength));
  return prior * (1 - s) + evidence * s;
}
