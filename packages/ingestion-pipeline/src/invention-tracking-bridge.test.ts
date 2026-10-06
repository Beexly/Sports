import { describe, expect, it } from "vitest";
import {
  evalBanditExperiment,
  evalCaseGate,
  evalCaseRetrieval,
  evalCateReplication,
  evalCopulaIndependence,
  evalDeltaSep,
  evalDriveAttribution,
  evalDriveExpectedValue,
  evalEbShrinkage,
  evalEpvBootstrap,
  evalImprovementGate,
  evalMetricQuality,
  evalMetricReliability,
  evalPaceNormalization,
  evalRecombineGroups,
  evalSeparabilityProbe,
  evalSelaSearch,
  evalUcBalance,
  type BanditOutcomeContext,
} from "./invention-tracking-bridge.js";
import type { DiscoveryCase } from "@sports/prediction-engine/src/invention/case-bank.js";
import type { HypothesisNode } from "@sports/prediction-engine/src/invention/2410-17238v1-sela-mcts.js";

const PM_MOD = 2 ** 31 - 1;

/**
 * Park-Miller minimal standard generator, values in [0, 1). Never Math.random:
 * every number these tests assert has to be reproducible from its seed.
 */
function lcg(seed: number): () => number {
  let s = seed % PM_MOD;
  if (s <= 0) s += PM_MOD - 1;
  return () => {
    s = (s * 16807) % PM_MOD;
    return s / PM_MOD;
  };
}

/**
 * Stateless deterministic draw in [0, 1) for a (visitor, arm) pair. A Weyl
 * rotation, so the sequence is exactly uniform over its period and no arm is
 * structurally favoured; deterministic so the oracle needs no mutable stream.
 */
const WEYL = 0.618_033;
const WEYL_OFFSET = 0.381_966;
function unitDraw(i: number, salt: number): number {
  return ((i + 1) * WEYL + (salt + 1) * WEYL_OFFSET) % 1;
}

// ─── AI Feynman separability ─────────────────────────────────────────────────

describe("invention-tracking separability probe", () => {
  // f reads only group A (indices 0,1) => both cross-partials vanish exactly.
  const additiveSamples = [
    { x: [1, 2, 0, 0], y: 7 },
    { x: [2, 1, 0, 0], y: 8 },
    { x: [0, 3, 0, 0], y: 6 },
    { x: [1, 1, 0, 0], y: 5 },
  ];
  const groupA = { name: "offense", indices: [0, 1] };
  const groupB = { name: "pace", indices: [2, 3] };

  it("detects a target that ignores group B exactly", () => {
    const r = evalSeparabilityProbe({
      samples: additiveSamples,
      f: (x) => 3 * (x[0] ?? 0) + 2 * (x[1] ?? 0),
      groupA,
      groupB,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.separability.deltaSepAdditive).toBe(0);
      expect(r.data.separability.additiveSeparable).toBe(true);
      expect(r.data.sampleCount).toBe(4);
      expect(r.data.featureWidth).toBe(4);
    }
  });

  it("a bilinear f(x0,x2) is multiplicatively but not additively separable", () => {
    const bilinear = [
      { x: [1, 0, 1, 0], y: 1 },
      { x: [1, 0, 2, 0], y: 2 },
      { x: [2, 0, 1, 0], y: 2 },
      { x: [2, 0, 2, 0], y: 4 },
    ];
    const r = evalSeparabilityProbe({
      samples: bilinear,
      f: (x) => (x[0] ?? 0) * (x[2] ?? 0),
      groupA: { name: "offense", indices: [0] },
      groupB: { name: "pace", indices: [2] },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Mixed second difference is 1 per sample and rms(y) = 2.5, so Delta_sep = 0.4.
      expect(r.data.separability.deltaSepAdditive).toBeCloseTo(0.4, 8);
      expect(r.data.separability.additiveSeparable).toBe(false);
      // log(x0 * x2) = log x0 + log x2, so the multiplicative test fires at ~0.
      expect(r.data.separability.deltaSepMultiplicative).toBeCloseTo(0, 8);
      expect(r.data.separability.multiplicativeSeparable).toBe(true);
    }
  });

  it("a coupled product term defeats both probes", () => {
    // f = 0.02 * (a*c + b*d) with a real cross term: the additive
    // cross-partial is non-zero and log f is not separable across the groups.
    const coupled = [
      { x: [1, 1, 1, 2], y: 0.06 },
      { x: [2, 1, 2, 1], y: 0.1 },
      { x: [1, 2, 1, 3], y: 0.14 },
      { x: [2, 2, 3, 1], y: 0.16 },
    ];
    const r = evalSeparabilityProbe({
      samples: coupled,
      f: (x) => 0.02 * ((x[0] ?? 0) * (x[2] ?? 0) + (x[1] ?? 0) * (x[3] ?? 0)),
      groupA,
      groupB,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.separability.additiveSeparable).toBe(false);
      expect(r.data.separability.multiplicativeSeparable).toBe(false);
      expect(r.data.separability.deltaSepAdditive).toBeGreaterThan(0.1);
      expect(r.data.separability.deltaSepMultiplicative).toBeGreaterThan(0.1);
    }
  });

  it("fail-closes on a missing target function, overlapping groups, or ragged samples", () => {
    expect(
      evalSeparabilityProbe({
        samples: additiveSamples,
        f: undefined as unknown as (x: readonly number[]) => number,
        groupA,
        groupB,
      }).ok,
    ).toBe(false);
    expect(
      evalSeparabilityProbe({
        samples: additiveSamples,
        f: (x) => x[0] ?? 0,
        groupA,
        groupB: { name: "pace", indices: [1, 2] },
      }).ok,
    ).toBe(false);
    expect(
      evalSeparabilityProbe({
        samples: [{ x: [1, 2], y: 1 }, { x: [1, 2, 3], y: 2 }],
        f: (x) => x[0] ?? 0,
        groupA,
        groupB,
      }).ok,
    ).toBe(false);
    expect(
      evalSeparabilityProbe({
        samples: [{ x: [1, 2, 0, 0], y: Number.NaN }],
        f: (x) => x[0] ?? 0,
        groupA,
        groupB,
      }).ok,
    ).toBe(false);
  });
  it("reports the raw Delta_sep statistics at the requested step size", () => {
    const bilinear = [
      { x: [1, 0, 1, 0], y: 1 },
      { x: [1, 0, 2, 0], y: 2 },
      { x: [2, 0, 1, 0], y: 2 },
      { x: [2, 0, 2, 0], y: 4 },
    ];
    const gA = { name: "offense", indices: [0] };
    const gB = { name: "pace", indices: [2] };
    // A bilinear form has an exact second cross-derivative of 1, so the
    // additive statistic is step-size independent: 1 / rms(y) = 1 / 2.5.
    for (const eps of [1e-3, 1e-2, 5e-2]) {
      const r = evalDeltaSep({
        samples: bilinear,
        f: (x) => (x[0] ?? 0) * (x[2] ?? 0),
        groupA: gA,
        groupB: gB,
        epsilon: eps,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.data.epsilon).toBe(eps);
        expect(r.data.deltaSepAdditive).toBeCloseTo(0.4, 6);
        // log(x0 * x2) is separable, so the multiplicative term is ~0.
        expect(r.data.deltaSepMultiplicative).toBeLessThan(1e-6);
        expect(r.data.groupA).toBe("offense");
        expect(r.data.groupB).toBe("pace");
      }
    }
  });

  it("fail-closes Delta_sep on a zero or absurd step size and on bad groups", () => {
    const samples = [
      { x: [1, 0, 1, 0], y: 1 },
      { x: [2, 0, 2, 0], y: 4 },
    ];
    const gA = { name: "offense", indices: [0] };
    const gB = { name: "pace", indices: [2] };
    const f = (x: readonly number[]) => (x[0] ?? 0) * (x[2] ?? 0);
    expect(evalDeltaSep({ samples, f, groupA: gA, groupB: gB, epsilon: 0 }).ok).toBe(false);
    expect(evalDeltaSep({ samples, f, groupA: gA, groupB: gB, epsilon: 5 }).ok).toBe(false);
    expect(evalDeltaSep({ samples, f, groupA: gA, groupB: gA }).ok).toBe(false);
    expect(evalDeltaSep({ samples: [], f, groupA: gA, groupB: gB }).ok).toBe(false);
  });
});

describe("invention-tracking recombination and improvement gate", () => {
  const groupA = { name: "offense", indices: [0, 1] };
  const groupB = { name: "pace", indices: [2, 3] };
  const equations = [
    { group: "offense", expression: "3*a+2*b", nodes: 3 },
    { group: "pace", expression: "0", nodes: 1 },
  ];

  it("recombines additively when separability fired", () => {
    const r = evalRecombineGroups({
      samples: [
        { x: [1, 2, 0, 0], y: 7 },
        { x: [2, 1, 0, 0], y: 8 },
        { x: [0, 3, 0, 0], y: 6 },
      ],
      f: (x) => 3 * (x[0] ?? 0) + 2 * (x[1] ?? 0),
      groupA,
      groupB,
      groupEquations: equations,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.equation.expression).toBe("(3*a+2*b + 0)");
      // 3 + 1 nodes, plus one joiner.
      expect(r.data.equation.totalNodes).toBe(5);
      expect(r.data.equation.separabilityFired).toBe(true);
    }
  });

  it("keeps the groups coupled when neither separability fires", () => {
    const coupled = [
      { x: [1, 1, 1, 2], y: 0.06 },
      { x: [2, 1, 2, 1], y: 0.1 },
      { x: [1, 2, 1, 3], y: 0.14 },
      { x: [2, 2, 3, 1], y: 0.16 },
    ];
    const r = evalRecombineGroups({
      samples: coupled,
      f: (x) => 0.02 * ((x[0] ?? 0) * (x[2] ?? 0) + (x[1] ?? 0) * (x[3] ?? 0)),
      groupA,
      groupB,
      groupEquations: equations,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.separability.additiveSeparable).toBe(false);
      expect(r.data.separability.multiplicativeSeparable).toBe(false);
      expect(r.data.equation.expression).toBe("coupled(3*a+2*b, 0)");
      expect(r.data.equation.totalNodes).toBe(4);
      expect(r.data.equation.separabilityFired).toBe(false);
    }
  });

  it("rejects an equation for a group that was never probed", () => {
    const r = evalRecombineGroups({
      samples: [
        { x: [1, 2, 0, 0], y: 7 },
        { x: [2, 1, 0, 0], y: 8 },
      ],
      f: (x) => 3 * (x[0] ?? 0) + 2 * (x[1] ?? 0),
      groupA,
      groupB,
      groupEquations: [{ group: "weather", expression: "w", nodes: 1 }],
    });
    expect(r.ok).toBe(false);
  });

  it("improvement gate fires at 10% lift / 20% node growth and fails above it", () => {
    const pass = evalImprovementGate({
      flatRmse: 1,
      recombinedRmse: 0.9,
      flatNodes: 10,
      recombinedNodes: 12,
    });
    expect(pass.ok).toBe(true);
    if (pass.ok) {
      expect(pass.data.passes).toBe(true);
      expect(pass.data.rmseImprovement).toBeCloseTo(0.1, 12);
      expect(pass.data.nodeGrowth).toBeCloseTo(0.2, 12);
    }
    const tooManyNodes = evalImprovementGate({
      flatRmse: 1,
      recombinedRmse: 0.9,
      flatNodes: 10,
      recombinedNodes: 13,
    });
    expect(tooManyNodes.ok && tooManyNodes.data.passes).toBe(false);
    // Under 5% lift, regardless of nodes.
    const thin = evalImprovementGate({
      flatRmse: 1,
      recombinedRmse: 0.96,
      flatNodes: 10,
      recombinedNodes: 10,
    });
    expect(thin.ok && thin.data.passes).toBe(false);
  });

  it("fail-closes the improvement gate on degenerate inputs", () => {
    expect(
      evalImprovementGate({ flatRmse: 0, recombinedRmse: 0, flatNodes: 1, recombinedNodes: 1 }).ok,
    ).toBe(false);
    expect(
      evalImprovementGate({ flatRmse: 1, recombinedRmse: 0.9, flatNodes: 0, recombinedNodes: 1 })
        .ok,
    ).toBe(false);
  });
});

describe("invention-tracking pace normalization", () => {
  it("rescales by pace and leaves league-mean rows untouched", () => {
    const r = evalPaceNormalization({
      samples: [
        { x: [1, 50], y: 20 },
        { x: [2, 100], y: 30 },
        { x: [3, 200], y: 50 },
      ],
      paceIndexInX: 1,
      leagueMeanPace: 100,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rows).toHaveLength(3);
      expect(r.data.rows[0]?.y).toBe(40);
      expect(r.data.rows[1]?.y).toBe(30);
      expect(r.data.rows[2]?.y).toBe(25);
      expect(r.data.rowsAtLeagueMeanPace).toBe(1);
      expect(r.data.rows[0]?.x).toEqual([1, 50]);
    }
  });

  it("fail-closes on an out-of-range pace index or a non-positive mean", () => {
    const samples = [{ x: [1, 50], y: 20 }];
    expect(evalPaceNormalization({ samples, paceIndexInX: 5, leagueMeanPace: 100 }).ok).toBe(false);
    expect(evalPaceNormalization({ samples, paceIndexInX: 1, leagueMeanPace: 0 }).ok).toBe(false);
    expect(evalPaceNormalization({ samples: [], paceIndexInX: 1, leagueMeanPace: 100 }).ok).toBe(
      false,
    );
  });
});

// ─── Dual-margin bandit ──────────────────────────────────────────────────────

describe("invention-tracking dual-margin bandit", () => {
  const arms = ["none", "soft", "standard", "hard"];
  const effect: Record<string, { conv: number; rev: number }> = {
    none: { conv: 0.45, rev: 0.05 },
    soft: { conv: 0.3, rev: 0.2 },
    standard: { conv: 0.5, rev: 0.3 },
    hard: { conv: 0.1, rev: 0.6 },
  };
  const outcome = (ctx: BanditOutcomeContext) => {
    const e = effect[ctx.armName] ?? { conv: 0, rev: 0 };
    const converted = unitDraw(ctx.visitorIndex, ctx.arm) < e.conv;
    return { converted, revenue: converted ? e.rev : 0 };
  };
  const gate = {
    minRevenueLift: 0.05,
    maxConversionDeclinePp: 1,
    minWeeks: 4,
    registeredAt: "2026-01-01T00:00:00.000Z",
  };

  it("runs a reproducible experiment and clears the pre-registered gate", () => {
    const input = {
      arms,
      controlArm: 0,
      bestArm: 2,
      pulls: 3000,
      weeks: 4,
      segments: ["new", "returning"],
      outcome,
      gate,
      segmentWeights: { soft: { returning: 0.2 }, hard: { returning: 0.1 } },
    } as const;
    const a = evalBanditExperiment({ ...input, rand: lcg(7) });
    const b = evalBanditExperiment({ ...input, rand: lcg(7) });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.arms.map((s) => s.pulls)).toEqual(b.data.arms.map((s) => s.pulls));
      expect(a.data.result.totalPulls).toBe(3000);
      expect(a.data.result.weeks).toBe(4);
      // The control books revenue, so the lift is a real ratio and not a 0 stand-in.
      const control = a.data.arms[0];
      expect(control?.pulls).toBeGreaterThan(0);
      expect(control?.revenuePerVisitor).toBeGreaterThan(0);
      expect(a.data.result.revenueLift).toBeGreaterThan(0.05);
      expect(-a.data.result.conversionChangePp).toBeLessThan(1);
      expect(a.data.gate).toBe(true);
      expect(a.data.arms.reduce((t, s) => t + s.pulls, 0)).toBe(3000);
      // Thompson sampling concentrates traffic on the best-converting arm.
      const standard = a.data.arms[2];
      const none = a.data.arms[0];
      expect(standard).toBeDefined();
      expect(none).toBeDefined();
      expect(standard?.pulls ?? 0).toBeGreaterThan(none?.pulls ?? 0);
      expect(a.data.spec.primaryMetric).toBe("revenue_per_visitor");
      expect(a.data.spec.guardrailMetric).toBe("conversion_rate");
      expect(a.data.spec.registeredAt).toBe("2026-01-01T00:00:00.000Z");
    }
  });

  it("keeps the control baseline measurable across independent seeds", () => {
    const mk = (seed: number) =>
      evalBanditExperiment({
        arms,
        controlArm: 0,
        bestArm: 2,
        pulls: 1500,
        weeks: 4,
        segments: ["new"],
        outcome,
        rand: lcg(seed),
        gate,
      });
    const s1 = mk(11);
    const s2 = mk(99);
    expect(s1.ok).toBe(true);
    expect(s2.ok).toBe(true);
    if (s1.ok && s2.ok) {
      expect(s1.data.result.totalPulls).toBe(1500);
      expect(s2.data.result.totalPulls).toBe(1500);
      // Different streams, but neither may starve the control baseline.
      expect(s1.data.arms[0]?.pulls ?? 0).toBeGreaterThan(0);
      expect(s2.data.arms[0]?.pulls ?? 0).toBeGreaterThan(0);
    }
  });

  it("fail-closes on a non-zero control arm, a bad RNG, or a missing pre-registration", () => {
    const base = {
      arms,
      controlArm: 0,
      bestArm: 2,
      pulls: 200,
      weeks: 4,
      segments: ["new"],
      outcome,
      gate,
    } as const;
    expect(evalBanditExperiment({ ...base, controlArm: 1, rand: lcg(1) }).ok).toBe(false);
    expect(evalBanditExperiment({ ...base, bestArm: 9, rand: lcg(1) }).ok).toBe(false);
    expect(evalBanditExperiment({ ...base, rand: () => 1.5 }).ok).toBe(false);
    expect(
      evalBanditExperiment({
        ...base,
        rand: lcg(1),
        gate: { minRevenueLift: 0.05, maxConversionDeclinePp: 1, minWeeks: 4, registeredAt: "" },
      }).ok,
    ).toBe(false);
    expect(evalBanditExperiment({ ...base, arms: ["a", "b", "c", "d", "e"], rand: lcg(1) }).ok).toBe(
      false,
    );
    // An outcome oracle returning a non-numeric revenue must not be trusted.
    expect(
      evalBanditExperiment({
        ...base,
        rand: lcg(1),
        outcome: () => ({ converted: true, revenue: Number.NaN }),
      }).ok,
    ).toBe(false);
    // An arm with no logged weight for a segment is a caller error, not a 1.0.
    expect(
      evalBanditExperiment({
        ...base,
        rand: lcg(1),
        segmentWeights: { soft: { returning: 0 } },
      }).ok,
    ).toBe(false);
  });
});

describe("invention-tracking CATE replication", () => {
  it("accepts an in-tolerance same-sign estimate and rejects a sign flip", () => {
    const good = evalCateReplication({ offlineUplift: 0.1, liveUplift: 0.12 });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.data.replicates).toBe(true);
      expect(good.data.signAgrees).toBe(true);
      expect(good.data.relativeError).toBeCloseTo(0.2, 10);
    }
    const flipped = evalCateReplication({ offlineUplift: 0.1, liveUplift: -0.1 });
    expect(flipped.ok).toBe(true);
    if (flipped.ok) {
      expect(flipped.data.replicates).toBe(false);
      expect(flipped.data.signAgrees).toBe(false);
      expect(flipped.data.relativeError).toBeCloseTo(2, 10);
    }
    const outOfBand = evalCateReplication({ offlineUplift: 0.1, liveUplift: 0.4, tolerance: 0.5 });
    expect(outOfBand.ok && outOfBand.data.replicates).toBe(false);
  });

  it("fail-closes on non-finite uplifts or a negative tolerance", () => {
    expect(evalCateReplication({ offlineUplift: Number.NaN, liveUplift: 0.1 }).ok).toBe(false);
    expect(evalCateReplication({ offlineUplift: 0.1, liveUplift: 0.1, tolerance: -1 }).ok).toBe(
      false,
    );
  });
});

// ─── SELA MCTS ───────────────────────────────────────────────────────────────

describe("invention-tracking SELA MCTS", () => {
  const families = ["matchup", "weather", "rest"];
  const hyp = (id: string, family: string, trueQuality: number): HypothesisNode => ({
    id,
    family,
    hypothesis: `${family} probe ${id}`,
    trueQuality,
  });

  it("concentrates budget on the thin winner lane and clears the SELA gate", () => {
    const candidates = {
      matchup: [hyp("m1", "matchup", 0.1)],
      weather: [
        hyp("w1", "weather", 0.9),
        hyp("w2", "weather", 0.88),
        hyp("w3", "weather", 0.86),
      ],
      rest: [hyp("r1", "rest", 0.1)],
    };
    const r = evalSelaSearch({
      families,
      candidates,
      config: { exploration: Math.SQRT2, wideningC: 1.5, wideningAlpha: 0.5, budget: 6 },
      gateThreshold: 0.5,
      makeRand: () => lcg(3),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rolloutsSpent).toBe(6);
      // Round-robin drains one candidate per family per round: 2 of 3 winners.
      expect(r.data.roundRobinGatePassers).toEqual(["w1", "w2"]);
      // MCTS's progressive widening admits the third weather leaf inside the
      // same budget, which is the whole point of the gate.
      expect(r.data.mctsGatePassers).toEqual(["w1", "w2", "w3"]);
      expect(r.data.spearmanRho).toBeGreaterThan(0.5);
      expect(r.data.mctsWastedRolloutRate).toBeGreaterThan(0);
      expect(r.data.roundRobinWastedSlotRate).toBeGreaterThan(r.data.mctsWastedRolloutRate);
      expect(r.data.valueEstimates).toHaveLength(r.data.trueQualities.length);
      expect(r.data.gate).toBe(true);
    }
  });

  it("reports the honest fail when discovery is not 1.5x round-robin", () => {
    const candidates = {
      matchup: [hyp("m1", "matchup", 0.1)],
      weather: [hyp("w1", "weather", 0.9)],
      rest: [hyp("r1", "rest", 0.1)],
    };
    const r = evalSelaSearch({
      families,
      candidates,
      config: { exploration: Math.SQRT2, wideningC: 1.5, wideningAlpha: 0.5, budget: 40 },
      gateThreshold: 0.5,
      makeRand: () => lcg(5),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rolloutsSpent).toBe(40);
      expect(r.data.mctsGatePassers).toEqual(["w1"]);
      expect(r.data.roundRobinGatePassers).toEqual(["w1"]);
      // 1 passer vs 1 passer is a ratio of 1, below the pre-registered 1.5.
      expect(r.data.gate).toBe(false);
    }
  });

  it("fail-closes on an empty family, a mis-filed hypothesis, or a bad RNG factory", () => {
    const good = {
      matchup: [hyp("m1", "matchup", 0.1)],
      weather: [hyp("w1", "weather", 0.9)],
    };
    const cfg = { exploration: 1.4, wideningC: 1.5, wideningAlpha: 0.5, budget: 10 };
    expect(
      evalSelaSearch({
        families: [],
        candidates: good,
        config: cfg,
        gateThreshold: 0.5,
        makeRand: () => lcg(1),
      }).ok,
    ).toBe(false);
    expect(
      evalSelaSearch({
        families: ["matchup", "weather", "rest"],
        candidates: good,
        config: cfg,
        gateThreshold: 0.5,
        makeRand: () => lcg(1),
      }).ok,
    ).toBe(false);
    expect(
      evalSelaSearch({
        families: ["matchup", "weather"],
        candidates: { matchup: [hyp("m1", "rest", 0.1)], weather: good.weather },
        config: cfg,
        gateThreshold: 0.5,
        makeRand: () => lcg(1),
      }).ok,
    ).toBe(false);
    expect(
      evalSelaSearch({
        families: ["matchup", "weather"],
        candidates: good,
        config: { ...cfg, budget: 0 },
        gateThreshold: 0.5,
        makeRand: () => lcg(1),
      }).ok,
    ).toBe(false);
    expect(
      evalSelaSearch({
        families: ["matchup", "weather"],
        candidates: good,
        config: cfg,
        gateThreshold: 0.5,
        makeRand: () => () => 2,
      }).ok,
    ).toBe(false);
  });
});

describe("invention-tracking UCB balance", () => {
  it("computes mean, UCB1 and the progressive-widening limit", () => {
    const r = evalUcBalance({
      nodeId: "family:weather",
      visits: 4,
      totalReward: 2,
      parentVisits: 16,
      exploration: Math.SQRT2,
      wideningC: 1.5,
      wideningAlpha: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.meanValue).toBeCloseTo(0.5, 12);
      // 0.5 + sqrt(2) * sqrt(ln(16) / 4)
      expect(r.data.ucb).toBeCloseTo(1.6774100225154744, 10);
      expect(r.data.wideningLimit).toBe(3);
    }
  });

  it("refuses to publish a bound for an unvisited node", () => {
    const r = evalUcBalance({
      nodeId: "family:rest",
      visits: 0,
      totalReward: 0,
      parentVisits: 3,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("visits");
  });
});

// ─── Case bank ───────────────────────────────────────────────────────────────

const BANK: readonly DiscoveryCase[] = [
  {
    caseId: "c-sharp",
    hypothesisText: "st. brown target share leads receiving",
    featureCode: "tgt_share",
    backtestSpec: "walk-forward",
    feedbackLog: "clean",
    devScore: 0.01,
    stage3Score: null,
    retainedFlag: true,
    embedding: [1, 0],
  },
  {
    caseId: "c-leaky",
    hypothesisText: "adjacent receiver efficiency",
    featureCode: "adj_eff",
    backtestSpec: "walk-forward",
    feedbackLog: "leaked: target column shuffled",
    devScore: 0.02,
    stage3Score: null,
    retainedFlag: true,
    embedding: [0.9, 0.1],
  },
  {
    caseId: "c-failed",
    hypothesisText: "weather drives totals",
    featureCode: "wind",
    backtestSpec: "walk-forward",
    feedbackLog: "failed",
    devScore: -0.001,
    stage3Score: null,
    retainedFlag: false,
    embedding: [0, 1],
  },
];

describe("invention-tracking case bank retrieval", () => {
  it("retrieves by similarity, then ReviseRank demotes the misleading case", () => {
    const r = evalCaseRetrieval({
      bank: BANK,
      queryEmbedding: [1, 0],
      k: 2,
      failureKeywords: ["leaked"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.retrieved).toHaveLength(2);
      expect(r.data.retrieved[0]?.caseId).toBe("c-sharp");
      expect(r.data.retrieved[0]?.similarity).toBeCloseTo(1, 12);
      expect(r.data.retrieved[1]?.caseId).toBe("c-leaky");
      expect(r.data.retrieved[1]?.similarity).toBeLessThan(1);
      // c-leaky has the higher devScore but is penalized by the failure keyword.
      expect(r.data.revisedOrder).toEqual(["c-sharp", "c-leaky"]);
      expect(r.data.bestProductionCaseId).toBe("c-leaky");
    }
  });

  it("reverses the revised order when the demotion actually bites", () => {
    const bank: readonly DiscoveryCase[] = [
      { ...BANK[0]!, devScore: 0.03 },
      { ...BANK[1]!, devScore: 0.02 },
      BANK[2]!,
    ];
    const r = evalCaseRetrieval({
      bank,
      queryEmbedding: [1, 0],
      k: 2,
      failureKeywords: ["leaked"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.revisedOrder).toEqual(["c-sharp", "c-leaky"]);
  });

  it("fail-closes on a mismatched embedding width, an empty bank, or k > size", () => {
    expect(evalCaseRetrieval({ bank: BANK, queryEmbedding: [1, 0, 0], k: 2 }).ok).toBe(false);
    expect(evalCaseRetrieval({ bank: [], queryEmbedding: [1, 0], k: 1 }).ok).toBe(false);
    expect(evalCaseRetrieval({ bank: BANK, queryEmbedding: [1, 0], k: 99 }).ok).toBe(false);
  });
});

describe("invention-tracking case retain gate and counter-cases", () => {
  it("retains a case above the gate and injects the nearest failure", () => {
    const r = evalCaseGate({ bank: BANK, focusCaseId: "c-sharp", gate: 0.002 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.devScore).toBe(0.01);
      expect(r.data.retained).toBe(true);
      expect(r.data.counterCaseId).toBe("c-failed");
      expect(r.data.counterCaseDevScore).toBe(-0.001);
    }
  });

  it("refuses to retain a sub-gate case and reports no counter-case honestly", () => {
    const r = evalCaseGate({ bank: BANK, focusCaseId: "c-failed", gate: 0.002 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.retained).toBe(false);
      // Every other case is a retained success, so there is no failure to inject.
      expect(r.data.counterCaseId).toBeNull();
      expect(r.data.counterCaseDevScore).toBeNull();
    }
  });

  it("fail-closes on an unknown case id or a non-finite score", () => {
    expect(evalCaseGate({ bank: BANK, focusCaseId: "nope" }).ok).toBe(false);
    const poisoned: DiscoveryCase = { ...BANK[0]!, devScore: Number.NaN };
    expect(evalCaseGate({ bank: [poisoned, BANK[2]!], focusCaseId: "c-sharp" }).ok).toBe(false);
  });
});

// ─── Meta-analytics ──────────────────────────────────────────────────────────

describe("invention-tracking metric quality (D and S)", () => {
  it("is exactly 1 when teams have no within-team sampling variance", () => {
    const r = evalMetricQuality({
      teamGameValues: [
        [10, 10, 10, 10],
        [0, 0, 0, 0],
        [5, 5, 5, 5],
      ],
      seasonValues: [10, 12, 11],
      rand: lcg(1),
      resamples: 50,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.D).toBe(1);
      expect(r.data.chanceDominated).toBe(false);
      // CV = 1/11, so S = 1 / (1 + 1/11) = 11/12.
      expect(r.data.S).toBeCloseTo(11 / 12, 12);
    }
  });

  it("drops below 1 with within-team noise and is reproducible from a seed", () => {
    const teams = [
      [10, 12, 9, 11, 10, 8],
      [0, 2, -1, 1, 0, 0],
      [5, 7, 3, 5, 6, 4],
    ];
    const mk = () =>
      evalMetricQuality({
        teamGameValues: teams,
        seasonValues: [10, 12, 11],
        rand: lcg(99),
        resamples: 200,
      });
    const a = mk();
    const b = mk();
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.D).toBe(b.data.D);
      expect(a.data.D).toBeGreaterThanOrEqual(0);
      expect(a.data.D).toBeLessThan(1);
    }
  });

  it("refuses to guess D without a caller-supplied RNG or two teams", () => {
    const teams = [[1, 2, 3, 4], [5, 6, 7, 8]];
    expect(
      evalMetricQuality({
        teamGameValues: teams,
        seasonValues: [1, 2],
        rand: undefined as unknown as () => number,
      }).ok,
    ).toBe(false);
    expect(
      evalMetricQuality({
        teamGameValues: [[1, 2, 3]],
        seasonValues: [1, 2],
        rand: lcg(1),
      }).ok,
    ).toBe(false);
    expect(
      evalMetricQuality({
        teamGameValues: teams,
        seasonValues: [1],
        rand: lcg(1),
      }).ok,
    ).toBe(false);
  });
});

describe("invention-tracking copula independence", () => {
  it("scores a perfectly collinear pair as fully redundant", () => {
    const r = evalCopulaIndependence({
      names: ["pace", "plays"],
      columns: [
        [1, 2, 3, 4, 5, 6],
        [2, 4, 6, 8, 10, 12],
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.independence).toEqual([0, 0]);
      expect(r.data.redundant).toEqual(["pace", "plays"]);
    }
  });

  it("leaves an uncorrelated third metric partly independent", () => {
    const r = evalCopulaIndependence({
      names: ["pace", "plays", "weather"],
      columns: [
        [1, 2, 3, 4, 5, 6],
        [2, 4, 6, 8, 10, 12],
        [3, 1, 4, 1, 5, 9],
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.independence).toHaveLength(3);
      expect(r.data.independence[0]).toBe(0);
      expect(r.data.independence[1]).toBe(0);
      const w = r.data.independence[2] ?? -1;
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThan(1);
      expect(r.data.redundant).toEqual(["pace", "plays"]);
    }
  });

  it("fail-closes on one metric, ragged columns, or a duplicate name", () => {
    expect(evalCopulaIndependence({ names: ["a"], columns: [[1, 2, 3]] }).ok).toBe(false);
    expect(evalCopulaIndependence({ names: ["a", "b"], columns: [[1, 2, 3], [1, 2]] }).ok).toBe(
      false,
    );
    expect(evalCopulaIndependence({ names: ["a", "a"], columns: [[1, 2], [3, 4]] }).ok).toBe(false);
  });
});

describe("invention-tracking reliability report", () => {
  it("flags chance-dominated and redundant metrics and ranks by the weakest axis", () => {
    const r = evalMetricReliability({
      metrics: [
        { name: "pace", D: 0.9, S: 0.8, I: 0.7 },
        { name: "noise", D: 0.2, S: 0.9, I: 0.8 },
        { name: "dup", D: 0.8, S: 0.7, I: 0.05 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.report.map((m) => m.name)).toEqual(["dup", "noise", "pace"]);
      // `flagged` follows the report's own ranking, not the input order.
      expect(r.data.flagged).toEqual(["dup", "noise"]);
      const noise = r.data.report.find((m) => m.name === "noise");
      const dup = r.data.report.find((m) => m.name === "dup");
      expect(noise?.flagReason).toBe("chance-dominated (D<0.5)");
      expect(dup?.flagReason).toBe("redundant (I<0.2)");
    }
  });

  it("fail-closes on out-of-range scores and empty input", () => {
    expect(evalMetricReliability({ metrics: [{ name: "a", D: 1.2, S: 0.5, I: 0.5 }] }).ok).toBe(
      false,
    );
    expect(evalMetricReliability({ metrics: [] }).ok).toBe(false);
  });
});

describe("invention-tracking empirical-Bayes shrinkage", () => {
  // No value equals the grand mean, so the implied weight is identifiable.
  const values = [0.5, 0.62, 0.55];
  const grandMean = (0.5 + 0.62 + 0.55) / 3;

  it("collapses to the grand mean when sampling variance dominates", () => {
    const r = evalEbShrinkage({
      values,
      samplingVars: [1e6, 1e6, 1e6],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.grandMean).toBeCloseTo(grandMean, 12);
      for (let i = 0; i < values.length; i++) {
        expect(r.data.shrunk[i]).toBeCloseTo(grandMean, 12);
        expect(r.data.weights[i] ?? 1).toBeCloseTo(0, 12);
      }
    }
  });

  it("keeps the raw estimate when sampling variance is negligible", () => {
    const r = evalEbShrinkage({
      values,
      samplingVars: [1e-12, 1e-12, 1e-12],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (let i = 0; i < values.length; i++) {
        expect(r.data.shrunk[i]).toBeCloseTo(values[i] ?? 0, 6);
        expect(r.data.weights[i]).toBeCloseTo(1, 6);
      }
    }
  });

  it("fail-closes on misaligned or non-positive sampling variances", () => {
    expect(evalEbShrinkage({ values: [0.5], samplingVars: [0.1, 0.2] }).ok).toBe(false);
    expect(evalEbShrinkage({ values: [0.5], samplingVars: [0] }).ok).toBe(false);
    expect(evalEbShrinkage({ values: [], samplingVars: [] }).ok).toBe(false);
  });
});

// ─── Expected drive value ────────────────────────────────────────────────────

describe("invention-tracking expected drive value", () => {
  it("aggregates discounted future scoring plays exactly", () => {
    const r = evalDriveExpectedValue({
      futureScores: [{ deltaT: 10, xP: 1 }],
      gamma: 0.5,
      oppNextDriveXP: 0.4,
      secondsUntilOppDrive: 10,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.edv).toBeCloseTo(Math.pow(0.5, 10), 15);
      expect(r.data.riskAdjusted).toBeCloseTo(Math.pow(0.5, 10) * 0.6, 15);
      expect(r.data.gamma).toBe(0.5);
      expect(r.data.futureScoreCount).toBe(1);
    }
  });

  it("is 1 for an immediate certain score and 0 for no scoring play", () => {
    const certain = evalDriveExpectedValue({
      futureScores: [{ deltaT: 0, xP: 1 }],
      gamma: 0.97,
    });
    expect(certain.ok).toBe(true);
    if (certain.ok) {
      expect(certain.data.edv).toBe(1);
      // Not supplied => not computed, which is null and never a fake zero.
      expect(certain.data.riskAdjusted).toBeNull();
    }
    const none = evalDriveExpectedValue({ futureScores: [], gamma: 0.97 });
    expect(none.ok).toBe(true);
    if (none.ok) expect(none.data.edv).toBe(0);
  });

  it("fail-closed on a bad discount or an unpaired risk input", () => {
    expect(evalDriveExpectedValue({ futureScores: [], gamma: 0 }).ok).toBe(false);
    expect(evalDriveExpectedValue({ futureScores: [], gamma: 1.5 }).ok).toBe(false);
    expect(evalDriveExpectedValue({ futureScores: [], oppNextDriveXP: 0.2 }).ok).toBe(false);
    expect(evalDriveExpectedValue({ futureScores: [{ deltaT: -1, xP: 0.2 }] }).ok).toBe(false);
    expect(evalDriveExpectedValue({ futureScores: [{ deltaT: 1, xP: Number.NaN }] }).ok).toBe(
      false,
    );
  });
});

describe("invention-tracking EDV attribution", () => {
  it("splits 60/40, pays the rusher in full and doubles the turnover debit", () => {
    const r = evalDriveAttribution({
      plays: [
        { deltaEdv: 0.5, actor: "passer" },
        { deltaEdv: 0.2, actor: "rusher" },
        { deltaEdv: 0.1, actor: "receiver", isTurnover: true },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // passer 0.5 -> {0.3, 0.2}; rusher 0.2 -> {0.2}; turnover 0.1 doubled -> {0.12, 0.08}
      expect(r.data.perActor.passer).toBeCloseTo(0.42, 12);
      expect(r.data.perActor.receiver).toBeCloseTo(0.28, 12);
      expect(r.data.perActor.rusher).toBeCloseTo(0.2, 12);
      expect(r.data.creditedTotal).toBeCloseTo(0.9, 12);
      expect(r.data.rawTotal).toBeCloseTo(0.8, 12);
      expect(r.data.turnoverCount).toBe(1);
      expect(r.data.playCount).toBe(3);
    }
  });

  it("fail-closes on an unknown actor or a non-finite Delta-EDV", () => {
    expect(
      evalDriveAttribution({
        plays: [{ deltaEdv: 0.1, actor: "quarterback" as "passer" }],
      }).ok,
    ).toBe(false);
    expect(evalDriveAttribution({ plays: [{ deltaEdv: Number.NaN, actor: "rusher" }] }).ok).toBe(
      false,
    );
    expect(evalDriveAttribution({ plays: [] }).ok).toBe(false);
  });
});

// ─── Bootstrap EPV error scaling ─────────────────────────────────────────────

describe("invention-tracking bootstrap EPV scaling", () => {
  it("is exactly zero standard error with a single cluster", () => {
    const r = evalEpvBootstrap({
      values: [1, 2, 3, 4],
      clusters: [7, 7, 7, 7],
      estimatedEdge: 0.03,
      baseEdge: 0.03,
      z: 1.64,
      nBoot: 200,
      seed: 7,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.se).toBe(0);
      expect(r.data.threshold).toBe(0.03);
      expect(r.data.act).toBe(true);
      expect(r.data.clusterCount).toBe(1);
      expect(r.data.observationCount).toBe(4);
    }
  });

  it("scales the bar with the bootstrap SE and is reproducible from a seed", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const clusters = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
    const mk = (edge: number) =>
      evalEpvBootstrap({ values, clusters, estimatedEdge: edge, nBoot: 500, seed: 42 });
    const a = mk(10);
    const b = mk(10);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.se).toBeGreaterThan(0);
      expect(a.data.se).toBe(b.data.se);
      expect(a.data.threshold).toBeCloseTo(1.64 * a.data.se, 12);
      expect(a.data.act).toBe(true);
      expect(a.data.clusterCount).toBe(2);
      const below = mk(0.001);
      expect(below.ok && below.data.act).toBe(false);
    }
  });

  it("fail-closes on misaligned inputs, a tiny resample count, or a negative z", () => {
    const base = { values: [1, 2], clusters: [1, 2], estimatedEdge: 0.1 } as const;
    expect(evalEpvBootstrap({ ...base, values: [1, 2, 3] }).ok).toBe(false);
    expect(evalEpvBootstrap({ ...base, nBoot: 1 }).ok).toBe(false);
    expect(evalEpvBootstrap({ ...base, z: -1 }).ok).toBe(false);
    expect(evalEpvBootstrap({ ...base, seed: -1 }).ok).toBe(false);
    expect(evalEpvBootstrap({ ...base, values: [] }).ok).toBe(false);
  });
});
