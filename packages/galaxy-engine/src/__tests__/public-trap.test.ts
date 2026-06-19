import { describe, it, expect } from "vitest";
import {
  PUBLIC_TRAP_SCENARIOS,
  PUBLIC_TRAP_MERCH_SKU,
  evaluatePublicTrapStep,
  evaluatePublicTrapEncounter,
} from "../public-trap.js";

describe("PvM boss — The Public Trap (bible §4.1)", () => {
  it("ships seeded scenarios so the encounter is never empty", () => {
    expect(PUBLIC_TRAP_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    for (const s of PUBLIC_TRAP_SCENARIOS) {
      expect(s.publicPct).toBeGreaterThan(0.5); // the crowd is genuinely piled on
      expect(s.lesson.length).toBeGreaterThan(0);
    }
  });

  it("resisting the crowd is the correct read and pays more", () => {
    const s = PUBLIC_TRAP_SCENARIOS[0]!;
    const resisted = evaluatePublicTrapStep(s, "VALUE", 70);
    const trapped = evaluatePublicTrapStep(s, "PUBLIC", 70);
    expect(resisted.resisted).toBe(true);
    expect(resisted.outcome.result).toBe("WIN");
    expect(trapped.resisted).toBe(false);
    expect(trapped.outcome.result).toBe("LOSS");
    expect(resisted.outcome.reward.xp).toBeGreaterThan(trapped.outcome.reward.xp);
    expect(resisted.teaching.toLowerCase()).toContain("held the line");
  });

  it("clears on a 2/3 majority and unlocks the merch entitlement", () => {
    const answers = PUBLIC_TRAP_SCENARIOS.map((scenario) => ({
      scenario,
      chosen: "VALUE" as const,
      confidence: 72,
    }));
    const r = evaluatePublicTrapEncounter(answers);
    expect(r.cleared).toBe(true);
    expect(r.resistedCount).toBe(r.totalSteps);
    expect(r.merchUnlockSku).toBe(PUBLIC_TRAP_MERCH_SKU);
    expect(r.totalXp).toBeGreaterThan(0);
  });

  it("does not clear (and unlocks nothing) when the crowd wins", () => {
    const answers = PUBLIC_TRAP_SCENARIOS.map((scenario) => ({
      scenario,
      chosen: "PUBLIC" as const,
      confidence: 80,
    }));
    const r = evaluatePublicTrapEncounter(answers);
    expect(r.cleared).toBe(false);
    expect(r.merchUnlockSku).toBeNull();
  });
});
