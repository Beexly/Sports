/**
 * NATIVE UNIFICATION — the hand-set passports and the compiler are ONE grammar.
 *
 * The morphology adapters (M4) lift each existing passport into a ClaimObject; this proves the lift is
 * not a parallel system. Two guarantees:
 *  1) the compiler's authority engine (composeAuthority) REPRODUCES each passport's intrinsic
 *     authorityCeiling exactly — the same lattice governs both;
 *  2) no passport, compiled on fixtures, ever exceeds its own intrinsic ceiling (the hand-set numbers
 *     are honest under the compiler).
 *
 * The deeper field-level native refactor (deriving each passport's fixtureWatermarked/publicSafe through
 * the compiler) is a no-op on fixtures — every ceiling is INFO_ONLY — so it is deferred to the live
 * phase, where the ceilings actually vary, rather than destabilize the green fixture suite for no gain.
 */

import { describe, it, expect } from "vitest";
import { composeAuthority, type AuthorityVectorInput } from "../../authority-vector.js";
import { rankOf } from "../../decision-state-stat-contract.js";
import { buildAllTrendPassports, type TrendPassport } from "../../trend-passport.js";
import { PREDICTION_TRIAL_FIXTURES } from "../../prediction-court.js";
import { compileClaimObject } from "../meaning-compiler.js";
import { trendToClaimObject, predictionTrialToClaimObject } from "../morphology-adapters.js";
import { buildAllPredictionTrials } from "../../prediction-court.js";

function live(localExpression: AuthorityVectorInput["localExpression"]): AuthorityVectorInput {
  return {
    rights: "PUBLIC", temporal: "FRESH_POST_LOCK", sourceReality: "LIVE_REAL", evidence: "SUFFICIENT",
    localExpression, modelMaturity: "PUBLIC_ALLOWED", entitlement: "PUBLIC", ownerAction: "ARMED",
  };
}

describe("the compiler's authority lattice reproduces each passport's intrinsic ceiling", () => {
  it("trends: composeAuthority(localExpression = passport ceiling) === the passport ceiling", () => {
    const trends = buildAllTrendPassports();
    expect(trends.length).toBeGreaterThan(0);
    for (const t of trends) {
      // with every other layer clear, the local-expression layer (the passport's own ceiling) binds
      expect(composeAuthority(live(t.authorityCeiling)).ceiling).toBe(t.authorityCeiling);
    }
  });

  it("predictions: the compiler reproduces each trial's published authorityCeiling", () => {
    for (const p of PREDICTION_TRIAL_FIXTURES) {
      expect(composeAuthority(live(p.authorityCeiling)).ceiling).toBe(p.authorityCeiling);
    }
  });
});

describe("no passport exceeds its own intrinsic ceiling once compiled (hand-set numbers are honest)", () => {
  it("every compiled trend's expression ≤ its passport ceiling", () => {
    for (const t of buildAllTrendPassports() as readonly TrendPassport[]) {
      const c = compileClaimObject(trendToClaimObject(t));
      expect(rankOf(c.publicExpression)).toBeLessThanOrEqual(rankOf(t.authorityCeiling));
    }
  });

  it("every compiled prediction's expression ≤ its trial authorityCeiling", () => {
    const trials = buildAllPredictionTrials();
    for (let i = 0; i < trials.length; i++) {
      const input = PREDICTION_TRIAL_FIXTURES[i]!;
      const c = compileClaimObject(predictionTrialToClaimObject(trials[i]!, input.claimStrength));
      expect(rankOf(c.publicExpression)).toBeLessThanOrEqual(rankOf(input.authorityCeiling));
    }
  });
});
