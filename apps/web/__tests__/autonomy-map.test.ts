import { describe, it, expect } from "vitest";
import {
  AUTONOMY_MAP,
  summarizeAutonomy,
  entriesByLevel,
  type AutonomyEntry,
} from "@/lib/autonomy/autonomy-map";

describe("autonomy-map — integrity", () => {
  it("entry ids are unique", () => {
    const ids = AUTONOMY_MAP.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a what, a gate, and a code ref", () => {
    for (const e of AUTONOMY_MAP) {
      expect(e.what.length).toBeGreaterThan(0);
      expect(e.gate.length).toBeGreaterThan(0);
      expect(e.ref.length).toBeGreaterThan(0);
    }
  });
});

describe("autonomy-map — the safety invariant (must never drift)", () => {
  // The whole point: money-out / publish / model-change actions must STAY parked.
  // If any of these is ever reclassified as autonomous, this test fails loudly.
  const MUST_BE_PARKED = ["model_activation", "content_publish", "paid_spend", "external_actions"];

  it("money/publish/model levers are owner_parked, never autonomous", () => {
    for (const id of MUST_BE_PARKED) {
      const e = AUTONOMY_MAP.find((x) => x.id === id) as AutonomyEntry;
      expect(e, `missing parked entry ${id}`).toBeTruthy();
      expect(e.level).toBe("owner_parked");
    }
  });

  it("no autonomous entry spends real money or publishes externally", () => {
    const selfDriving = AUTONOMY_MAP.filter(
      (e) => e.level === "autonomous" || e.level === "autonomous_within_budget",
    );
    for (const e of selfDriving) {
      // A self-driving op must name a hard-stop / budget / read-only guard.
      expect(e.gate.length).toBeGreaterThan(10);
    }
    // None of the must-be-parked ids may appear as self-driving.
    const selfIds = new Set(selfDriving.map((e) => e.id));
    for (const id of MUST_BE_PARKED) expect(selfIds.has(id)).toBe(false);
  });

  it("owner_activation entries are one-time setup steps", () => {
    for (const e of entriesByLevel("owner_activation")) {
      expect(e.cadence).toBe("one-time");
    }
  });
});

describe("autonomy-map — summary", () => {
  it("counts add up to the total", () => {
    const s = summarizeAutonomy();
    expect(
      s.autonomous + s.autonomousWithinBudget + s.ownerParked + s.ownerActivation,
    ).toBe(s.total);
  });

  it("the recurring loop is majority self-driving (high autonomy)", () => {
    const s = summarizeAutonomy();
    // Recurring ops = autonomous + within-budget + parked. Self-driving must dominate.
    expect(s.recurringAutonomyShare).toBeGreaterThan(0.5);
  });

  it("there are at least the four known owner-activation steps", () => {
    expect(entriesByLevel("owner_activation").length).toBeGreaterThanOrEqual(4);
  });
});
