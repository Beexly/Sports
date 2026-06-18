/**
 * Tests for the PURE reality-engine diagnostics aggregator
 * (apps/web/lib/reality/diagnostics.ts).
 *
 * A fixture array of settled-pick records drives every assertion: CLV-by-segment,
 * edge-type counts, autopsy counts, and the honest no-bet / calibration caveats.
 * Pure — no DB, no fetch, no clock. The edge-significance RNG is injected so the
 * Monte-Carlo is deterministic.
 */

import { describe, it, expect } from "vitest";
import {
  buildDiagnosticsReport,
  buildCalibrationReadiness,
  timeToCloseBucket,
  STANDING_CAVEATS,
  DEFAULT_MIN_SEGMENT_SAMPLE,
  type SettledPickRecord,
} from "../diagnostics";

// Generation 24h before kickoff → "12-48h" bucket for the NFL/SPREAD rows.
const GEN = "2026-01-01T00:00:00.000Z";
const KICK = "2026-01-02T00:00:00.000Z";

/**
 * Fixture: 5 NFL spread picks (points unit) + 1 NBA moneyline pick (probability unit).
 * NFL spread CLV verdicts: BEAT, BEAT, BEAT, LOST, MATCHED → beatCloseRate 3/5 = 0.6.
 */
const FIXTURE: SettledPickRecord[] = [
  {
    sport: "americanfootball_nfl", market: "SPREAD", result: "WIN", tier: "PRO", confidence: 75,
    clvVerdict: "BEAT_CLOSE", clvValue: 1.0, clvKind: "POINTS", generatedAt: GEN, commenceTime: KICK,
    nullProb: 0.5,
  },
  {
    sport: "americanfootball_nfl", market: "SPREAD", result: "LOSS", tier: "PRO", confidence: 72,
    clvVerdict: "BEAT_CLOSE", clvValue: 0.5, clvKind: "POINTS", generatedAt: GEN, commenceTime: KICK,
    nullProb: 0.5,
  },
  {
    sport: "americanfootball_nfl", market: "SPREAD", result: "WIN", tier: "FREE", confidence: 80,
    clvVerdict: "BEAT_CLOSE", clvValue: 2.0, clvKind: "POINTS", generatedAt: GEN, commenceTime: KICK,
    nullProb: 0.5,
    // Cross-book disagreement → book-disagreement-lag edge type.
    bookDispersion: 0.05, bookCount: 4,
  },
  {
    sport: "americanfootball_nfl", market: "SPREAD", result: "LOSS", tier: "PRO", confidence: 71,
    clvVerdict: "LOST_TO_CLOSE", clvValue: -1.0, clvKind: "POINTS", generatedAt: GEN, commenceTime: KICK,
    nullProb: 0.5,
  },
  {
    sport: "americanfootball_nfl", market: "SPREAD", result: "WIN", tier: "PRO", confidence: 73,
    clvVerdict: "MATCHED_CLOSE", clvValue: 0.0, clvKind: "POINTS", generatedAt: GEN, commenceTime: KICK,
    nullProb: 0.5,
    // Large move + meaningful retrace → market-overcorrection edge type.
    lineMovement: { magnitude: 2.0, reversal: 1.0 },
  },
  {
    sport: "basketball_nba", market: "MONEYLINE", result: "LOSS", tier: "ELITE", confidence: 60,
    clvVerdict: "LOST_TO_CLOSE", clvValue: -0.02, clvKind: "PROBABILITY", generatedAt: GEN, commenceTime: KICK,
    nullProb: 0.5,
  },
];

// Deterministic RNG: returns 0.999 → simulated wins are almost never recorded, so the
// permutation p-value is stable across runs (we assert structure, not a luck claim).
const FIXED_RNG = () => 0.999;

describe("buildDiagnosticsReport — sample counts", () => {
  const report = buildDiagnosticsReport(FIXTURE, { eligibleSampleSize: 16 }, { random: FIXED_RNG });

  it("counts total, decided (WIN/LOSS), and CLV-graded records from the input", () => {
    expect(report.totalRecords).toBe(6);
    expect(report.decidedRecords).toBe(6); // all 6 are WIN/LOSS
    expect(report.clvGradedRecords).toBe(6); // all 6 carry a verdict + finite value
  });
});

describe("buildDiagnosticsReport — CLV by segment (via engine summarizeClv)", () => {
  const report = buildDiagnosticsReport(FIXTURE, { eligibleSampleSize: 16 }, {
    random: FIXED_RNG,
    minSegmentSample: 5, // make the 5-pick NFL segment exactly meet the floor
  });

  it("buckets the 5 NFL spread picks into one points segment with beatCloseRate 0.6", () => {
    const nflSpread = report.clvBySegment.find(
      (s) => s.sport === "americanfootball_nfl" && s.market === "SPREAD",
    );
    expect(nflSpread).toBeDefined();
    expect(nflSpread!.unit).toBe("POINTS");
    expect(nflSpread!.timeToCloseBucket).toBe("12-48h");
    expect(nflSpread!.confidenceBand).toBe("SHARP"); // 71-80 all land in SHARP (70-92)
    expect(nflSpread!.summary.sampleSize).toBe(5);
    expect(nflSpread!.summary.beatCloseRate).toBe(0.6); // 3 of 5 BEAT_CLOSE
    expect(nflSpread!.summary.lostToCloseRate).toBe(0.2); // 1 of 5 LOST
    expect(nflSpread!.suppressed).toBe(false); // 5 >= minSegmentSample 5
  });

  it("keeps points and probability units separate (NBA moneyline is its own segment)", () => {
    const nbaMl = report.clvBySegment.find((s) => s.sport === "basketball_nba");
    expect(nbaMl).toBeDefined();
    expect(nbaMl!.unit).toBe("PROBABILITY");
    expect(nbaMl!.summary.sampleSize).toBe(1);
    // Global rollup splits by unit and never mixes them.
    const units = report.clvGlobalByUnit.map((g) => g.unit).sort();
    expect(units).toEqual(["POINTS", "PROBABILITY"]);
    const points = report.clvGlobalByUnit.find((g) => g.unit === "POINTS")!;
    expect(points.summary.sampleSize).toBe(5);
    expect(points.summary.beatCloseRate).toBe(0.6);
  });

  it("suppresses (flags 'collecting') segments below the minimum sample floor", () => {
    // With the default ≥20 discipline, the 5-pick NFL segment is suppressed.
    const defaultReport = buildDiagnosticsReport(FIXTURE, { eligibleSampleSize: 16 }, { random: FIXED_RNG });
    expect(DEFAULT_MIN_SEGMENT_SAMPLE).toBe(20);
    const nflSpread = defaultReport.clvBySegment.find(
      (s) => s.sport === "americanfootball_nfl" && s.market === "SPREAD",
    );
    expect(nflSpread!.suppressed).toBe(true);
  });
});

describe("buildDiagnosticsReport — edge-type counts (via engine tagEdgeType)", () => {
  const report = buildDiagnosticsReport(FIXTURE, { eligibleSampleSize: 16 }, { random: FIXED_RNG });

  it("tags the dispersion row as book-disagreement-lag and the move+retrace row as market-overcorrection", () => {
    const byType = new Map(report.edgeTypeCounts.map((c) => [c.type, c.count]));
    expect(byType.get("book-disagreement-lag")).toBe(1);
    expect(byType.get("market-overcorrection")).toBe(1);
  });

  it("the remaining rows (no usable market read) are untaggable, never a fabricated type", () => {
    const byType = new Map(report.edgeTypeCounts.map((c) => [c.type, c.count]));
    // 6 records − 1 dispersion − 1 overcorrection = 4 with no usable signal → untaggable.
    expect(byType.get("untaggable")).toBe(4);
    // Data-blocked types are never positively counted.
    expect(byType.get("stale-injury-price")).toBeUndefined();
    expect(byType.get("weather-underreaction")).toBeUndefined();
  });

  it("marks the detectable-now HAVE types correctly", () => {
    const book = report.edgeTypeCounts.find((c) => c.type === "book-disagreement-lag")!;
    expect(book.detectableNow).toBe(true);
  });
});

describe("buildDiagnosticsReport — autopsy counts (via engine classifyAutopsy)", () => {
  const report = buildDiagnosticsReport(FIXTURE, { eligibleSampleSize: 16 }, { random: FIXED_RNG });

  it("classifies the result × CLV matrix from the fixture", () => {
    const byCls = new Map(report.autopsyCounts.map((c) => [c.cls, c.count]));
    // WIN+BEAT → good-win (row 1), WIN+BEAT → good-win (row 3),
    // WIN+MATCHED → good-win (row 5, market confirmed our number) = 3 good-win.
    expect(byCls.get("good-win")).toBe(3);
    // LOSS+BEAT → CLV-win/result-loss (row 2): right process, variance bit.
    expect(byCls.get("CLV-win/result-loss")).toBe(1);
    // LOSS+LOST → bad-loss (row 4 NFL) AND LOSS+LOST (row 6 NBA) = 2 bad-loss.
    expect(byCls.get("bad-loss")).toBe(2);
  });

  it("counts every classified record exactly once (sum equals decided sample)", () => {
    const total = report.autopsyCounts.reduce((n, c) => n + c.count, 0);
    expect(total).toBe(report.totalRecords);
  });

  it("never returns a needs-more-signal class (no no-bet-gate classes)", () => {
    const classes = report.autopsyCounts.map((c) => c.cls);
    expect(classes).not.toContain("no-bet-gate-saved-us");
    expect(classes).not.toContain("no-bet-gate-cost-us");
    expect(classes).not.toContain("bad-expression");
  });
});

describe("buildDiagnosticsReport — edge significance (via engine permutation test)", () => {
  it("runs over the decided sample carrying a nullProb, deterministically with injected RNG", () => {
    const report = buildDiagnosticsReport(FIXTURE, {}, { random: FIXED_RNG, significanceTrials: 100 });
    expect(report.edgeSignificance).not.toBeNull();
    expect(report.edgeSignificance!.picks).toBe(6);
    expect(report.edgeSignificance!.observedWins).toBe(3); // 3 WINs in the fixture
    expect(report.edgeSignificance!.trials).toBe(100);
  });

  it("returns null (no invented baseline) when no decided record carries a nullProb", () => {
    const noNull = FIXTURE.map((r) => ({ ...r, nullProb: null }));
    const report = buildDiagnosticsReport(noNull, {}, { random: FIXED_RNG });
    expect(report.edgeSignificance).toBeNull();
    expect(report.edgeSignificanceNote).toMatch(/never invent|not computed/i);
  });
});

describe("buildDiagnosticsReport — honest calibration + no-bet caveats", () => {
  it("states N/floor plainly when eligible sample is known and below the floor", () => {
    const report = buildDiagnosticsReport(FIXTURE, { eligibleSampleSize: 16 });
    expect(report.calibration.eligibleSampleSize).toBe(16);
    expect(report.calibration.floor).toBe(100);
    expect(report.calibration.meetsFloor).toBe(false);
    expect(report.calibration.statusLine).toMatch(/data-blocked at 16\/100/);
  });

  it("says 'unknown' and never green-lights when the eligible sample is absent", () => {
    const report = buildDiagnosticsReport(FIXTURE, {});
    expect(report.calibration.eligibleSampleSize).toBeNull();
    expect(report.calibration.meetsFloor).toBe(false);
    expect(report.calibration.statusLine).toMatch(/UNKNOWN/i);
  });

  it("always carries the building-the-record and no-bet-ledger-not-wired caveats", () => {
    const report = buildDiagnosticsReport(FIXTURE, { eligibleSampleSize: 16 });
    expect(report.caveats).toEqual(STANDING_CAVEATS);
    expect(report.caveats.join(" ")).toMatch(/No-bet ledger not yet wired/i);
    expect(report.caveats.join(" ")).toMatch(/heuristic sum in scoring\.ts/i);
  });

  it("empty input degrades honestly (no fabricated numbers)", () => {
    const report = buildDiagnosticsReport([], {});
    expect(report.totalRecords).toBe(0);
    expect(report.clvBySegment).toHaveLength(0);
    expect(report.edgeSignificance).toBeNull();
    expect(report.caveats).toEqual(STANDING_CAVEATS);
  });
});

describe("helper: timeToCloseBucket + buildCalibrationReadiness", () => {
  it("buckets lead time honestly and returns 'unknown' on missing/invalid/negative input", () => {
    expect(timeToCloseBucket(GEN, KICK)).toBe("12-48h");
    expect(timeToCloseBucket("2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z")).toBe("<2h");
    expect(timeToCloseBucket("2026-01-01T00:00:00Z", "2026-01-01T06:00:00Z")).toBe("2-12h");
    expect(timeToCloseBucket("2026-01-01T00:00:00Z", "2026-01-05T00:00:00Z")).toBe(">48h");
    expect(timeToCloseBucket(null, KICK)).toBe("unknown");
    expect(timeToCloseBucket(KICK, GEN)).toBe("unknown"); // kickoff before generation
  });

  it("meetsFloor is true only when the known eligible sample reaches the floor", () => {
    expect(buildCalibrationReadiness({ eligibleSampleSize: 100 }, 0).meetsFloor).toBe(true);
    expect(buildCalibrationReadiness({ eligibleSampleSize: 99 }, 0).meetsFloor).toBe(false);
    expect(buildCalibrationReadiness({ eligibleSampleSize: null }, 50).meetsFloor).toBe(false);
  });
});
