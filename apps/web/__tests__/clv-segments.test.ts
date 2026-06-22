import { describe, it, expect } from "vitest";
import {
  segmentClv,
  confidenceBand,
  type ClvGradedItem,
} from "@/lib/performance/clv-segments";

function item(overrides: Partial<ClvGradedItem> = {}): ClvGradedItem {
  return {
    sport: "NFL",
    pickType: "SPREAD",
    clvKind: "POINTS",
    clvValue: 0.5,
    verdict: "BEAT_CLOSE",
    confidence: 72,
    ...overrides,
  };
}

describe("confidence bands", () => {
  it("buckets scores into display bands", () => {
    expect(confidenceBand(95)).toBe("90-100");
    expect(confidenceBand(72)).toBe("70-79");
    expect(confidenceBand(50)).toBe("50-59");
    expect(confidenceBand(40)).toBe("<50");
    expect(confidenceBand(Number.NaN)).toBe("unknown");
  });
});

describe("segmented CLV", () => {
  it("groups by sport and computes a unit-free beat-close rate", () => {
    const items = [
      item({ sport: "NFL", verdict: "BEAT_CLOSE" }),
      item({ sport: "NFL", verdict: "LOST_TO_CLOSE" }),
      item({ sport: "NBA", verdict: "BEAT_CLOSE" }),
    ];
    const segs = segmentClv(items, "sport");
    const nfl = segs.find((s) => s.key === "NFL")!;
    expect(nfl.n).toBe(2);
    expect(nfl.beatCloseCount).toBe(1);
    expect(nfl.lostCloseCount).toBe(1);
    expect(nfl.beatCloseRatePct).toBe(50);
  });

  it("never averages CLV across units — a mixed segment reports null meanClv", () => {
    const items = [
      item({ pickType: "SPREAD", clvKind: "POINTS", clvValue: 0.8 }),
      item({ pickType: "MONEYLINE", clvKind: "PROBABILITY", clvValue: 0.02 }),
    ];
    // Group everything together by a constant dimension via sport (both NFL).
    const segs = segmentClv(items, "sport");
    expect(segs).toHaveLength(1);
    expect(segs[0]!.kind).toBe("MIXED");
    expect(segs[0]!.meanClv).toBeNull();
    // Rate is still valid across units.
    expect(segs[0]!.beatCloseRatePct).toBe(100);
  });

  it("reports a real mean CLV within a single unit", () => {
    const items = [
      item({ clvKind: "POINTS", clvValue: 1.0 }),
      item({ clvKind: "POINTS", clvValue: 0.0 }),
    ];
    const segs = segmentClv(items, "pickType");
    expect(segs[0]!.kind).toBe("POINTS");
    expect(segs[0]!.meanClv).toBe(0.5);
  });

  it("segments by confidence band", () => {
    const items = [
      item({ confidence: 91 }),
      item({ confidence: 72 }),
      item({ confidence: 71 }),
    ];
    const segs = segmentClv(items, "confidenceBand");
    expect(segs.find((s) => s.key === "70-79")!.n).toBe(2);
    expect(segs.find((s) => s.key === "90-100")!.n).toBe(1);
  });

  it("sorts segments by sample size (most-evidenced first)", () => {
    const items = [
      item({ sport: "NBA" }),
      item({ sport: "NFL" }),
      item({ sport: "NFL" }),
      item({ sport: "NFL" }),
    ];
    const segs = segmentClv(items, "sport");
    expect(segs.map((s) => s.key)).toEqual(["NFL", "NBA"]);
  });

  it("returns nothing for an empty graded set", () => {
    expect(segmentClv([], "sport")).toEqual([]);
  });
});
