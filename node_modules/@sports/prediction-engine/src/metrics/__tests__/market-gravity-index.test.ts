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

  it("does not let a thin (single or empty) book mint a gravity event", () => {
    const shared = {
      crossedKeyNumber: true,
      currentLine: -3.5,
      freshnessTtlMinutes: 10,
      hoursToStart: 2,
      injuryExplainability: 0.8,
      openingLine: -1,
      sourceAgeMinutes: 2,
    } as const;

    const corroborated = marketGravityIndex({ ...shared, bookLines: [-3.5, -3.5, -3.5, -3.5] });
    const singleBook = marketGravityIndex({ ...shared, bookLines: [-3.5] });
    const noBooks = marketGravityIndex({ ...shared, bookLines: [] });

    // A well-corroborated market with the same movement is allowed to peak.
    expect(corroborated.signal).toBe("GRAVITY_EVENT");
    // A lone or absent book cannot fabricate consensus into the top band.
    expect(singleBook.signal).not.toBe("GRAVITY_EVENT");
    expect(noBooks.signal).not.toBe("GRAVITY_EVENT");
    expect(singleBook.score).toBeLessThan(85);
    expect(noBooks.score).toBeLessThan(85);
    expect(singleBook.score).toBeLessThan(corroborated.score);
  });

  it("treats sourceAge equal to the freshness ttl as stale", () => {
    const result = marketGravityIndex({
      bookLines: [-3.5, -3.5, -3.5],
      crossedKeyNumber: true,
      currentLine: -3.5,
      freshnessTtlMinutes: 10,
      hoursToStart: 2,
      injuryExplainability: 0.8,
      openingLine: -1,
      sourceAgeMinutes: 10,
    });

    expect(result.stale).toBe(true);
    expect(result.signal).toBe("NO_SIGNAL");
  });

  it("surfaces injury explainability and key-number crossings as score-moving drivers", () => {
    const base = {
      bookLines: [-3.5, -3.5, -3.5],
      currentLine: -3.5,
      freshnessTtlMinutes: 10,
      hoursToStart: 2,
      openingLine: -1,
      sourceAgeMinutes: 2,
    } as const;

    const withCatalysts = marketGravityIndex({ ...base, crossedKeyNumber: true, injuryExplainability: 0.9 });
    const withoutCatalysts = marketGravityIndex({ ...base, crossedKeyNumber: false, injuryExplainability: 0 });

    expect(withCatalysts.score).toBeGreaterThan(withoutCatalysts.score);
    expect(
      withCatalysts.drivers.some((driver) => driver.name === "injury_explainability" && driver.direction === "UP" && driver.contribution > 0),
    ).toBe(true);
    expect(withCatalysts.drivers.some((driver) => driver.name === "key_number" && driver.direction === "UP" && driver.contribution > 0)).toBe(true);
    expect(withoutCatalysts.drivers.some((driver) => driver.name === "injury_explainability" && driver.direction === "NEUTRAL")).toBe(true);
    expect(withoutCatalysts.drivers.some((driver) => driver.name === "key_number" && driver.direction === "NEUTRAL")).toBe(true);
  });
});
