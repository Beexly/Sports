import { describe, expect, it } from "vitest";

import {
  COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES,
  runComposedDecisionMetricPayloadFixtures,
  summarizeComposedDecisionMetricPayloadFixtures,
} from "../core/index.js";

describe("composed decision metric payload-envelope fixtures", () => {
  it("defines the expected local-only fixture library", () => {
    expect(COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES.map((fixture) => fixture.fixtureId)).toEqual([
      "composed_decision_api_safe",
      "composed_decision_blocks_protected_raw_and_probability",
      "composed_decision_blocks_uncleared_source",
    ]);
  });

  it("allows only derived scores, bands, summaries, and public drivers in the safe fixture", () => {
    const safe = fixtureResult("composed_decision_api_safe");

    expect(safe.envelope.ok).toBe(true);
    expect(safe.envelope.blockedFields).toEqual([]);
    expect(safe.envelope.approvedFields).toEqual(safe.expectedApprovedFields);
    expect(safe.envelope.payload["metrics.playableWindow.score"]).toEqual(expect.any(Number));
    expect(safe.envelope.payload["metrics.gseSignal.score"]).toEqual(expect.any(Number));
    expect(safe.envelope.payload["metrics.staleLineRisk.marketSignalAllowed"]).toBe(true);
    expect(safe.envelope.payload["metrics.gseSignal.probability"]).toBeUndefined();
    expect(safe.envelope.meta).toMatchObject({
      exposure: "API",
      requestId: "req_composed_decision_api_safe",
      shadow: true,
    });
  });

  it("blocks protected weights, raw source values, provider ids, and unsupported probability claims", () => {
    const unsafe = fixtureResult("composed_decision_blocks_protected_raw_and_probability");

    expect(unsafe.envelope.ok).toBe(false);
    expect(unsafe.envelope.approvedFields).toEqual(unsafe.expectedApprovedFields);
    expect(unsafe.envelope.blockedFields).toEqual(unsafe.expectedBlockedFields);
    for (const blockedField of unsafe.expectedBlockedFields) {
      expect(unsafe.envelope.payload[blockedField]).toBeUndefined();
    }
    expect(unsafe.envelope.violations.join(" ")).toContain("protected weights");
    expect(unsafe.envelope.violations.join(" ")).toContain("raw source value");
    expect(unsafe.envelope.violations.join(" ")).toContain("blocks raw API exposure");
    expect(unsafe.envelope.violations.join(" ")).toContain("unsupported probability claims");
  });

  it("fails closed when a fallback source lacks derived API rights", () => {
    const blocked = fixtureResult("composed_decision_blocks_uncleared_source");

    expect(blocked.envelope.ok).toBe(false);
    expect(blocked.envelope.payload).toEqual({});
    expect(blocked.envelope.blockedFields).toEqual(["metrics.playableWindow.fallback.publicSignal"]);
    expect(blocked.envelope.violations[0]).toContain("espn-public-api blocks derived API exposure");
  });

  it("summarizes approved and blocked fixture fields without route exposure", () => {
    const results = runComposedDecisionMetricPayloadFixtures();
    const summary = summarizeComposedDecisionMetricPayloadFixtures(results);

    expect(summary).toEqual({
      approvedFieldCount: 20,
      blocked: 2,
      blockedFieldCount: 6,
      ok: 1,
      total: 3,
    });
  });
});

function fixtureResult(fixtureId: (typeof COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES)[number]["fixtureId"]) {
  const result = runComposedDecisionMetricPayloadFixtures().find((fixture) => fixture.fixtureId === fixtureId);
  if (!result) throw new Error(`Missing fixture result for ${fixtureId}`);
  return result;
}
