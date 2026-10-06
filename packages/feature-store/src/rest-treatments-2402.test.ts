import { describe, expect, it } from "vitest";
import { assignTreatments, naiveAte, SHORT_REST_DAYS, LONG_TRAVEL_MILES, GSE_ACTE_REST_ENABLED } from "./rest-treatments-2402.js";

const u = (days: number | null, miles: number, epa: number) => ({
  playerId: "p1", gameId: "g", daysSinceLastGame: days, travelMiles: miles,
  epaPerPlay: epa, successRate: 0.5, fantasyPoints: 10,
});

describe("rest treatments", () => {
  it("flags short rest at <=3 days and long travel >2000 miles", () => {
    const t = assignTreatments(u(3, 2100, 0.1));
    expect(t.shortRest).toBe(1);
    expect(t.longTravel).toBe(1);
    expect(SHORT_REST_DAYS).toBe(3);
    expect(LONG_TRAVEL_MILES).toBe(2000);
  });
  it("treats unknown rest (null) as control", () => {
    expect(assignTreatments(u(null, 100, 0.1)).shortRest).toBe(0);
  });
  it("naive ATE contrasts treated vs control means", () => {
    const units = [u(2, 100, 0.0), u(2, 100, 0.2), u(7, 100, 0.5), u(7, 100, 0.7)];
    const ate = naiveAte(units, (t) => t.shortRest, (x) => x.epaPerPlay);
    expect(ate).toBeCloseTo(0.1 - 0.6, 10);
  });
  it("handles empty units", () => {
    expect(naiveAte([], (t) => t.shortRest, (x) => x.epaPerPlay)).toBe(0);
  });
  it("stays off until the DGP gate clears", () => {
    expect(GSE_ACTE_REST_ENABLED).toBe(false);
  });
});

