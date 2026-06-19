import { describe, it, expect } from "vitest";

import {
  buildPickAnalyticsReport,
  PICK_ANALYTICS_MIN_SAMPLE,
  type SettledPickRecord,
} from "@/lib/cockpit/load-pick-analytics";

/**
 * Unit tests for the PURE pick-analytics aggregator (array → report).
 *
 * No DB is touched — `buildPickAnalyticsReport` is a pure function. We feed it
 * fixture record arrays and assert the aggregation (win rates + Wilson CI,
 * per-tier/sport/confidence-bin breakdowns, reliability, CLV beat-rate, streak,
 * and bankroll/drawdown framing) plus the honest INSUFFICIENT_SAMPLE floor.
 */

type ResultLit = SettledPickRecord["result"];

let seq = 0;
function rec(over: Partial<SettledPickRecord> = {}): SettledPickRecord {
  seq += 1;
  // Monotonic ISO so the chronological streak/bankroll order is deterministic.
  const iso = new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString();
  return {
    sport: "nfl",
    market: "SPREAD",
    tier: "PREMIUM",
    confidence: 65,
    result: "WIN",
    clvVerdict: null,
    clvValue: null,
    settledAtIso: iso,
    ...over,
  };
}

/** Build N records with a given result. */
function many(n: number, result: ResultLit, over: Partial<SettledPickRecord> = {}): SettledPickRecord[] {
  return Array.from({ length: n }, () => rec({ result, ...over }));
}

describe("buildPickAnalyticsReport — honest empty / below floor", () => {
  it("empty input is INSUFFICIENT_SAMPLE with honest zeros", () => {
    const r = buildPickAnalyticsReport([]);
    expect(r.status).toBe("INSUFFICIENT_SAMPLE");
    expect(r.totalRecords).toBe(0);
    expect(r.decidedRecords).toBe(0);
    expect(r.floor).toBe(PICK_ANALYTICS_MIN_SAMPLE);
    expect(r.insufficientNote).toBeTypeOf("string");
    // No fabricated rate over zero decided picks.
    expect(r.overall.winRate).toBeNull();
    expect(r.overall.ci95).toBeNull();
    expect(r.byTier).toHaveLength(0);
    expect(r.bySport).toHaveLength(0);
    expect(r.byConfidenceBin).toHaveLength(0);
    expect(r.clv.beatRate).toBeNull();
    expect(r.streak.settled).toBe(0);
    expect(r.bankroll.finalUnits).toBeNull();
  });

  it("a small decided sample stays INSUFFICIENT_SAMPLE but still reports honest counts", () => {
    const records = [...many(3, "WIN"), ...many(2, "LOSS")];
    const r = buildPickAnalyticsReport(records);
    expect(r.status).toBe("INSUFFICIENT_SAMPLE");
    expect(r.decidedRecords).toBe(5);
    // Honest rate for the small sample it describes.
    expect(r.overall.winRate).toBeCloseTo(3 / 5, 10);
    expect(r.overall.ci95).not.toBeNull();
  });
});

describe("buildPickAnalyticsReport — happy path with enough sample", () => {
  // 70 wins, 50 losses, 10 pushes → 120 decided ≥ floor (100).
  function bigSample(): SettledPickRecord[] {
    return [
      ...many(70, "WIN"),
      ...many(50, "LOSS"),
      ...many(10, "PUSH"),
    ];
  }

  it("clears the floor and computes overall win rate over decided picks only", () => {
    const r = buildPickAnalyticsReport(bigSample());
    expect(r.status).toBe("OK");
    expect(r.totalRecords).toBe(130);
    expect(r.decidedRecords).toBe(120);
    expect(r.insufficientNote).toBeNull();
    // 70 / (70 + 50) — pushes excluded.
    expect(r.overall.winRate).toBeCloseTo(70 / 120, 10);
    expect(r.overall.wins).toBe(70);
    expect(r.overall.losses).toBe(50);
    expect(r.overall.pushes).toBe(10);
  });

  it("attaches a Wilson 95% CI that brackets the point estimate", () => {
    const r = buildPickAnalyticsReport(bigSample());
    const ci = r.overall.ci95;
    expect(ci).not.toBeNull();
    if (ci && r.overall.winRate !== null) {
      const [lo, hi] = ci;
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
      expect(lo).toBeLessThan(r.overall.winRate);
      expect(hi).toBeGreaterThan(r.overall.winRate);
    }
  });

  it("breaks out per-tier and per-sport, omitting empty groups", () => {
    const records = [
      ...many(60, "WIN", { tier: "PREMIUM", sport: "nfl" }),
      ...many(40, "LOSS", { tier: "PREMIUM", sport: "nfl" }),
      ...many(8, "WIN", { tier: "FREE", sport: "nba" }),
      ...many(4, "LOSS", { tier: "FREE", sport: "nba" }),
    ];
    const r = buildPickAnalyticsReport(records);

    const tiers = r.byTier.map((c) => c.label).sort();
    expect(tiers).toEqual(["FREE", "PREMIUM"]);
    const premium = r.byTier.find((c) => c.label === "PREMIUM");
    expect(premium?.decided).toBe(100);
    expect(premium?.winRate).toBeCloseTo(60 / 100, 10);

    const sports = r.bySport.map((c) => c.label).sort();
    expect(sports).toEqual(["nba", "nfl"]);
    // No phantom tiers/sports with zero picks.
    expect(r.byTier.every((c) => c.decided + c.pushes > 0)).toBe(true);
  });

  it("bins by confidence and omits empty bins; reliability mirrors the bins", () => {
    const records = [
      ...many(30, "WIN", { confidence: 55 }), // 50–60 bin
      ...many(20, "LOSS", { confidence: 55 }),
      ...many(40, "WIN", { confidence: 85 }), // 80–90 bin
      ...many(20, "LOSS", { confidence: 85 }),
    ];
    const r = buildPickAnalyticsReport(records);
    const binLabels = r.byConfidenceBin.map((c) => c.label).sort();
    expect(binLabels).toEqual(["50–60%", "80–90%"]);
    // 70–80% bin is empty → must be omitted, never printed as 0%.
    expect(r.byConfidenceBin.find((c) => c.label === "70–80%")).toBeUndefined();

    // Reliability rows align 1:1 with the populated bins.
    expect(r.reliability.map((x) => x.label).sort()).toEqual(binLabels);
    const hiBand = r.reliability.find((x) => x.label === "80–90%");
    expect(hiBand?.meanConfidence).toBeCloseTo(0.85, 10);
    expect(hiBand?.observedWinRate).toBeCloseTo(40 / 60, 10);
  });

  it("aggregates CLV beat-rate from verdicts and means clvValue over valued picks", () => {
    const records = [
      ...many(60, "WIN", { clvVerdict: "BEAT_CLOSE", clvValue: 2 }),
      ...many(30, "LOSS", { clvVerdict: "LOST_TO_CLOSE", clvValue: -1 }),
      ...many(20, "WIN", { clvVerdict: "MATCHED_CLOSE", clvValue: 0 }),
      // Ungraded picks contribute to neither the beat-rate nor the mean.
      ...many(10, "LOSS", { clvVerdict: null, clvValue: null }),
    ];
    const r = buildPickAnalyticsReport(records);
    expect(r.clv.graded).toBe(110); // 60 + 30 + 20
    expect(r.clv.beatClose).toBe(60);
    expect(r.clv.beatRate).toBeCloseTo(60 / 110, 10);
    expect(r.clv.beatRateCi95).not.toBeNull();
    expect(r.clv.clvValued).toBe(110);
    // mean = (60*2 + 30*-1 + 20*0) / 110 = 90/110
    expect(r.clv.meanClvValue).toBeCloseTo(90 / 110, 10);
  });

  it("computes a streak over the chronological decided series (push breaks runs)", () => {
    // Construct an explicit chronological order via settledAtIso.
    const records: SettledPickRecord[] = [];
    const push = (result: ResultLit, i: number) =>
      records.push(rec({ result, settledAtIso: new Date(Date.UTC(2026, 1, 1, 0, 0, i)).toISOString() }));
    // ...padding to clear the floor, then a clean tail of 3 wins.
    for (let i = 0; i < 100; i++) push(i % 2 === 0 ? "WIN" : "LOSS", i);
    push("WIN", 101);
    push("WIN", 102);
    push("WIN", 103);
    const r = buildPickAnalyticsReport(records);
    expect(r.streak.currentStreak.type).toBe("win");
    expect(r.streak.currentStreak.length).toBe(3);
    expect(r.streak.settled).toBe(103); // 100 + 3 decided; pushes would be excluded
  });

  it("frames a bankroll/drawdown shape over a flat-stake series (assumption documented)", () => {
    const r = buildPickAnalyticsReport(bigSample());
    expect(r.bankroll.decided).toBe(120);
    expect(r.bankroll.stakeUnits).toBe(1);
    // −110 standard juice decimal.
    expect(r.bankroll.assumedDecimalOdds).toBeCloseTo(100 / 110 + 1, 10);
    expect(typeof r.bankroll.finalUnits).toBe("number");
    // Drawdown fractions are well-formed.
    expect(r.bankroll.drawdown.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(r.bankroll.drawdown.maxDrawdownPct).toBeLessThanOrEqual(1);
  });

  it("excludes VOID and PENDING from decided counts and the bankroll series", () => {
    const records = [
      ...many(70, "WIN"),
      ...many(40, "LOSS"),
      ...many(15, "VOID"),
      ...many(5, "PENDING"),
    ];
    const r = buildPickAnalyticsReport(records);
    expect(r.decidedRecords).toBe(110);
    // VOID/PENDING are not pushes either — overall pushes stay 0 here.
    expect(r.overall.pushes).toBe(0);
    // Streak only saw win/loss outcomes (110), no void/pending.
    expect(r.streak.settled).toBe(110);
  });
});
