import { describe, it, expect } from "vitest";
import { computeTargetSuccess, type TargetPlay } from "../target-success.js";
import { SUCCESS_RATE_MODEL_VERSION } from "../success-rate.js";
import { computeFeatureSchemaHash } from "../types.js";

const TARGET_SUCCESS_FEATURE_KEYS = ["epa"] as const;

function makeTarget(
  week: number,
  receiverId: string,
  epa: number | null,
  interception: 0 | 1 = 0,
  playType: string = "pass",
  season: number = 2026
): TargetPlay {
  return {
    playId: `test-${Math.random()}`,
    week,
    season,
    playType,
    receiverId,
    interception,
    epa
  };
}

describe("Target Success expected metric (SHADOW)", () => {
  it("computes hand-calculated fixtures for season-to-date correctly", () => {
    // We need 2 players that meet the floor of 20 targets.
    // Player A: 20 targets, 15 successful (75%)
    // Player B: 30 targets, 15 successful (50%)
    const plays: TargetPlay[] = [];

    // Player A
    for (let i = 0; i < 20; i++) {
      plays.push(makeTarget(1, "A", i < 15 ? 1.5 : -1.0));
    }

    // Player B
    for (let i = 0; i < 30; i++) {
      plays.push(makeTarget(1, "B", i < 15 ? 0.5 : -0.5));
    }

    const res = computeTargetSuccess(plays, 2026, 2, 20);
    const std = res.splits.filter(s => s.window === "season-to-date");

    expect(std.length).toBe(2);

    const splitA = std.find(s => s.playerId === "A")!;
    const splitB = std.find(s => s.playerId === "B")!;

    expect(splitA.ratedTargets).toBe(20);
    expect(splitA.successfulTargets).toBe(15);
    expect(splitA.rawTargetSuccessRate).toBe(0.75);

    expect(splitB.ratedTargets).toBe(30);
    expect(splitB.successfulTargets).toBe(15);
    expect(splitB.rawTargetSuccessRate).toBe(0.5);

    // League mean: (15 + 15) / (20 + 30) = 30 / 50 = 0.60
    expect(splitA.leagueMeanRate).toBeCloseTo(0.60, 4);
    expect(splitB.leagueMeanRate).toBeCloseTo(0.60, 4);

    // Shrunk A = 0.60 + (20/40) * (0.75 - 0.60) = 0.60 + 0.5 * 0.15 = 0.675
    expect(splitA.shrunkTargetSuccessRate).toBeCloseTo(0.675, 4);
    // Shrunk B = 0.60 + (30/50) * (0.50 - 0.60) = 0.60 + 0.6 * (-0.10) = 0.54
    expect(splitB.shrunkTargetSuccessRate).toBeCloseTo(0.54, 4);

    expect(splitA.provenance.modelVersion).toBe(SUCCESS_RATE_MODEL_VERSION);
    expect(splitA.provenance.method).toBe("deterministic-rule");
    expect(splitA.provenance.featureKeys).toEqual(["epa"]);
    expect(splitA.provenance.featureSchemaHash).toBe(computeFeatureSchemaHash(TARGET_SUCCESS_FEATURE_KEYS));
    expect(splitA.provenance.sampleSize).toBe(20);
  });

  it("handles EPA exact 0 boundary", () => {
    const plays: TargetPlay[] = [];
    // Player A gets 20 targets, some exactly 0, some positive, some negative
    // 10 positive, 5 zero, 5 negative -> 10 successful targets out of 20
    for (let i = 0; i < 10; i++) plays.push(makeTarget(1, "A", 0.01)); // IS success
    for (let i = 0; i < 5; i++) plays.push(makeTarget(1, "A", 0)); // NOT success
    for (let i = 0; i < 5; i++) plays.push(makeTarget(1, "A", -0.01)); // NOT success

    const res = computeTargetSuccess(plays, 2026, 2, 20);
    const splitA = res.splits.find(s => s.playerId === "A" && s.window === "season-to-date")!;

    expect(splitA.ratedTargets).toBe(20);
    expect(splitA.successfulTargets).toBe(10);
    expect(splitA.rawTargetSuccessRate).toBe(0.5);
  });

  it("excludes non-targets (empty receiver id, run plays)", () => {
    const plays: TargetPlay[] = [];

    // Player A has 19 valid targets, plus some invalid ones
    for (let i = 0; i < 19; i++) plays.push(makeTarget(1, "A", 1.0));

    // Invalid: empty receiver
    plays.push(makeTarget(1, "", 1.0, 0, "pass"));
    // Invalid: run play
    plays.push(makeTarget(1, "A", 1.0, 0, "run"));

    const res = computeTargetSuccess(plays, 2026, 2, 20);
    // Player A should be excluded due to having only 19 rated targets
    expect(res.splits.find(s => s.playerId === "A")).toBeUndefined();
    // But diagnostics will capture it in belowFloorExcluded
    // since we do a map iteration where the empty strings aren't mapped.
    // Let's ensure belowFloorExcluded counts the below-floor players.
    expect(res.diagnostics.belowFloorExcluded).toBeGreaterThanOrEqual(1); // At least 1 window (std) has A below floor
  });

  it("includes interceptions in denominator", () => {
    const plays: TargetPlay[] = [];
    for (let i = 0; i < 15; i++) plays.push(makeTarget(1, "A", 1.0));
    for (let i = 0; i < 5; i++) plays.push(makeTarget(1, "A", -2.5, 1)); // interceptions

    const res = computeTargetSuccess(plays, 2026, 2, 20);
    const splitA = res.splits.find(s => s.playerId === "A" && s.window === "season-to-date")!;

    expect(splitA.ratedTargets).toBe(20);
    expect(splitA.successfulTargets).toBe(15);
  });

  it("excludes null-EPA targets from BOTH numerator and denominator and counts in diagnostics", () => {
    const plays: TargetPlay[] = [];
    for (let i = 0; i < 20; i++) plays.push(makeTarget(1, "A", 1.0));
    // 3 null EPA plays
    plays.push(makeTarget(1, "A", null));
    plays.push(makeTarget(1, "B", null));
    plays.push(makeTarget(1, "C", null));

    const res = computeTargetSuccess(plays, 2026, 2, 20);
    const splitA = res.splits.find(s => s.playerId === "A" && s.window === "season-to-date")!;

    expect(splitA.ratedTargets).toBe(20);
    expect(res.diagnostics.nullEpaExcluded).toBe(3);
  });

  it("enforces floor omission logic", () => {
    const plays: TargetPlay[] = [];
    // Player A: 19 targets
    for (let i = 0; i < 19; i++) plays.push(makeTarget(1, "A", 1.0));
    // Player B: 20 targets
    for (let i = 0; i < 20; i++) plays.push(makeTarget(1, "B", 1.0));

    const res = computeTargetSuccess(plays, 2026, 2, 20);

    expect(res.splits.filter(s => s.playerId === "A").length).toBe(0); // absent in all windows
    expect(res.splits.filter(s => s.playerId === "B" && s.window === "season-to-date").length).toBe(1);

    // Player A is below floor in 3 windows
    expect(res.diagnostics.belowFloorExcluded).toBe(3);
  });

  it("enforces point-in-time discipline and last-N distinct week windows", () => {
    const plays: TargetPlay[] = [];
    // Target week is 10.
    // Player A has 20 targets in week 9. (successes: 20)
    for (let i = 0; i < 20; i++) plays.push(makeTarget(9, "A", 1.0));
    // Player A has 20 targets in week 8. (successes: 20)
    for (let i = 0; i < 20; i++) plays.push(makeTarget(8, "A", 1.0));
    // Player A has 20 targets in week 7. (successes: 20)
    for (let i = 0; i < 20; i++) plays.push(makeTarget(7, "A", 1.0));
    // Player A has 20 targets in week 6. (successes: 20)
    for (let i = 0; i < 20; i++) plays.push(makeTarget(6, "A", 1.0));
    // Player A has 20 targets in week 5. (successes: 0)
    for (let i = 0; i < 20; i++) plays.push(makeTarget(5, "A", -1.0));

    // Should be excluded due to PIT (week >= 10)
    for (let i = 0; i < 20; i++) plays.push(makeTarget(10, "A", 1.0));
    for (let i = 0; i < 20; i++) plays.push(makeTarget(11, "A", 1.0));

    const res = computeTargetSuccess(plays, 2026, 10, 20);

    const l4 = res.splits.find(s => s.playerId === "A" && s.window === "last-4")!;
    // Last 4 distinct weeks are 9, 8, 7, 6.
    // Total targets in those 4 weeks: 80.
    // Successes: 80.
    expect(l4.ratedTargets).toBe(80);
    expect(l4.successfulTargets).toBe(80);
    expect(l4.rawTargetSuccessRate).toBe(1.0);

    const l8 = res.splits.find(s => s.playerId === "A" && s.window === "last-8")!;
    // Last 8 distinct weeks available: 9, 8, 7, 6, 5 (only 5 weeks exist < 10)
    // Total targets: 100
    // Successes: 80
    expect(l8.ratedTargets).toBe(100);
    expect(l8.successfulTargets).toBe(80);
    expect(l8.rawTargetSuccessRate).toBe(0.8);

    const std = res.splits.find(s => s.playerId === "A" && s.window === "season-to-date")!;
    expect(std.ratedTargets).toBe(100);
    expect(std.successfulTargets).toBe(80);
  });
});
