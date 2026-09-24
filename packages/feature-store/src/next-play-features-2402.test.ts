import { describe, expect, it } from "vitest";
import { encodePrePlayState, teamContextKey, NEXT_PLAY_FEATURE_DIM, GSE_TEAM_CONTEXT_MODEL_ENABLED } from "./next-play-features-2402.js";

const base = {
  down: 3, distance: 7, yardline: 65, scoreDiff: -3, quarter: 4,
  secondsRemaining: 300, personnel: "11", shotgun: true, noHuddle: false,
  motion: true, teamId: "KC",
};

describe("next-play features", () => {
  it("encodes to a fixed 16-dim vector", () => {
    const v = encodePrePlayState(base);
    expect(v).toHaveLength(NEXT_PLAY_FEATURE_DIM);
    expect(v.every((x) => Number.isFinite(x))).toBe(true);
  });
  it("flags money down, red zone, one-score, two-minute", () => {
    const v = encodePrePlayState({ ...base, down: 3, yardline: 85, scoreDiff: 3, secondsRemaining: 90 });
    expect(v[11]).toBe(1);
    expect(v[12]).toBe(1);
    expect(v[14]).toBe(1);
    expect(v[15]).toBe(1);
  });
  it("personnel digits are parsed safely", () => {
    const v = encodePrePlayState({ ...base, personnel: "jumbo" });
    expect(v[6]).toBe(0);
    expect(v[7]).toBe(0);
  });
  it("team context keys are namespaced", () => {
    expect(teamContextKey("KC")).toBe("teamctx:KC");
  });
  it("stays off until the win-MAE gate clears", () => {
    expect(GSE_TEAM_CONTEXT_MODEL_ENABLED).toBe(false);
  });
  it("handles degenerate input", () => {
    // all-zero state encodes without NaN and stays in [0,1]-ish bounds
    const v = encodePrePlayState({
      down: 0, distance: 0, yardline: 0, scoreDiff: 0, quarter: 0,
      secondsRemaining: 0, personnel: "", shotgun: false, noHuddle: false,
      motion: false, teamId: "",
    });
    expect(v).toHaveLength(16);
    expect(v.every(Number.isFinite)).toBe(true);
    expect(teamContextKey("")).toBe("teamctx:");
  });
  it("handles edge inputs", () => {
    // non-numeric personnel degrades to zeros, not NaN
    const v = encodePrePlayState({
      down: 1, distance: 10, yardline: 25, scoreDiff: 0, quarter: 1,
      secondsRemaining: 900, personnel: "jumbo", shotgun: false, noHuddle: false,
      motion: false, teamId: "KC",
    });
    expect(v[6]).toBe(0);
    expect(v[7]).toBe(0);
    expect(v.every(Number.isFinite)).toBe(true);
  });
});

