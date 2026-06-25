import { describe, expect, it } from "vitest";
import {
  buildKaplanMeierReturnCurve,
  coxAvailabilityMultiplier,
  projectAvailabilityRole,
} from "../availability-role-tenure.js";

describe("buildKaplanMeierReturnCurve", () => {
  it("estimates cumulative return probability while treating non-returns as censored", () => {
    const curve = buildKaplanMeierReturnCurve([
      { durationWeeks: 1, returned: true },
      { durationWeeks: 2, returned: true },
      { durationWeeks: 3, returned: false },
      { durationWeeks: 3, returned: true },
    ]);

    expect(curve[0]).toMatchObject({ week: 1, atRisk: 4, returns: 1 });
    expect(curve[1]!.cumulativeReturnProbability).toBeGreaterThan(curve[0]!.cumulativeReturnProbability);
    expect(curve[2]!.survivalInactive).toBeGreaterThanOrEqual(0);
  });
});

describe("coxAvailabilityMultiplier", () => {
  it("raises return hazard for full practice and lowers it for did-not-practice", () => {
    const base = { weeksSinceActive: 2, recentSnapShares: [0.72, 0.68], age: 27 };
    const full = coxAvailabilityMultiplier({ ...base, practiceStatus: "full" });
    const dnp = coxAvailabilityMultiplier({ ...base, practiceStatus: "dnp" });

    expect(full).toBeGreaterThan(dnp);
    expect(full).toBeGreaterThan(1);
  });
});

describe("projectAvailabilityRole", () => {
  const returnSpells = [
    { durationWeeks: 1, returned: true },
    { durationWeeks: 1, returned: true },
    { durationWeeks: 2, returned: true },
    { durationWeeks: 3, returned: false },
  ];

  it("projects higher active probability for returning full-practice players than doubtful players", () => {
    const returning = projectAvailabilityRole({
      playerId: "p1",
      status: "returning",
      practiceStatus: "full",
      weeksSinceActive: 1,
      recentSnapShares: [0.81, 0.77, 0.79],
      returnSpells,
    });
    const doubtful = projectAvailabilityRole({
      playerId: "p1",
      status: "doubtful",
      practiceStatus: "dnp",
      weeksSinceActive: 1,
      recentSnapShares: [0.81, 0.77, 0.79],
      returnSpells,
    });

    expect(returning.activeProbability).toBeGreaterThan(doubtful.activeProbability);
    expect(returning.expectedSnapShare).toBeLessThanOrEqual(returning.expectedSnapShareIfActive);
    expect(returning.status).toBe("shadow");
    expect(returning.priced).toBe(false);
  });

  it("keeps official out and IR statuses capped", () => {
    const out = projectAvailabilityRole({
      playerId: "p2",
      status: "out",
      practiceStatus: "full",
      weeksSinceActive: 4,
      recentSnapShares: [0.95],
      returnSpells,
    });
    const ir = projectAvailabilityRole({
      playerId: "p2",
      status: "ir",
      practiceStatus: "full",
      weeksSinceActive: 4,
      recentSnapShares: [0.95],
      returnSpells,
    });

    expect(out.activeProbability).toBeLessThanOrEqual(0.12);
    expect(ir.activeProbability).toBeLessThanOrEqual(0.05);
  });

  it("assigns longer role half-life to stable role histories", () => {
    const stable = projectAvailabilityRole({
      playerId: "p3",
      status: "healthy",
      weeksSinceActive: 0,
      roleHistory: [
        { weekIndex: 1, roleState: "lead", snapShare: 0.72 },
        { weekIndex: 2, roleState: "lead", snapShare: 0.77 },
        { weekIndex: 3, roleState: "lead", snapShare: 0.74 },
        { weekIndex: 4, roleState: "lead", snapShare: 0.78 },
      ],
    });
    const volatile = projectAvailabilityRole({
      playerId: "p3",
      status: "healthy",
      weeksSinceActive: 0,
      roleHistory: [
        { weekIndex: 1, roleState: "lead", snapShare: 0.72 },
        { weekIndex: 2, roleState: "committee", snapShare: 0.45 },
        { weekIndex: 3, roleState: "lead", snapShare: 0.74 },
        { weekIndex: 4, roleState: "committee", snapShare: 0.38 },
      ],
    });

    expect(stable.roleTenure.halfLifeWeeks).toBeGreaterThan(volatile.roleTenure.halfLifeWeeks);
    expect(stable.roleTenure.consecutiveWeeks).toBe(4);
    expect(volatile.roleTenure.consecutiveWeeks).toBe(1);
  });
});
