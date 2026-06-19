import { describe, it, expect } from "vitest";

import {
  validatePaceScheduleInput,
  runPaceScheduleOptimization,
  PACE_SCHEDULE_DISCLAIMER,
  PACE_MAX_REST,
  type PaceScheduleInput,
} from "@/lib/lab/pace-schedule-optimizer";

function baseInput(overrides: Partial<PaceScheduleInput> = {}): PaceScheduleInput {
  return {
    league: "NBA",
    homeName: "Home",
    awayName: "Away",
    homeDaysRest: 2,
    awayDaysRest: 2,
    homeBackToBack: false,
    awayBackToBack: false,
    homeTempo: null,
    awayTempo: null,
    ...overrides,
  };
}

describe("validatePaceScheduleInput", () => {
  it("rejects non-objects", () => {
    expect(validatePaceScheduleInput(null)).toEqual({
      error: expect.stringContaining("JSON object"),
    });
    expect(validatePaceScheduleInput("nope")).toHaveProperty("error");
    expect(validatePaceScheduleInput(42)).toHaveProperty("error");
  });

  it("requires a valid league", () => {
    expect(
      validatePaceScheduleInput({ homeDaysRest: 2, awayDaysRest: 2 }),
    ).toHaveProperty("error");
    expect(
      validatePaceScheduleInput({
        league: "MLS",
        homeDaysRest: 2,
        awayDaysRest: 2,
      }),
    ).toHaveProperty("error");
  });

  it("accepts a lowercase league string and normalizes it", () => {
    const res = validatePaceScheduleInput({
      league: "nfl",
      homeDaysRest: 7,
      awayDaysRest: 6,
    });
    expect(res).not.toHaveProperty("error");
    expect((res as PaceScheduleInput).league).toBe("NFL");
  });

  it("requires the two rest fields", () => {
    expect(validatePaceScheduleInput({ league: "NBA" })).toHaveProperty("error");
    expect(
      validatePaceScheduleInput({ league: "NBA", homeDaysRest: 2 }),
    ).toHaveProperty("error");
  });

  it("accepts numeric strings for rest", () => {
    const res = validatePaceScheduleInput({
      league: "NBA",
      homeDaysRest: "3",
      awayDaysRest: "1",
    });
    expect(res).not.toHaveProperty("error");
    const v = res as PaceScheduleInput;
    expect(v.homeDaysRest).toBe(3);
    expect(v.awayDaysRest).toBe(1);
  });

  it("clamps rest into 0..14 and rounds", () => {
    const v = validatePaceScheduleInput({
      league: "NBA",
      homeDaysRest: 999,
      awayDaysRest: -5,
    }) as PaceScheduleInput;
    expect(v.homeDaysRest).toBe(PACE_MAX_REST);
    expect(v.awayDaysRest).toBe(0);
  });

  it("collapses rest to 1 day when the back-to-back flag is set", () => {
    const v = validatePaceScheduleInput({
      league: "NBA",
      homeDaysRest: 5,
      awayDaysRest: 5,
      homeBackToBack: true,
    }) as PaceScheduleInput;
    expect(v.homeBackToBack).toBe(true);
    expect(v.homeDaysRest).toBe(1);
    expect(v.awayDaysRest).toBe(5);
  });

  it("treats missing optional tempo as null", () => {
    const v = validatePaceScheduleInput({
      league: "NBA",
      homeDaysRest: 2,
      awayDaysRest: 2,
    }) as PaceScheduleInput;
    expect(v.homeTempo).toBeNull();
    expect(v.awayTempo).toBeNull();
  });

  it("clamps supplied tempo into range", () => {
    const v = validatePaceScheduleInput({
      league: "NBA",
      homeDaysRest: 2,
      awayDaysRest: 2,
      homeTempo: 9999,
      awayTempo: 1,
    }) as PaceScheduleInput;
    expect(v.homeTempo).toBe(130);
    expect(v.awayTempo).toBe(40);
  });

  it("truncates over-long team names", () => {
    const v = validatePaceScheduleInput({
      league: "NBA",
      homeDaysRest: 2,
      awayDaysRest: 2,
      homeName: "x".repeat(200),
    }) as PaceScheduleInput;
    expect(v.homeName.length).toBeLessThanOrEqual(48);
  });
});

describe("runPaceScheduleOptimization", () => {
  it("returns a neutral, zero-shift frame for symmetric rest", () => {
    const out = runPaceScheduleOptimization(baseInput());
    expect(out.expectedMarginShift).toBe(0);
    expect(out.leans).toBe("neutral");
    expect(out.restEdgeDays).toBe(0);
    // Symmetric => coin-flip on who carries the edge.
    expect(out.homeAdvantageProbability).toBeCloseTo(0.5, 5);
  });

  it("favors the better-rested side", () => {
    const out = runPaceScheduleOptimization(
      baseInput({ homeDaysRest: 4, awayDaysRest: 1 }),
    );
    expect(out.expectedMarginShift).toBeGreaterThan(0);
    expect(out.leans).toBe("home");
    expect(out.homeAdvantageProbability).toBeGreaterThan(0.5);
    expect(out.restEdgeDays).toBe(3);
  });

  it("penalizes the side on a back-to-back", () => {
    const out = runPaceScheduleOptimization(
      baseInput({
        homeDaysRest: 2,
        awayDaysRest: 1,
        awayBackToBack: true,
      }),
    );
    // Away is on a B2B => home should be favored.
    expect(out.expectedMarginShift).toBeGreaterThan(0);
    expect(out.leans).toBe("home");
    expect(out.away.backToBack).toBe(true);
  });

  it("treats both-back-to-back as a wash", () => {
    const out = runPaceScheduleOptimization(
      baseInput({
        homeDaysRest: 1,
        awayDaysRest: 1,
        homeBackToBack: true,
        awayBackToBack: true,
      }),
    );
    expect(out.expectedMarginShift).toBe(0);
    expect(out.leans).toBe("neutral");
    expect(out.notes.some((n) => n.toLowerCase().includes("wash"))).toBe(true);
  });

  it("handles zero rest for both sides without throwing", () => {
    const out = runPaceScheduleOptimization(
      baseInput({ homeDaysRest: 0, awayDaysRest: 0 }),
    );
    expect(out.expectedMarginShift).toBe(0);
    expect(Number.isFinite(out.marginShiftInterval[0])).toBe(true);
    expect(Number.isFinite(out.marginShiftInterval[1])).toBe(true);
  });

  it("works with missing optional tempo (paceTier null)", () => {
    const out = runPaceScheduleOptimization(baseInput());
    expect(out.home.paceTier).toBeNull();
    expect(out.away.paceTier).toBeNull();
  });

  it("classifies tempo when supplied", () => {
    const out = runPaceScheduleOptimization(
      baseInput({ league: "NBA", homeTempo: 92, awayTempo: 108 }),
    );
    expect(out.home.paceTier).toBe("slow");
    expect(out.away.paceTier).toBe("very-fast");
    expect(out.notes.some((n) => n.toLowerCase().includes("tempo"))).toBe(true);
  });

  it("produces a confidence interval that brackets the point estimate", () => {
    const out = runPaceScheduleOptimization(
      baseInput({ homeDaysRest: 5, awayDaysRest: 1 }),
    );
    const [lo, hi] = out.marginShiftInterval;
    expect(lo).toBeLessThan(out.expectedMarginShift);
    expect(hi).toBeGreaterThan(out.expectedMarginShift);
    expect(hi).toBeGreaterThan(lo);
  });

  it("derives a real RestAnalysis from the schedule library", () => {
    const out = runPaceScheduleOptimization(
      baseInput({ league: "NFL", homeDaysRest: 12, awayDaysRest: 6 }),
    );
    expect(out.home.analysis.daysSinceLastGame).toBe(12);
    expect(out.home.analysis.isLongRest).toBe(true);
    expect(out.away.analysis.isShortWeek).toBe(false);
    expect(out.away.analysis.daysSinceLastGame).toBe(6);
  });

  it("is deterministic — same input yields identical output", () => {
    const a = runPaceScheduleOptimization(
      baseInput({ homeDaysRest: 4, awayDaysRest: 1, homeTempo: 100 }),
    );
    const b = runPaceScheduleOptimization(
      baseInput({ homeDaysRest: 4, awayDaysRest: 1, homeTempo: 100 }),
    );
    expect(a).toEqual(b);
  });

  it("always carries the honesty disclaimer", () => {
    const out = runPaceScheduleOptimization(baseInput());
    expect(out.disclaimer).toBe(PACE_SCHEDULE_DISCLAIMER);
    expect(out.disclaimer.toLowerCase()).toContain("not a published pick");
    expect(out.disclaimer.toLowerCase()).toContain("injury");
  });

  it("home advantage probability is bounded in [0,1]", () => {
    const out = runPaceScheduleOptimization(
      baseInput({ league: "NFL", homeDaysRest: 14, awayDaysRest: 0 }),
    );
    expect(out.homeAdvantageProbability).toBeGreaterThanOrEqual(0);
    expect(out.homeAdvantageProbability).toBeLessThanOrEqual(1);
  });
});
