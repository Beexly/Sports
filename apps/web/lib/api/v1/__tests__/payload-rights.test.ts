import { describe, expect, it, vi } from "vitest";

import {
  buildFableSourceRegistry,
  findFableSourceRegistryEntry,
  type FableSourceRegistryEntry,
  type FableUseStatus,
} from "@/lib/fable/source-registry";

import { evaluateApiV1PayloadRights } from "../payload-rights";
import type { ApiV1PayloadUse } from "../types";

type MatrixUse = Exclude<ApiV1PayloadUse, "model_training">;

const MATRIX_USES = [
  "commercial_display",
  "public_display",
  "derived_feature",
  "raw_storage",
  "partner_sharing",
] as const satisfies readonly MatrixUse[];

const MATRIX_STATUSES = ["allowed", "conditional", "unknown", "blocked"] as const satisfies readonly FableUseStatus[];

const { PARTNER_SHARING_ALLOWED_SOURCE_ID, UNKNOWN_STATUS_SOURCE_ID } = vi.hoisted(() => ({
  PARTNER_SHARING_ALLOWED_SOURCE_ID: "fixture-partner-sharing-allowed",
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
        [PARTNER_SHARING_ALLOWED_SOURCE_ID]: {
          ...nflverse,
          partner_sharing_status: "allowed",
          source_id: PARTNER_SHARING_ALLOWED_SOURCE_ID,
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

function registryStatusForUse(entry: FableSourceRegistryEntry, use: MatrixUse): FableUseStatus {
  if (use === "commercial_display" || use === "public_display") return entry.display_status;
  if (use === "derived_feature") return entry.derived_feature_status;
  if (use === "raw_storage") return entry.storage_status;
  return entry.partner_sharing_status;
}

function resolveSourceId(use: MatrixUse, status: FableUseStatus): string {
  if (status === "unknown") return UNKNOWN_STATUS_SOURCE_ID;
  const match = buildFableSourceRegistry().find((entry) => registryStatusForUse(entry, use) === status);
  if (match) return match.source_id;
  if (use === "partner_sharing" && status === "allowed") return PARTNER_SHARING_ALLOWED_SOURCE_ID;
  throw new Error(`No Fable registry source for ${status} × ${use}`);
}

function expectedStatusBlockers(sourceId: string, status: FableUseStatus, use: MatrixUse): readonly string[] {
  if (status === "allowed") return [];
  if (status === "conditional") {
    return [`${sourceId} is conditional for ${use}; owner/legal approval is required before API exposure.`];
  }
  if (status === "unknown") {
    return [`${sourceId} has unknown rights for ${use}; API exposure fails closed.`];
  }
  return [`${sourceId} is blocked for ${use}.`];
}

describe("evaluateApiV1PayloadRights — FableUseStatus × ApiV1PayloadUse", () => {
  it.each(
    MATRIX_USES.flatMap((intendedUse) =>
      MATRIX_STATUSES.map((status) => ({ intendedUse, status })),
    ),
  )("$status × $intendedUse has the fail-closed allowed flag and blocker text", ({ intendedUse, status }) => {
    const sourceId = resolveSourceId(intendedUse, status);
    if (status !== "unknown" && !(intendedUse === "partner_sharing" && status === "allowed")) {
      expect(sourceId.startsWith("fixture-")).toBe(false);
    }

    const report = evaluateApiV1PayloadRights({
      intendedUse,
      sourceIds: [sourceId],
    });
    const decision = report.sourceDecisions[0];
    const blockers = expectedStatusBlockers(sourceId, status, intendedUse);

    expect(decision).toBeDefined();
    expect(decision?.sourceId).toBe(sourceId);
    expect(decision?.status).toBe(status);
    expect(decision?.blockers).toEqual(blockers);
    expect(decision?.allowed).toBe(blockers.length === 0);
    expect(report.allowed).toBe(blockers.length === 0);
    expect(report.blockers).toEqual(blockers);
    expect(report.intendedUse).toBe(intendedUse);
  });

  it("maps each intended use onto the matching registry status field for a real source", () => {
    const nflverse = findFableSourceRegistryEntry("nflverse");
    const espn = findFableSourceRegistryEntry("espn-public-api");
    expect(nflverse).not.toBeNull();
    expect(espn).not.toBeNull();
    if (nflverse === null || espn === null) return;

    expect(evaluateApiV1PayloadRights({ intendedUse: "commercial_display", sourceIds: ["nflverse"] }).sourceDecisions[0]?.status)
      .toBe(nflverse.display_status);
    expect(evaluateApiV1PayloadRights({ intendedUse: "public_display", sourceIds: ["nflverse"] }).sourceDecisions[0]?.status)
      .toBe(nflverse.display_status);
    expect(evaluateApiV1PayloadRights({ intendedUse: "derived_feature", sourceIds: ["espn-public-api"] }).sourceDecisions[0]?.status)
      .toBe(espn.derived_feature_status);
    expect(evaluateApiV1PayloadRights({ intendedUse: "raw_storage", sourceIds: ["espn-public-api"] }).sourceDecisions[0]?.status)
      .toBe(espn.storage_status);
    expect(evaluateApiV1PayloadRights({ intendedUse: "partner_sharing", sourceIds: ["nflverse"] }).sourceDecisions[0]?.status)
      .toBe(nflverse.partner_sharing_status);
  });

  it("fails closed for an unknown sourceId", () => {
    const sourceId = "not-a-registered-source";
    const report = evaluateApiV1PayloadRights({
      intendedUse: "public_display",
      sourceIds: [sourceId],
    });

    expect(report.allowed).toBe(false);
    expect(report.blockers).toEqual([`Unknown source '${sourceId}' cannot be exposed through API v1.`]);
    expect(report.sourceDecisions).toEqual([
      expect.objectContaining({
        allowed: false,
        attributionRequired: false,
        attributionText: null,
        blockers: [`Unknown source '${sourceId}' cannot be exposed through API v1.`],
        sourceId,
        sourceName: null,
        status: "unknown",
      }),
    ]);
  });

  it("adds a raw-vendor-payload blocker when storage_status is not allowed", () => {
    const espn = findFableSourceRegistryEntry("espn-public-api");
    const kalshi = findFableSourceRegistryEntry("kalshi");
    const nflverse = findFableSourceRegistryEntry("nflverse");
    expect(espn).not.toBeNull();
    expect(kalshi).not.toBeNull();
    expect(nflverse).not.toBeNull();
    if (espn === null || kalshi === null || nflverse === null) return;

    expect(espn.storage_status).not.toBe("allowed");
    expect(kalshi.storage_status).not.toBe("allowed");
    expect(nflverse.storage_status).toBe("allowed");

    const espnRaw = evaluateApiV1PayloadRights({
      includesRawVendorPayload: true,
      intendedUse: "derived_feature",
      sourceIds: ["espn-public-api"],
    });
    expect(espnRaw.allowed).toBe(false);
    expect(espnRaw.blockers).toContain(
      "espn-public-api cannot include raw vendor payload because storage is blocked.",
    );

    const kalshiRaw = evaluateApiV1PayloadRights({
      includesRawVendorPayload: true,
      intendedUse: "derived_feature",
      sourceIds: ["kalshi"],
    });
    expect(kalshiRaw.allowed).toBe(false);
    expect(kalshiRaw.blockers).toContain(
      "kalshi cannot include raw vendor payload because storage is conditional.",
    );

    const nflverseRaw = evaluateApiV1PayloadRights({
      includesRawVendorPayload: true,
      intendedUse: "commercial_display",
      sourceIds: ["nflverse"],
    });
    expect(nflverseRaw.allowed).toBe(true);
    expect(nflverseRaw.blockers.join(" ")).not.toMatch(/cannot include raw vendor payload/);
  });
});
