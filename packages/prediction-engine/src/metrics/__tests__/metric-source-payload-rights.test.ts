import { describe, expect, it } from "vitest";
import {
  GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  evaluateMetricPayloadRights,
  evaluateMetricSourceRights,
  metricSourceRightsPolicy,
  sourceRightsEnvelopeFromPolicy,
  type MetricPayloadField,
} from "../core/index.js";

const policies = GSE_METRIC_SOURCE_RIGHTS_POLICIES;

describe("metric source and payload rights", () => {
  it("allows nflverse modeling, validation, and derived exposure with attribution", () => {
    const modeling = evaluateMetricSourceRights({
      policies,
      sourceIds: ["nflverse"],
      use: "model_training",
    });
    const validation = evaluateMetricSourceRights({
      policies,
      sourceIds: ["nflverse"],
      use: "validation",
    });
    const derivedApi = evaluateMetricSourceRights({
      policies,
      sourceIds: ["nflverse"],
      use: "derived_api",
    });

    expect(modeling.allowed).toBe(true);
    expect(validation.allowed).toBe(true);
    expect(derivedApi.allowed).toBe(true);
    expect(derivedApi.requiredAttribution).toEqual([
      expect.stringContaining("Data from nflverse"),
    ]);
  });

  it("blocks The Odds API raw API exposure while allowing derived market payloads", () => {
    const rawApi = evaluateMetricSourceRights({
      policies,
      sourceIds: ["the-odds-api"],
      use: "raw_api",
    });
    const derivedApi = evaluateMetricSourceRights({
      policies,
      sourceIds: ["the-odds-api"],
      use: "derived_api",
    });

    expect(rawApi.allowed).toBe(false);
    expect(rawApi.violations[0]).toContain("blocks raw API exposure");
    expect(derivedApi.allowed).toBe(true);
  });

  it("maps source policies into metric asset source-rights envelopes", () => {
    const nflversePolicy = metricSourceRightsPolicy(policies, "nflverse");

    expect(nflversePolicy).not.toBeNull();
    if (nflversePolicy === null) return;

    const envelope = sourceRightsEnvelopeFromPolicy(nflversePolicy);

    expect(envelope.sourceId).toBe("nflverse");
    expect(envelope.mayUseForModeling).toBe(true);
    expect(envelope.mayValidateAgainst).toBe(true);
    expect(envelope.mayExposeDerived).toBe(true);
    expect(envelope.mayExposeRaw).toBe(false);
    expect(envelope.attributionRequired).toContain("nflverse");
  });

  it("blocks raw odds fields from API payloads", () => {
    const fields: readonly MetricPayloadField[] = [
      {
        description: "Market gravity score derived from licensed odds movement.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "marketGravity.score",
        sourceIds: ["the-odds-api"],
      },
      {
        description: "Raw sportsbook price copied from provider feed.",
        exposure: "API",
        kind: "RAW_SOURCE_VALUE",
        path: "odds.bookmakers[0].markets[0].outcomes[0].price",
        sourceIds: ["the-odds-api"],
      },
    ];

    const decision = evaluateMetricPayloadRights({ exposure: "API", fields, policies });

    expect(decision.allowed).toBe(false);
    expect(decision.violations[0]).toContain("raw source value");
    expect(decision.violations[0]).toContain("the-odds-api");
  });

  it("allows derived API payloads when the source permits derived exposure", () => {
    const fields: readonly MetricPayloadField[] = [
      {
        description: "Market gravity score derived from licensed odds movement.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "marketGravity.score",
        sourceIds: ["the-odds-api"],
      },
    ];

    const decision = evaluateMetricPayloadRights({ exposure: "API", fields, policies });

    expect(decision.allowed).toBe(true);
    expect(decision.violations).toEqual([]);
  });

  it("fails closed when a payload field references an unknown source policy", () => {
    const fields: readonly MetricPayloadField[] = [
      {
        description: "Unclear market signal with no source policy.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "mystery.signal",
        sourceIds: ["unknown-vendor"],
      },
    ];

    const decision = evaluateMetricPayloadRights({ exposure: "API", fields, policies });

    expect(decision.allowed).toBe(false);
    expect(decision.violations[0]).toContain("missing source-rights policy");
  });
});
