import { describe, expect, it } from "vitest";

import {
  ENABLED,
  availabilityGate,
  certifyUnit,
  heldOutSelection,
  picksNeededForAvailability,
  unitKey,
} from "@/lib/calibration/2609-22048-availability-certification";

describe("availability certification", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("picks-needed grows with stricter tolerance and noisier grades", () => {
    const loose = picksNeededForAvailability(1, 0.5);
    const strict = picksNeededForAvailability(1, 0.1);
    expect(strict).toBeGreaterThan(loose);
    const noisy = picksNeededForAvailability(3, 0.2);
    const clean = picksNeededForAvailability(1, 0.2);
    expect(noisy).toBeGreaterThan(clean);
    expect(loose).toBeGreaterThan(0);
  });

  it("certified badge only crosses the bar with enough graded picks", () => {
    const unit = { sport: "NFL", market: "spread" };
    expect(unitKey(unit)).toBe("NFL x spread");
    const needed = picksNeededForAvailability(1, 0.2);
    const under = certifyUnit(unit, needed - 1, 1, 0.2);
    expect(under.certified).toBe(false);
    expect(under.availability).toBeLessThan(1);
    const over = certifyUnit(unit, needed, 1, 0.2);
    expect(over.certified).toBe(true);
    expect(over.availability).toBe(1);
  });

  it("held-out selection ranks by forward profit, not backtest", () => {
    const ranking = heldOutSelection([
      { id: "backtest-king", forwardProfits: [-1, -2, 0, -1] },
      { id: "steady", forwardProfits: [1, 2, 1, 2] },
    ]);
    expect(ranking[0].id).toBe("steady");
    expect(ranking[0].meanForwardProfit).toBeCloseTo(1.5, 10);
  });

  it("availability gate requires validity >= 80% and must bite", () => {
    const mk = (unit: string, certified: boolean) => ({
      unit,
      gradedPicks: certified ? 100 : 5,
      needed: 50,
      availability: certified ? 1 : 0.1,
      certified,
    });
    const historical = [mk("NFL x spread", true), mk("NFL x total", true), mk("NBA x spread", false)];
    const forward = [mk("NFL x spread", true), mk("NFL x total", true), mk("NBA x spread", false)];
    const g = availabilityGate(historical, forward, (u) => u === "NBA x spread");
    expect(g.validityRate).toBe(1);
    expect(g.bites).toBe(true);
    expect(g.adopt).toBe(true);
    const noBite = availabilityGate(historical, forward, () => false);
    expect(noBite.adopt).toBe(false); // rubber-stamp rejected
  });
});
