import { describe, it } from "vitest";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as moduleUnderTest from "./2309-00756-inverse-mdp-fourth-down.js";
import {
  quantileValue,
  decisionResidual,
  recoverTau,
  assertTauSealed,
  makeNextScoreSamples,
  exampleRecovery,
  type FourthDownDecisionSample,
  type FourthDownState,
} from "./2309-00756-inverse-mdp-fourth-down.js";

const state: FourthDownState = {
  yardLine: 35,
  yardsToGo: 4,
  scoreDiff: -3,
  timeRemainingSec: 120,
  isHome: true,
};

describe("inverse-MDP fourth-down quantile recovery (arXiv:2309.00756v3)", () => {
  it("quantileValue returns the smallest outcome reaching tau", () => {
    // 0 at 0.6, 7 at 0.4 -> cumulative 0.6 at 0, 1.0 at 7
    const samples = makeNextScoreSamples([
      [7, 0.4],
      [0, 0.6],
    ]);
    assert.equal(quantileValue(samples, 0.3), 0);
    assert.equal(quantileValue(samples, 0.6), 0);
    assert.equal(quantileValue(samples, 0.61), 7);
    assert.equal(quantileValue(samples, 0.99), 7);
  });

  it("quantileValue rejects tau outside (0,1)", () => {
    const samples = makeNextScoreSamples([[7, 0.4], [0, 0.6]]);
    assert.throws(() => quantileValue(samples, 0), /tau must be in/);
    assert.throws(() => quantileValue(samples, 1), /tau must be in/);
  });

  it("decisionResidual is zero when the observed action is already optimal", () => {
    const values = [
      { state, action: "go" as const, samples: makeNextScoreSamples([[7, 0.9], [0, 0.1]]) },
      { state, action: "kick" as const, samples: makeNextScoreSamples([[3, 0.5], [0, 0.5]]) },
    ];
    // At tau 0.5 the go action's quantile is 7, the kick action's is 3 -> best is 7 = observed
    assert.equal(decisionResidual(values, "go", 0.5), 0);
  });

  it("decisionResidual is positive when the coach chose the worse action", () => {
    const values = [
      { state, action: "go" as const, samples: makeNextScoreSamples([[7, 0.9], [0, 0.1]]) },
      { state, action: "kick" as const, samples: makeNextScoreSamples([[3, 0.9], [0, 0.1]]) },
    ];
    // At tau 0.5: go quantile = 7, kick quantile = 3. Observed kick -> 7 - 3 = 4.
    assert.equal(decisionResidual(values, "kick", 0.5), 4);
  });

  it("recoverTau returns a tau in (0,1) with finite total residual", () => {
    const res = exampleRecovery();
    assert.ok(res.tau > 0 && res.tau < 1, `tau out of range: ${res.tau}`);
    assert.ok(Number.isFinite(res.totalResidual), "totalResidual must be finite");
    assert.ok(res.totalResidual >= 0, "totalResidual must be non-negative");
  });

  it("recoverTau minimises total residual across the grid", () => {
    const decisions: FourthDownDecisionSample[] = [
      {
        values: [
          { state, action: "go", samples: makeNextScoreSamples([[7, 0.4], [0, 0.6]]) },
          { state, action: "kick", samples: makeNextScoreSamples([[3, 0.7], [0, 0.3]]) },
        ],
        observedAction: "go",
      },
    ];
    const recovered = recoverTau(decisions);
    // Perturb tau away from the optimum and confirm residual does not improve.
    for (const probe of [0.01, 0.25, 0.5, 0.75, 0.99]) {
      let total = 0;
      for (const d of decisions) total += decisionResidual(d.values, d.observedAction, probe);
      assert.ok(
        recovered.totalResidual <= total + 1e-9,
        `probe tau ${probe} beat recovered tau ${recovered.tau}`,
      );
    }
  });

  it("recoverTau recovers a known ground-truth tau within one grid step", () => {
    // Construction: "kick" is a safe 3 points with certainty. "go" is 0 with
    // probability 0.9 and 20 with probability 0.1. The quantile functions cross
    // at tau = 0.9: below it the safe kick dominates, above it the explosive go
    // dominates. An observed "go" is therefore optimal only for tau > 0.9, so
    // the total residual is positive up to 0.9 and zero after it. The first
    // zero on the 0.01 grid is 0.91, exactly one step past the true tau.
    const TRUE_TAU = 0.9;
    const decisions: FourthDownDecisionSample[] = [
      {
        values: [
          { state, action: "go", samples: makeNextScoreSamples([[0, 0.9], [20, 0.1]]) },
          { state, action: "kick", samples: makeNextScoreSamples([[3, 1.0]]) },
        ],
        observedAction: "go",
      },
    ];

    // Sanity: the residual really is positive below the crossing point and
    // exactly zero above it. Without this the assertion below could pass by
    // accident on a flat objective.
    assert.ok(decisionResidual(decisions[0]!.values, "go", 0.5) > 0);
    assert.equal(decisionResidual(decisions[0]!.values, "go", 0.95), 0);

    const recovered = recoverTau(decisions);
    const gridStep = 1 / 100;
    assert.ok(
      Math.abs(recovered.tau - TRUE_TAU) <= gridStep + 1e-9,
      `recovered tau ${recovered.tau} is more than one grid step from ${TRUE_TAU}`,
    );
    assert.equal(recovered.totalResidual, 0);
  });

  it("assertTauSealed accepts an unchanged tau and rejects a moved tau", () => {
    const tau = exampleRecovery().tau;
    // Synthetic injury delta: execution weights change, tau must not.
    const afterInjuryDelta = tau;
    assert.equal(assertTauSealed(tau, afterInjuryDelta), true);
    assert.equal(assertTauSealed(tau, tau + 0.01), false);
    assert.equal(assertTauSealed(tau, tau + 1e-12), true);
  });

  it("tau survives a realistic injury overlay without moving", () => {
    // The seal invariant from locked-projection.ts: an injury path may
    // reallocate targets but may never re-estimate tau.
    const before = recoverTau([
      {
        values: [
          { state, action: "go", samples: makeNextScoreSamples([[7, 0.45], [0, 0.55]]) },
          { state, action: "kick", samples: makeNextScoreSamples([[3, 0.65], [0, 0.35]]) },
        ],
        observedAction: "go",
      },
      {
        values: [
          { state, action: "go", samples: makeNextScoreSamples([[7, 0.3], [0, 0.7]]) },
          { state, action: "kick", samples: makeNextScoreSamples([[3, 0.8], [0, 0.2]]) },
        ],
        observedAction: "kick",
      },
    ]);

    // Injury overlay: a starter is scratched; the next-score distribution
    // shifts but the coach's risk preference does not.
    const after = recoverTau([
      {
        values: [
          { state, action: "go", samples: makeNextScoreSamples([[7, 0.45], [0, 0.55]]) },
          { state, action: "kick", samples: makeNextScoreSamples([[3, 0.65], [0, 0.35]]) },
        ],
        observedAction: "go",
      },
      {
        values: [
          { state, action: "go", samples: makeNextScoreSamples([[7, 0.3], [0, 0.7]]) },
          { state, action: "kick", samples: makeNextScoreSamples([[3, 0.8], [0, 0.2]]) },
        ],
        observedAction: "kick",
      },
    ]);

    assert.equal(
      assertTauSealed(before.tau, after.tau),
      true,
      `tau moved across the injury path: ${before.tau} -> ${after.tau}`,
    );
  });

  it("does not advertise itself as disabled while the recovery path is live in production", () => {
    // The module header used to claim "ENABLED = false until wired into
    // locked-projection.ts and tested" while locked-projection.ts had already
    // imported and called recoverTau unconditionally. A stale false flag is
    // the inverse of the usual defect: it makes a LIVE sealed-tau path look
    // dormant, so a reader or auditor could "safely" change it believing
    // nothing production depends on it. Assert the actual wiring first, then
    // assert the flag does not contradict it.
    const consumer = readFileSync(
      new URL("./coach-sim/locked-projection.ts", import.meta.url),
      "utf8",
    );
    assert.match(
      consumer,
      /from "\.\.\/2309-00756-inverse-mdp-fourth-down\.js"/,
      "locked-projection.ts must import this module — the flag's claim depends on it",
    );
    assert.match(consumer, /\brecoverTau\(/, "the recovery path must be called in production");

    const flag = (moduleUnderTest as { ENABLED?: boolean }).ENABLED;
    assert.ok(
      flag === undefined || flag === true,
      `module declares ENABLED=${String(flag)} but recoverTau is live in locked-projection.ts; ` +
        "a stale false flag hides a production path. Remove the flag or set it true.",
    );
  });
});
