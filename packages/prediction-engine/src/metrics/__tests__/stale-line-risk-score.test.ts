import { describe, expect, it } from "vitest";
import { staleLineRiskScore, type StaleLineRiskInput } from "../market/stale-line-risk-score.js";

const cleanInput: StaleLineRiskInput = {
  bookLines: [-2.5, -2.5, -2.6, -2.4],
  contradictionCount: 0,
  currentLine: -2.5,
  expectedSourceCount: 4,
  freshnessTtlMinutes: 10,
  lineAgeMinutes: 1,
  openingLine: -2,
  rightsStatus: "approved",
  sourceCount: 4,
};

describe("staleLineRiskScore", () => {
  it("keeps fresh, well-sourced, rights-clean lines low risk", () => {
    const result = staleLineRiskScore(cleanInput);

    expect(result.metricId).toBe("stale-line-risk-score");
    expect(result.status).toBe("SHADOW");
    expect(result.stale).toBe(false);
    expect(result.marketSignalAllowed).toBe(true);
    expect(result.band).toBe("LOW");
    expect(result.score).toBeLessThan(35);
    expect(result.drivers.every((driver) => !driver.name.includes("weight"))).toBe(true);
  });

  it("hard-blocks stale line snapshots even when movement looks meaningful", () => {
    const result = staleLineRiskScore({
      ...cleanInput,
      currentLine: -7,
      lineAgeMinutes: 45,
      openingLine: -1,
    });

    expect(result.stale).toBe(true);
    expect(result.band).toBe("BLOCK");
    expect(result.marketSignalAllowed).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.drivers.some((driver) => driver.name === "line_age_staleness" && driver.direction === "UP")).toBe(true);
  });

  it("raises risk when source count falls below expected coverage", () => {
    const fullCoverage = staleLineRiskScore(cleanInput);
    const lowCoverage = staleLineRiskScore({ ...cleanInput, sourceCount: 1 });

    expect(lowCoverage.score).toBeGreaterThan(fullCoverage.score);
    expect(lowCoverage.drivers.some((driver) => driver.name === "source_coverage_gap" && driver.direction === "UP")).toBe(true);
  });

  it("raises risk when sources contradict each other", () => {
    const clean = staleLineRiskScore(cleanInput);
    const contradictory = staleLineRiskScore({ ...cleanInput, contradictionCount: 3 });

    expect(contradictory.score).toBeGreaterThan(clean.score);
    expect(contradictory.drivers.some((driver) => driver.name === "source_contradiction_pressure" && driver.direction === "UP")).toBe(true);
  });

  it("raises risk when source rights are unclear or blocked", () => {
    const clean = staleLineRiskScore(cleanInput);
    const unclear = staleLineRiskScore({ ...cleanInput, rightsStatus: "unknown" });
    const blocked = staleLineRiskScore({ ...cleanInput, rightsStatus: "blocked" });

    expect(unclear.score).toBeGreaterThan(clean.score);
    expect(blocked.score).toBeGreaterThan(clean.score);
    expect(unclear.drivers.some((driver) => driver.name === "source_rights_risk" && driver.direction === "UP")).toBe(true);
  });

  it("hard-blocks blocked or excluded source rights even on a fresh line", () => {
    const blocked = staleLineRiskScore({ ...cleanInput, rightsStatus: "blocked" });
    const excluded = staleLineRiskScore({ ...cleanInput, rightsStatus: "excluded" });

    expect(blocked.stale).toBe(false);
    expect(blocked.band).toBe("BLOCK");
    expect(blocked.marketSignalAllowed).toBe(false);
    expect(blocked.score).toBeGreaterThanOrEqual(85);

    expect(excluded.stale).toBe(false);
    expect(excluded.band).toBe("BLOCK");
    expect(excluded.marketSignalAllowed).toBe(false);
    expect(excluded.score).toBeGreaterThanOrEqual(85);
  });

  it("keeps merely-unknown rights graduated rather than hard-blocking", () => {
    const unclear = staleLineRiskScore({ ...cleanInput, rightsStatus: "unknown" });

    expect(unclear.band).not.toBe("BLOCK");
    expect(unclear.marketSignalAllowed).toBe(true);
  });

  it("isolates book dispersion: wider book lines raise risk on an otherwise identical fresh line", () => {
    const tight = staleLineRiskScore({ ...cleanInput, bookLines: [-2.5, -2.5, -2.5, -2.5] });
    const wide = staleLineRiskScore({ ...cleanInput, bookLines: [-1, -4, 0, -5] });

    expect(wide.stale).toBe(false);
    expect(wide.score).toBeGreaterThan(tight.score);
    expect(wide.drivers.some((driver) => driver.name === "book_dispersion_risk" && driver.direction === "UP")).toBe(true);
  });

  it("isolates line movement: a large open-to-current delta raises risk when the line is not stale", () => {
    const still = staleLineRiskScore({ ...cleanInput, currentLine: -2.5, openingLine: -2.5 });
    const swung = staleLineRiskScore({ ...cleanInput, currentLine: -7, openingLine: -1 });

    expect(swung.stale).toBe(false);
    expect(swung.score).toBeGreaterThan(still.score);
    expect(swung.drivers.some((driver) => driver.name === "line_movement_audit_pressure" && driver.direction === "UP")).toBe(true);
  });

  it("scales movement risk by market type", () => {
    const base: StaleLineRiskInput = {
      contradictionCount: 0,
      currentLine: -2.5,
      expectedSourceCount: 4,
      freshnessTtlMinutes: 10,
      lineAgeMinutes: 1,
      openingLine: 0,
      rightsStatus: "approved",
      sourceCount: 4,
    };
    const prop = staleLineRiskScore({ ...base, marketType: "prop" });
    const moneyline = staleLineRiskScore({ ...base, marketType: "moneyline" });

    // A 2.5 swing saturates the prop scale (2.5) but is trivial on the moneyline scale (80).
    expect(prop.score).toBeGreaterThan(moneyline.score);
  });

  it("classifies mid-range risk as WATCH", () => {
    const watch = staleLineRiskScore({
      ...cleanInput,
      currentLine: -2.5,
      expectedSourceCount: 4,
      lineAgeMinutes: 9,
      openingLine: -2.5,
      sourceCount: 0,
    });

    expect(watch.stale).toBe(false);
    expect(watch.band).toBe("WATCH");
    expect(watch.score).toBeGreaterThanOrEqual(45);
    expect(watch.score).toBeLessThan(75);
    expect(watch.marketSignalAllowed).toBe(true);
  });

  it("classifies severe non-stale risk as HIGH without blocking", () => {
    const high = staleLineRiskScore({
      ...cleanInput,
      contradictionCount: 3,
      currentLine: -2.5,
      expectedSourceCount: 4,
      lineAgeMinutes: 9,
      openingLine: -2.5,
      rightsStatus: "unknown",
      sourceCount: 0,
    });

    expect(high.stale).toBe(false);
    expect(high.band).toBe("HIGH");
    expect(high.score).toBeGreaterThanOrEqual(75);
    expect(high.marketSignalAllowed).toBe(true);
  });
});
