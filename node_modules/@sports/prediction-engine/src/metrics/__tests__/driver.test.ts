import { describe, expect, it } from "vitest";
import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";

describe("metricDriver", () => {
  it("rounds the contribution to 4 digits and preserves the other fields", () => {
    const driver = metricDriver({
      name: "rest_advantage",
      contribution: 0.123456,
      direction: "UP",
      explanation: "extra rest days",
    });
    expect(driver.contribution).toBe(0.1235);
    expect(driver.name).toBe("rest_advantage");
    expect(driver.direction).toBe("UP");
    expect(driver.explanation).toBe("extra rest days");
  });
});

describe("sortedDrivers", () => {
  const make = (name: string, contribution: number): MetricDriver =>
    metricDriver({ name, contribution, direction: "NEUTRAL", explanation: name });

  it("orders drivers by absolute contribution descending", () => {
    const drivers = [make("a", 0.1), make("b", -0.9), make("c", 0.5), make("d", -0.3)];
    const sorted = sortedDrivers(drivers);
    expect(sorted.map((driver) => driver.name)).toEqual(["b", "c", "d", "a"]);
  });

  it("ranks a large negative contribution above a smaller positive one (absolute, not signed)", () => {
    const sorted = sortedDrivers([make("positive", 0.4), make("negative", -0.8)]);
    expect(sorted.map((driver) => driver.name)).toEqual(["negative", "positive"]);
  });

  it("returns a new array without mutating the input order", () => {
    const drivers = [make("a", 0.1), make("b", -0.9), make("c", 0.5)];
    const sorted = sortedDrivers(drivers);
    expect(sorted).not.toBe(drivers);
    expect(drivers.map((driver) => driver.name)).toEqual(["a", "b", "c"]);
  });

  it("handles a single-element list", () => {
    const sorted = sortedDrivers([make("only", -0.42)]);
    expect(sorted.map((driver) => driver.name)).toEqual(["only"]);
  });

  it("handles an empty list", () => {
    expect(sortedDrivers([])).toEqual([]);
  });
});
