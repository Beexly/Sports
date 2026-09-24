import { describe, expect, it } from "vitest";
import {
  availabilityAwareRanking,
  rankingDiffers,
  scoreline,
  SCORELINE_OUTCOME_POINTS,
  verifyProtocol,
} from "./scoreline-metric-2607.js";

describe("scoreline metric", () => {
  it("awards 45 for the outcome class plus closeness terms", () => {
    const perfect = scoreline({ predictedHome: 24, predictedAway: 17, actualHome: 24, actualAway: 17 });
    expect(perfect).toBe(45 + 30 + 25);
    const wrongClass = scoreline({ predictedHome: 10, predictedAway: 24, actualHome: 24, actualAway: 10 });
    expect(wrongClass).toBeLessThan(SCORELINE_OUTCOME_POINTS);
    // right class, off by a little: partial credit
    const close = scoreline({ predictedHome: 24, predictedAway: 20, actualHome: 27, actualAway: 20 });
    expect(close).toBeGreaterThan(SCORELINE_OUTCOME_POINTS);
    expect(close).toBeLessThan(perfect);
  });

  it("availability-aware ranking penalizes absent variants", () => {
    const ranking = availabilityAwareRanking([
      { variant: "a", score: 80, availability: 1 },
      { variant: "b", score: 95, availability: 0.5 },
    ]);
    expect(ranking[0]).toBe("a"); // 80 > 47.5
  });

  it("verification protocol enforces lock-before-deadline and score-after", () => {
    const checks = verifyProtocol([
      { variant: "ok", lockedAtMs: 100, deadlineMs: 200, scoredAtMs: 300 },
      { variant: "late-lock", lockedAtMs: 250, deadlineMs: 200, scoredAtMs: 300 },
      { variant: "early-score", lockedAtMs: 100, deadlineMs: 200, scoredAtMs: 150 },
    ]);
    expect(checks.find((c) => c.variant === "ok")?.valid).toBe(true);
    expect(checks.find((c) => c.variant === "late-lock")?.valid).toBe(false);
    expect(checks.find((c) => c.variant === "early-score")?.valid).toBe(false);
  });

  it("rankingDiffers detects decorative metrics", () => {
    expect(rankingDiffers(["a", "b"], ["a", "b"])).toBe(false);
    expect(rankingDiffers(["a", "b"], ["b", "a"])).toBe(true);
    expect(rankingDiffers(["a"], ["a", "b"])).toBe(true);
  });

  it("handles empty and malformed input", () => {
    expect(availabilityAwareRanking([])).toEqual([]);
    expect(verifyProtocol([])).toEqual([]);
    expect(Number.isNaN(scoreline({ predictedHome: NaN, predictedAway: 1, actualHome: 1, actualAway: 1 }))).toBe(true);
    expect(Number.isNaN(scoreline({ predictedHome: 1, predictedAway: 1, actualHome: 1, actualAway: 1 }, 0, 10))).toBe(true);
  });
});
