import { describe, expect, it } from "vitest";
import { filterMetricPayloadEnvelope } from "../payload-envelope.js";
import type { MetricPayloadEnvelopeField } from "../payload-envelope.js";
import { metricSourceRightsPolicyFromRegistryEntry } from "../source-rights-registry-adapter.js";

function envelopeField(
  overrides: Partial<MetricPayloadEnvelopeField> & Pick<MetricPayloadEnvelopeField, "path" | "value">,
): MetricPayloadEnvelopeField {
  return {
    description: "fixture envelope field",
    exposure: "API",
    kind: "DERIVED_METRIC",
    sourceIds: ["nflverse"],
    ...overrides,
  };
}

describe("filterMetricPayloadEnvelope", () => {
  it("defaults to API exposure, epoch generatedAt, null requestId, and shadow meta", () => {
    const envelope = filterMetricPayloadEnvelope({
      fields: [envelopeField({ path: "metrics.score", value: 12 })],
    });

    expect(envelope.ok).toBe(true);
    expect(envelope.meta).toEqual({
      exposure: "API",
      generatedAt: new Date(0).toISOString(),
      requestId: null,
      shadow: true,
    });
    expect(envelope.payload).toEqual({ "metrics.score": 12 });
  });

  it("copies only approved field values into the payload", () => {
    const envelope = filterMetricPayloadEnvelope({
      fields: [
        envelopeField({ path: "marketGravity.score", sourceIds: ["the-odds-api"], value: 81 }),
        envelopeField({
          kind: "RAW_SOURCE_VALUE",
          path: "odds.price",
          sourceIds: ["the-odds-api"],
          value: -110,
        }),
        envelopeField({
          exposure: "INTERNAL",
          kind: "PROTECTED_WEIGHT",
          path: "marketGravity.weights.lineMovement",
          sourceIds: ["the-odds-api"],
          value: 0.42,
        }),
      ],
      generatedAt: "2026-07-06T00:00:00.000Z",
      requestId: "req_envelope_1",
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.payload).toEqual({ "marketGravity.score": 81 });
    expect(envelope.approvedFields).toEqual(["marketGravity.score"]);
    expect(envelope.blockedFields).toEqual([
      "odds.price",
      "marketGravity.weights.lineMovement",
    ]);
    expect(envelope.violations.join(" ")).toContain("raw source value");
    expect(envelope.violations.join(" ")).toContain("protected weights");
    expect(envelope.rightsDecision.allowed).toBe(false);
    expect(envelope.meta).toEqual({
      exposure: "API",
      generatedAt: "2026-07-06T00:00:00.000Z",
      requestId: "req_envelope_1",
      shadow: true,
    });
  });

  it("keeps requiredAttribution from the rights decision", () => {
    const envelope = filterMetricPayloadEnvelope({
      fields: [
        envelopeField({ path: "metrics.expectedYac.score", value: 6.2 }),
        envelopeField({
          kind: "PUBLIC_DRIVER",
          path: "metrics.expectedYac.drivers.space",
          value: 0.73,
        }),
      ],
    });

    expect(envelope.ok).toBe(true);
    expect(envelope.requiredAttribution).toEqual([
      "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
    ]);
    expect(envelope.requiredAttribution).toEqual(envelope.rightsDecision.requiredAttribution);
  });

  it("honors caller-supplied policies instead of the default registry set", () => {
    const blockedPolicy = metricSourceRightsPolicyFromRegistryEntry({
      attribution_required: false,
      attribution_text: null,
      commercial_display_allowed: true,
      derived_analytics_allowed: true,
      evidence_urls: [],
      model_training_allowed: true,
      notes: "synthetic blocked policy",
      source_id: "nflverse",
      source_name: "nflverse",
      status: "excluded",
      storage_allowed: true,
    });

    const envelope = filterMetricPayloadEnvelope({
      fields: [envelopeField({ path: "metrics.score", value: 1 })],
      policies: [blockedPolicy],
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.payload).toEqual({});
    expect(envelope.blockedFields).toEqual(["metrics.score"]);
    expect(envelope.violations[0]).toContain("nflverse blocks derived API exposure");
  });

  it("returns an empty ok envelope when there are no fields", () => {
    const envelope = filterMetricPayloadEnvelope({
      exposure: "CONTENT",
      fields: [],
      generatedAt: "2026-01-01T00:00:00.000Z",
      requestId: "req_empty",
    });

    expect(envelope.ok).toBe(true);
    expect(envelope.payload).toEqual({});
    expect(envelope.approvedFields).toEqual([]);
    expect(envelope.blockedFields).toEqual([]);
    expect(envelope.violations).toEqual([]);
    expect(envelope.meta.exposure).toBe("CONTENT");
    expect(envelope.meta.shadow).toBe(true);
  });
});
