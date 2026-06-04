import { describe, expect, it } from "vitest";
import { evaluateResponsiblePlay } from "../responsible-gaming.js";

const now = () => new Date("2026-06-03T00:00:00Z");

describe("evaluateResponsiblePlay", () => {
  it("hard-blocks an active self-exclusion", () => {
    const v = evaluateResponsiblePlay({ selfExcludedUntil: "2026-07-01T00:00:00Z" }, { now });
    expect(v.blocked).toBe(true);
    expect(v.reasons).toContain("self_excluded");
  });

  it("ignores an expired self-exclusion", () => {
    const v = evaluateResponsiblePlay({ selfExcludedUntil: "2026-05-01T00:00:00Z" }, { now });
    expect(v.reasons).not.toContain("self_excluded");
  });

  it("enforces a mandatory cool-down after a loss streak", () => {
    const v = evaluateResponsiblePlay({ consecutiveLosses: 5 }, { now });
    expect(v.reasons).toContain("loss_cooldown");
    expect(v.blocked).toBe(true);
  });

  it("nudges (not blocks) on session limit and milestones", () => {
    const v = evaluateResponsiblePlay({ sessionMinutes: 130, netUnitsThisPeriod: 60 }, { now });
    expect(v.reasons).toEqual(expect.arrayContaining(["session_limit", "profit_milestone"]));
    expect(v.blocked).toBe(false);
  });

  it("flags a loss milestone", () => {
    const v = evaluateResponsiblePlay({ netUnitsThisPeriod: -60 }, { now });
    expect(v.reasons).toContain("loss_milestone");
  });

  it("is clean for a healthy state", () => {
    const v = evaluateResponsiblePlay({ consecutiveLosses: 1, sessionMinutes: 20, netUnitsThisPeriod: 5 }, { now });
    expect(v.blocked).toBe(false);
    expect(v.reasons).toHaveLength(0);
  });
});
