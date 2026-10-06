
import { describe, expect, it } from "vitest";
import {
  aggregateCredits,
  attributeWindow,
  fractionalTackleRate,
} from "./fractional-tackles";

describe("fractional-tackles", () => {
  it("window credit sums to the window value and favors the faster defender", () => {
    const c = attributeWindow([
      { defender: "A", value: 1, peakVelocityTowardCarrier: 6 },
      { defender: "B", value: 1, peakVelocityTowardCarrier: 2 },
    ]);
    // both entries share one window of value 1: total credit = 1
    const total = (c["A"] ?? 0) + (c["B"] ?? 0);
    expect(total).toBeCloseTo(1, 10);
    expect(c["A"]).toBeGreaterThan(c["B"] ?? 0);
    expect(c["A"]).toBeCloseTo(0.75, 10);
  });
  it("zero-velocity windows manufacture no credit", () => {
    expect(attributeWindow([{ defender: "A", value: 1, peakVelocityTowardCarrier: 0 }])).toEqual({});
  });
  it("aggregation and rates are consistent", () => {
    const agg = aggregateCredits([
      [{ defender: "A", value: 1, peakVelocityTowardCarrier: 4 }],
      [{ defender: "A", value: 0.5, peakVelocityTowardCarrier: 4 }],
    ]);
    expect(agg["A"]).toBeCloseTo(1.5, 10);
    expect(fractionalTackleRate(agg["A"] ?? 0, 30)).toBeCloseTo(0.05, 10);
    expect(() => fractionalTackleRate(1, 0)).toThrow();
  });
});
