import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SO-1h: invariant tests for the backfillIndependentTrueProb ORCHESTRATOR
 * (packages/ingestion-pipeline/src/backfill-independent-trueprob.ts, 305 lines).
 *
 * The pre-existing sibling file `backfill-independent-trueprob.test.ts` covers
 * only the `blendIndependentHomeFair` polarity math it imports directly; the
 * orchestrator's own 272-line body (write-once law, never-invent rule, work
 * budget, side mapping, 0.5-neutral market filter) had ZERO coverage before
 * this file. Nothing here replaces the sibling suite — both run.
 *
 * MOCK POLICY (precedent: build-independent-fair-values-rights-gate.test.ts):
 * - `@sports/db` is stubbed (pick.findMany / pick.update).
 * - `buildIndependentFairValues` and `blendIndependentHomeFair` are stubbed so
 *   each scenario controls the blended p exactly. The real blend polarity is
 *   the sibling file's job; the real `pickSelectionSide` (via process-sport.js)
 *   and the real `sourceAgreement` (via @sports/prediction-engine) stay REAL
 *   so the side-mapping and agreement seams are exercised, not reimplemented.
 *
 * LAWS UNDER TEST (from the module header):
 * - Never rewrite selection, line, result, settledAt, confidence, or grade —
 *   the update writes ONLY factorBreakdown.
 * - Never invent probabilities: empty independents → skip.
 * - 0.5 book fair is synthetic neutral → never persisted as a market price.
 * - Agreement is direction agreement, not a source count (SPLIT is possible).
 */

const mocks = vi.hoisted(() => ({
  pickFindMany: vi.fn(),
  pickUpdate: vi.fn(),
  buildIndependents: vi.fn(),
  blend: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: {
      findMany: mocks.pickFindMany,
      update: mocks.pickUpdate,
    },
  },
}));

vi.mock("../build-independent-fair-values.js", () => ({
  buildIndependentFairValues: mocks.buildIndependents,
}));

vi.mock("../generate-signal-slate.js", () => ({
  blendIndependentHomeFair: mocks.blend,
}));

import { backfillIndependentTrueProb } from "../backfill-independent-trueprob.js";
import type { BackfillIndependentResult } from "../backfill-independent-trueprob.js";

type GameRow = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  commenceTime: Date;
  sport: { key: string } | null;
};

type PickRow = {
  id: string;
  selection: string;
  pickType: string | null;
  factorBreakdown: unknown;
  game: GameRow | null;
};

const GAME: GameRow = {
  id: "g1",
  homeTeamName: "Denver Broncos",
  awayTeamName: "Kansas City Chiefs",
  commenceTime: new Date("2026-09-20T17:00:00Z"),
  sport: { key: "nfl" },
};

function row(overrides: Partial<PickRow> = {}): PickRow {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    selection: "Denver Broncos ML",
    pickType: "MONEYLINE",
    factorBreakdown: {},
    game: GAME,
    ...overrides,
  };
}

function pricedEdge(): Record<string, unknown> {
  return {
    independentEdge: { trueProb: 0.61, priced: true, trueProbBasis: "backfill" },
  };
}

/** Blend stub used by most scenarios: home 0.62 from two named sources. */
function blendHome062(): void {
  mocks.blend.mockReturnValue({ homeP: 0.62, sources: ["fpi", "elo"] });
}

function updateFactorBreakdowns(): Record<string, unknown>[] {
  return mocks.pickUpdate.mock.calls.map((c) => {
    const arg = c[0] as { data: { factorBreakdown: Record<string, unknown> } };
    return arg.data.factorBreakdown;
  });
}

function updateEdgeArgs(): { where: unknown; data: unknown }[] {
  return mocks.pickUpdate.mock.calls.map((c) => ({
    where: (c[0] as { where: unknown }).where,
    data: (c[0] as { data: unknown }).data,
  }));
}

beforeEach(() => {
  mocks.pickFindMany.mockReset();
  mocks.pickUpdate.mockReset();
  mocks.buildIndependents.mockReset();
  mocks.blend.mockReset();
  mocks.pickUpdate.mockResolvedValue({});
  mocks.buildIndependents.mockResolvedValue([
    { source: "fpi", homeFairProb: 0.62, awayFairProb: 0.38, capturedAt: "2026-09-20T12:00:00Z" },
  ]);
  blendHome062();
});

describe("write-once law: the update can only touch factorBreakdown", () => {
  it("update data carries exactly one key, factorBreakdown, and nothing else", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(mocks.pickUpdate).toHaveBeenCalledTimes(1);
    const data = (mocks.pickUpdate.mock.calls[0][0] as { data: object }).data;
    expect(Object.keys(data)).toEqual(["factorBreakdown"]);
  });

  it("update is keyed by the pick's id", async () => {
    const target = row({ id: "pick-abc" });
    mocks.pickFindMany.mockResolvedValue([target]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const args = updateEdgeArgs();
    expect(args[0].where).toEqual({ id: "pick-abc" });
  });

  it("dryRun writes nothing yet still counts the row as updated work", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    const res = await backfillIndependentTrueProb({
      dryRun: true,
      skipNetworkIndependents: true,
    });
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
    expect(res.updated).toBe(1);
    expect(res.note).toContain("dryRun=true");
  });

  it("seed rows are structurally excluded and the scan is settled-first", async () => {
    mocks.pickFindMany.mockResolvedValue([]);
    await backfillIndependentTrueProb();
    const args = mocks.pickFindMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    };
    expect(args.where).toEqual({
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS"] },
      NOT: { modelVersion: "v5.0.0-seed" },
    });
    expect(args.orderBy).toEqual({ settledAt: "desc" });
  });
});

describe("never invents: no independent opinion means no write", () => {
  it("empty independents are an honest skip, not a 0.5 write", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.buildIndependents.mockResolvedValue([]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.skippedNoOpinion).toBe(1);
    expect(res.updated).toBe(0);
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
  });

  it("an empty-independent skip never reaches the blend step", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.buildIndependents.mockResolvedValue([]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(mocks.blend).not.toHaveBeenCalled();
  });

  it("a thrown independent build is an error entry plus skip, never a write", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ id: "boom-1" })]);
    mocks.buildIndependents.mockRejectedValue(new Error("kalshi unreachable"));
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.updated).toBe(0);
    expect(res.skippedNoOpinion).toBe(1);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toContain("boom-1");
    expect(res.errors[0]).toContain("kalshi unreachable");
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it("a null blend is a skip, not a fabricated 0.5", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.buildIndependents.mockResolvedValue([
      { source: "fpi", homeFairProb: null, awayFairProb: null },
    ]);
    mocks.blend.mockResolvedValue(null);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.skippedNoOpinion).toBe(1);
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
  });

  it("a degenerate homeP outside (0,1) trips the sanity guard instead of writing", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.buildIndependents.mockResolvedValue([
      { source: "fpi", homeFairProb: 0.5, awayFairProb: 0.5 },
    ]);
    mocks.blend.mockReturnValue({ homeP: 1, sources: ["fpi"] });
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.skippedNoOpinion).toBe(1);
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
  });

  it("a selection mappable to neither team is an error plus skip, never a guess", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ id: "unmappable", selection: "Ohio State Buckeyes ML" }),
    ]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.updated).toBe(0);
    expect(res.skippedNoOpinion).toBe(1);
    expect(res.errors[0]).toContain("unmappable");
    expect(mocks.buildIndependents).not.toHaveBeenCalled();
  });
});

describe("side mapping through the REAL pickSelectionSide", () => {
  it("home moneyline pick prices the blended home prob", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const fb = updateFactorBreakdowns()[0];
    const edge = fb.independentEdge as Record<string, unknown>;
    expect(edge.trueProb).toBe(0.62);
  });

  it("away moneyline pick prices the exact complement", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ selection: "Kansas City Chiefs ML" })]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.trueProb).toBeCloseTo(0.38, 12);
  });

  it("clamp01 keeps a degenerate away complement inside the open interval", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ selection: "Kansas City Chiefs ML" })]);
    mocks.blend.mockReturnValue({ homeP: 1 - 1e-7, sources: ["fpi"] });
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    const p = edge.trueProb as number;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
    expect(p).toBeCloseTo(1e-6, 12);
  });

  it("spread picks strip the points and map the team side", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ pickType: "SPREAD", selection: "Denver Broncos -3.5" }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.trueProb).toBe(0.62);
    const rationale = edge.rationale as string;
    expect(rationale).toContain("not ATS cover p");
  });

  it("a bare nickname selection matches by containment", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ selection: "Chiefs -2.5", pickType: "SPREAD" }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.trueProb).toBeCloseTo(0.38, 12);
  });
});

describe("market scope: no honest independent cover model for TOTAL", () => {
  it("TOTAL picks are counted as non-ML and never call the independents", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ pickType: "TOTAL", selection: "OVER 47.5" })]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.skippedNonMl).toBe(1);
    expect(res.updated).toBe(0);
    expect(mocks.buildIndependents).not.toHaveBeenCalled();
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
  });

  it("pick types other than ML/SPREAD/TOTAL are refused the same way", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ pickType: "PROP", selection: "Whatever" })]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.skippedNonMl).toBe(1);
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
  });

  it("a null pickType defaults to MONEYLINE and still prices", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ pickType: null })]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.updated).toBe(1);
    expect(res.skippedNonMl).toBe(0);
  });
});

describe("the persisted independentEdge shape", () => {
  it("persists the full edge block: basis, shrunk edge, conviction, priced, rationale", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.trueProbBasis).toBe("backfill");
    expect(edge.rawEdge).toBeCloseTo(0.12, 12);
    expect(edge.shrunkEdge).toBeCloseTo(0.12 * 0.7, 12);
    expect(edge.conviction).toBe(62);
    expect(edge.priced).toBe(true);
    expect(edge.decision).toBe("LEAN");
    expect(edge.sources).toEqual(["fpi", "elo"]);
    expect(String(edge.rationale)).toContain("Calibration enrichment only");
  });

  it("PASS below the 0.58 threshold on both sides", async () => {
    mocks.blend.mockReturnValue({ homeP: 0.57, sources: ["fpi"] });
    mocks.pickFindMany.mockResolvedValue([row(), row({ id: "p2", selection: "Chiefs ML" })]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const fbs = updateFactorBreakdowns();
    expect((fbs[0].independentEdge as Record<string, unknown>).decision).toBe("PASS");
    expect((fbs[1].independentEdge as Record<string, unknown>).decision).toBe("PASS");
  });

  it("LEAN on the home side when the blend clears 0.58", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.blend.mockReturnValue({ homeP: 0.58, sources: ["kalshi"] });
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.decision).toBe("LEAN");
    expect(edge.sources).toEqual(["kalshi"]);
  });

  it("agreement is DIRECTION agreement: opposite-reading sources stay SPLIT", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.buildIndependents.mockResolvedValue([
      { source: "kalshi", homeFairProb: 0.7, awayFairProb: 0.3 },
      { source: "elo", homeFairProb: 0.3, awayFairProb: 0.7 },
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    // Two sources, zero corroboration: the real sourceAgreement must say SPLIT.
    expect(edge.agreement).toBe("SPLIT");
  });

  it("agreement CONFIRMS only when the sources actually read the same side", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.buildIndependents.mockResolvedValue([
      { source: "kalshi", homeFairProb: 0.7, awayFairProb: 0.3 },
      { source: "elo", homeFairProb: 0.65, awayFairProb: 0.35 },
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.agreement).toBe("CONFIRMS");
  });

  it("exact-0.5 book fair is synthetic neutral: persisted as null, edge vs 0.5", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ factorBreakdown: { marketFairProb: 0.5 } }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.marketFairProb).toBeNull();
    expect(edge.rawEdge).toBeCloseTo(0.12, 12);
  });

  it("a market fair within 1e-9 of 0.5 is treated as the same synthetic neutral", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ factorBreakdown: { marketFairProb: 0.5 + 1e-12 } }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.marketFairProb).toBeNull();
  });

  it("a real market fair is persisted and rawEdge prices against it", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ factorBreakdown: { marketFairProb: 0.55 } }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.marketFairProb).toBe(0.55);
    expect(edge.rawEdge).toBeCloseTo(0.62 - 0.55, 12);
  });

  it("market fair falls back to the top-level factorBreakdown field when the edge lacks it", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({
        factorBreakdown: {
          marketFairProb: 0.55,
          independentEdge: { trueProb: null, marketFairProb: null },
        },
      }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.marketFairProb).toBe(0.55);
  });

  it("expectedClv survives when present and defaults to 0 when absent", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ id: "a", factorBreakdown: { independentEdge: { expectedClv: -0.02 } } }),
      row({ id: "b" }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const fbs = updateFactorBreakdowns();
    expect((fbs[0].independentEdge as Record<string, unknown>).expectedClv).toBe(-0.02);
    expect((fbs[1].independentEdge as Record<string, unknown>).expectedClv).toBe(0);
  });

  it("fairProbability is never overwritten when the row already has one", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ factorBreakdown: { fairProbability: 0.7, unrelatedKept: "kept" } }),
    ]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const fb = updateFactorBreakdowns()[0];
    expect(fb.fairProbability).toBe(0.7);
    // Unrelated factorBreakdown keys are preserved, not rebuilt from nothing.
    expect(fb.unrelatedKept).toBe("kept");
  });

  it("fairProbability is stamped from trueProb when the row has none", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const fb = updateFactorBreakdowns()[0];
    expect(fb.fairProbability).toBe(0.62);
  });

  it("conviction rounds, not floors: 0.627 becomes 63", async () => {
    mocks.pickFindMany.mockResolvedValue([row()]);
    mocks.blend.mockReturnValue({ homeP: 0.627, sources: ["fpi"] });
    await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    const edge = updateFactorBreakdowns()[0].independentEdge as Record<string, unknown>;
    expect(edge.conviction).toBe(63);
  });

  it("a failed update is an error entry and is not counted as updated", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ id: "stuck" })]);
    mocks.pickUpdate.mockRejectedValue(new Error("db write refused"));
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.updated).toBe(0);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toContain("stuck");
    expect(res.errors[0]).toContain("db write refused");
  });
});

describe("already-priced detection: hasIndependentTrueProb", () => {
  it("a row with a live trueProb is already-priced and consumes no work budget", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ factorBreakdown: pricedEdge() })]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.alreadyPriced).toBe(1);
    expect(res.scanned).toBe(0);
    expect(res.updated).toBe(0);
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
  });

  it("the rankingP fallback branch also detects an already-priced row", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({
        factorBreakdown: {
          rankingSource: "independent_trueProb",
          rankingP: 0.44,
          independentEdge: { trueProb: null },
        },
      }),
    ]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.alreadyPriced).toBe(1);
    expect(mocks.pickUpdate).not.toHaveBeenCalled();
  });

  it("rankingSource without a live rankingP is NOT already-priced", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({
        factorBreakdown: {
          rankingSource: "independent_trueProb",
          rankingP: null,
          independentEdge: { trueProb: null },
        },
      }),
    ]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.alreadyPriced).toBe(0);
    expect(res.updated).toBe(1);
  });

  it("trueProb of exactly 1 or NaN is not a priced row", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ id: "one", factorBreakdown: { independentEdge: { trueProb: 1 } } }),
      row({ id: "nan", factorBreakdown: { independentEdge: { trueProb: Number.NaN } } }),
    ]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.alreadyPriced).toBe(0);
    expect(res.updated).toBe(2);
  });

  it("a non-object factorBreakdown is not already-priced and still gets the edge", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ factorBreakdown: "garbage" })]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.alreadyPriced).toBe(0);
    expect(res.updated).toBe(1);
    // The garbage string is REPLACED by the edge block, not merged with it.
    const fb = updateFactorBreakdowns()[0];
    expect(typeof fb).toBe("object");
    expect(fb.independentEdge).toBeDefined();
  });
});

describe("forceReprice: repricing never rewrites results", () => {
  it("force re-prices an already-priced row and counts it in both buckets", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ factorBreakdown: pricedEdge() })]);
    const res = await backfillIndependentTrueProb({
      forceReprice: true,
      skipNetworkIndependents: true,
    });
    expect(res.alreadyPriced).toBe(1);
    expect(res.updated).toBe(1);
    expect(mocks.pickUpdate).toHaveBeenCalledTimes(1);
  });

  it("without force, an already-priced row before the work queue does not block it", async () => {
    mocks.pickFindMany.mockResolvedValue([
      row({ id: "priced", factorBreakdown: pricedEdge() }),
      row({ id: "fresh" }),
    ]);
    const res = await backfillIndependentTrueProb({ limit: 1, skipNetworkIndependents: true });
    expect(res.alreadyPriced).toBe(1);
    expect(res.updated).toBe(1);
    const updatedId = (mocks.pickUpdate.mock.calls[0][0] as { where: { id: string } }).where.id;
    expect(updatedId).toBe("fresh");
  });
});

describe("work budget and oversample", () => {
  it("the loop stops at the limit: 3 candidates, limit 2, third untouched", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ id: "a" }), row({ id: "b" }), row({ id: "c" })]);
    const res = await backfillIndependentTrueProb({ limit: 2, skipNetworkIndependents: true });
    expect(res.scanned).toBe(2);
    expect(res.updated).toBe(2);
  });

  it("limit clamps up to 1 and down to 500", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ id: "a" }), row({ id: "b" })]);
    const lo = await backfillIndependentTrueProb({ limit: 0, skipNetworkIndependents: true });
    expect(lo.scanned).toBe(1);

    const many: PickRow[] = Array.from({ length: 520 }, (_, i) => row({ id: `r${i}` }));
    mocks.pickFindMany.mockReset();
    mocks.pickFindMany.mockResolvedValue(many);
    const hi = await backfillIndependentTrueProb({ limit: 600, skipNetworkIndependents: true });
    expect(hi.scanned).toBe(500);
  });

  it("the findMany take oversamples 12x with a 200 floor and 2500 ceiling", async () => {
    mocks.pickFindMany.mockResolvedValue([]);
    await backfillIndependentTrueProb({ limit: 20 });
    expect(
      (mocks.pickFindMany.mock.calls[0][0] as { take: number }).take,
    ).toBe(Math.min(2500, Math.max(20 * 12, 200)));

    await backfillIndependentTrueProb({ limit: 1 });
    expect(
      (mocks.pickFindMany.mock.calls[1][0] as { take: number }).take,
    ).toBe(200);

    await backfillIndependentTrueProb({ limit: 500 });
    expect(
      (mocks.pickFindMany.mock.calls[2][0] as { take: number }).take,
    ).toBe(2500);
  });

  it("a game-less row consumes budget and reports no-opinion", async () => {
    mocks.pickFindMany.mockResolvedValue([row({ id: "orphan", game: null }), row({ id: "ok" })]);
    const res = await backfillIndependentTrueProb({ limit: 2, skipNetworkIndependents: true });
    expect(res.scanned).toBe(2);
    expect(res.skippedNoOpinion).toBe(1);
    expect(res.updated).toBe(1);
    const updatedId = (mocks.pickUpdate.mock.calls[0][0] as { where: { id: string } }).where.id;
    expect(updatedId).toBe("ok");
  });

  it("the error list in the result is capped at 20 even when more accumulate", async () => {
    const unpriced = Array.from({ length: 25 }, (_, i) =>
      row({ id: `bad${i}`, selection: `Ohio State Buckeyes ${i} ML` }),
    );
    mocks.pickFindMany.mockResolvedValue(unpriced);
    const res = await backfillIndependentTrueProb({
      limit: 30,
      skipNetworkIndependents: true,
    });
    expect(res.scanned).toBe(25);
    expect(res.errors).toHaveLength(20);
  });

  it("the note line and ok flag report every counter", async () => {
    mocks.pickFindMany.mockResolvedValue([row(), row({ id: "t", pickType: "TOTAL", selection: "OVER 44.5" })]);
    const res = await backfillIndependentTrueProb({ skipNetworkIndependents: true });
    expect(res.ok).toBe(true);
    expect(res.note).toContain("scanned=2");
    expect(res.note).toContain("updated=1");
    expect(res.note).toContain("noOpinion=0");
    expect(res.note).toContain("nonMl=1");
    expect(typeof res.note).toBe("string");
  });
});
