/**
 * buildPerformanceSummaries: the shape /performance reads, and the invariants that
 * keep it honest â€” pushes in the population not the rate, in-play rows withheld,
 * and the rate in PERCENTAGE POINTS through the allow-listed helper.
 */
import { describe, expect, it } from "vitest";
import {
  buildPerformanceSummaries,
  decodeLaneModelVersion,
  encodeLaneModelVersion,
  laneFromBookmakerCount,
  MODEL_SIGNAL_LANE_SUFFIX,
  type SummaryPickRow,
} from "@/lib/performance/build-performance-summaries";
import { winRatePct } from "@/lib/format/stat";

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
    bookmakerCount: 8,
    ...over,
  };
}

describe("buildPerformanceSummaries â€” the shape /performance reads", () => {
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
      // 2 of 3 DECIDED picks, in PERCENTAGE POINTS, through the allow-listed helper:
      // a push is population, never rate â€” the same rule the page states. Pinned
      // against winRatePct rather than a literal so the unit cannot drift back to a
      // fraction: the first version of this stored 0.6667 here, wrong by 100x.
      winRate: winRatePct(2, 1),
    });
    expect(built.rows.filter((r) => r.period === "2026-09")).toHaveLength(1);
  });

  it("stores PERCENTAGE POINTS, not a 0-1 fraction â€” a regression to a fraction is 100x wrong", () => {
    // 50% is the clean discriminator: a fraction implementation would store 0.5.
    const built = buildPerformanceSummaries([row({ result: "WIN" }), row({ result: "LOSS" })]);
    const all = built.rows.find((r) => r.period === "all-time");
    expect(all?.winRate).toBe(50);
    expect(all?.winRate).not.toBe(0.5);
  });

  it("a group with no decided pick stores 0 through the helper's null case, never a fabricated rate", () => {
    const built = buildPerformanceSummaries([row({ result: "PUSH" })]);
    const all = built.rows.find((r) => r.period === "all-time");
    // No decided pick exists, so the sanctioned helper refuses to state a rate at all...
    expect(winRatePct(all?.wins ?? 0, all?.losses ?? 0)).toBeNull();
    // ...and the non-nullable column carries the schema's default, meaning "no decided
    // pick" rather than a 0% record.
    expect(all?.winRate).toBe(0);
    expect(all?.pushes).toBe(1);
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

describe("buildPerformanceSummaries â€” what it refuses to count", () => {
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

describe("buildPerformanceSummaries â€” determinism", () => {
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

describe("buildPerformanceSummaries — book-priced vs model-signal lanes (C-352)", () => {
  it("classifies by bookmakerCount >= 1 vs 0; absent/null counts as model-signal", () => {
    expect(laneFromBookmakerCount(1)).toBe("book-priced");
    expect(laneFromBookmakerCount(8)).toBe("book-priced");
    expect(laneFromBookmakerCount(0)).toBe("model-signal");
    expect(laneFromBookmakerCount(null)).toBe("model-signal");
    expect(laneFromBookmakerCount(undefined)).toBe("model-signal");
  });

  it("encodes the model-signal lane into modelVersion so the frozen unique key holds both", () => {
    expect(encodeLaneModelVersion("v5.2.7", "book-priced")).toBe("v5.2.7");
    expect(encodeLaneModelVersion("v5.2.7", "model-signal")).toBe(
      `v5.2.7${MODEL_SIGNAL_LANE_SUFFIX}`,
    );
    expect(decodeLaneModelVersion("v5.2.7")).toEqual({
      modelVersion: "v5.2.7",
      lane: "book-priced",
    });
    expect(decodeLaneModelVersion(`v5.2.7${MODEL_SIGNAL_LANE_SUFFIX}`)).toEqual({
      modelVersion: "v5.2.7",
      lane: "model-signal",
    });
  });

  it("emits TWO all-time rows when the population mixes lanes, and keeps both in the record", () => {
    const built = buildPerformanceSummaries([
      row({ result: "WIN", bookmakerCount: 8 }),
      row({ result: "LOSS", bookmakerCount: 8 }),
      row({ result: "WIN", bookmakerCount: 0 }),
      row({ result: "WIN", bookmakerCount: 0 }),
      row({ result: "LOSS", bookmakerCount: 0 }),
    ]);
    const all = built.rows.filter((r) => r.period === "all-time");
    expect(all).toHaveLength(2);

    const book = all.find((r) => decodeLaneModelVersion(r.modelVersion).lane === "book-priced")!;
    const signal = all.find((r) => decodeLaneModelVersion(r.modelVersion).lane === "model-signal")!;

    expect(book).toMatchObject({ wins: 1, losses: 1, totalPicks: 2 });
    expect(signal).toMatchObject({ wins: 2, losses: 1, totalPicks: 3 });
    expect(book.wins + signal.wins).toBe(3);
    expect(book.losses + signal.losses).toBe(2);
  });

  it("a model-signal row cannot land in the book-priced bucket", () => {
    const built = buildPerformanceSummaries([
      row({ result: "WIN", bookmakerCount: 0 }),
      row({ result: "LOSS", bookmakerCount: 0 }),
    ]);
    const all = built.rows.filter((r) => r.period === "all-time");
    expect(all).toHaveLength(1);
    expect(decodeLaneModelVersion(all[0]!.modelVersion).lane).toBe("model-signal");
    expect(all[0]!.modelVersion).not.toBe("v5.2.7");
  });
});