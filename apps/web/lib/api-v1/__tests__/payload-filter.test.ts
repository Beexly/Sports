import { describe, expect, it, vi } from "vitest";

import type { FableSourceRegistryEntry } from "@/lib/fable/source-registry";

import {
  filterApiV1MetricPayloadFields,
  filterApiV1PayloadFields,
  type ApiV1MetricPayloadField,
} from "../payload-filter";

const { UNKNOWN_STATUS_SOURCE_ID } = vi.hoisted(() => ({
  UNKNOWN_STATUS_SOURCE_ID: "fixture-unknown-all",
}));

vi.mock("@/lib/fable/source-registry", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@/lib/fable/source-registry");
  const nflverse = actual.findFableSourceRegistryEntry("nflverse");
  const fixtures: Record<string, FableSourceRegistryEntry> = nflverse
    ? {
        [UNKNOWN_STATUS_SOURCE_ID]: {
          ...nflverse,
          commercial_use_status: "unknown",
          derived_feature_status: "unknown",
          display_status: "unknown",
          partner_sharing_status: "unknown",
          source_id: UNKNOWN_STATUS_SOURCE_ID,
          storage_status: "unknown",
        },
      }
    : {};

  return {
    ...actual,
    findFableSourceRegistryEntry: (
      sourceId: string,
      entries?: readonly FableSourceRegistryEntry[],
    ): FableSourceRegistryEntry | null =>
      fixtures[sourceId] ?? actual.findFableSourceRegistryEntry(sourceId, entries),
  };
});

describe("filterApiV1PayloadFields", () => {
  it("passes allowed sources through unchanged", () => {
    const result = filterApiV1PayloadFields(
      [
        {
          path: "metrics.playableWindow.score",
          sourceIds: ["nflverse"],
          value: 0.42,
        },
      ],
      "commercial_display",
    );

    expect(result.ok).toBe(true);
    expect(result.blockedFields).toEqual([]);
    expect(result.blockers).toEqual([]);
    expect(result.payload).toEqual({ "metrics.playableWindow.score": 0.42 });
  });

  it("omits blocked, unknown, and conditional fields, sets ok false, and records blockers", () => {
    const result = filterApiV1PayloadFields(
      [
        {
          path: "scores.home",
          sourceIds: ["espn-public-api"],
          value: 24,
        },
        {
          path: "weather.wind",
          sourceIds: [UNKNOWN_STATUS_SOURCE_ID],
          value: 12,
        },
        {
          path: "markets.kalshi",
          sourceIds: ["kalshi"],
          value: { ticker: "KX" },
        },
        {
          path: "metrics.playableWindow.score",
          sourceIds: ["nflverse"],
          value: 0.42,
        },
      ],
      "commercial_display",
    );

    expect(result.ok).toBe(false);
    expect(result.payload).toEqual({ "metrics.playableWindow.score": 0.42 });
    expect(result.blockedFields).toEqual(["scores.home", "weather.wind", "markets.kalshi"]);
    expect(result.blockers).toEqual([
      "scores.home: espn-public-api is blocked for commercial_display.",
      `weather.wind: ${UNKNOWN_STATUS_SOURCE_ID} has unknown rights for commercial_display; API exposure fails closed.`,
      "markets.kalshi: kalshi is conditional for commercial_display; owner/legal approval is required before API exposure.",
    ]);
    expect(result.payload["scores.home"]).toBeUndefined();
    expect(result.payload["weather.wind"]).toBeUndefined();
    expect(result.payload["markets.kalshi"]).toBeUndefined();
  });

  it("fails closed for an unknown sourceId", () => {
    const result = filterApiV1PayloadFields(
      [
        {
          path: "secret.field",
          sourceIds: ["not-a-registered-source"],
          value: "hidden",
        },
      ],
      "public_display",
    );

    expect(result.ok).toBe(false);
    expect(result.payload).toEqual({});
    expect(result.blockedFields).toEqual(["secret.field"]);
    expect(result.blockers).toEqual([
      "secret.field: Unknown source 'not-a-registered-source' cannot be exposed through API v1.",
    ]);
  });

  it("adds a rawVendorPayload blocker when storage is not allowed", () => {
    const allowedDerived = filterApiV1PayloadFields(
      [
        {
          path: "scores.derived",
          sourceIds: ["espn-public-api"],
          value: 7,
        },
      ],
      "derived_feature",
    );
    expect(allowedDerived.ok).toBe(true);
    expect(allowedDerived.payload).toEqual({ "scores.derived": 7 });

    const rawBlocked = filterApiV1PayloadFields(
      [
        {
          path: "scores.raw",
          rawVendorPayload: true,
          sourceIds: ["espn-public-api"],
          value: { vendor: "espn" },
        },
      ],
      "derived_feature",
    );
    expect(rawBlocked.ok).toBe(false);
    expect(rawBlocked.payload).toEqual({});
    expect(rawBlocked.blockedFields).toEqual(["scores.raw"]);
    expect(rawBlocked.blockers).toEqual([
      "scores.raw: espn-public-api cannot include raw vendor payload because storage is blocked.",
    ]);

    const rawAllowedStorage = filterApiV1PayloadFields(
      [
        {
          path: "pbp.raw",
          rawVendorPayload: true,
          sourceIds: ["nflverse"],
          value: { play: 1 },
        },
      ],
      "commercial_display",
    );
    expect(rawAllowedStorage.ok).toBe(true);
    expect(rawAllowedStorage.payload).toEqual({ "pbp.raw": { play: 1 } });
    expect(rawAllowedStorage.blockers.join(" ")).not.toMatch(/cannot include raw vendor payload/);
  });
});

describe("filterApiV1MetricPayloadFields", () => {
  it("delegates to the prediction-engine envelope and omits blocked metric fields", () => {
    const fields: readonly ApiV1MetricPayloadField[] = [
      {
        description: "Derived playable-window score",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "metrics.playableWindow.score",
        sourceIds: ["nflverse"],
        value: 0.42,
      },
      {
        description: "Raw sportsbook price copied from provider feed",
        exposure: "API",
        kind: "RAW_SOURCE_VALUE",
        path: "odds.bookmakers[0].price",
        sourceIds: ["the-odds-api"],
        value: 110,
      },
    ];

    const result = filterApiV1MetricPayloadFields(fields, {
      generatedAt: "2026-07-06T00:00:00.000Z",
      requestId: "api_v1_b6_payload_filter",
    });

    expect(result.ok).toBe(false);
    expect(result.payload).toEqual({ "metrics.playableWindow.score": 0.42 });
    expect(result.approvedFields).toContain("metrics.playableWindow.score");
    expect(result.blockedFields).toContain("odds.bookmakers[0].price");
    expect(result.payload["odds.bookmakers[0].price"]).toBeUndefined();
    expect(result.blockers.join(" ")).toMatch(/raw/i);
    expect(result.rightsDecision.allowed).toBe(false);
    expect(result.rightsDecision.blockedFields).toEqual(result.blockedFields);
  });
});
