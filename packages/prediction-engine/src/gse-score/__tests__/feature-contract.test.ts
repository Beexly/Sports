import { describe, expect, it } from "vitest";
import {
  evaluateFeatureContract,
  type FeatureSourcePolicy,
  type GseFeatureValue,
} from "../feature-contract.js";

const allowedPolicy: FeatureSourcePolicy = {
  allowedForModeling: true,
  sourceId: "market-consensus",
  status: "allowed",
};

function feature(overrides: Partial<GseFeatureValue> & Pick<GseFeatureValue, "key">): GseFeatureValue {
  return {
    ageMinutes: 10,
    quality: 1,
    sourcePolicy: allowedPolicy,
    value: 0.5,
    ...overrides,
  };
}

describe("evaluateFeatureContract", () => {
  it("composes missing-required, stale, and blocked-source penalties additively into featureHealth", () => {
    const result = evaluateFeatureContract({
      features: [
        feature({ key: "fresh_allowed", quality: 1 }),
        feature({ ageMinutes: 121, key: "stale_optional", quality: 1 }),
        feature({
          key: "blocked_source",
          quality: 1,
          sourcePolicy: { allowedForModeling: false, sourceId: "restricted-feed", status: "restricted" },
        }),
      ],
      maxAgeMinutes: 120,
      requiredFeatureKeys: ["missing_required"],
    });

    expect(result.missingRequired).toEqual(["missing_required"]);
    expect(result.staleFeatures).toEqual(["stale_optional"]);
    expect(result.blockedSources).toEqual(["blocked_source"]);
    expect(result.featureHealth).toBe(8);
    expect(result.drivers.map((driver) => ({ impact: driver.impact, name: driver.name }))).toEqual([
      { impact: 100, name: "feature_quality" },
      { impact: -35, name: "missing_required_features" },
      { impact: -12, name: "stale_features" },
      { impact: -45, name: "source_policy_blocks" },
    ]);
    expect(result.status).toBe("BLOCK");
  });

  it("returns OK when there are no missing, stale, or blocked features and health is at least 70", () => {
    const result = evaluateFeatureContract({
      features: [
        feature({ key: "market_fair_probability", quality: 0.8, required: true }),
        feature({ key: "source_freshness_score", quality: 0.8 }),
      ],
    });

    expect(result.status).toBe("OK");
    expect(result.featureHealth).toBe(80);
    expect(result.missingRequired).toEqual([]);
    expect(result.staleFeatures).toEqual([]);
    expect(result.staleRequired).toEqual([]);
    expect(result.blockedSources).toEqual([]);
  });

  it("returns WARN when a non-required feature is stale even if health stays high", () => {
    const result = evaluateFeatureContract({
      features: [
        feature({ key: "fresh_required", quality: 1, required: true }),
        feature({ ageMinutes: 121, key: "stale_optional", quality: 1 }),
      ],
      maxAgeMinutes: 120,
    });

    expect(result.status).toBe("WARN");
    expect(result.staleFeatures).toEqual(["stale_optional"]);
    expect(result.staleRequired).toEqual([]);
    expect(result.featureHealth).toBe(88);
  });

  it("returns WARN when health is below 70 with no missing, stale-required, or blocked sources", () => {
    const result = evaluateFeatureContract({
      features: [feature({ key: "low_quality", quality: 0.69 })],
    });

    expect(result.status).toBe("WARN");
    expect(result.featureHealth).toBe(69);
    expect(result.missingRequired).toEqual([]);
    expect(result.staleFeatures).toEqual([]);
    expect(result.blockedSources).toEqual([]);
  });

  it("returns BLOCK when a required feature is missing", () => {
    const result = evaluateFeatureContract({
      features: [feature({ key: "present", quality: 1 })],
      requiredFeatureKeys: ["injury_status"],
    });

    expect(result.status).toBe("BLOCK");
    expect(result.missingRequired).toEqual(["injury_status"]);
    expect(result.featureHealth).toBe(65);
  });

  it("returns BLOCK when a required feature is stale", () => {
    const result = evaluateFeatureContract({
      features: [feature({ ageMinutes: 121, key: "market_fair_probability", quality: 1, required: true })],
      maxAgeMinutes: 120,
    });

    expect(result.status).toBe("BLOCK");
    expect(result.staleFeatures).toEqual(["market_fair_probability"]);
    expect(result.staleRequired).toEqual(["market_fair_probability"]);
  });

  it("returns BLOCK when a source policy is not allowed for modeling", () => {
    const result = evaluateFeatureContract({
      features: [
        feature({
          key: "rights_blocked",
          sourcePolicy: { allowedForModeling: true, sourceId: "unknown-feed", status: "unknown" },
        }),
      ],
    });

    expect(result.status).toBe("BLOCK");
    expect(result.blockedSources).toEqual(["rights_blocked"]);
    expect(result.featureHealth).toBe(55);
  });

  it("treats staleRequired as the intersection of stale features and required keys", () => {
    const result = evaluateFeatureContract({
      features: [
        feature({ ageMinutes: 200, key: "stale_required", required: true }),
        feature({ key: "fresh_required", required: true }),
        feature({ ageMinutes: 200, key: "stale_optional" }),
        feature({ key: "fresh_optional" }),
      ],
      maxAgeMinutes: 120,
      requiredFeatureKeys: ["also_required_missing"],
    });

    expect(result.staleFeatures).toEqual(["stale_required", "stale_optional"]);
    expect(result.staleRequired).toEqual(["stale_required"]);
    expect(result.missingRequired).toEqual(["also_required_missing"]);
    expect(new Set(result.staleRequired)).toEqual(
      new Set(result.staleFeatures.filter((key) => ["stale_required", "fresh_required", "also_required_missing"].includes(key))),
    );
  });

  it("does not treat age equal to maxAgeMinutes as stale", () => {
    const result = evaluateFeatureContract({
      features: [feature({ ageMinutes: 120, key: "on_the_limit", required: true })],
      maxAgeMinutes: 120,
    });

    expect(result.staleFeatures).toEqual([]);
    expect(result.staleRequired).toEqual([]);
    expect(result.status).toBe("OK");
  });
});
