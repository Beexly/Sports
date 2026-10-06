import { describe, it, expect } from "vitest";
import {
  censusAnchors,
  formatCensusReport,
  RunningStats,
  MIN_CENSUS_ROWS,
  type CensusObservation,
} from "../signal-anchor-census.js";

/** Deterministic pseudo-uniform generator — no Math.random, so tests cannot flake. */
function ramp(n: number, start = 0, step = 1): number[] {
  return Array.from({ length: n }, (_, i) => start + i * step);
}

function obs(key: string, values: readonly number[]): CensusObservation[] {
  return values.map((value) => ({ key, value }));
}

describe("RunningStats", () => {
  it("matches a hand-computed mean and population sd", () => {
    const s = new RunningStats();
    for (const v of [2, 4, 4, 4, 5, 5, 7, 9]) s.push(v);
    expect(s.n).toBe(8);
    expect(s.average).toBe(5);
    // Population sd of that classic set is 2.
    expect(s.stdDev).toBeCloseTo(2, 10);
  });

  it("divides by n (population), not n-1 (sample)", () => {
    // n=2, values 0 and 2: mean 1, population sd 1, sample sd would be sqrt(2).
    const s = new RunningStats();
    s.push(0);
    s.push(2);
    expect(s.stdDev).toBeCloseTo(1, 10);
  });

  it("reports 0 spread for a constant series and never a negative variance", () => {
    const s = new RunningStats();
    for (const v of ramp(50, 7, 0)) s.push(v);
    expect(s.stdDev).toBe(0);
    expect(s.stdDev).toBeGreaterThanOrEqual(0);
  });

  it("survives a catastrophic outlier where sum-of-squares would cancel to negative", () => {
    // The two-pass form computes sumSq - (sum^2)/n. With one 1e12 reading the
    // cancellation is severe enough to yield a negative variance in float64.
    const s = new RunningStats();
    for (const v of [1, 2, 3, 4, 1e12]) s.push(v);
    expect(Number.isFinite(s.stdDev)).toBe(true);
    expect(s.stdDev).toBeGreaterThan(0);
  });

  it("is NaN-guarded on an empty accumulator", () => {
    const s = new RunningStats();
    expect(s.n).toBe(0);
    expect(Number.isNaN(s.average)).toBe(true);
    expect(Number.isNaN(s.stdDev)).toBe(true);
  });
});

describe("censusAnchors", () => {
  it("measures anchor and spread from the population, not a hardcoded constant", () => {
    const report = censusAnchors(["k"], obs("k", [1, 2, 3, 4, 5]), { minRows: 5 });
    const e = report.entries[0]!;
    expect(e.status).toBe("measured");
    expect(e.anchor).toBe(3);
    expect(e.spread).toBeCloseTo(Math.sqrt(2), 10);
    expect(report.anchors["k"]).toEqual({ anchor: 3, spread: e.spread });
  });

  it("withholds the anchor below the row floor rather than averaging 3 rows", () => {
    const report = censusAnchors(["k"], obs("k", [1, 2, 3])); // n=3 < 30
    expect(report.entries[0]!.status).toBe("insufficient-rows");
    expect(report.anchors["k"]).toBeUndefined();
    expect(report.skipped[0]!.reason).toBe("insufficient-rows");
  });

  it("respects a custom floor and lands exactly on it", () => {
    const exactly = censusAnchors(["k"], obs("k", ramp(MIN_CENSUS_ROWS))).entries[0]!;
    expect(exactly.n).toBe(MIN_CENSUS_ROWS);
    expect(exactly.status).toBe("measured");

    const below = censusAnchors(["k"], obs("k", ramp(MIN_CENSUS_ROWS - 1))).entries[0]!;
    expect(below.status).toBe("insufficient-rows");
  });

  it("reports a constant column as zero-variance rather than dropping it silently", () => {
    const report = censusAnchors(["k"], obs("k", ramp(100, 0.42, 0)));
    const e = report.entries[0]!;
    expect(e.status).toBe("zero-variance");
    // No anchor is issued: normalizeReading treats a zero spread as no anchor.
    expect(report.anchors["k"]).toBeUndefined();
    // But it is still NAMED, so a dead producer is visible rather than missing.
    expect(report.skipped.map((s) => s.key)).toEqual(["k"]);
  });

  it("counts a key listed but never observed as insufficient, not absent", () => {
    const report = censusAnchors(["seen", "never_seen"], obs("seen", ramp(50)));
    const never = report.entries.find((e) => e.key === "never_seen")!;
    expect(never.status).toBe("insufficient-rows");
    expect(never.n).toBe(0);
    expect(never.coverage).toBe(0);
  });

  it("excludes non-finite readings from n but counts them against coverage", () => {
    const contaminated: CensusObservation[] = [
      ...obs("k", ramp(40)),
      { key: "k", value: Number.NaN },
      { key: "k", value: Number.POSITIVE_INFINITY },
    ];
    const e = censusAnchors(["k"], contaminated).entries[0]!;
    expect(e.n).toBe(40);
    expect(e.status).toBe("measured");
    expect(e.coverage).toBeCloseTo(40 / 42, 10);
  });

  it("a fully-NULL column reports coverage 0, not 'no rows'", () => {
    const allNull: CensusObservation[] = ramp(50).map(() => ({ key: "k", value: Number.NaN }));
    const e = censusAnchors(["k"], allNull).entries[0]!;
    expect(e.n).toBe(0);
    expect(e.coverage).toBe(0);
    expect(e.status).toBe("insufficient-rows");
  });

  it("keeps keys independent — one constant key does not suppress another", () => {
    const report = censusAnchors(
      ["dead", "live"],
      [...obs("dead", ramp(50, 1, 0)), ...obs("live", ramp(50, 1, 2))],
    );
    expect(report.entries.find((e) => e.key === "dead")!.status).toBe("zero-variance");
    expect(report.entries.find((e) => e.key === "live")!.status).toBe("measured");
    expect(report.measuredCount).toBe(1);
    expect(report.skippedCount).toBe(1);
  });

  it("ignores observations for a key that was never requested", () => {
    // Guards the census against silently widening its own remit.
    const report = censusAnchors(["wanted"], obs("unwanted", ramp(500)));
    expect(report.entries).toHaveLength(1);
    expect(report.anchors["unwanted"]).toBeUndefined();
  });

  it("is deterministic: identical rows give identical output", () => {
    const rows = [...obs("a", ramp(60, 3, 0.5)), ...obs("b", ramp(60, -2, 0.25))];
    expect(censusAnchors(["a", "b"], rows)).toEqual(censusAnchors(["a", "b"], rows));
  });
});

describe("formatCensusReport", () => {
  it("names every skipped key so a dead producer is visible in the report", () => {
    const report = censusAnchors(
      ["live_key", "dead_key", "thin_key"],
      [...obs("live_key", ramp(40)), ...obs("dead_key", ramp(40, 1, 0)), ...obs("thin_key", [1, 2])],
    );
    const text = formatCensusReport(report);
    expect(text).toContain("live_key");
    expect(text).toContain("dead_key");
    expect(text).toContain("thin_key");
    expect(text).toContain("zero-variance");
    expect(text).toContain("insufficient-rows");
    // The header must state the split, not imply everything was measured.
    expect(text).toContain("1 measured, 2 skipped");
  });

  it("says so plainly when nothing could be measured", () => {
    const text = formatCensusReport(censusAnchors(["a", "b"], obs("a", [1])));
    expect(text).toContain("0 measured, 2 skipped");
    expect(text).toContain("(none - every key is below the row floor or has no spread)");
  });
});
