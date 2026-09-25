import { describe, expect, it, vi } from "vitest";
import {
  NGS_SIGNAL_CREATE_CHUNK,
  NGS_SIGNAL_TRANSACTION_MAX_WAIT_MS,
  NGS_SIGNAL_TRANSACTION_TIMEOUT_MS,
  persistNgsSignals,
  type NgsSignalWrite,
  type NgsSignalWriterDb,
} from "./ngs-signal-writer.js";
import { NGS_FEATURE_KEYS, NGS_TEAM_SIGNAL_KEY } from "@sports/types";

const NOW = new Date("2026-09-24T00:00:00.000Z");
const RIGHTS = { source_id: "nflverse", status: "cleared-with-attribution" };
const NGS_KEYS = [...NGS_FEATURE_KEYS, NGS_TEAM_SIGNAL_KEY];

function row(over: Record<string, unknown> = {}) {
  return {
    gsisId: "00-1",
    team: "KC",
    season: 2026,
    week: 2,
    seasonType: "REG",
    statType: "passing",
    cpoe: 2,
    avgTimeToThrow: 2.5,
    avgSeparation: null,
    avgYacAboveExpectation: null,
    rushYardsOverExpectedPerAtt: null,
    avgCushion: null,
    sourceId: "nflverse",
    rightsSnapshot: RIGHTS,
    fetchedAt: NOW,
    ...over,
  };
}

function writerClient(rows: readonly unknown[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const deleteMany = vi.fn(async (_args: Parameters<NgsSignalWriterDb["signal"]["deleteMany"]>[0]) => ({ count: 0 }));
  const createMany = vi.fn(async (args: { data: NgsSignalWrite[] }) => ({ count: args.data.length }));
  const transaction = vi.fn(async (
    run: (tx: { signal: NgsSignalWriterDb["signal"] }) => Promise<number>,
    _options?: { maxWait?: number; timeout?: number },
  ): Promise<number> => run({ signal: { deleteMany, createMany } }));
  const client: NgsSignalWriterDb = {
    nextGenStat: { findMany },
    signal: { deleteMany, createMany },
    $transaction: transaction,
  };
  return { client, findMany, deleteMany, createMany, transaction };
}

function writtenRows(createMany: ReturnType<typeof vi.fn>): NgsSignalWrite[] {
  return createMany.mock.calls.flatMap((call) => (call[0] as { data: NgsSignalWrite[] }).data);
}

describe("persistNgsSignals", () => {
  it("atomically replaces the season's NGS key set with weighted player/team signals", async () => {
    const mocks = writerClient([
      row(),
      row({ statType: "receiving", week: 2, cpoe: null, avgSeparation: 3, avgYacAboveExpectation: 1, avgCushion: 2 }),
      row({ gsisId: "00-2", statType: "rushing", cpoe: null, avgSeparation: null, rushYardsOverExpectedPerAtt: 1.2 }),
    ]);

    const result = await persistNgsSignals(2026, mocks.client);

    expect(result).toMatchObject({ status: "ok", playersWithSignals: 2, signalsWritten: 8, teamsWritten: 1 });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { season: 2026, key: { in: NGS_KEYS } },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]![1]).toEqual({
      maxWait: NGS_SIGNAL_TRANSACTION_MAX_WAIT_MS,
      timeout: NGS_SIGNAL_TRANSACTION_TIMEOUT_MS,
    });
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    const writes = writtenRows(mocks.createMany);
    expect(writes.map((write) => write.key)).toEqual(expect.arrayContaining(NGS_KEYS));
    expect(writes.find((write) => write.key === "ngs.team_score")).toMatchObject({
      entityType: "team",
      entityId: "KC",
    });
  });

  it("scopes replacement to the season's NGS key set, so unrelated keys and seasons survive", async () => {
    const mocks = writerClient([row()]);

    await persistNgsSignals(2026, mocks.client);

    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        season: 2026,
        key: { in: NGS_KEYS },
      },
    });
  });

  it("does not replace a prior generation when current rows have no usable feature", async () => {
    const mocks = writerClient([
      row({
        cpoe: null,
        avgTimeToThrow: null,
        avgSeparation: null,
        avgYacAboveExpectation: null,
        rushYardsOverExpectedPerAtt: null,
        avgCushion: null,
      }),
    ]);

    const result = await persistNgsSignals(2026, mocks.client);

    expect(result).toMatchObject({ status: "ok", playersWithSignals: 0, signalsWritten: 0, teamsWritten: 0 });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("falls back to a usable weekly grain when week 0 exists but has no features", async () => {
    const mocks = writerClient([
      row({ week: 0, cpoe: null, avgTimeToThrow: null, avgSeparation: null, avgYacAboveExpectation: null, rushYardsOverExpectedPerAtt: null, avgCushion: null }),
      row({ week: 4, cpoe: 7, fetchedAt: new Date("2026-09-24T00:00:00.000Z") }),
    ]);

    const result = await persistNgsSignals(2026, mocks.client);
    const playerWrite = writtenRows(mocks.createMany).find((write) => write.key === "ngs.cpoe");
    const teamWrite = writtenRows(mocks.createMany).find((write) => write.key === "ngs.team_score");

    expect(result.status).toBe("ok");
    expect(playerWrite).toMatchObject({ week: 4, valueRaw: 7 });
    expect(teamWrite).toMatchObject({ week: 4 });
  });

  it("writes team aggregates at multiple usable weeks for a shared-grain loader", async () => {
    const mocks = writerClient([
      row({ gsisId: "00-1", team: "KC", week: 0, cpoe: 1 }),
      row({ gsisId: "00-1", team: "KC", week: 4, cpoe: 9 }),
    ]);

    await persistNgsSignals(2026, mocks.client);

    const teamWrites = writtenRows(mocks.createMany).filter(
      (write) => write.key === "ngs.team_score" && write.entityType === "team",
    );
    expect(teamWrites.map((write) => write.week).sort((a, b) => a - b)).toEqual([0, 4]);
  });

  it("prefers the season aggregate week and does not mix a newer weekly row into it", async () => {
    const mocks = writerClient([
      row({ week: 0, cpoe: 1, fetchedAt: new Date("2026-09-23T00:00:00.000Z") }),
      row({ week: 4, cpoe: 9, fetchedAt: new Date("2026-09-24T00:00:00.000Z") }),
      row({ statType: "receiving", week: 0, cpoe: null, avgSeparation: 2, fetchedAt: new Date("2026-09-23T01:00:00.000Z") }),
    ]);

    const result = await persistNgsSignals(2026, mocks.client);

    expect(result.status).toBe("ok");
    const teamWrite = writtenRows(mocks.createMany).find((write) => write.key === "ngs.team_score");
    expect(teamWrite?.week).toBe(0);
    expect(teamWrite?.rightsSnapshot).toMatchObject({ _ngs: { sourceWeek: 0, statTypes: ["passing", "receiving"] } });
    expect(teamWrite?.capturedAt).toEqual(new Date("2026-09-23T00:00:00.000Z"));
  });

  it("uses one shared team week when players have different latest weeks", async () => {
    const mocks = writerClient([
      row({ gsisId: "00-1", week: 4, cpoe: 1 }),
      row({ gsisId: "00-2", week: 3, cpoe: 8 }),
    ]);

    await persistNgsSignals(2026, mocks.client);

    const teamWrite = writtenRows(mocks.createMany).find((write) => write.key === "ngs.team_score");
    expect(teamWrite?.week).toBe(4);
    expect(teamWrite?.rightsSnapshot).toMatchObject({ _ngs: { sourceWeek: 4, statTypes: ["passing"] } });
  });

  it("returns no-data and performs no writes when NGS has no usable rows", async () => {
    const mocks = writerClient([]);

    const result = await persistNgsSignals(2026, mocks.client);

    expect(result.status).toBe("no-data");
    expect(result.signalsWritten).toBe(0);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.createMany).not.toHaveBeenCalled();
  });

  it("reads week 0 separately so a bounded weekly query cannot omit the aggregate", async () => {
    const findMany = vi.fn(async (args: { where?: { week?: number | { gt?: number } } }) => {
      if (args.where?.week === 0) {
        return [row({ week: 0, cpoe: 1, fetchedAt: new Date("2026-09-23T00:00:00.000Z") })];
      }
      return [row({ week: 4, cpoe: 9, fetchedAt: new Date("2026-09-24T00:00:00.000Z") })];
    });
    const deleteMany = vi.fn(async (_args: Parameters<NgsSignalWriterDb["signal"]["deleteMany"]>[0]) => ({ count: 0 }));
    const createMany = vi.fn(async (args: { data: NgsSignalWrite[] }) => ({ count: args.data.length }));
    const transaction = vi.fn(async (
      run: (tx: { signal: NgsSignalWriterDb["signal"] }) => Promise<number>,
      _options?: { maxWait?: number; timeout?: number },
    ): Promise<number> => run({ signal: { deleteMany, createMany } }));
    const client: NgsSignalWriterDb = {
      nextGenStat: { findMany },
      signal: { deleteMany, createMany },
      $transaction: transaction,
    };

    const result = await persistNgsSignals(2026, client);

    expect(result.status).toBe("ok");
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls.map((call) => call[0]!.where!.week)).toEqual([0, { gt: 0 }]);
    const playerWrite = writtenRows(createMany).find((write) => write.key === "ngs.cpoe");
    expect(playerWrite?.valueRaw).toBe(1);
    expect(playerWrite?.week).toBe(0);
  });

  it("pins one batch at 2000 rows and two batches immediately above the boundary", async () => {
    const allFeatures = (index: number) => row({
      gsisId: `00-${index}`,
      team: index % 2 === 0 ? "KC" : "SF",
      avgSeparation: 3,
      avgYacAboveExpectation: 1,
      rushYardsOverExpectedPerAtt: 1.2,
      avgCushion: 2,
    });

    const exact = writerClient(Array.from({ length: 333 }, (_, index) => allFeatures(index)));
    const exactResult = await persistNgsSignals(2026, exact.client);
    expect(exactResult.signalsWritten).toBe(NGS_SIGNAL_CREATE_CHUNK);
    expect(exact.createMany).toHaveBeenCalledTimes(1);
    expect((exact.createMany.mock.calls[0]![0] as { data: NgsSignalWrite[] }).data).toHaveLength(NGS_SIGNAL_CREATE_CHUNK);

    const over = writerClient(Array.from({ length: 334 }, (_, index) => allFeatures(index)));
    const overResult = await persistNgsSignals(2026, over.client);
    expect(overResult.signalsWritten).toBe(NGS_SIGNAL_CREATE_CHUNK + 6);
    expect(over.createMany).toHaveBeenCalledTimes(2);
    expect(over.createMany.mock.calls.map((call) => (call[0] as { data: NgsSignalWrite[] }).data.length)).toEqual([
      NGS_SIGNAL_CREATE_CHUNK,
      6,
    ]);
  });

  it("reports zero writes when the replacement transaction rolls back", async () => {
    const mocks = writerClient([row()]);
    mocks.createMany.mockRejectedValue(new Error("db down"));

    const result = await persistNgsSignals(2026, mocks.client);

    expect(result).toMatchObject({
      status: "error",
      playersWithSignals: 0,
      signalsWritten: 0,
      teamsWritten: 0,
      errors: ["db down"],
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
