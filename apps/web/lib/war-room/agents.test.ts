import { describe, it, expect } from "vitest";
import { CASCADE, DEFAULT_STATE, statesAtStep } from "./agents";

describe("Agent War Room — the traceable cascade", () => {
  it("opens at the default state with a PLAY verdict", () => {
    expect(CASCADE.steps[0]!.verdict).toBe("PLAY");
    const s0 = statesAtStep(0);
    expect(s0.injury!.level).toBe(DEFAULT_STATE.injury!.level);
  });

  it("accumulates overrides as the cascade advances", () => {
    // find the step where Model Disagreement escalates and check it stepped to WATCHLIST
    const i = CASCADE.steps.findIndex((s) => s.changed === "disagree");
    expect(i).toBeGreaterThan(0);
    expect(CASCADE.steps[i]!.verdict).toBe("WATCHLIST");
    expect(statesAtStep(i).disagree!.level).toBe("elevated");
  });

  it("the final state reflects every agent that escalated", () => {
    const last = CASCADE.steps.length - 1;
    const final = statesAtStep(last);
    expect(final.injury!.level).toBe("alert"); // roster shock persists
    expect(final.public!.level).toBe("elevated"); // public surge persists
    expect(CASCADE.steps[last]!.verdict).toBe("WATCHLIST");
  });

  it("the verdict steps down (PLAY → WATCHLIST), never silently up", () => {
    const verdicts = CASCADE.steps.map((s) => s.verdict);
    expect(verdicts[0]).toBe("PLAY");
    expect(verdicts.includes("WATCHLIST")).toBe(true);
    // once it leaves PLAY it never quietly returns to PLAY
    const firstWatch = verdicts.indexOf("WATCHLIST");
    expect(verdicts.slice(firstWatch).every((v) => v !== "PLAY")).toBe(true);
  });
});
