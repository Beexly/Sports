/**
 * LIVE integration check for the T-02 seeded HNSW fix (READ-ONLY).
 *
 * Runs only when DATABASE_URL is set (a read-only Neon role is enough):
 *   DATABASE_URL=postgres://... vitest run src/literature/__tests__/corpus-grounding-live.test.ts
 *
 * Gates:
 *   - EXPLAIN (FORMAT JSON) total cost < 12000 and the plan uses the HNSW index.
 *   - Timed live seeded query < 5s, returns rows, excludes the seed itself.
 *   - hnsw.ef_search=128 is in force inside the batch and does NOT leak after.
 *   - A missing (md5-shaped) seed short-circuits to zero rows fast.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { CHUNK_SEEDED_SQL, seedKeyExists } from "../corpus-grounding.js";
import { pgBatchSqlClient, runSeededInTransaction, SET_HNSW_EF_SQL, type BatchSqlClient } from "../sql-batch.js";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("live Neon: T-02 seeded HNSW grounding (read-only)", () => {
  let client: InstanceType<typeof pg.Client>;
  let db: BatchSqlClient;
  let seed: { corpus_key: string; chunk_index: number };

  beforeAll(async () => {
    client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000 });
    await client.connect();
    db = pgBatchSqlClient(client);
    const res = await db.query(
      `SELECT s.corpus_key, s.chunk_index
         FROM lit.situation s
         JOIN lit.corpus_chunk c ON c.corpus_key = s.corpus_key AND c.chunk_index = s.chunk_index
        WHERE c.embedding IS NOT NULL AND length(s.corpus_key) = 64
        LIMIT 1`,
    );
    const row = res.rows[0] as { corpus_key: string; chunk_index: number } | undefined;
    if (!row) throw new Error("no live seed found (situation key present in corpus_chunk with embedding)");
    seed = row;
  }, 40000);

  afterAll(async () => {
    await client?.end().catch(() => undefined);
  });

  it("EXPLAIN cost < 12000 and the HNSW index supplies the ordering", async () => {
    const res = await db.query(`EXPLAIN (FORMAT JSON) ${CHUNK_SEEDED_SQL}`, [seed.corpus_key, seed.chunk_index, 40]);
    const plan = (res.rows[0] as { "QUERY PLAN": [{ Plan: { "Total Cost": number } }] })["QUERY PLAN"][0].Plan;
    const cost = plan["Total Cost"];
    const json = JSON.stringify(res.rows[0]);
    console.log(`[T-02 live] EXPLAIN total cost = ${cost}`);
    expect(cost).toBeLessThan(12000);
    expect(json).toContain("corpus_chunk_hnsw_idx");
  }, 30000);

  it("timed live seeded query < 5s, returns neighbours, excludes the seed", async () => {
    const t0 = Date.now();
    const res = await runSeededInTransaction(db, CHUNK_SEEDED_SQL, [seed.corpus_key, seed.chunk_index, 40]);
    const ms = Date.now() - t0;
    console.log(`[T-02 live] seeded batch latency = ${ms}ms, rows = ${res.rows.length}`);
    expect(ms).toBeLessThan(5000);
    expect(res.rows.length).toBeGreaterThan(0);
    const rows = res.rows as { corpus_key: string; chunk_index: number; similarity: number }[];
    for (const r of rows) {
      expect(r.corpus_key === seed.corpus_key && r.chunk_index === seed.chunk_index).toBe(false);
      expect(Number.isFinite(r.similarity)).toBe(true);
    }
    const sims = rows.map((r) => r.similarity);
    const sorted = [...sims].sort((a, b) => b - a);
    expect(sims).toEqual(sorted);
  }, 30000);

  it("hnsw.ef_search=128 inside the batch, default restored after commit", async () => {
    const inside = await db.batch([
      { text: SET_HNSW_EF_SQL },
      { text: "SELECT current_setting('hnsw.ef_search') AS ef" },
    ]);
    expect((inside[1]!.rows[0] as { ef: string }).ef).toBe("128");
    const after = await db.query("SHOW hnsw.ef_search");
    expect((after.rows[0] as Record<string, string>)["hnsw.ef_search"]).toBe("40");
  }, 30000);

  it("missing md5-shaped seed returns zero rows fast (short-circuit)", async () => {
    const t0 = Date.now();
    const res = await db.query(CHUNK_SEEDED_SQL, ["f".repeat(32), 0, 40]);
    const ms = Date.now() - t0;
    console.log(`[T-02 live] missing-seed latency = ${ms}ms, rows = ${res.rows.length}`);
    expect(res.rows.length).toBe(0);
    expect(ms).toBeLessThan(2000);
  }, 30000);

  it("seed existence guard: real key passes, md5 key fails", async () => {
    const t0 = Date.now();
    expect(await seedKeyExists(db, seed)).toBe(true);
    const probeMs = Date.now() - t0;
    console.log(`[T-02 live] seed existence probe = ${probeMs}ms`);
    expect(probeMs).toBeLessThan(1000);
    expect(await seedKeyExists(db, { corpus_key: "f".repeat(32), chunk_index: 0 })).toBe(false);
  }, 30000);
});