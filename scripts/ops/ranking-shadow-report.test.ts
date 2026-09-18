import { describe, expect, it } from "vitest";
import * as shadow from "./ranking-shadow-report";
import {
  buildRankingShadowReport,
  SHADOW_REPORT_TARGET_PATH,
  WIN_RATE_SAMPLE_FLOOR,
  type SettledShadowRow,
} from "./ranking-shadow-report";
import type { RankingCandidateRow } from "../../packages/types/src/ranking-candidates";

function row(
  partial: Partial<SettledShadowRow> & Pick<SettledShadowRow, "id" | "inputIndex" | "slateId" | "result">,
): SettledShadowRow {
  const base: RankingCandidateRow = {
    id: partial.id,
    inputIndex: partial.inputIndex,
    expectedClv: null,
    trueProb: null,
    marketFairProb: null,
    rankingP: 0.5,
    rankingScore: 50,
    confidence: 50,
    generatedAt: "2026-09-18T00:00:00.000Z",
    isFeatured: false,
    rankingSource: "confidence",
  };
  return { ...base, ...partial };
}

describe("ranking shadow report", () => {
  it("target path is the committed file", () => {
    expect(SHADOW_REPORT_TARGET_PATH).toBe("scripts/ops/ranking-shadow-report.ts");
  });

  it("identical orderings give perfect correlation", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      row({
        id: `r${i}`,
        inputIndex: i,
        slateId: "s1",
        result: "WIN",
        rankingP: 0.9 - i * 0.05,
        expectedClv: 0.2 - i * 0.01,
        rankingSource: "blend_indep_conf",
        trueProb: 0.6,
        marketFairProb: 0.4,
      }),
    );
    const report = await buildRankingShadowReport(() => rows, [3]);
    expect(report.spearmanVsCurrent.current).toBe(1);
    expect(report.committedSwitch).toBe("current");
  });

  it("a constructed inversion is detected and named", async () => {
    const unpriced = row({
      id: "unpriced-91",
      inputIndex: 0,
      slateId: "s1",
      result: "LOSS",
      confidence: 91,
      rankingP: 0.91,
      rankingSource: "confidence",
      expectedClv: 0.02,
    });
    const priced = row({
      id: "priced-edge",
      inputIndex: 1,
      slateId: "s1",
      result: "WIN",
      confidence: 85,
      rankingP: 0.55,
      rankingSource: "blend_indep_conf",
      expectedClv: 0.22,
      trueProb: 0.62,
      marketFairProb: 0.4,
    });
    const report = await buildRankingShadowReport(() => [unpriced, priced], [2]);
    const pricedFirst = report.slices.find(
      (s) => s.ordering === "priced-tier-first" && s.n === 2,
    );
    expect(pricedFirst?.topIds[0]).toBe("priced-edge");
    const currentFirst = report.slices.find((s) => s.ordering === "current" && s.n === 2);
    expect(currentFirst?.topIds[0]).toBe("unpriced-91");
    expect(
      report.largestDisagreements.some(
        (d) => d.id === "priced-edge" && d.otherOrdering === "priced-tier-first",
      ),
    ).toBe(true);
  });

  it("below-floor sample returns null rather than a number", async () => {
    const rows = [
      row({ id: "a", inputIndex: 0, slateId: "s1", result: "WIN", rankingP: 0.8 }),
      row({ id: "b", inputIndex: 1, slateId: "s1", result: "LOSS", rankingP: 0.7 }),
    ];
    const report = await buildRankingShadowReport(() => rows, [2]);
    for (const s of report.slices) {
      expect(s.winRate).toBeNull();
      expect(s.winRateWithheldReason).toContain(String(WIN_RATE_SAMPLE_FLOOR));
      expect(s.n).toBeGreaterThan(0);
    }
  });

  it("pushes are excluded from the rate and counted separately", async () => {
    const rows: SettledShadowRow[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push(
        row({
          id: `w${i}`,
          inputIndex: i,
          slateId: "s1",
          result: "WIN",
          rankingP: 0.9,
        }),
      );
    }
    for (let i = 0; i < 10; i++) {
      rows.push(
        row({
          id: `l${i}`,
          inputIndex: 10 + i,
          slateId: "s1",
          result: "LOSS",
          rankingP: 0.1,
        }),
      );
    }
    rows.push(
      row({
        id: "push",
        inputIndex: 20,
        slateId: "s1",
        result: "PUSH",
        rankingP: 0.5,
      }),
    );
    const report = await buildRankingShadowReport(() => rows, [21]);
    const slice = report.slices.find((s) => s.ordering === "current" && s.n === 21)!;
    expect(slice.pushes).toBe(1);
    expect(slice.winRate).toBe(0.5);
    expect(report.nPushesExcludedFromRates).toBe(1);
    expect(slice.wins + slice.losses).toBe(20);
  });

  it("does not export ranking weight constants", () => {
    expect("RANKING_P_WEIGHT" in shadow).toBe(false);
    expect("CONFIDENCE_WEIGHT" in shadow).toBe(false);
  });
});
