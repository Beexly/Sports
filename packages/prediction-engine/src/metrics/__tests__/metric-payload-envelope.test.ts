import { describe, expect, it } from "vitest";

import {
  filterMetricPayloadEnvelope,
  type MetricPayloadEnvelopeField,
} from "../core/index.js";

describe("metric payload envelope", () => {
  it("keeps allowed derived API fields and carries attribution", () => {
    const envelope = filterMetricPayloadEnvelope({
      fields: [
        {
          description: "GSE-derived expected YAC summary.",
          exposure: "API",
          kind: "DERIVED_METRIC",
          path: "metrics.expectedYac.score",
          sourceIds: ["nflverse"],
          value: 6.2,
        },
        {
          description: "Public driver for model explainability.",
          exposure: "API",
          kind: "PUBLIC_DRIVER",
          path: "metrics.expectedYac.drivers.space",
          sourceIds: ["nflverse"],
          value: 0.73,
        },
      ] satisfies readonly MetricPayloadEnvelopeField[],
      requestId: "req_metric_1",
    });

    expect(envelope.ok).toBe(true);
    expect(envelope.payload["metrics.expectedYac.score"]).toBe(6.2);
    expect(envelope.payload["metrics.expectedYac.drivers.space"]).toBe(0.73);
    expect(envelope.blockedFields).toEqual([]);
    expect(envelope.requiredAttribution).toEqual([expect.stringContaining("Data from nflverse")]);
    expect(envelope.meta).toMatchObject({ exposure: "API", requestId: "req_metric_1", shadow: true });
  });

  it("excludes raw source values and protected weights from API payloads", () => {
    const envelope = filterMetricPayloadEnvelope({
      fields: [
        {
          description: "Allowed derived market gravity score.",
          exposure: "API",
          kind: "DERIVED_METRIC",
          path: "marketGravity.score",
          sourceIds: ["the-odds-api"],
          value: 81,
        },
        {
          description: "Raw provider odds price.",
          exposure: "API",
          kind: "RAW_SOURCE_VALUE",
          path: "odds.bookmakers.0.price",
          sourceIds: ["the-odds-api"],
          value: -110,
        },
        {
          description: "Protected market gravity formula coefficient.",
          exposure: "INTERNAL",
          kind: "PROTECTED_WEIGHT",
          path: "marketGravity.weights.lineMovement",
          sourceIds: ["the-odds-api"],
          value: 0.42,
        },
      ] satisfies readonly MetricPayloadEnvelopeField[],
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.payload["marketGravity.score"]).toBe(81);
    expect(envelope.payload["odds.bookmakers.0.price"]).toBeUndefined();
    expect(envelope.payload["marketGravity.weights.lineMovement"]).toBeUndefined();
    expect(envelope.blockedFields).toEqual([
      "odds.bookmakers.0.price",
      "marketGravity.weights.lineMovement",
    ]);
    expect(envelope.violations.join(" ")).toContain("raw source value");
    expect(envelope.violations.join(" ")).toContain("protected weights");
  });

  it("blocks derived API payloads when the source policy does not allow derived API exposure", () => {
    const envelope = filterMetricPayloadEnvelope({
      fields: [
        {
          description: "Public logged-off ESPN fallback transformed into an API field.",
          exposure: "API",
          kind: "DERIVED_METRIC",
          path: "fallback.espnSignal",
          sourceIds: ["espn-public-api"],
          value: "blocked",
        },
      ] satisfies readonly MetricPayloadEnvelopeField[],
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.payload).toEqual({});
    expect(envelope.blockedFields).toEqual(["fallback.espnSignal"]);
    expect(envelope.violations[0]).toContain("espn-public-api blocks derived API exposure");
  });

  it("allows protected weights only for internal review envelopes", () => {
    const envelope = filterMetricPayloadEnvelope({
      exposure: "INTERNAL",
      fields: [
        {
          description: "Internal-only formula coefficient for calibration review.",
          exposure: "INTERNAL",
          kind: "PROTECTED_WEIGHT",
          path: "gss.weights.calibrationDebt",
          sourceIds: ["nflverse"],
          value: 0.19,
        },
      ] satisfies readonly MetricPayloadEnvelopeField[],
    });

    expect(envelope.ok).toBe(true);
    expect(envelope.payload["gss.weights.calibrationDebt"]).toBe(0.19);
  });
});
