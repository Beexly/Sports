import { describe, expect, it } from "vitest";

import {
  runApiV1ComposedMetricPayloadFixtureBridge,
  summarizeApiV1ComposedMetricPayloadFixtureBridge,
} from "@/lib/api-v1";

describe("API v1 composed metric payload fixture bridge", () => {
  it("runs the package-owned composed payload fixtures without creating routes", () => {
    const results = runApiV1ComposedMetricPayloadFixtureBridge();

    expect(results.map((result) => result.fixtureId)).toEqual([
      "composed_decision_api_safe",
      "composed_decision_blocks_protected_raw_and_probability",
      "composed_decision_blocks_uncleared_source",
    ]);
    for (const result of results) {
      expect(result.shadowOnly).toBe(true);
      expect(result.liveRouteCreated).toBe(false);
      expect(result.routePath).toBeNull();
    }
  });

  it("keeps safe composed decision metric payload fields available to the app bridge", () => {
    const safe = bridgeResult("composed_decision_api_safe");

    expect(safe.ok).toBe(true);
    expect(safe.blockedFields).toEqual([]);
    expect(safe.approvedFields).toEqual(safe.expectedApprovedFields);
    expect(safe.payload["metrics.playableWindow.score"]).toEqual(expect.any(Number));
    expect(safe.payload["metrics.gseSignal.score"]).toEqual(expect.any(Number));
    expect(safe.payload["metrics.marketMirage.score"]).toEqual(expect.any(Number));
    expect(safe.payload["metrics.gseSignal.probability"]).toBeUndefined();
  });

  it("blocks protected, raw, provider, probability, and uncleared source fields through the app bridge", () => {
    const unsafe = bridgeResult("composed_decision_blocks_protected_raw_and_probability");
    const uncleared = bridgeResult("composed_decision_blocks_uncleared_source");

    expect(unsafe.ok).toBe(false);
    expect(unsafe.blockedFields).toEqual(unsafe.expectedBlockedFields);
    for (const blockedField of unsafe.blockedFields) {
      expect(unsafe.payload[blockedField]).toBeUndefined();
    }
    expect(unsafe.blockers.join(" ")).toContain("unsupported probability claims");
    expect(unsafe.blockers.join(" ")).toContain("protected weights");
    expect(unsafe.blockers.join(" ")).toContain("raw source value");

    expect(uncleared.ok).toBe(false);
    expect(uncleared.payload).toEqual({});
    expect(uncleared.blockers.join(" ")).toContain("espn-public-api blocks derived API exposure");
  });

  it("summarizes app-bridge fixture results with live route creation locked at zero", () => {
    const summary = summarizeApiV1ComposedMetricPayloadFixtureBridge(
      runApiV1ComposedMetricPayloadFixtureBridge(),
    );

    expect(summary).toEqual({
      approvedFieldCount: 26,
      blocked: 2,
      blockedFieldCount: 6,
      liveRouteCreatedCount: 0,
      ok: 1,
      total: 3,
    });
  });
});

function bridgeResult(
  fixtureId: ReturnType<typeof runApiV1ComposedMetricPayloadFixtureBridge>[number]["fixtureId"],
) {
  const result = runApiV1ComposedMetricPayloadFixtureBridge().find((fixture) => fixture.fixtureId === fixtureId);
  if (!result) throw new Error(`Missing bridge result for ${fixtureId}`);
  return result;
}
