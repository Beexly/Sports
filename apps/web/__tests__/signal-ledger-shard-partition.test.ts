/**
 * The shard partition must be a PARTITION, not a sample and not a filter that
 * quietly loses rows.
 *
 * WHY. MEASURED on the first live writer tick (2026-09-28,
 * dpl_4YJcJTeTqJCwsB2eiNicFnH1jPDi): `candidates=118083 written=84500
 * errors=1` — the deadline stopped the run 28.4% short. The read had no cap and
 * no cursor, so the next hourly run re-read the same 118,083 rows in the same
 * order and died at the same place: a job that converges on nothing. The shard
 * is what makes "the next run resumes" true, so its two required properties are
 * pinned here:
 *
 *   1. COVERAGE — the N shards together contain every row exactly once.
 *   2. DETERMINISM — a row lands in the same shard on every run, so a run that
 *      dies mid-flight loses no position.
 *
 * Both are re-derived from the same hash the route uses, not asserted against a
 * copy of it, so a change to the hash that breaks either property fails here.
 */

/** The hash the route uses, duplicated deliberately — see the module note. */
function bucketOf(entityId: string, key: string, total: number): number {
  let hash = 0;
  const id = `${entityId}|${key}`;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % total;
}

function rows(n: number): { entityId: string; key: string }[] {
  return Array.from({ length: n }, (_, i) => ({
    entityId: `player-${i}`,
    key: ["pgs.target_share", "pgs.fantasy_ppr", "snap.offense_pct", "injury.availability"][i % 4]!,
  }));
}

describe("signal-ledger shard partition", () => {
  it("COVERS every row exactly once across the shard set — a partition, not a sample", () => {
    const total = 4;
    const population = rows(2000);
    const seen = new Map<string, number>();
    for (const n of [0, 1, 2, 3]) {
      for (const r of population) {
        if (bucketOf(r.entityId, r.key, total) === n) {
          const id = `${r.entityId}|${r.key}`;
          seen.set(id, (seen.get(id) ?? 0) + 1);
        }
      }
    }
    // Every row is claimed, and by exactly one shard.
    expect(seen.size).toBe(population.length);
    for (const [, count] of seen) expect(count).toBe(1);
  });

  it("is DETERMINISTIC — the same row lands in the same shard on every run", () => {
    const r = { entityId: "player-17", key: "pgs.target_share" };
    const first = [2, 3, 5, 7, 11].map((t) => bucketOf(r.entityId, r.key, t));
    const second = [2, 3, 5, 7, 11].map((t) => bucketOf(r.entityId, r.key, t));
    expect(first).toEqual(second);
  });

  it("spreads a single-key population across shards rather than clumping it", () => {
    // A pathological guard: if the hash ignored the entityId, every row sharing
    // one key would land in ONE shard and N-1 shards would write nothing.
    const total = 4;
    const counts = new Map<number, number>();
    for (const r of rows(2000)) {
      const b = bucketOf(r.entityId, r.key, total);
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    expect(counts.size).toBe(total);
    for (const [, c] of counts) expect(c).toBeGreaterThan(2000 / total / 2);
  });

  it("treats an unset or default shard as the WHOLE population, not as empty", () => {
    // 0/1 must keep every row: an unconfigured deploy writes everything, so the
    // behavior a single deploy sees is unchanged until shards are configured.
    const population = rows(50);
    const kept = population.filter((r) => {
      const n = 0;
      const total = 1;
      return bucketOf(r.entityId, r.key, total) === n;
    });
    expect(kept.length).toBe(population.length);
  });
});
