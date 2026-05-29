import { describe, it, expect } from "vitest";
import {
  inferStyle,
  capObservations,
  EMPTY_OBSERVATIONS,
  type StyleObservations,
} from "@/lib/understanding/inferred-style";

describe("inferStyle — opt-in posture", () => {
  it("returns disabled state when opt-in is false", () => {
    const result = inferStyle(false, EMPTY_OBSERVATIONS, []);
    expect(result.enabled).toBe(false);
    expect(result.traits).toEqual([]);
    expect(result.effective).toEqual([]);
    expect(result.explanation).toMatch(/off/i);
  });

  it("returns enabled state with no inferred traits at zero observations", () => {
    const result = inferStyle(true, EMPTY_OBSERVATIONS, []);
    expect(result.enabled).toBe(true);
    expect(result.traits).toEqual([]);
  });
});

describe("inferStyle — trait inference", () => {
  it("infers evidence-skipper when evidence-open rate is below 0.2 with 10+ pick views", () => {
    const obs: StyleObservations = {
      ...EMPTY_OBSERVATIONS,
      pickViews: 20,
      evidenceOpens: 2,
    };
    const result = inferStyle(true, obs, []);
    expect(result.traits).toContain("evidence-skipper");
  });

  it("does NOT infer evidence-skipper with high evidence rate", () => {
    const obs: StyleObservations = {
      ...EMPTY_OBSERVATIONS,
      pickViews: 20,
      evidenceOpens: 18,
    };
    const result = inferStyle(true, obs, []);
    expect(result.traits).not.toContain("evidence-skipper");
  });

  it("infers process-grader at >= 5 autopsy grades", () => {
    const obs: StyleObservations = { ...EMPTY_OBSERVATIONS, autopsyGrades: 7 };
    expect(inferStyle(true, obs, []).traits).toContain("process-grader");
  });

  it("infers correlation-aware at >= 3 parlay-MRI runs", () => {
    const obs: StyleObservations = { ...EMPTY_OBSERVATIONS, parlayMriRuns: 4 };
    expect(inferStyle(true, obs, []).traits).toContain("correlation-aware");
  });

  it("infers no-bet-respecter when no-bet view ratio is high", () => {
    const obs: StyleObservations = {
      ...EMPTY_OBSERVATIONS,
      noBetViews: 10,
      pickViews: 10,
    };
    expect(inferStyle(true, obs, []).traits).toContain("no-bet-respecter");
  });

  it("infers post-loss-cautious when last loss is within 24h", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    const obs: StyleObservations = {
      ...EMPTY_OBSERVATIONS,
      lastLossAt: "2026-05-29T06:00:00Z", // 6h ago
    };
    expect(inferStyle(true, obs, [], now).traits).toContain("post-loss-cautious");
  });

  it("does NOT infer post-loss-cautious when last loss is older than 24h", () => {
    const now = new Date("2026-05-30T12:00:00Z");
    const obs: StyleObservations = {
      ...EMPTY_OBSERVATIONS,
      lastLossAt: "2026-05-28T06:00:00Z", // 54h ago
    };
    expect(inferStyle(true, obs, [], now).traits).not.toContain("post-loss-cautious");
  });
});

describe("inferStyle — override precedence", () => {
  it("override is included in effective set even without inference", () => {
    const result = inferStyle(true, EMPTY_OBSERVATIONS, ["process-grader"]);
    expect(result.effective).toContain("process-grader");
    expect(result.overrides).toContain("process-grader");
  });

  it("inferred + overrides are deduped in effective set", () => {
    const obs: StyleObservations = { ...EMPTY_OBSERVATIONS, autopsyGrades: 10 };
    const result = inferStyle(true, obs, ["process-grader"]);
    const count = result.effective.filter((t) => t === "process-grader").length;
    expect(count).toBe(1);
  });

  it("overrides survive opt-out (user explicitly set them)", () => {
    const result = inferStyle(false, EMPTY_OBSERVATIONS, ["no-bet-respecter"]);
    expect(result.effective).toContain("no-bet-respecter");
  });
});

describe("capObservations", () => {
  it("caps positive values at 1000", () => {
    const result = capObservations({
      evidenceOpens: 9999,
      pickViews: 9999,
      autopsyGrades: 9999,
      parlayMriRuns: 9999,
      noBetViews: 9999,
      lastLossAt: null,
    });
    expect(result.evidenceOpens).toBe(1000);
    expect(result.pickViews).toBe(1000);
  });

  it("clamps negative values to zero", () => {
    const result = capObservations({
      evidenceOpens: -5,
      pickViews: -10,
      autopsyGrades: -1,
      parlayMriRuns: -1,
      noBetViews: -1,
      lastLossAt: null,
    });
    expect(result.evidenceOpens).toBe(0);
    expect(result.pickViews).toBe(0);
  });
});

describe("inferStyle — privacy posture", () => {
  it("pure function: same input produces same output", () => {
    const obs: StyleObservations = { ...EMPTY_OBSERVATIONS, autopsyGrades: 7 };
    const a = inferStyle(true, obs, ["evidence-skipper"]);
    const b = inferStyle(true, obs, ["evidence-skipper"]);
    expect(a).toEqual(b);
  });
});
