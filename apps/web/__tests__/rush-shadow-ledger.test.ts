import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  isStubMode: vi.fn(() => false),
}));
vi.mock("@sports/db", () => ({
  db: {},
  isStubMode: dbMocks.isStubMode,
}));

import { persistRushShadowLedger, type RushShadowLedgerDb } from "@/lib/ops/rush-shadow-ledger";

const NOW = new Date("2026-09-24T12:00:00.000Z");
const RIGHTS = { source_id: "nflverse", status: "cleared-with-attribution" };

function profile(over: Record<string, unknown> = {}) {
  return {
    gsisId: "00-0034857",
    season: 2026,
    sourceId: "nflverse",
    rightsSnapshot: RIGHTS,
    fetchedAt: NOW,
    runs: 200,
    guardRuns: 110,
    tackleRuns: 50,
    endRuns: 40,
    leftRuns: 60,
    middleRuns: 80,
    rightRuns: 60,
    epaPerRun: 0.12,
    ...over,
  };
}

function client(
  findMany: () => Promise<unknown>,
  upsert: (args: unknown) => Promise<unknown> = async () => ({ id: "signal" }),
  deleteMany: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 }),
) {
  const signal = { deleteMany, upsert };
  const transaction = vi.fn(async (
    run: (tx: { signal: typeof signal }) => Promise<unknown>,
  ) => run({ signal }));
  return {
    playerRushProfile: { findMany },
    signal,
    $transaction: transaction,
    transaction,
  } as unknown as RushShadowLedgerDb;
}

beforeEach(() => {
  dbMocks.isStubMode.mockReset().mockReturnValue(false);
});

describe("persistRushShadowLedger", () => {
  it("writes low-weight, season-keyed shadow rows and reports composition", async () => {
    const upsert = vi.fn(async () => ({ id: "signal" }));
    const result = await persistRushShadowLedger(
      2026,
      client(async () => [profile()], upsert),
    );

    expect(result).toMatchObject({
      status: "ok",
      mode: "shadow",
      priced: false,
      season: 2026,
      profilesRead: 1,
      playersWithSignals: 1,
      composedSignals: 2,
      signalsWritten: 2,
      signalsSkipped: 0,
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    const first = upsert.mock.calls[0]![0] as {
      where: { entityType_entityId_key_season_week: Record<string, unknown> };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(first.where.entityType_entityId_key_season_week).toEqual({
      entityType: "player",
      entityId: "00-0034857",
      key: "rush.epa_per_run",
      season: 2026,
      week: 0,
    });
    expect(first.create).toMatchObject({
      category: "RATINGS",
      valueRaw: 0.12,
      value: 0.12,
      weight: 0.25,
      confidence: 0.55,
      sourceId: "nflverse",
      season: 2026,
      week: 0,
    });
    expect(first.update).toMatchObject({ value: 0.12, sourceId: "nflverse" });
  });

  it("removes stale rush rows before writing the current season generation", async () => {
    const deleteMany = vi.fn(async () => ({ count: 3 }));
    const upsert = vi.fn(async () => ({ id: "signal" }));
    const result = await persistRushShadowLedger(
      2026,
      client(async () => [profile()], upsert, deleteMany),
    );

    expect(result.status).toBe("ok");
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        entityType: "player",
        key: { in: ["rush.epa_per_run", "rush.scheme_lean"] },
        season: 2026,
        week: 0,
      },
    });
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("clears the current season generation when the capture table is empty", async () => {
    const findMany = vi.fn(async () => []);
    const deleteMany = vi.fn(async () => ({ count: 3 }));
    const upsert = vi.fn(async () => ({ id: "signal" }));
    const result = await persistRushShadowLedger(
      2026,
      client(findMany, upsert, deleteMany),
    );

    expect(result.status).toBe("no-data");
    expect(result.profilesRead).toBe(0);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("skips low-sample, unrights-stamped, and malformed-capture rows", async () => {
    const upsert = vi.fn(async () => ({ id: "signal" }));
    const result = await persistRushShadowLedger(
      2026,
      client(async () => [
        profile({ gsisId: "low", runs: 19 }),
        profile({ gsisId: "no-rights", rightsSnapshot: null }),
        profile({ gsisId: "bad-time", fetchedAt: "not-a-date" }),
        profile({ gsisId: "ok" }),
      ], upsert),
    );

    expect(result).toMatchObject({
      status: "ok",
      profilesRead: 4,
      playersWithSignals: 1,
      signalsWritten: 2,
      signalsSkipped: 3,
    });
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("returns stub without touching the database in stub mode", async () => {
    dbMocks.isStubMode.mockReturnValue(true);
    const findMany = vi.fn(async () => []);
    const upsert = vi.fn(async () => ({ id: "signal" }));
    const result = await persistRushShadowLedger(2026, client(findMany, upsert));

    expect(result.status).toBe("stub");
    expect(findMany).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("reports a partial upsert failure without throwing into the caller", async () => {
    const upsert = vi.fn(async (args: unknown) => {
      const call = args as { create: { key: string } };
      if (call.create.key === "rush.scheme_lean") throw new Error("write failed");
      return { id: "signal" };
    });
    const result = await persistRushShadowLedger(2026, client(async () => [profile()], upsert));

    expect(result.status).toBe("error");
    expect(result.signalsWritten).toBe(0);
    expect(result.errors).toEqual(["write failed"]);
  });

  it("rejects an invalid season before reading the database", async () => {
    const findMany = vi.fn(async () => []);
    const upsert = vi.fn(async () => ({ id: "signal" }));
    const result = await persistRushShadowLedger(1850, client(findMany, upsert));

    expect(result).toMatchObject({ status: "error", errors: ["invalid season"] });
    expect(findMany).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
});
