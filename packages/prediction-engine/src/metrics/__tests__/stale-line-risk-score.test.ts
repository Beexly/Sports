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
});
