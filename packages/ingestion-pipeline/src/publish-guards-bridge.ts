/**
 * Publish-guards bridge — wires selective abstention, stratum coverage,
 * proper-scoring reliability, and the promotion decision engine into the
 * live publish surface.
 *
 * This is the "should we publish, and did the challenger earn it" layer:
 * Chow/NP-style abstention on interval width, stratum sample floors,
 * reliability diagrams, and the full promotion decision (walk-forward
 * integrity + CLV non-inferiority + empirical-Bernstein Brier LCB).
 *
 * Fail-closed on missing inputs. Never publishes against an empty stratum.
 */

import {
  meanBrier,
  reliabilityDiagram,
} from "@sports/prediction-engine";
import {
  chowStyleShouldAbstain,
  npStyleLowerEndpointFire,
  sampleFloorAbstain,
  evaluateAbstentionHelpers,
  type Interval,
  type AbstentionConfig,
} from "@sports/prediction-engine";
import {
  stratumKey,
  parseStratumKey,
  coverageFor,
  refuseIfEmptyStratum,
  floorStrata,
  type StratumCoverage,
} from "@sports/prediction-engine";
import {
  evaluatePromotion,
  recomputePromotionDecision,
  pairedBrierLcb,
  welchOneSidedNonInferiority,
  validateWalkForwardIntegrity,
  type PromotionInput,
  type PromotionDecision,
  type PairedBrierLcbResult,
} from "@sports/prediction-engine";

export type GuardEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Proper scoring ─────────────────────────────────────────────────────────

/**
 * Mean Brier and a reliability diagram over a scored set.
 */
export function evalReliability(input: {
  readonly rows: readonly { readonly p: number; readonly y: 0 | 1 }[];
  readonly bins?: number;
}): GuardEval<{ readonly brier: number; readonly diagram: ReturnType<typeof reliabilityDiagram> }> {
  const { rows, bins } = input;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: "rows must be non-empty" };
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (!Number.isFinite(r.p) || r.p <= 0 || r.p >= 1) {
      return { ok: false, reason: `row ${i}: p must be finite in (0,1) — not imputed` };
    }
    if (r.y !== 0 && r.y !== 1) {
      return { ok: false, reason: `row ${i}: y must be 0|1` };
    }
  }
  try {
    const brier = meanBrier(rows as { p: number; y: 0 | 1 }[]);
    const diagram = reliabilityDiagram(rows as { p: number; y: 0 | 1 }[], bins);
    return {
      ok: true,
      data: {
        brier: Number(brier.toFixed(6)),
        diagram,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Selective abstention ───────────────────────────────────────────────────

export interface AbstentionDecision {
  readonly kind: "FIRE" | "NO_BET";
  readonly reasons: readonly string[];
}

/**
 * Combined abstention check: interval width, LCB floor, sample floor,
 * odds staleness, price integrity, handicap match, placeability, provenance.
 */
export function evalAbstention(input: {
  readonly interval?: Interval | null;
  readonly stratumN: number;
  readonly staleOdds?: boolean;
  readonly priceIntegrityQ?: boolean;
  readonly handicapMismatch?: boolean;
  readonly notPlaceable?: boolean;
  readonly provenanceFail?: boolean;
  readonly cfg?: AbstentionConfig;
}): GuardEval<AbstentionDecision> {
  const { interval, stratumN, cfg } = input;
  if (!Number.isFinite(stratumN)) {
    return { ok: false, reason: "stratumN must be finite" };
  }
  try {
    const r = evaluateAbstentionHelpers({
      interval: interval ?? undefined,
      stratumN,
      staleOdds: input.staleOdds,
      priceIntegrityQ: input.priceIntegrityQ,
      handicapMismatch: input.handicapMismatch,
      notPlaceable: input.notPlaceable,
      provenanceFail: input.provenanceFail,
      cfg,
    });
    return {
      ok: true,
      data: {
        kind: r.kind,
        reasons: r.reasons as readonly string[],
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Chow-style interval-width abstention on its own.
 */
export function evalChowAbstain(input: {
  readonly interval: Interval | null;
  readonly cfg?: AbstentionConfig;
}): GuardEval<{ readonly abstain: boolean; readonly reasons: readonly string[] }> {
  const { interval, cfg } = input;
  if (!interval || !Number.isFinite(interval.lo) || !Number.isFinite(interval.hi)) {
    return { ok: false, reason: "finite interval required" };
  }
  try {
    const r = chowStyleShouldAbstain(interval, cfg);
    return {
      ok: true,
      data: { abstain: r.abstain, reasons: r.reasons as readonly string[] },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Stratum coverage ───────────────────────────────────────────────────────

export interface StratumDecision {
  readonly key: string;
  readonly n: number;
  readonly floor: number;
  readonly meetsFloor: boolean;
  readonly refuse: boolean;
  readonly reason: string | null;
}

/**
 * Build the stratum key and refuse FIRE when the stratum is empty or
 * under the sample floor. Never publishes against an empty stratum.
 */
export function evalStratumGate(input: {
  readonly sport: string;
  readonly pickType: string;
  readonly modelVersion: string;
  readonly n: number;
  readonly floor?: number;
}): GuardEval<StratumDecision> {
  const { sport, pickType, modelVersion, n, floor } = input;
  if (!sport || !pickType || !modelVersion) {
    return { ok: false, reason: "sport/pickType/modelVersion required" };
  }
  if (!Number.isFinite(n)) {
    return { ok: false, reason: "n must be finite" };
  }
  try {
    const key = stratumKey({ sport, pickType, modelVersion });
    const parsed = parseStratumKey(key);
    if (!parsed) {
      return { ok: false, reason: "stratumKey round-trip failed" };
    }
    const refusal = refuseIfEmptyStratum(key, n, floor ?? 100);
    return {
      ok: true,
      data: {
        key,
        n,
        floor: refusal.coverage.floor,
        meetsFloor: refusal.coverage.meetsFloor,
        refuse: refusal.refuse,
        reason: refusal.reason,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Floor a set of strata: which meet the sample floor, which do not.
 */
export function evalFloorStrata(input: {
  readonly strata: readonly { readonly key: string; readonly n: number }[];
  readonly floor?: number;
}): GuardEval<readonly StratumCoverage[]> {
  const { strata, floor } = input;
  if (!Array.isArray(strata) || strata.length === 0) {
    return { ok: false, reason: "strata must be non-empty" };
  }
  try {
    const covered = floorStrata(strata as never, floor);
    return { ok: true, data: covered as StratumCoverage[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Promotion decision ─────────────────────────────────────────────────────

/**
 * Full promotion decision: walk-forward integrity, CLV non-inferiority,
 * empirical-Bernstein Brier LCB. Throws on an improperly registered or
 * leaking window — that throw is a refusal, not a default.
 */
export function evalPromotion(input: PromotionInput, now: string): GuardEval<PromotionDecision> {
  if (!input || !now || !Number.isFinite(Date.parse(now))) {
    return { ok: false, reason: "input and valid now timestamp required" };
  }
  try {
    const decision = evaluatePromotion(input, now);
    return { ok: true, data: decision };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Paired Brier lower confidence bound via empirical Bernstein.
 * delta is the confidence level in (0,1).
 */
export function evalPairedBrierLcb(input: {
  readonly diffs: readonly number[];
  readonly delta: number;
}): GuardEval<PairedBrierLcbResult> {
  const { diffs, delta } = input;
  if (!Array.isArray(diffs) || diffs.length < 2) {
    return { ok: false, reason: "diffs must have at least 2 samples" };
  }
  if (!Number.isFinite(delta) || delta <= 0 || delta >= 1) {
    return { ok: false, reason: "delta must be finite in (0,1)" };
  }
  for (let i = 0; i < diffs.length; i++) {
    if (!Number.isFinite(diffs[i])) {
      return { ok: false, reason: `diffs[${i}] must be finite — not imputed` };
    }
  }
  try {
    const r = pairedBrierLcb(diffs as number[], delta);
    return { ok: true, data: r };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * One-sided Welch non-inferiority test on CLV.
 * `challengerClv` and `championClv` are graded CLV rows; `options` carries
 * alphaAdj / epsilon / minN. Returns the full module result including `pass`.
 */
export function evalClvNonInferiority(input: {
  readonly championClv: readonly number[];
  readonly challengerClv: readonly number[];
  readonly alphaAdj: number;
  readonly epsilon: number;
  readonly minN: number;
}): GuardEval<{
  readonly pass: boolean;
  readonly reason: string;
  readonly z: number;
  readonly oneSidedP: number;
}> {
  const { championClv, challengerClv, alphaAdj, epsilon, minN } = input;
  if (
    !Array.isArray(championClv) ||
    !Array.isArray(challengerClv) ||
    championClv.length === 0 ||
    challengerClv.length === 0
  ) {
    return { ok: false, reason: "championClv/challengerClv must be non-empty" };
  }
  if (
    !Number.isFinite(alphaAdj) ||
    alphaAdj <= 0 ||
    alphaAdj >= 1 ||
    !Number.isFinite(epsilon) ||
    !Number.isFinite(minN) ||
    minN <= 0
  ) {
    return {
      ok: false,
      reason: "alphaAdj in (0,1), epsilon finite, minN > 0 required",
    };
  }
  try {
    const r = welchOneSidedNonInferiority(
      challengerClv as number[],
      championClv as number[],
      { alphaAdj, epsilon, minN },
    );
    return {
      ok: true,
      data: {
        pass: r.pass,
        reason: r.reason,
        z: Number(r.z.toFixed(6)),
        oneSidedP: Number(r.oneSidedP.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  meanBrier,
  reliabilityDiagram,
  chowStyleShouldAbstain,
  sampleFloorAbstain,
  evaluateAbstentionHelpers,
  stratumKey,
  parseStratumKey,
  coverageFor,
  refuseIfEmptyStratum,
  floorStrata,
  evaluatePromotion,
  pairedBrierLcb,
  welchOneSidedNonInferiority,
  validateWalkForwardIntegrity,
};
export type { Interval, AbstentionConfig, StratumCoverage, PromotionInput, PromotionDecision, PairedBrierLcbResult };
