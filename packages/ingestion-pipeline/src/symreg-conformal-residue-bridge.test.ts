import { describe, expect, it } from "vitest";
import {
  evalParetoPrune,
  evalSkeletonJaccard,
  evalPairedPvalue,
  evalVerticalFilter,
  evalNmse,
  evalStagedRefine,
  evalHillClimb,
  evalStlsq,
  evalVerifySideInfo,
  evalDropIntercept,
  evalTaxonomy,
  evalCategoryDiagnostics,
  evalGreedyPartition,
  evalBestSplit,
  evalAssignLeafId,
  evalStandardNormalQuantile,
  evalZCritOneSided,
  evalRbfKernel,
  evalRffKrr,
  evalGateCertificate,
} from "./symreg-conformal-residue-bridge.js";

describe("symreg-conformal-residue pareto / hypothesis", () => {
  it("prunes dominated points to the frontier", () => {
    const r = evalParetoPrune({
      points: [
        { id: "a", error: 1.0, complexity: 5 },
        { id: "b", error: 2.0, complexity: 1 },
        { id: "c", error: 3.0, complexity: 9 },
      ],
      candidateErr: [0.5, 0.6, 0.55],
      baselineErr: [0.5, 0.6, 0.55],
      alpha: 0.05,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ids = r.data.frontier.map((p) => p.id);
      expect(ids).toContain("a");
      expect(ids).toContain("b");
      expect(ids).not.toContain("c");
    }
  });

  it("fail-closes on empty points or mismatched errors", () => {
    expect(evalParetoPrune({ points: [], candidateErr: [1], baselineErr: [1] }).ok).toBe(false);
    expect(
      evalParetoPrune({
        points: [{ id: "a", error: 1, complexity: 1 }],
        candidateErr: [1],
        baselineErr: [1, 2],
      }).ok,
    ).toBe(false);
  });

  it("skeleton jaccard gates at 0.5", () => {
    const r = evalSkeletonJaccard({
      clean: ["a+b", "a*b", "sin(a)"],
      noisy: ["a+b", "a*b", "cos(b)"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.jaccard).toBeGreaterThan(0);
      expect(r.data.passesGate).toBe(r.data.jaccard >= 0.5);
    }
  });

  it("paired pvalue is finite and in [0, 1]", () => {
    const r = evalPairedPvalue({ a: [1, 2, 3, 4], b: [1.1, 2.1, 2.9, 4.2] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.pvalue).toBeGreaterThanOrEqual(0);
      expect(r.data.pvalue).toBeLessThanOrEqual(1);
    }
  });

  it("vertical filter keeps only allowed features", () => {
    const r = evalVerticalFilter({
      hof: [
        { expr: "a+b", features: ["a", "b"], error: 1 },
        { expr: "a+c", features: ["a", "c"], error: 0.5 },
      ],
      allowed: ["a", "b"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.kept).toHaveLength(1);
      expect(r.data.kept[0]?.expr).toBe("a+b");
      expect(r.data.dropped).toBe(1);
    }
  });
});

describe("symreg-conformal-residue DGSR refine", () => {
  it("nmse is near zero on perfect predictions", () => {
    const r = evalNmse({ y: [1, 2, 3], pred: [1, 2, 3] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.nmse).toBeCloseTo(0, 10);
  });

  it("staged refine reduces a quadratic loss", () => {
    let i = 0;
    const rand = () => {
      i += 1;
      return (Math.sin(i * 12.9898) + 1) / 2;
    };
    const loss = (p: number[]) => (p[0]! - 2) ** 2 + (p[1]! + 1) ** 2;
    const r = evalStagedRefine({
      lossDenoised: loss,
      lossRaw: loss,
      init: [0, 0],
      rand,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.loss).toBeLessThan(loss([0, 0]));
    }
  });

  it("hill climb fail-closes on bad init", () => {
    expect(
      evalHillClimb({
        loss: (p) => p[0]! * p[0]!,
        init: [Number.NaN],
        rand: () => 0.5,
      }).ok,
    ).toBe(false);
  });
});

describe("symreg-conformal-residue SINDy-SI", () => {
  it("stlsq recovers a sparse linear system", () => {
    // y = 2*x0 + 0*x1
    const theta = [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ];
    const dxdt = [2, 2, 2, 2];
    const r = evalStlsq({ theta, dxdt, lambda: 0.1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.xi[0]).toBeCloseTo(2, 5);
      expect(Math.abs(r.data.xi[1] ?? 0)).toBeLessThan(0.2);
      expect(r.data.activeCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("verifySideInfo flags unbounded / non-monotone", () => {
    const r = evalVerifySideInfo({
      f: (x) => x[0]! * 2, // unbounded
      dfdScore: () => 1,
      grid: [[0], [1], [2]],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.bounded).toBe(false);
      expect(r.data.monotone).toBe(true);
    }
  });

  it("dropIntercept zeros index 0", () => {
    const r = evalDropIntercept({ xi: [1.5, 2, 3] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.xi[0]).toBe(0);
      expect(r.data.xi[1]).toBe(2);
    }
  });
});

describe("symreg-conformal-residue taxonomy", () => {
  it("assigns home|favorite and rest buckets", () => {
    const r = evalTaxonomy({
      ctx: { isHome: true, isFavorite: true, restDays: 4, isPrimetime: true },
      level: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rest).toBe("rest_normal");
      expect(r.data.mondrian).toBe("home|favorite|rest_normal");
      expect(r.data.tier1).toContain("home");
      expect(r.data.tier1).toContain("primetime");
      expect(r.data.tier2.length).toBeGreaterThan(0);
    }
  });

  it("fail-closes on missing context fields", () => {
    expect(
      evalTaxonomy({ ctx: { isHome: true, isFavorite: true, restDays: Number.NaN } }).ok,
    ).toBe(false);
  });

  it("summarizes category diagnostics", () => {
    const r = evalCategoryDiagnostics({
      entries: [
        { category: "home|favorite", covered: true, width: 2, residual: 0.1 },
        { category: "home|favorite", covered: false, width: 4, residual: -0.1 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.diagnostics).toHaveLength(1);
      expect(r.data.diagnostics[0]?.sampleSize).toBe(2);
      expect(r.data.diagnostics[0]?.coverage).toBeCloseTo(0.5, 5);
    }
  });
});

describe("symreg-conformal-residue LWT partition", () => {
  const samples = Array.from({ length: 40 }, (_, i) => ({
    // x separates residual SCALE (small spread vs large spread). z is
    // constant so it cannot produce a threshold. Each side needs within-
    // group variance or Brown-Forsythe is degenerate and bestSplit is null.
    features: { x: i < 20 ? 0 : 10, z: 0 },
    residual: i < 20 ? 0.1 + (i % 5) * 0.02 : 2.0 + (i % 5) * 0.4,
  }));

  it("greedy partition produces leaves under maxDepth", () => {
    const r = evalGreedyPartition({
      samples,
      featureKeys: ["x", "z"],
      maxDepth: 1,
      minLeafSize: 5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.leaves.length).toBeGreaterThan(0);
      expect(r.data.leafIds.length).toBe(r.data.leaves.length);
    }
  });

  it("bestSplit finds the x threshold that splits residual scale", () => {
    const r = evalBestSplit({ samples, featureKeys: ["x", "z"], minLeafSize: 5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.split).not.toBeNull();
      expect(r.data.split?.featureKey).toBe("x");
      expect(r.data.split?.quality).toBeGreaterThan(0);
      expect(r.data.split?.leftCount).toBeGreaterThan(0);
      expect(r.data.split?.rightCount).toBeGreaterThan(0);
    }
  });

  it("assignLeafId matches and misses correctly", () => {
    const ok = evalAssignLeafId({
      features: { x: 0 },
      path: [{ featureKey: "x", threshold: 5, goesLeft: true }],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.matched).toBe(true);

    const miss = evalAssignLeafId({
      features: { x: 10 },
      path: [{ featureKey: "x", threshold: 5, goesLeft: true }],
    });
    expect(miss.ok).toBe(true);
    if (miss.ok) expect(miss.data.matched).toBe(false);
  });
});

describe("symreg-conformal-residue promotion quantiles", () => {
  it("standardNormalQuantile inverts known quantiles", () => {
    const r = evalStandardNormalQuantile({ p: 0.975 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.x).toBeCloseTo(1.959964, 4);
  });

  it("zCritOneSided tightens with smaller alpha", () => {
    const a = evalZCritOneSided({ alpha: 0.05 });
    const b = evalZCritOneSided({ alpha: 0.01 });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.z).toBeCloseTo(1.644854, 4);
      expect(b.data.z).toBeGreaterThan(a.data.z);
      expect(b.data.z).toBeCloseTo(2.326348, 4);
    }
  });

  it("fail-closes outside (0, 1)", () => {
    expect(evalStandardNormalQuantile({ p: 0 }).ok).toBe(false);
    expect(evalStandardNormalQuantile({ p: 1 }).ok).toBe(false);
    expect(evalZCritOneSided({ alpha: 1.5 }).ok).toBe(false);
  });
});

describe("symreg-conformal-residue kernel helpers", () => {
  it("rbf kernel is 1 at identical points", () => {
    const r = evalRbfKernel({ x: [1, 2], y: [1, 2], lengthscale: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.k).toBeCloseTo(1, 10);
  });

  it("rff + krr fits a linear target", () => {
    let i = 0;
    const rand = () => {
      i += 1;
      return ((i * 1103515245 + 12345) % 2147483647) / 2147483647;
    };
    const x = Array.from({ length: 12 }, (_, i) => [i * 0.1]);
    const y = x.map((row) => row[0]! * 2);
    const r = evalRffKrr({
      x,
      y,
      numFeatures: 8,
      gamma: 1,
      lambda: 0.1,
      rand,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.dim).toBe(8);
      expect(r.data.weights.every((w) => Number.isFinite(w))).toBe(true);
    }
  });

  it("fail-closes on shape mismatch", () => {
    expect(evalRbfKernel({ x: [1], y: [1, 2], lengthscale: 1 }).ok).toBe(false);
    expect(
      evalRffKrr({
        x: [[1]],
        y: [1, 2],
        numFeatures: 4,
        gamma: 1,
        lambda: 0.1,
        rand: () => 0.5,
      }).ok,
    ).toBe(false);
  });
});

describe("symreg-conformal-residue gate certificate", () => {
  it("builds a no-bet certificate for a rejected candidate", async () => {
    const r = await evalGateCertificate({
      candidate: {
        eventId: "evt-1",
        market: "SPREAD",
        stratumKey: "home|favorite",
        modelVersion: "v1",
        admitted: false,
        exclusions: ["NO_EDGE"],
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.certificate).toBeTruthy();
    }
  });

  it("fail-closes on missing required fields", async () => {
    const r = await evalGateCertificate({
      candidate: {
        eventId: "",
        market: "SPREAD",
        stratumKey: "s",
        modelVersion: "v1",
        admitted: true,
      },
    });
    expect(r.ok).toBe(false);
  });
});
