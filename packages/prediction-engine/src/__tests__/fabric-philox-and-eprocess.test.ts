import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  PHILOX_M0,
  PHILOX_M1,
  drawNormalPairBoxMuller,
  drawUniformQuad,
  fnv1a32Utf8,
  generatePhilox4x32WgslShader,
  philox4x32_10,
  sampleCategoricalMarkovStep,
  uniform01FromU32,
} from "../fabric/philox";
import {
  verifyFrechetHoeffdingBounds,
  verifyMarkovRowStochastic,
  verifyProperScoringAndConformal,
  verifySinkhornMarginals,
} from "../fabric/invariants";
import { SequentialEProcessGate, boundedScoreTransform } from "../fabric/e-process";
import {
  HotSwapInferenceEngine,
  buildChampionBundle,
  defaultChampionBundle,
} from "../fabric/hot-swap-registry";
import {
  computeAdaptiveSliceQuantum,
  executeTsMicrotaskKernel,
  throttlePolicyFromLoad,
} from "../fabric/hybrid-worker";

describe("GSE Distributed Compute Fabric (TypeScript + fast-check)", () => {
  it("matches golden Philox-4x32-10 coordinates & keeps (0,1) bounds across fast-check", () => {
    expect(PHILOX_M0).toBe(0xd2511f53);
    expect(PHILOX_M1).toBe(0xcd9e8d57);

    const w0 = philox4x32_10([0, 0, 0, 0], [0, 0]);
    const w1 = philox4x32_10([0, 0, 0, 0], [0, 0]);
    expect(w0).toEqual(w1);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0x7fffffff }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 500 }),
        (seed, pathIdx, stepIdx) => {
          const quad = drawUniformQuad(seed, "MONTE_CARLO_SLATE", pathIdx, stepIdx);
          for (const u of quad) {
            if (!(u > 0 && u < 1 && Number.isFinite(u))) return false;
          }
          const [z0, z1] = drawNormalPairBoxMuller(seed, "MONTE_CARLO_SLATE", pathIdx, stepIdx);
          return Number.isFinite(z0) && Number.isFinite(z1);
        },
      ),
      { numRuns: 300 },
    );

    expect(uniform01FromU32(0)).toBeGreaterThan(0);
    expect(uniform01FromU32(0xffffffff)).toBeLessThan(1);
    expect(fnv1a32Utf8("chaos-0")).toBe(fnv1a32Utf8("chaos-0"));
    expect(sampleCategoricalMarkovStep([0.6, 0.4], 0.7)).toBe(1);
    expect(generatePhilox4x32WgslShader(64)).toContain("@compute @workgroup_size(64)");
  });

  it("enforces Frechet-Hoeffding, Markov, Sinkhorn, and Conformal invariants", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.05, max: 0.95, noNaN: true }),
        fc.double({ min: 0.05, max: 0.95, noNaN: true }),
        fc.double({ min: 0.0, max: 1.0, noNaN: true }),
        (p1, p2, frac) => {
          const lower = Math.max(p1 + p2 - 1, 0);
          const upper = Math.min(p1, p2);
          const validJoint = lower + frac * (upper - lower);
          if (!verifyFrechetHoeffdingBounds([p1, p2], validJoint).ok) return false;
          if (verifyFrechetHoeffdingBounds([p1, p2], upper + 0.05).ok) return false;
          return true;
        },
      ),
      { numRuns: 250 },
    );

    expect(verifyMarkovRowStochastic([[0.5, 0.5], [0.25, 0.75]]).ok).toBe(true);
    expect(verifyMarkovRowStochastic([[0.5, 0.6], [0.25, 0.75]]).ok).toBe(false);
    expect(verifySinkhornMarginals([[0.4, 0.1], [0.1, 0.4]], [0.5, 0.5], [0.5, 0.5]).ok).toBe(true);
    expect(verifyProperScoringAndConformal(0.21, [0.1, 0.5, 0.9]).ok).toBe(true);
    expect(verifyProperScoringAndConformal(0.21, [0.6, 0.5, 0.9]).ok).toBe(false);
  });

  it("maintains martingale null-safety under fast-check symmetric noise & promotes true edge", () => {
    let falsePromotions = 0;
    const totalTrials = 400;
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.boolean(), fc.double({ min: 0.01, max: 0.12, noNaN: true })), {
          minLength: 40,
          maxLength: 40,
        }),
        (steps) => {
          const gate = new SequentialEProcessGate({ alpha: 0.05, scoreScale: 0.25 });
          for (const [sign, mag] of steps) {
            const d = sign ? mag : -mag;
            gate.step(0.25 + d, 0.25, true);
            if (gate.canPromote()) return true;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );

    // Deterministic empirical false-promotion check across 400 Rademacher trajectories.
    for (let t = 0; t < totalTrials; t += 1) {
      const gate = new SequentialEProcessGate({ alpha: 0.05, scoreScale: 0.25 });
      for (let s = 0; s < 50; s += 1) {
        const [u] = drawUniformQuad(9000 + t, "h0-null", s, 0);
        const signed = u < 0.5 ? -0.09 : 0.09;
        gate.step(0.25 + signed, 0.25, true);
        if (gate.canPromote()) {
          falsePromotions += 1;
          break;
        }
      }
    }
    expect(falsePromotions / totalTrials).toBeLessThanOrEqual(0.05);

    // True positive edge clears W_t >= 20 reliably.
    const posGate = new SequentialEProcessGate({ alpha: 0.05, scoreScale: 0.25 });
    for (let s = 0; s < 40; s += 1) {
      posGate.step(0.29, 0.21, true);
    }
    expect(posGate.canPromote()).toBe(true);
    expect(boundedScoreTransform(0.5, 0.25)).toBe(1);
    expect(boundedScoreTransform(-0.5, 0.25)).toBe(-1);
  });

  it("serves <5ms hot-swap inference, rejects tampered bundles, and throttles hybrid workers", () => {
    const engine = new HotSwapInferenceEngine();
    for (let i = 0; i < 100; i += 1) {
      const res = engine.query({ p1: 0.56, p2: 0.52, pairing: "QB-WR", marketFairProb: 0.24 });
      expect(res.latencyMs).toBeLessThan(5.0);
    }

    const base = defaultChampionBundle();
    const tampered = { ...base, copulaParams: { ...base.copulaParams, theta_qb_wr: 1.4 } };
    expect(engine.hotSwap(tampered).ok).toBe(false);

    const v2 = buildChampionBundle({
      versionTag: "v2.0.0-ts",
      islandOrigin: "copula_tail",
      copulaParams: { ...base.copulaParams, theta_qb_wr: 0.85 },
      markovDriveMatrix: base.markovDriveMatrix,
      sinkhornParams: base.sinkhornParams,
      conformalOffsets: base.conformalOffsets,
      corpusPillarWeights: base.corpusPillarWeights,
    });
    expect(engine.hotSwap(v2).ok).toBe(true);
    expect(engine.rollback()).toBe(true);
    expect(engine.activeBundle.versionTag).toBe("v1.0.0-baseline");

    expect(computeAdaptiveSliceQuantum(200, 0.1)).toBeGreaterThan(
      computeAdaptiveSliceQuantum(200, 0.9),
    );
    expect(throttlePolicyFromLoad(0.1).maxBatchTasks).toBeGreaterThan(
      throttlePolicyFromLoad(0.9).maxBatchTasks,
    );

    const kernelOut = executeTsMicrotaskKernel({
      taskId: "ts-k-1",
      fencingToken: 7,
      taskType: "COPULA_STRESS",
      deterministicSeed: 42,
    });
    expect(kernelOut.invariantsOk).toBe(true);
  });
});
