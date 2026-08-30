import { describe, expect, it } from "vitest";
import { roleVolatilityIndex, type RoleVolatilityIndexInput } from "../role/role-volatility-index.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const approvedSource: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-weekly",
  status: "approved",
};

const stableInput: RoleVolatilityIndexInput = {
  sampleGames: 8,
  snapShareDelta: 0.02,
  sourcePolicy: [approvedSource],
  usageAgeDays: 1,
  usageFreshnessTtlDays: 7,
};

describe("roleVolatilityIndex", () => {
  it("keeps fresh stable usage low volatility and shadow-only", () => {
    const result = roleVolatilityIndex(stableInput);

    expect(result.metricId).toBe("role-volatility-index");
    expect(result.status).toBe("SHADOW");
    expect(result.staleUsage).toBe(false);
    expect(result.roleSignalAllowed).toBe(true);
    expect(result.sourcePosture).toBe("CLEAN");
    expect(result.volatilityBand).toBe("LOW");
    expect(result.volatilityIndex).toBeLessThan(30);
    expect(result.drivers.every((driver) => !Object.prototype.hasOwnProperty.call(driver, "weight"))).toBe(true);
  });

  it("increases with snap, opportunity, depth-chart, and injury shocks", () => {
    const stable = roleVolatilityIndex(stableInput);
    const snapShock = roleVolatilityIndex({ ...stableInput, snapShareDelta: 0.4 });
    const opportunityShock = roleVolatilityIndex({
      ...stableInput,
      carryShareDelta: 0.24,
      targetShareDelta: 0.3,
    });
    const depthShock = roleVolatilityIndex({ ...stableInput, depthChartShock: true });
    const injuryShock = roleVolatilityIndex({
      ...stableInput,
      injuryStatusChanged: true,
      returnUncertainty: 0.9,
      teammateRoleShock: true,
    });

    expect(snapShock.volatilityIndex).toBeGreaterThan(stable.volatilityIndex);
    expect(opportunityShock.volatilityIndex).toBeGreaterThan(stable.volatilityIndex);
    expect(depthShock.volatilityIndex).toBeGreaterThan(stable.volatilityIndex);
    expect(injuryShock.volatilityIndex).toBeGreaterThan(stable.volatilityIndex);
    expect(snapShock.drivers.some((driver) => driver.name === "snap_share_volatility" && driver.direction === "UP")).toBe(true);
  });

  it("reaches ELEVATED and HIGH volatility bands as shocks compound", () => {
    const elevated = roleVolatilityIndex({
      ...stableInput,
      depthChartShock: true,
      injuryStatusChanged: true,
      snapShareDelta: 0.45,
    });
    const high = roleVolatilityIndex({
      ...stableInput,
      depthChartShock: true,
      injuryStatusChanged: true,
      returnUncertainty: 1,
      routeShareDelta: 0.45,
      sampleGames: 2,
      snapShareDelta: 0.45,
      targetShareDelta: 0.35,
      teammateRoleShock: true,
    });

    expect(elevated.staleUsage).toBe(false);
    expect(elevated.volatilityIndex).toBeGreaterThanOrEqual(35);
    expect(elevated.volatilityIndex).toBeLessThan(70);
    expect(elevated.volatilityBand).toBe("ELEVATED");

    expect(high.staleUsage).toBe(false);
    expect(high.volatilityIndex).toBeGreaterThanOrEqual(70);
    expect(high.volatilityBand).toBe("HIGH");
    expect(
      high.drivers.some((driver) => driver.name === "route_share_volatility" && driver.direction === "UP"),
    ).toBe(true);
    expect(
      high.drivers.some((driver) => driver.name === "teammate_role_shock" && driver.direction === "UP"),
    ).toBe(true);
    expect(
      high.drivers.some((driver) => driver.name === "sample_size_risk" && driver.direction === "UP"),
    ).toBe(true);
  });

  it("fails closed when no source policy is supplied", () => {
    const noPolicy = roleVolatilityIndex({ ...stableInput, sourcePolicy: [] });

    expect(noPolicy.sourcePosture).toBe("BLOCKED");
    expect(noPolicy.roleSignalAllowed).toBe(false);
    expect(noPolicy.uncertaintyBand).toBe("HIGH");
  });

  it("fails stale usage closed before role signals can be trusted", () => {
    const stale = roleVolatilityIndex({
      ...stableInput,
      snapShareDelta: 0.01,
      usageAgeDays: 12,
      usageFreshnessTtlDays: 7,
    });

    expect(stale.staleUsage).toBe(true);
    expect(stale.roleSignalAllowed).toBe(false);
    expect(stale.volatilityBand).toBe("BLOCK");
    expect(stale.uncertaintyBand).toBe("HIGH");
    expect(stale.volatilityIndex).toBeGreaterThanOrEqual(85);
  });

  it("raises review pressure and uncertainty when source posture is unclear or blocked", () => {
    const clean = roleVolatilityIndex(stableInput);
    const review = roleVolatilityIndex({
      ...stableInput,
      sourcePolicy: [{ ...approvedSource, status: "manual_review" }],
    });
    const blocked = roleVolatilityIndex({
      ...stableInput,
      sourcePolicy: [{ ...approvedSource, allowedForModeling: false, status: "blocked" }],
    });

    expect(review.volatilityIndex).toBeGreaterThan(clean.volatilityIndex);
    expect(blocked.volatilityIndex).toBeGreaterThan(clean.volatilityIndex);
    expect(review.uncertaintyBand).toBe("MEDIUM");
    expect(blocked.uncertaintyBand).toBe("HIGH");
    expect(review.confidenceScore).toBeLessThan(clean.confidenceScore);
    expect(blocked.sourcePosture).toBe("BLOCKED");
    expect(blocked.roleSignalAllowed).toBe(false);
    expect(blocked.drivers.some((driver) => driver.name === "source_posture_review_pressure")).toBe(true);
  });

  it("keeps volatility separate from confidence and player-quality claims", () => {
    const result = roleVolatilityIndex({
      ...stableInput,
      returnUncertainty: 0.8,
      sampleGames: 2,
      snapShareDelta: 0.28,
      targetShareDelta: 0.2,
    });

    expect(result.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_ROLE_CERTAINTY_OR_PLAYER_QUALITY");
    expect(result.confidenceScore).not.toBeCloseTo(result.volatilityIndex, 2);
    expect(result.birthCertificate.metricId).toBe("role-volatility-index");
  });
});
