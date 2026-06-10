import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * processSport — R-13 quota burn-down persistence tests.
 *
 * The Odds API returns x-requests-remaining / x-requests-used headers on
 * every response; processSport must persist them onto the IngestionRun at
 * run completion. Pinned contracts:
 *
 *   - SUCCESS completion carries remainingRequests/usedRequests.
 *   - Quota persistence is fail-soft: if the combined completion write fails
 *     (e.g. columns not migrated yet), completion is retried WITHOUT the
 *     quota fields and the run still reports success — quota visibility
 *     must NEVER block or fail a run.
 *   - A FAILED run still persists the error-carried remaining quota
 *     (OddsApiError.remainingRequests) — quota exhaustion is visible on the
 *     exact run that hit it.
 *   - Unparseable headers (NaN) degrade to "no quota fields", not zeros.
 *
 * Mirrors the settle.test.ts pattern: @sports/db mocked with stub-proxy
 * shapes, @sports/data-ingestion mocked at the OddsApiClient seam with the
 * pure helpers kept real, pipeline side-writers mocked at the module seam.
 */

const dbMocks = vi.hoisted(() => ({
  runCreate: vi.fn<(args?: unknown) => Promise<{ id: string }>>(),
  runUpdate: vi.fn<(args?: unknown) => Promise<unknown>>(),
  sportUpsert: vi.fn<(args?: unknown) => Promise<{ id: string }>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: dbMocks.runCreate, update: dbMocks.runUpdate },
    sport: { upsert: dbMocks.sportUpsert },
  },
  // closing-line.ts (re-exported by the mocked-with-actual data-ingestion
  // module) imports this at module scope.
  isStubMode: () => true,
}));

const providerMocks = vi.hoisted(() => ({
  getOdds: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("@sports/data-ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/data-ingestion")>();
  class MockOddsApiClient {
    constructor(_apiKey: string) {}
    getOdds = providerMocks.getOdds;
  }
  return {
    ...actual,
    OddsApiClient: MockOddsApiClient as unknown as typeof actual.OddsApiClient,
  };
});

// Pipeline side-writers — out of scope here, mocked at the module seam.
vi.mock("../source-snapshot.js", () => ({
  recordSourceSnapshot: vi.fn(async () => undefined),
}));
vi.mock("../gate-decisions.js", () => ({
  recordGateDecisions: vi.fn(async () => undefined),
}));

import { OddsApiError } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { processSport, type SportConfig } from "../process-sport.js";

const SPORT: SportConfig = {
  key: "basketball_nba",
  name: "NBA",
  displayName: "National Basketball Association",
};

function runProcessSport() {
  return processSport(SPORT, "test-key", getReadinessGates(), "[test]");
}

/** The data payload of the Nth ingestionRun.update call. */
function updateData(callIndex: number): Record<string, unknown> {
  const call = dbMocks.runUpdate.mock.calls[callIndex];
  expect(call).toBeDefined();
  return (call?.[0] as { data: Record<string, unknown> }).data;
}

describe("processSport — R-13 quota persistence", () => {
  beforeEach(() => {
    for (const mock of Object.values(dbMocks)) mock.mockReset();
    providerMocks.getOdds.mockReset();

    dbMocks.runCreate.mockResolvedValue({ id: "run-1" });
    dbMocks.runUpdate.mockResolvedValue({ id: "run-1" });
    dbMocks.sportUpsert.mockResolvedValue({ id: "sport-1" });
    // Empty slate keeps the run on the completion path without per-game writes.
    providerMocks.getOdds.mockResolvedValue({
      data: [],
      remainingRequests: 412,
      usedRequests: 88,
    });

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists remainingRequests/usedRequests on the SUCCESS completion update", async () => {
    const result = await runProcessSport();

    expect(result.status).toBe("success");
    expect(dbMocks.runUpdate).toHaveBeenCalledTimes(1);
    expect(dbMocks.runUpdate).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "SUCCESS",
        remainingRequests: 412,
        usedRequests: 88,
      }),
    });
  });

  it("fail-soft: a quota-bearing completion failure retries WITHOUT quota fields and the run still succeeds", async () => {
    // First update (with quota fields) fails — e.g. columns not migrated yet.
    dbMocks.runUpdate
      .mockRejectedValueOnce(new Error('column "remainingRequests" does not exist'))
      .mockResolvedValue({ id: "run-1" });

    const result = await runProcessSport();

    expect(result.status).toBe("success");
    expect(dbMocks.runUpdate).toHaveBeenCalledTimes(2);
    // Retry carries the completion truth but no quota fields.
    const retryData = updateData(1);
    expect(retryData["status"]).toBe("SUCCESS");
    expect("remainingRequests" in retryData).toBe(false);
    expect("usedRequests" in retryData).toBe(false);
  });

  it("persists the error-carried remaining quota on a FAILED run (quota exhaustion stays visible)", async () => {
    providerMocks.getOdds.mockRejectedValue(
      new OddsApiError("The Odds API error: 429 — quota spent", 429, 0)
    );

    const result = await runProcessSport();

    expect(result.status).toBe("failed");
    expect(dbMocks.runUpdate).toHaveBeenCalledTimes(1);
    const data = updateData(0);
    expect(data["status"]).toBe("FAILED");
    expect(data["remainingRequests"]).toBe(0);
    // usedRequests is not carried on the error — persisted as null, never faked.
    expect(data["usedRequests"]).toBeNull();
  });

  it("degrades unparseable quota headers (NaN) to a completion without quota fields", async () => {
    providerMocks.getOdds.mockResolvedValue({
      data: [],
      remainingRequests: Number.NaN,
      usedRequests: Number.NaN,
    });

    const result = await runProcessSport();

    expect(result.status).toBe("success");
    expect(dbMocks.runUpdate).toHaveBeenCalledTimes(1);
    const data = updateData(0);
    expect(data["status"]).toBe("SUCCESS");
    expect("remainingRequests" in data).toBe(false);
    expect("usedRequests" in data).toBe(false);
  });
});
