import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  owenScrambledSobolMatrix,
  owenScrambledSobolRawU32,
} from "../fabric/philox";
import { MultiplicityAgrapaOnsGate } from "../fabric/e-process";
import {
  evaluateFiveRegimeRVineSgp,
  frechetHoeffdingNBounds,
  highamNearestCorrelation,
} from "../nfl/sgp-copula";
import {
  fetchEtkfWinProbability,
  type EtkfDmaBusReadoutOptional,
  type EtkfPredictionSuccess,
} from "../ensemble/gse-ml-endpoints";

const SOBOL_REF_8x4_FROM_PYTHON: readonly (readonly number[])[] = [
  [2604696360, 3736116112, 2589521978, 1505819648],
  [1711269187, 44395862, 1690425986, 3794785554],
  [223449611, 2765291039, 3564901592, 566380837],
  [3578550313, 1371904782, 206245238, 2188309311],
  [3863760542, 2304592279, 1571688064, 3183210278],
  [610504831, 2004070097, 2866482219, 515010410],
  [1556404965, 3919739374, 629015309, 3475122426],
  [2879414908, 724792871, 3883794649, 2130735380],
];

describe("Master Plan v4.0 TypeScript Parity & Property Tests (K03/K05/K13/K25)", () => {
  it("K03: matches Python Burley-2020 Owen-scrambled Sobol raw uint32 bit-for-bit & stays in (0,1)", () => {
    const raw = owenScrambledSobolRawU32(8, 4, 20261116, "v4-k03-sobol-parity");
    expect(raw).toEqual(SOBOL_REF_8x4_FROM_PYTHON);

    const mat = owenScrambledSobolMatrix(64, 16, 20261116, "v4-k03-sobol-parity");
    expect(mat.length).toBe(64);
    for (const row of mat) {
      expect(row.length).toBe(16);
      for (const u of row) {
        expect(u).toBeGreaterThan(0);
        expect(u).toBeLessThan(1);
        expect(Number.isFinite(u)).toBe(true);
      }
    }
  });

  it("K13: Higham nearest correlation preserves PSD eigenvalue floor and unit diagonal across fast-check", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.75, max: 0.99, noNaN: true }),
        fc.double({ min: -0.95, max: 0.95, noNaN: true }),
        fc.double({ min: 0.75, max: 0.99, noNaN: true }),
        (r01, r02, r12) => {
          const raw = [
            [1.0, r01, r02],
            [r01, 1.0, r12],
            [r02, r12, 1.0],
          ];
          const res = highamNearestCorrelation(raw, 1e-5, 40);
          return (
            res.matrix.length === 3 &&
            res.minEigenvalue >= 1e-5 - 1e-9 &&
            res.maxDiagError < 1e-8
          );
        },
      ),
      { numRuns: 150 },
    );
  });

  it("K13: 5-Regime R-Vine SGP honors d-leg Frechet-Hoeffding bounds & shootout upper-tail lambda_U", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.12, max: 0.85, noNaN: true }), {
          minLength: 2,
          maxLength: 5,
        }),
        fc.double({ min: -0.6, max: 0.8, noNaN: true }),
        (legs, rho) => {
          const d = legs.length;
          const rawCorr = Array.from({ length: d }, (_, i) =>
            Array.from({ length: d }, (__, j) => (i === j ? 1.0 : rho)),
          );
          const [fLo, fHi] = frechetHoeffdingNBounds(legs);
          const sgp = evaluateFiveRegimeRVineSgp({
            legExceedanceProbs: legs,
            rawCorrMatrix: rawCorr,
            shootoutGumbelTheta: 1.55,
            grindClaytonTheta: 0.7,
          });
          return (
            sgp.frechetLower === fLo &&
            sgp.frechetUpper === fHi &&
            sgp.jointProb >= fLo - 1e-12 &&
            sgp.jointProb <= fHi + 1e-12 &&
            sgp.shootoutUpperTailLambda > 0.05 &&
            sgp.minEigenvalue >= 1e-5 - 1e-9
          );
        },
      ),
      { numRuns: 120 },
    );
  });

  it("K25: MultiplicityAgrapaOnsGate enforces alpha-multiplicity threshold & Mondrian ECE guard", () => {
    const agrapa = new MultiplicityAgrapaOnsGate({
      mode: "agrapa",
      activeCandidatesM: 6,
      alpha: 0.05,
    });
    expect(agrapa.multiplicityThreshold).toBeCloseTo(120, 8);
    expect(agrapa.canPromote(0.01)).toBe(false);

    for (let i = 0; i < 60; i += 1) {
      agrapa.step(0.45, 2.5);
    }
    expect(agrapa.wealth).toBeGreaterThanOrEqual(agrapa.multiplicityThreshold);
    expect(agrapa.canPromote(0.015)).toBe(true);
    expect(agrapa.canPromote(0.04)).toBe(false);

    const onsNull = new MultiplicityAgrapaOnsGate({
      mode: "ons",
      activeCandidatesM: 4,
      alpha: 0.05,
    });
    for (let i = 0; i < 30; i += 1) {
      onsNull.step(-0.2, 2.5);
    }
    expect(onsNull.wealth).toBeLessThan(1.0);
    expect(onsNull.canPromote(0.01)).toBe(false);
  });

  it("K05: EtkfPredictionSuccess handles optional dmaBusOptional safely & fetchEtkfWinProbability parses strict responses", async () => {
    const bus: EtkfDmaBusReadoutOptional = {
      dma_regime_weights: [0.55, 0.3, 0.15],
      state_vector_dim: 312,
      ensemble_size_k: 64,
      split_brain_gap: 0.0,
    };
    const withBus: EtkfPredictionSuccess = {
      ok: true,
      probability: 0.61,
      latentMargin: 3.1,
      marginSpread: 4.8,
      observationsAssimilated: 12,
      calibration: "logistic",
      dmaBusOptional: bus,
    };
    expect(withBus.dmaBusOptional?.state_vector_dim).toBe(312);
    expect(withBus.dmaBusOptional?.split_brain_gap).toBe(0);

    const outcome = await fetchEtkfWinProbability({
      baseUrl: "https://ml.galaxysportsedge.example",
      nowMs: 1_760_000_000_000,
      request: {
        teams: ["KC", "ATL"],
        home_team: "ATL",
        away_team: "KC",
      },
      fetch: async () =>
        new Response(
          JSON.stringify({
            probability: 0.58,
            latent_margin: 2.1,
            margin_spread: 4.5,
            observations_assimilated: 8,
            calibration: "platt",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.probability).toBeCloseTo(0.58, 6);
      expect(outcome.dmaBusOptional).toBeUndefined();
    }

    const withOptionalBus = await fetchEtkfWinProbability({
      baseUrl: "https://ml.galaxysportsedge.example",
      nowMs: 1_760_000_000_001,
      request: { teams: ["KC", "ATL"], home_team: "ATL", away_team: "KC" },
      fetch: async () =>
        new Response(
          JSON.stringify({
            probability: 0.62,
            latent_margin: 3.2,
            margin_spread: 4.4,
            observations_assimilated: 10,
            calibration: "platt",
            dma_bus: {
              dma_regime_weights: [0.55, 0.3, 0.15],
              state_vector_dim: 312,
              ensemble_size_k: 64,
              split_brain_gap: 0.0,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });
    expect(withOptionalBus.ok).toBe(true);
    if (withOptionalBus.ok) {
      expect(withOptionalBus.dmaBusOptional?.split_brain_gap).toBe(0);
      expect(withOptionalBus.dmaBusOptional?.state_vector_dim).toBe(312);
    }
  });
});
