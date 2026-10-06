/**
 * The ranking-basis census: which branch of the comparator actually orders
 * published picks.
 *
 * WHY. `sort-key.ts` prefers `rankingP` (measured monotone) over `confidence`
 * (measured anti-predictive, z = -10.7) and has carried the note "NOBODY HAS
 * EVER MEASURED WHAT SHARE OF ROWS THAT IS" since it was written, because
 * `rankingBasisCensus` had zero non-test callers. This is the loader that
 * finally gives it a real population.
 *
 * The property that makes the number meaningful — and the one most likely to rot
 * — is that it counts the SAME slice as `loadConfidenceTail`. Two censuses over
 * different populations produce two percentages that look comparable and are
 * not, which is worse than no number at all.
 */

import { describe, it, expect } from "vitest";
import { loadRankingBasisCensus } from "@/lib/calibration/ranking-basis-census";

type Row = {
  confidence: number;
  factorBreakdown?: unknown;
  result: string | null;
  isPublished: boolean;
  isBootstrap: boolean;
  modelVersion: string | null;
};

function fakeDb(rows: Row[], captured: { args: unknown } = { args: null }) {
  return {
    db: {
      pick: {
        findMany: async (args: unknown) => {
          captured.args = args;
          return rows;
        },
      },
    },
    captured,
  };
}

const row = (over: Partial<Row> = {}): Row => ({
  confidence: 80,
  result: "WIN",
  isPublished: true,
  isBootstrap: false,
  modelVersion: "v5.2.7",
  ...over,
});

const withRankingP = (rp: number) => ({ rankingP: rp, rankingScore: 50 });
const withRankingScore = (rs: number) => ({ rankingScore: rs });
const bare = () => ({ someOtherFactor: 1 });

describe("loadRankingBasisCensus", () => {
  it("counts which branch orders each published row", async () => {
    const { db } = fakeDb([
      row({ factorBreakdown: withRankingP(0.8) }),
      row({ factorBreakdown: withRankingP(0.6) }),
      row({ factorBreakdown: withRankingScore(70) }),
      row({ factorBreakdown: bare() }),
    ]);
    const census = await loadRankingBasisCensus(db);
    expect(census.total).toBe(4);
    expect(census.rankingP).toBe(2);
    expect(census.rankingScore).toBe(1);
    expect(census.confidence).toBe(1);
    expect(census.confidenceShare).toBe(0.25);
  });

  it("reads the SAME population as the confidence tail, or the share is a lie", async () => {
    // The comparison in AGENTS.md and the launch audit is ranking-basis against
    // confidence-tail. That comparison is only valid over one slice, so the
    // filter is pinned here rather than trusted to stay aligned.
    const { db, captured } = fakeDb([]);
    await loadRankingBasisCensus(db);
    const where = (captured.args as { where: Record<string, unknown> }).where;
    expect(where["result"]).toEqual({ in: ["WIN", "LOSS"] });
    expect(where["isPublished"]).toBe(true);
    expect(where["isBootstrap"]).toBe(false);
    expect(where["NOT"]).toEqual({ modelVersion: "v5.0.0-seed" });
  });

  it("returns all zeros for an empty population — a real answer, not an error", async () => {
    const { db } = fakeDb([]);
    const census = await loadRankingBasisCensus(db);
    expect(census.total).toBe(0);
    expect(census.confidenceShare).toBe(0);
    expect(census.confidence).toBe(0);
  });

  it("does not divide by zero into NaN when every row resolves to rankingP", async () => {
    const { db } = fakeDb([row({ factorBreakdown: withRankingP(0.9) })]);
    const census = await loadRankingBasisCensus(db);
    expect(census.confidenceShare).toBe(0);
    expect(Number.isNaN(census.confidenceShare)).toBe(false);
  });

  it("treats a non-finite rankingP as absent, so it counts as the fallback", async () => {
    const { db } = fakeDb([
      row({ factorBreakdown: { rankingP: null, rankingScore: null } }),
      row({ factorBreakdown: { rankingP: Number.NaN } }),
    ]);
    const census = await loadRankingBasisCensus(db);
    expect(census.confidence).toBe(2);
    expect(census.confidenceShare).toBe(1);
  });
});
