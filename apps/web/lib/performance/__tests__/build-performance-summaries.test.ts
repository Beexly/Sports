import { describe, expect, it } from "vitest";
import {
  buildPerformanceSummaries,
  type SummaryPickRow,
} from "@/lib/performance/build-performance-summaries";

const KICKOFF = new Date("2026-09-10T23:00:00Z");

function row(over: Partial<SummaryPickRow> = {}): SummaryPickRow {
  return {
    sport: "baseball_mlb",
    pickType: "MONEYLINE",
    tier: "A",
    modelVersion: "v5.2.7",
    result: "WIN",
    settledAt: new Date("2026-09-11T02:00:00Z"),
    generatedAt: new Date("2026-09-10T12:00:00Z"), // pre-game on purpose
    commenceTime: KICKOFF,
    ...over,
  };
}

describe("buildPerformanceSummaries — the shape /performance reads", () => {
  it("groups one row per key and period, with winRate over decided picks only", () => {
    const built = buildPerformanceSummaries([
      row({ result: "WIN" }),
      row({ result: "WIN" }),
      row({ result: "LOSS" }),
      row({ result: "PUSH" }),
    ]);
    const all = built.rows.filter((r) => r.period === "all-time");
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      sport: "baseball_mlb",
      pickType: "MONEYLINE",
      tier: "A",
      modelVersion: "v5.2.7",
      totalPicks: 4,
      wins: 2,
      losses: 1,
      pushes: 1,
      // 2/3, not 2/4: a push is population, never rate — the same rule the page states.
      winRate: 0.6667,
    });
    expect(built.rows.filter((r) => r.period === "2026-09")).toHaveLength(1);
  });

  it("emits all-time even when settledAt is missing, but no monthly row for it", () => {
    const built = buildPerformanceSummaries([row({ settledAt: null })]);
    expect(built.rows.map((r) => r.period)).toEqual(["all-time"]);
  });

  it("separates keys: a different tier or modelVersion is a different row", () => {
    const built = buildPerformanceSummaries([
      row({ tier: "A" }),
      row({ tier: "B" }),
      row({ modelVersion: "v5.2.6" }),
    ]);
    expect(built.rows.filter((r) => r.period === "all-time")).toHaveLength(3);
  });
});

describe("buildPerformanceSummaries — what it refuses to count", () => {
  it("withholds in-play rows and reports them (C-302, same rule as the calibration readers)", () => {
    const built = buildPerformanceSummaries([
      row({ result: "WIN", generatedAt: new Date("2026-09-10T23:30:00Z") }), // after kickoff
      row({ result: "LOSS" }),
    ]);
    expect(built.skipped.inPlay).toBe(1);
    const all = built.rows.find((r) => r.period === "all-time")!;
    expect(all.totalPicks).toBe(1);
    expect(all.wins).toBe(0);
    expect(all.losses).toBe(1);
  });

  it("treats exactly-at-kickoff as in-play, the same boundary the readers use", () => {
    const built = buildPerformanceSummaries([row({ generatedAt: new Date(KICKOFF) })]);
    expect(built.skipped.inPlay).toBe(1);
    expect(built.rows).toHaveLength(0);
  });

  it("drops VOID and PENDING rather than scoring them either way, and counts them", () => {
    const built = buildPerformanceSummaries([
      row({ result: "VOID" }),
      row({ result: "PENDING" }),
      row({ result: "WIN" }),
    ]);
    expect(built.skipped.notDecidedOrVoid).toBe(2);
    const all = built.rows.find((r) => r.period === "all-time")!;
    expect(all.totalPicks).toBe(1);
  });

  it("counts an unkeyable row instead of inventing a sport or a version for it", () => {
    const built = buildPerformanceSummaries([
      row({ sport: null }),
      row({ modelVersion: null }),
      row({ sport: null, modelVersion: null }),
    ]);
    expect(built.skipped.unkeyable).toBe(3);
    expect(built.rows).toHaveLength(0);
  });
});

describe("buildPerformanceSummaries — determinism", () => {
  it("orders rows so two builds of the same input diff clean", () => {
    const input = [row({ tier: "B" }), row({ tier: "A" }), row({ modelVersion: "v5.2.6" })];
    const a = buildPerformanceSummaries(input).rows;
    const b = buildPerformanceSummaries([...input].reverse()).rows;
    expect(a).toEqual(b);
  });

  it("reports the periods it built, sorted", () => {
    const built = buildPerformanceSummaries([
      row({ settledAt: new Date("2026-08-02T00:00:00Z") }),
      row({ settledAt: new Date("2026-09-11T02:00:00Z") }),
    ]);
    expect(built.periods).toEqual(["2026-08", "2026-09", "all-time"]);
  });

  it("gives an empty population an empty result rather than a zero row", () => {
    const built = buildPerformanceSummaries([]);
    expect(built.rows).toHaveLength(0);
    expect(built.periods).toHaveLength(0);
    expect(built.skipped).toEqual({ notDecidedOrVoid: 0, inPlay: 0, unkeyable: 0 });
  });
});
