import { describe, expect, it } from "vitest";
import { marketGravityIndex } from "../market/market-gravity-index.js";

describe("marketGravityIndex", () => {
  it("classifies fresh consensus movement as meaningful gravity", () => {
    const result = marketGravityIndex({
      bookLines: [-3.4, -3.5, -3.5, -3.6],
      crossedKeyNumber: true,
      currentLine: -3.5,
      freshnessTtlMinutes: 10,
      hoursToStart: 2,
      injuryExplainability: 0.8,
      openingLine: -1,
      sourceAgeMinutes: 2,
    });

    expect(result.score).toBeGreaterThan(60);
    expect(["WATCH", "STRONG_PULL", "GRAVITY_EVENT"]).toContain(result.signal);
    expect(result.stale).toBe(false);
  });

  it("cannot classify stale data as a clean market signal", () => {
    const result = marketGravityIndex({
      bookLines: [-4, -4.1, -4.2],
      crossedKeyNumber: true,
      currentLine: -4,
      freshnessTtlMinutes: 10,
      hoursToStart: 1,
      injuryExplainability: 1,
      openingLine: 0,
      sourceAgeMinutes: 45,
    });

    expect(result.stale).toBe(true);
    expect(result.signal).toBe("NO_SIGNAL");
    expect(result.drivers.some((driver) => driver.name === "freshness_penalty" && driver.direction === "DOWN")).toBe(true);
  });
});
