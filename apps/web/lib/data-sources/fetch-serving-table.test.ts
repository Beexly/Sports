import { describe, expect, it } from "vitest";
import {
  FETCH_SERVING_TABLE_TARGET,
  buildFetchServingPlan,
  buildFetchServingRow,
  buildFetchServingSnapshot,
  type FetchSnapshotPersistence,
} from "@/lib/data-sources/fetch-serving-table";

describe("fetch serving table seam", () => {
  it("builds deterministic hashes and object keys from stable payload content", () => {
    const first = buildFetchServingSnapshot({
      fetchedAt: "2026-06-24T16:30:00.000Z",
      payload: { b: 2, a: 1 },
      rowCount: 2,
      sourceId: "ESPN Public API",
      sourceKind: "Scoreboard",
    });
    const second = buildFetchServingSnapshot({
      fetchedAt: "2026-06-24T16:30:00.000Z",
      payload: { a: 1, b: 2 },
      rowCount: 2,
      sourceId: "espn-public-api",
      sourceKind: "scoreboard",
    });

    expect(first.payloadHash).toBe(second.payloadHash);
    expect(first.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.objectKey).toBe(second.objectKey);
    expect(first.objectKey).toContain("source_id=espn-public-api/fetched_date=2026-06-24");
  });

  it("derives latest-serving rows without creating a write path", () => {
    const plan = buildFetchServingPlan(
      {
        entityKey: "NFL Week 01",
        fetchedAt: "2026-06-24T16:00:00.000Z",
        payload: [{ id: "game-1" }],
        rowCount: 1,
        sourceId: "nflverse",
        sourceKind: "schedule",
        ttlMs: 60_000,
      },
      { now: "2026-06-24T16:00:30.000Z" },
    );

    expect(plan.snapshot.target).toEqual(FETCH_SERVING_TABLE_TARGET);
    expect(plan.snapshot.storageMode).toBe("hash-only");
    expect(plan.servingRow).toMatchObject({
      entityKey: "nfl-week-01",
      priced: false,
      rowCount: 1,
      sourceId: "nflverse",
      sourceKind: "schedule",
      status: "FRESH",
    });
  });

  it("marks rows stale after their TTL", () => {
    const snapshot = buildFetchServingSnapshot({
      fetchedAt: "2026-06-24T16:00:00.000Z",
      payload: [],
      rowCount: -1,
      sourceId: "open-meteo",
      sourceKind: "weather",
    });

    const row = buildFetchServingRow(snapshot, {
      now: "2026-06-24T16:02:01.000Z",
      ttlMs: 120_000,
    });

    expect(row.status).toBe("STALE");
    expect(row.rowCount).toBe(0);
    expect(row.staleAfter).toBe("2026-06-24T16:02:00.000Z");
  });

  it("declares the future R2 and DuckDB persistence contract as injectable infra", async () => {
    const writes: string[] = [];
    const store: FetchSnapshotPersistence = {
      target: FETCH_SERVING_TABLE_TARGET,
      async readLatest() {
        return null;
      },
      async writeSnapshot(snapshot) {
        writes.push(snapshot.objectKey);
      },
    };
    const snapshot = buildFetchServingSnapshot({
      fetchedAt: "2026-06-24T16:00:00.000Z",
      payload: { ok: true },
      rowCount: 1,
      sourceId: "source",
      sourceKind: "kind",
    });

    await store.writeSnapshot(snapshot);

    expect(store.target).toEqual({
      bucketBinding: "R2_FETCH_ARCHIVE",
      kind: "r2-duckdb",
      partitionKeys: ["source_id", "fetched_date"],
      servingRelation: "fetch_store.latest_by_source",
      snapshotRelation: "fetch_store.source_snapshots",
      status: "INFRA",
    });
    expect(writes).toEqual([snapshot.objectKey]);
  });
});
