/**
 * TREND PASSPORTS + TREND TRIALS — tests.
 *
 * Proves the discipline Scores24 lacks: small samples are fragile, stacked filters are overfit,
 * overlapping trends are not independent evidence, a trend without a line can't price and without odds
 * can't be valued, a trend ALONE never exceeds WATCH, and a trial separates process from outcome.
 */

import { describe, it, expect } from "vitest";
import {
  buildTrendPassport,
  buildAllTrendPassports,
  gradeTrendTrial,
  type TrendInput,
} from "../trend-passport.js";

const BANNED = /\b(lock|guarantee|guaranteed|sure thing|can't lose|risk[-\s]?free|profit|locks?)\b/i;

describe("Fragility — small samples are fragile", () => {
  it("a 9-game trend is more fragile than a 50-game trend", () => {
    const small = buildTrendPassport({ trendId: "a", sport: "mlb", eventId: "e", market: "Total", claim: "Under has hit recently.", sampleScope: "last 9", sampleSize: 9, hitCount: 8, marketLine: 9.5, oddsAtPublish: 1.9, knownAtPreMatch: true });
    const big = buildTrendPassport({ trendId: "b", sport: "mlb", eventId: "e", market: "Total", claim: "Under has hit over a long run.", sampleScope: "last 50", sampleSize: 50, hitCount: 30, marketLine: 9.5, oddsAtPublish: 1.9, knownAtPreMatch: true });
    expect(small.fragilityScore).toBeGreaterThan(big.fragilityScore);
    expect(small.fragilityScore).toBeGreaterThan(0.3);
  });
});

describe("Overfit / p-hacking — stacked filters on a small sample", () => {
  it("two filters on a small sample is HIGH overfit + HIGH p-hacking risk", () => {
    const p = buildTrendPassport({ trendId: "of", sport: "soccer", eventId: "e", market: "Total", claim: "Under has hit in this slice.", sampleScope: "last 6 home games vs top-6", sampleSize: 6, hitCount: 6, homeAwayFilter: "HOME", opponentFilter: "top-6", marketLine: 2.5, oddsAtPublish: 1.8, knownAtPreMatch: true });
    expect(p.overfitRisk).toBe("HIGH");
    expect(p.pHackingRisk).toBe("HIGH");
  });
});

describe("Independence — overlapping trends are flagged", () => {
  it("two Total-runs trends on the same game are flagged as correlated (not independent)", () => {
    const all = buildAllTrendPassports();
    const rays = all.find((t) => t.trendId === "t-rays-u95")!;
    expect(rays.correlatedTrends).toContain("t-royals-o75"); // same event + same market family
  });
});

describe("Authority — a trend alone never reaches public action", () => {
  it("no line → INFO_ONLY (cannot even price)", () => {
    const p = buildTrendPassport({ trendId: "nl", sport: "soccer", eventId: "e", market: "First half", claim: "Has drawn at the half recently.", sampleScope: "last 7", sampleSize: 7, hitCount: 6, marketLine: null, knownAtPreMatch: true });
    expect(p.authorityCeiling).toBe("INFO_ONLY");
  });
  it("with a line, a trend still caps at WATCH — never ACTION/PUBLIC_ACTION", () => {
    for (const p of buildAllTrendPassports()) {
      expect(["INFO_ONLY", "WATCH"]).toContain(p.authorityCeiling);
    }
  });
});

describe("Pricing — no odds cannot be valued", () => {
  it("a trend with a line but no odds grades NO_ODDS in trial", () => {
    const p = buildTrendPassport({ trendId: "no", sport: "mlb", eventId: "e", market: "Total", claim: "Under has hit recently.", sampleScope: "last 12", sampleSize: 12, hitCount: 9, marketLine: 9.5, oddsAtPublish: null, knownAtPreMatch: true });
    const trial = gradeTrendTrial(p, "pred-1", "WIN");
    expect(trial.processGrade).toBe("NO_ODDS");
  });
});

describe("Trial — process is separated from outcome", () => {
  it("a WIN on an overfit trend is graded LUCKY, not DESERVED", () => {
    const p = buildTrendPassport({ trendId: "of2", sport: "soccer", eventId: "e", market: "Total", claim: "Under has hit in this slice.", sampleScope: "last 5 away vs top-4", sampleSize: 5, hitCount: 5, homeAwayFilter: "AWAY", opponentFilter: "top-4", marketLine: 2.5, oddsAtPublish: 1.8, knownAtPreMatch: true });
    const trial = gradeTrendTrial(p, "pred-2", "WIN");
    expect(trial.processGrade).toBe("OVERFIT_TREND");
    expect(trial.outcomeGrade).toBe("LUCKY"); // won, but not on good process
  });
  it("a LOSS on a good-process trend is UNLUCKY, not a process failure", () => {
    const p = buildTrendPassport({ trendId: "gp", sport: "mlb", eventId: "e", market: "Total", claim: "Under has hit over a long run.", sampleScope: "last 60", sampleSize: 60, hitCount: 36, marketLine: 9.5, oddsAtPublish: 1.9, knownAtPreMatch: true });
    const trial = gradeTrendTrial(p, "pred-3", "LOSS");
    expect(trial.processGrade).toBe("GOOD_PROCESS");
    expect(trial.outcomeGrade).toBe("UNLUCKY");
  });
});

describe("Brand safety — no certainty language", () => {
  it("no passport claim/weakness/decision-use contains banned betting-certainty phrases", () => {
    for (const p of buildAllTrendPassports()) {
      for (const text of [p.claim, p.weakness, p.decisionUse, p.whatWouldInvalidate]) {
        expect(BANNED.test(text)).toBe(false);
      }
    }
  });
});
