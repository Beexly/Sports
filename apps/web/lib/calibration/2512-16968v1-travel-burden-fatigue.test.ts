import { describe, expect, it } from "vitest";

import {
  ENABLED,
  scheduleFairnessAudit,
  travelBurden,
  travelBurdenDifferential,
} from "@/lib/calibration/2512-16968v1-travel-burden-fatigue";

describe("travel-burden fatigue features", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("recent and frequent travel burdens more", () => {
    const roadTrip: { travelMiles: number; restDays: number }[] = [
      { travelMiles: 2000, restDays: 2 },
      { travelMiles: 1500, restDays: 1 },
      { travelMiles: 1800, restDays: 1 },
    ];
    const rested: { travelMiles: number; restDays: number }[] = [
      { travelMiles: 2000, restDays: 4 },
      { travelMiles: 0, restDays: 3 },
      { travelMiles: 0, restDays: 3 },
    ];
    expect(travelBurden(roadTrip)).toBeGreaterThan(travelBurden(rested));
    expect(travelBurden([])).toBe(0);
  });

  it("differential favors the rested home team", () => {
    const away = [
      { travelMiles: 2500, restDays: 1 },
      { travelMiles: 2000, restDays: 1 },
    ];
    const home = [
      { travelMiles: 0, restDays: 3 },
      { travelMiles: 0, restDays: 2 },
    ];
    expect(travelBurdenDifferential(away, home)).toBeGreaterThan(0);
    expect(travelBurdenDifferential(home, away)).toBeLessThan(0);
  });

  it("schedule audit finds the fairness gap and outliers", () => {
    const mk = (miles: number) => [{ travelMiles: miles, restDays: 2 }];
    const teams: Record<string, { travelMiles: number; restDays: number }[]> = {};
    for (let i = 0; i < 29; i++) teams["team" + i] = mk(500);
    teams["roadWarriors"] = mk(9000);
    const audit = scheduleFairnessAudit(teams);
    expect(audit.fairnessGap).toBeGreaterThan(0);
    expect(audit.outliers).toContain("roadWarriors");
    expect(audit.teamBurden.length).toBe(30);
  });
});
