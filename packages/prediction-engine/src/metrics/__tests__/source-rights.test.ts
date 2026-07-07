import { describe, expect, it } from "vitest";
import {
  GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  evaluateMetricPayloadRights,
  evaluateMetricSourceRights,
  sourceRightsEnvelopeFromPolicy,
  type MetricPayloadField,
  type MetricSourceAttributionPolicy,
  type MetricSourceRightsPermissionSet,
  type MetricSourceRightsPolicy,
} from "../core/index.js";

const policies = GSE_METRIC_SOURCE_RIGHTS_POLICIES;

const allPermissions: MetricSourceRightsPermissionSet = {
  contentDisplay: true,
  derivedApi: true,
  derivedMetric: true,
  modelTraining: true,
  rawApi: true,
  storage: true,
  validation: true,
};

function policyWith(attribution: MetricSourceAttributionPolicy): MetricSourceRightsPolicy {
  return {
    attribution,
    evidenceRefs: [],
    notes: [],
    permissions: allPermissions,
    registrySourceId: "synthetic-registry",
    sourceId: "synthetic-source",
    sourceName: "Synthetic Source",
    status: "approved_api",
  };
}

describe("evaluateMetricSourceRights fail-closed gates", () => {
  it("denies when sourceIds is empty (no provenance -> deny)", () => {
    const decision = evaluateMetricSourceRights({ policies, sourceIds: [], use: "validation" });

    expect(decision.allowed).toBe(false);
    expect(decision.violations).toHaveLength(1);
    expect(decision.violations[0]).toContain("no source ids provided");
    expect(decision.requiredAttribution).toEqual([]);
  });

  it("blocks a payload field whose sourceIds is empty", () => {
    const fields: readonly MetricPayloadField[] = [
      {
        description: "Derived metric with no provenance.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "mystery.noSources",
        sourceIds: [],
      },
    ];

    const decision = evaluateMetricPayloadRights({ exposure: "API", fields, policies });

    expect(decision.allowed).toBe(false);
    expect(decision.blockedFields).toContain("mystery.noSources");
    expect(decision.violations.join(" ")).toContain("no source ids provided");
  });

  it("fails closed when attribution is required but no attribution text is configured", () => {
    const localPolicies = [policyWith({ required: true, text: null })];

    const decision = evaluateMetricSourceRights({
      policies: localPolicies,
      sourceIds: ["synthetic-source"],
      use: "derived_api",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.violations.join(" ")).toContain(
      "requires attribution but no attribution text is configured",
    );
    expect(decision.requiredAttribution).toEqual([]);
  });

  it("allows and propagates attribution text when required attribution is configured", () => {
    const localPolicies = [policyWith({ required: true, text: "Data from Synthetic Source" })];

    const decision = evaluateMetricSourceRights({
      policies: localPolicies,
      sourceIds: ["synthetic-source"],
      use: "derived_api",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.violations).toEqual([]);
    expect(decision.requiredAttribution).toEqual(["Data from Synthetic Source"]);
  });

  it("surfaces the unmet attribution requirement in the source-rights envelope", () => {
    const envelope = sourceRightsEnvelopeFromPolicy(policyWith({ required: true, text: null }));

    expect(envelope.attributionRequired).toBeDefined();
    expect(envelope.attributionRequired).toContain("attribution required");
  });

  it("omits attributionRequired when attribution is not required", () => {
    const envelope = sourceRightsEnvelopeFromPolicy(policyWith({ required: false, text: null }));

    expect(envelope.attributionRequired).toBeUndefined();
  });
});
