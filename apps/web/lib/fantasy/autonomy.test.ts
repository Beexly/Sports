import { describe, it, expect } from "vitest";
import { LEVELS, levelSpec, proposeActions, executionNotice, type AutonomyLevel } from "./autonomy";

describe("gm autopilot autonomy spectrum", () => {
  it("defines five levels, manual → full remote, monotonic", () => {
    expect(LEVELS.length).toBe(5);
    LEVELS.forEach((l, i) => expect(l.level).toBe(i));
    expect(LEVELS[0]!.approval).toBe("manual");
    expect(LEVELS[4]!.approval).toBe("report-only");
  });

  it("any acting level (2+) is founder-gated; advisory levels are not", () => {
    expect(levelSpec(0).founderGated).toBe(false);
    expect(levelSpec(1).founderGated).toBe(false);
    for (const lvl of [2, 3, 4] as AutonomyLevel[]) expect(levelSpec(lvl).founderGated).toBe(true);
  });

  it("proposes nothing at Manual, real actions from Advisor up", () => {
    expect(proposeActions(0)).toHaveLength(0);
    for (const lvl of [1, 2, 3, 4] as AutonomyLevel[]) {
      expect(proposeActions(lvl).length).toBeGreaterThan(0);
    }
  });

  it("surfaces a lineup, waiver, and drop action; trade only at full remote", () => {
    const l2 = proposeActions(2);
    expect(l2.some((a) => a.type === "lineup")).toBe(true);
    expect(l2.some((a) => a.type === "waiver")).toBe(true);
    expect(l2.some((a) => a.type === "trade")).toBe(false);
    expect(proposeActions(4).some((a) => a.type === "trade")).toBe(true);
  });

  it("every proposed action carries a rationale and a reversibility flag", () => {
    for (const a of proposeActions(4)) {
      expect(a.rationale.length).toBeGreaterThan(8);
      expect(typeof a.reversible).toBe("boolean");
      expect(a.confidence).toBeGreaterThan(0);
      expect(a.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("execution notice escalates with the level and never claims silent live execution", () => {
    expect(executionNotice(0).toLowerCase()).toContain("you run");
    expect(executionNotice(1).toLowerCase()).toContain("suggestions");
    expect(executionNotice(2).toLowerCase()).toContain("approval");
    // acting levels must reference gating/consent, not promise autonomous execution
    expect(executionNotice(3).toLowerCase()).toMatch(/veto|enabled/);
    expect(executionNotice(4).toLowerCase()).toMatch(/consent|compliance|gated/);
  });
});
