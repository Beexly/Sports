import { describe, expect, it } from "vitest";
import { attributeEdv, edv, riskAdjustedEdv } from "./expected-drive-value";

describe("expected-drive-value", () => {
  it("edv aggregates discounted future scoring plays", () => {
    // One TD (xP capped at 1) 60s out at gamma=0.97: 1-(1-0.97^60).
    const v = edv([{ deltaT: 60, xP: 1 }], 0.97);
    expect(v).toBeCloseTo(1 - (1 - Math.pow(0.97, 60)), 12);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
    // No future scores -> zero value.
    expect(edv([], 0.97)).toBe(0);
    // Two scoring plays beat one.
    const two = edv([{ deltaT: 30, xP: 0.5 }, { deltaT: 90, xP: 0.5 }], 0.97);
    expect(two).toBeGreaterThan(edv([{ deltaT: 30, xP: 0.5 }], 0.97));
  });
  it("attributeEdv splits passer/receiver 60/40 and doubles turnovers", () => {
    const pr = attributeEdv(1, "passer");
    expect(pr["passer"]).toBeCloseTo(0.6, 12);
    expect(pr["receiver"]).toBeCloseTo(0.4, 12);
    const rush = attributeEdv(2, "rusher", true);
    expect(rush["rusher"]).toBeCloseTo(4, 12); // doubled turnover debit
    const oth = attributeEdv(1, "other");
    expect(oth["other"]).toBeCloseTo(1, 12);
  });
  it("riskAdjustedEdv subtracts discounted opponent value", () => {
    const r = riskAdjustedEdv(0.8, 0.5, 120, 0.97);
    expect(r).toBeCloseTo(0.8 - Math.pow(0.97, 120) * 0.5, 12);
    expect(r).toBeLessThan(0.8);
  });
  it("throws on degenerate inputs", () => {
    expect(() => edv([{ deltaT: 10, xP: 1 }], 1.5)).toThrow();
    expect(() => edv([{ deltaT: -5, xP: 1 }], 0.97)).toThrow();
    expect(() => riskAdjustedEdv(0.5, 0.5, -1)).toThrow();
  });
});
