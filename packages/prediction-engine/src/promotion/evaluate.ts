/**
 * evaluatePromotion — composes Leg 1 (paired Brier EB-LCB), Leg 2 (CLV
 * non-inferiority), and Leg 3 (walk-forward integrity) into a single
 * PromotionDecision, per docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md.
 *
 * Promotion rule (contract §3): Leg 1 AND Leg 2. A challenger that improves
 * calibration but degrades CLV is rejected; a CLV-superior-but-calibration-
 * flat challenger is a founder-judgment case, never auto-promoted here.
 *
 * `now` is an injected parameter, never sampled internally — this keeps the
 * evaluator pure and makes replay byte-identical (contract §5 invariant #5).
 *
 * This module is DARK: it is exported from the package barrel for
 * discoverability but nothing in the live app (cron, route, UI) imports it,
 * and it touches no live-model-selection constant. Applying a promotion
 * remains a separate, founder-only step outside this module.
 */

import { pairedBrierLcb } from "./empirical-bernstein.js";
import { welchOneSidedNonInferiority } from "./clv-non-inferiority.js";
import { validateWalkForwardIntegrity } from "./integrity.js";
import { computeWindowHash } from "./window-hash.js";
import type { Leg1Result, Leg2Result, PromotionDecision, PromotionInput } from "./types.js";

export function evaluatePromotion(input: PromotionInput, now: string): PromotionDecision {
  const { window, brierRows, clvRows, championId, challengerId, codeRevision } = input;

  // Leg 3: reject outright (throws) rather than silently proceeding on an
  // improperly registered or leaking window.
  validateWalkForwardIntegrity(window, brierRows, clvRows);

  if (!(window.concurrentChallengers >= 1) || !Number.isInteger(window.concurrentChallengers)) {
    throw new RangeError(
      `evaluatePromotion: window.concurrentChallengers must be a positive integer (got ${window.concurrentChallengers})`,
    );
  }
  const m = window.concurrentChallengers;
  const alphaAdj = window.alpha / m;

  // Leg 1 — paired Brier differential, empirical-Bernstein LCB, plus the
  // coverage requirement over the pre-registered event universe (integrity
  // has already rejected out-of-universe and duplicate event ids, so `n`
  // counts distinct registered events).
  const diffs = brierRows.map(
    (r) => (r.championProb - r.outcome) ** 2 - (r.challengerProb - r.outcome) ** 2,
  );
  const eb = pairedBrierLcb(diffs, alphaAdj);
  const registeredEvents = window.registeredEventIds.length;
  const coverage = eb.n / registeredEvents;
  const coveragePass = coverage >= window.coverageFloor;
  const leg1Pass = eb.n >= window.nMin && coveragePass && eb.lcb > window.deltaPrac;
  const leg1: Leg1Result = {
    n: eb.n,
    meanD: eb.meanD,
    stdD: eb.stdD,
    lcb: eb.lcb,
    deltaPrac: window.deltaPrac,
    nMin: window.nMin,
    registeredEvents,
    coverage,
    coverageFloor: window.coverageFloor,
    pass: leg1Pass,
    reason: leg1Pass
      ? undefined
      : eb.n < window.nMin
        ? `n=${eb.n} < N_min=${window.nMin}`
        : !coveragePass
          ? `coverage=${coverage.toFixed(4)} < coverageFloor=${window.coverageFloor} — the paired sample ` +
            "does not cover the registered event universe (challenger abstention/cherry-picking)"
          : `lcb=${eb.lcb.toFixed(6)} <= deltaPrac=${window.deltaPrac}`,
  };

  // Leg 2 — CLV non-inferiority, unpaired Welch, over the shadow-lane rows.
  const challengerClv = clvRows.filter((r) => r.model === "challenger").map((r) => r.clv);
  const championClv = clvRows.filter((r) => r.model === "champion").map((r) => r.clv);
  const leg2: Leg2Result = welchOneSidedNonInferiority(challengerClv, championClv, {
    epsilon: window.epsilonClv,
    alphaAdj,
    minN: window.minClvN,
  });

  const verdict = leg1.pass && leg2.pass ? "ELIGIBLE" : "NOT_ELIGIBLE";

  const windowHash = computeWindowHash(window, codeRevision);

  return {
    windowId: window.windowId,
    windowHash,
    marketFamily: window.marketFamily,
    championId,
    challengerId,
    codeRevision,
    decidedAt: now,
    alpha: window.alpha,
    alphaAdj,
    concurrentChallengers: m,
    leg1,
    leg2,
    verdict,
  };
}

/**
 * Re-derives a PromotionDecision from the same persisted rows. This is
 * literally the same pure function as evaluatePromotion — there is no
 * separate "recorded" code path to drift from the "recomputed" one, which is
 * the whole point (contract §5 invariant #5: recompute must match byte-for-
 * byte). Kept as a distinctly named export so a future ledger/audit caller
 * can express intent ("I am replaying this decision") at the call site.
 */
export function recomputePromotionDecision(input: PromotionInput, decidedAt: string): PromotionDecision {
  return evaluatePromotion(input, decidedAt);
}
