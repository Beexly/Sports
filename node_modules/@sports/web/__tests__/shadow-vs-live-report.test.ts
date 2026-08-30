import { describe, it, expect } from "vitest";
import {
  buildShadowVsLiveReport,
  renderShadowVsLiveMarkdown,
  MIN_COMPARISON_SAMPLE,
} from "../lib/ops/shadow-vs-live-report";
import type { SettledShadowRow } from "../lib/ops/shadow-signal-store";

function row(
  i: number,
  shadowProb: number,
  liveConfidence: number | null,
  outcome: 0 | 1,
  marketProb = 0.5,
): SettledShadowRow {
  return {
    gameId: `g${i}`,
    modelVersion: "v1",
    shadowProb,
    marketProb,
    liveConfidence,
    outcome,
  };
}

/** n rows where the shadow engine is sharp and correct, the live one is a coin flip. */
function shadowWins(n: number): SettledShadowRow[] {
  return Array.from({ length: n }, (_, i) =>
    row(i, i % 2 === 0 ? 0.85 : 0.15, 50, i % 2 === 0 ? 1 : 0),
  );
}

describe("buildShadowVsLiveReport", () => {
  it("refuses a verdict below the minimum sample", () => {
    const r = buildShadowVsLiveReport(shadowWins(MIN_COMPARISON_SAMPLE - 1));
    expect(r.verdict).toBe("insufficient-sample");
    expect(r.brierAdvantage).toBeNull();
    expect(r.summary).toContain("noise, not evidence");
  });

  it("scores a genuinely better shadow engine as shadow-better", () => {
    const r = buildShadowVsLiveReport(shadowWins(40));
    expect(r.verdict).toBe("shadow-better");
    expect(r.brierAdvantage).toBeGreaterThan(0);
    expect(r.shadow!.brier).toBeLessThan(r.live!.brier);
  });

  it("scores a worse shadow engine as live-better (no thumb on the scale)", () => {
    // Shadow is confidently WRONG every time; live is a coin flip.
    const rows = Array.from({ length: 40 }, (_, i) =>
      row(i, i % 2 === 0 ? 0.1 : 0.9, 50, i % 2 === 0 ? 1 : 0),
    );
    const r = buildShadowVsLiveReport(rows);
    expect(r.verdict).toBe("live-better");
    expect(r.brierAdvantage).toBeLessThan(0);
  });

  it("reports a tie inside the band rather than inventing a winner", () => {
    const rows = Array.from({ length: 40 }, (_, i) => row(i, 0.5, 50, i % 2 === 0 ? 1 : 0));
    const r = buildShadowVsLiveReport(rows);
    expect(r.verdict).toBe("tied");
  });

  it("compares only games where BOTH engines produced a probability", () => {
    const rows = [...shadowWins(30), ...shadowWins(5).map((x, i) => ({ ...x, gameId: `x${i}`, liveConfidence: null }))];
    const r = buildShadowVsLiveReport(rows);
    expect(r.comparedGames).toBe(30);
    expect(r.shadowOnlyGames).toBe(5);
    expect(r.shadow!.sampleSize).toBe(30);
    expect(r.live!.sampleSize).toBe(30);
  });

  it("says so explicitly when the shadow engine does not beat the market", () => {
    // Market is perfectly sharp and correct; shadow is a coin flip.
    const rows = Array.from({ length: 40 }, (_, i) =>
      row(i, 0.5, 50, i % 2 === 0 ? 1 : 0, i % 2 === 0 ? 0.99 : 0.01),
    );
    const r = buildShadowVsLiveReport(rows);
    expect(r.summary).toContain("does NOT beat the market baseline");
  });

  it("handles an empty input without throwing", () => {
    const r = buildShadowVsLiveReport([]);
    expect(r.comparedGames).toBe(0);
    expect(r.verdict).toBe("insufficient-sample");
    expect(r.shadow).toBeNull();
  });

  it("renders markdown carrying the verdict and the not-published disclaimer", () => {
    const md = renderShadowVsLiveMarkdown(buildShadowVsLiveReport(shadowWins(40)));
    expect(md).toContain("shadow-better");
    expect(md).toContain("| shadow |");
    expect(md).toContain("not published");
  });
});
