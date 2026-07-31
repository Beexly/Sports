import { describe, it, expect } from "vitest";
import {
  binaryEntropy,
  binaryEntropyBits,
  klBernoulli,
  entropyReduction,
  eigOfOutcomeObservation,
  eigOfMarketPull,
  expectedAbsoluteResidual,
  rankMarketPullsByEig,
  compareVoIRankings,
  marketBeliefFromOptional,
} from "../expected-info-gain.js";
import {
  scoreOddsPullCandidate,
  rankOddsPullsForBudget,
  toRankedIdScores,
} from "../odds-api-voi.js";
import { infoGainSelectNext } from "../offline-hyperparam-search.js";
import {
  fitBinaryMondrian,
  evaluateBinaryCoverage,
  geometryOnlyCertificate,
  issueCalibrationCertificate,
  type BinaryPickSample,
} from "../conformal/binary-adapter.js";

function assertShadow(x: { priced: false; status: "shadow" }): void {
  expect(x.priced).toBe(false);
  expect(x.status).toBe("shadow");
}

describe("binary entropy + KL", () => {
  it("H(0.5) is max; H(0)=H(1)=0", () => {
    expect(binaryEntropy(0)).toBe(0);
    expect(binaryEntropy(1)).toBe(0);
    expect(binaryEntropy(0.5)).toBeCloseTo(Math.LN2, 5);
    expect(binaryEntropyBits(0.5)).toBeCloseTo(1, 5);
  });

  it("KL / entropyReduction / outcome EIG / residual identities", () => {
    expect(klBernoulli(0.6, 0.6)).toBeCloseTo(0, 10);
    expect(entropyReduction(0.5, 0.9)).toBeGreaterThan(0);
    expect(eigOfOutcomeObservation(0.7)).toBeCloseTo(binaryEntropy(0.7));
    expect(expectedAbsoluteResidual(0.5)).toBeCloseTo(0.5);
  });
});

describe("R1 leverage — labeled market beliefs", () => {
  it("rejects unknown market by default (not a 50% forecast)", () => {
    const r = eigOfMarketPull(0.7, { kind: "unknown" });
    assertShadow(r);
    expect(r.marketPriorKind).toBe("rejected_unknown");
    expect(r.eig).toBe(0);
    expect(r.usedMarketP).toBeNull();
  });

  it("max-entropy prior only when allowMaxEntropyPrior + penalty", () => {
    const r = eigOfMarketPull(0.7, { kind: "unknown" }, { allowMaxEntropyPrior: true });
    expect(r.marketPriorKind).toBe("max_entropy_default");
    expect(r.usedMarketP).toBe(0.5);
    expect(r.eig).toBeGreaterThan(0);
    const full = eigOfMarketPull(0.7, { kind: "point", p: 0.5 });
    expect(r.eig).toBeLessThan(full.eig); // penalty applied
  });

  it("point market prefers disagreement", () => {
    const mild = eigOfMarketPull(0.7, { kind: "point", p: 0.72 });
    const hard = eigOfMarketPull(0.7, { kind: "point", p: 0.3 });
    expect(hard.eig).toBeGreaterThan(mild.eig);
  });

  it("rankMarketPullsByEig counts rejected unknowns", () => {
    const result = rankMarketPullsByEig(
      [
        { id: "known", modelP: 0.55, market: { kind: "point", p: 0.7 }, creditCost: 1, hoursToStart: 3 },
        { id: "unk", modelP: 0.55, market: { kind: "unknown" }, creditCost: 1, hoursToStart: 3 },
      ],
      5,
    );
    assertShadow(result);
    expect(result.rejectedUnknownCount).toBe(1);
    expect(result.selected.some((s) => s.id === "unk")).toBe(false);
    expect(result.selected.some((s) => s.id === "known")).toBe(true);
  });

  it("odds-api-voi does not invent 50% market without expectedMarketP", () => {
    const base = {
      id: "x",
      sport: "nfl",
      creditCost: 1,
      hoursToStart: 6,
      hasCloseSnapshot: false,
      taxonomySampleSize: 5,
    };
    const modelOnly = scoreOddsPullCandidate({ ...base, modelP: 0.5 });
    const plain = scoreOddsPullCandidate(base);
    expect(modelOnly).toBeCloseTo(plain, 10); // no silent EIG boost
    const withPoint = scoreOddsPullCandidate({
      ...base,
      modelP: 0.5,
      expectedMarketP: 0.85,
    });
    expect(withPoint).toBeGreaterThan(plain);
  });

  it("marketBeliefFromOptional maps nullish to unknown", () => {
    expect(marketBeliefFromOptional(undefined).kind).toBe("unknown");
    expect(marketBeliefFromOptional(0.6)).toEqual({ kind: "point", p: 0.6 });
  });
});

describe("R2 leverage — certificate ladder", () => {
  const ctx = { isHome: true, isFavorite: true, restDays: 6 };
  const samples: BinaryPickSample[] = Array.from({ length: 40 }, (_, i) => ({
    sampleId: `s${i}`,
    p: 0.6,
    y: (i % 4 === 0 ? 0 : 1) as 0 | 1,
    ctx,
  }));

  it("synthetic path is permanently geometry_only", () => {
    const fit = fitBinaryMondrian(samples, { minSamples: 5 });
    const report = evaluateBinaryCoverage(fit, samples.slice(20), 0.8);
    const cert = geometryOnlyCertificate(report);
    assertShadow(cert);
    expect(cert.tier).toBe("geometry_only");
    expect(cert.eligible).toBe(false);
    expect(cert.publicClaim).toMatch(/do not certify production/i);
  });

  it("non-synthetic with thin n stays historical_replay ineligible", () => {
    const fit = fitBinaryMondrian(samples, { minSamples: 5 });
    const report = evaluateBinaryCoverage(fit, samples.slice(20), 0.8);
    const cert = issueCalibrationCertificate(report, {
      isSynthetic: false,
      dataSource: "replay-fixture",
      minHoldoutN: 100,
    });
    expect(cert.tier).toBe("historical_replay");
    expect(cert.eligible).toBe(false);
    expect(cert.reasons.some((r) => r.includes("holdout n="))).toBe(true);
  });
});

describe("R3 leverage — dual ranker inspect gate", () => {
  it("identical top-k → safeToSpendWithoutInspect", () => {
    const list = [
      { id: "a", score: 3 },
      { id: "b", score: 2 },
      { id: "c", score: 1 },
    ];
    const cmp = compareVoIRankings(list, list, 3);
    assertShadow(cmp);
    expect(cmp.safeToSpendWithoutInspect).toBe(true);
    expect(cmp.inspectRequired).toBe(false);
    expect(cmp.jaccardTopK).toBe(1);
  });

  it("set mismatch → inspectRequired (credit firewall)", () => {
    const h = [
      { id: "a", score: 3 },
      { id: "b", score: 2 },
    ];
    const e = [
      { id: "a", score: 3 },
      { id: "z", score: 2 },
    ];
    const cmp = compareVoIRankings(h, e, 2);
    expect(cmp.inspectRequired).toBe(true);
    expect(cmp.onlyHeuristic).toContain("b");
    expect(cmp.onlyEig).toContain("z");
    expect(cmp.rationale).toMatch(/inspect before spend/);
  });

  it("end-to-end heuristic vs eig projectors", () => {
    const candidates = [
      {
        id: "1",
        sport: "nfl",
        creditCost: 1,
        hoursToStart: 2,
        hasCloseSnapshot: false,
        modelP: 0.55,
        expectedMarketP: 0.8,
      },
      {
        id: "2",
        sport: "nba",
        creditCost: 1,
        hoursToStart: 40,
        hasCloseSnapshot: false,
        modelP: 0.9,
        expectedMarketP: 0.91,
      },
    ];
    const h = rankOddsPullsForBudget(candidates, 10);
    const e = rankMarketPullsByEig(
      candidates.map((c) => ({
        id: c.id,
        modelP: c.modelP!,
        market: { kind: "point" as const, p: c.expectedMarketP! },
        creditCost: c.creditCost,
        hoursToStart: c.hoursToStart,
      })),
      10,
    );
    const cmp = compareVoIRankings(
      toRankedIdScores(h.ranked),
      e.ranked.map((r) => ({ id: r.id, score: r.eigPerCredit })),
      2,
    );
    assertShadow(cmp);
    // may or may not agree — but comparison is always defined
    expect(cmp.heuristicTop.length).toBeGreaterThan(0);
    expect(typeof cmp.inspectRequired).toBe("boolean");
  });
});

describe("infoGainSelectNext still shadow", () => {
  const base = {
    minSamples: 10,
    learningRate: 0.05,
    taxonomyLevel: 1 as const,
    targetCoverage: 0.8,
  };
  it("prefers never-tried", () => {
    const r = infoGainSelectNext(
      [
        { id: "old", ...base },
        { id: "new", ...base },
      ],
      [
        {
          id: "old",
          ...base,
          objective: 0.5,
          nEval: 3,
          priced: false,
          status: "shadow",
        },
      ],
    );
    expect(r.next?.id).toBe("new");
    expect(r.priced).toBe(false);
  });
});
