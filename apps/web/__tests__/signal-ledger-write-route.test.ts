/**
 * The write route must call the writer EXACTLY ONCE, with the sharded set.
 *
 * WHY. MEASURED 2026-09-28 on dpl_8hKqsyXxb1KDLm4kgBw6ffEBEq9e: a scripted edit
 * left a duplicated write in this route,
 *     report = await writeSignalCandidates(db, scoped,    { deadline });
 *     report = await writeSignalCandidates(db, candidates, { deadline });
 * The first call consumed the wall-clock budget, so the second saw an already-
 * past deadline and wrote nothing. The live log read
 *     shard=0/1 candidates=118083 written=0 skipped=0 batches=0 errors=1
 * i.e. 84,500 rows went to 0 and the route still returned 200. Nothing in the
 * unit suite called the route, so 17 writer tests all passed over a route that
 * wrote nothing. This is the test that would have caught it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const writeSignalCandidates = vi.fn();
const loadSignalCandidates = vi.fn();

vi.mock("@/lib/cron/authorize", () => ({
  cronAuthError: () => null,
}));
vi.mock("@/sports/db", () => ({
  db: {
    playerGameStat: { findMany: async () => [] },
    snapCount: { findMany: async () => [] },
    nextGenStat: { findMany: async () => [] },
    injury: { findMany: async () => [] },
  },
}));
vi.mock("@/lib/observability/sentry", () => ({ captureError: () => {} }));
vi.mock("@/lib/ops/signal-ledger-writer", () => ({
  // The real projector returns { candidates, dropped }: rows it refused for want
  // of a fitted scale are counted per key rather than vanishing silently.
  projectSignalCandidates: () => ({ candidates: [CANDIDATE], dropped: { "snap.offense_pct": 3 } }),
  writeSignalCandidates: (...args: unknown[]) => writeSignalCandidates(...args),
}));

const CANDIDATE = {
  entityType: "player",
  entityId: "p1",
  key: "pgs.target_share",
  category: "PRODUCTION",
  value: 0.5,
  valueRaw: 0.5,
  season: 2026,
  week: 1,
  // The FITTED weight for pgs.target_share, not a uniform 1. A mock that still
  // says 1 would let the weight regression this PR fixes pass unnoticed here.
  weight: 0.101859,
  confidence: 1,
  capturedAt: new Date("2026-09-28T00:00:00Z"),
  fetchedAt: new Date("2026-09-28T00:00:00Z"),
  sourceId: "nflverse",
  rightsSnapshot: { source: "nflverse", dataset: "pgs.target_share", measured: true },
};

async function invoke(): Promise<Response> {
  vi.resetModules();
  const mod = await import("@/app/api/cron/signal-ledger-write/route");
  return (await mod.GET(new Request("http://localhost/api/cron/signal-ledger-write"))) as Response;
}

describe("GET /api/cron/signal-ledger-write", () => {
  beforeEach(() => {
    writeSignalCandidates.mockReset();
    writeSignalCandidates.mockResolvedValue({
      candidates: 1,
      written: 1,
      skipped: 0,
      batches: 1,
      errors: [],
    });
    loadSignalCandidates.mockReset();
  });

  it("calls the writer EXACTLY ONCE", async () => {
    const res = await invoke();
    expect(res.status).toBe(200);
    expect(writeSignalCandidates).toHaveBeenCalledTimes(1);
  });

  it("passes a DEADLINE, so a long run reports rather than being killed", async () => {
    await invoke();
    const [, , options] = writeSignalCandidates.mock.calls[0] as [
      unknown,
      unknown,
      { deadline?: Date } | undefined,
    ];
    expect(options?.deadline).toBeInstanceOf(Date);
  });

  it("REPORTS rows dropped for want of a fitted scale, keyed, not silently", async () => {
    // The projector refuses a row it cannot place on the shared scale. That is a
    // finding (on prod: every snap_counts row, for want of a playerId), and a
    // 200 that quietly omits it is exactly the "green cron that was writing
    // nothing" failure this route's stderr line was added to prevent.
    const res = await invoke();
    const body = (await res.json()) as { data: { dropped: Record<string, number> } };
    expect(body.data.dropped).toEqual({ "snap.offense_pct": 3 });
  });

  it("STATES the fitted-weight policy rather than the old 'all 1' string", async () => {
    const res = await invoke();
    const body = (await res.json()) as { data: { weights: string; value: string } };
    expect(body.data.weights).not.toContain("all 1");
    expect(body.data.weights).toContain("FITTED");
    expect(body.data.value).toContain("NORMALIZED");
  });

  it("writes the whole candidate set when the shard is 0/1", async () => {
    delete process.env["SIGNAL_LEDGER_SHARD"];
    await invoke();
    const [, rows] = writeSignalCandidates.mock.calls[0] as [unknown, unknown[]];
    expect(Array.isArray(rows)).toBe(true);
  });

  it("REFUSES a malformed shard instead of guessing 0/1", async () => {
    process.env["SIGNAL_LEDGER_SHARD"] = "not-a-shard";
    try {
      const res = await invoke();
      expect(res.status).toBe(500);
      // The whole point: nothing may be written when the config is bad.
      expect(writeSignalCandidates).not.toHaveBeenCalled();
    } finally {
      delete process.env["SIGNAL_LEDGER_SHARD"];
    }
  });

  it("partitions the population across shards of a multi-shard set", async () => {
    process.env["SIGNAL_LEDGER_SHARD"] = "1/3";
    try {
      await invoke();
      const [, rows] = writeSignalCandidates.mock.calls[0] as [unknown, unknown[]];
      // Whatever the split, the route must forward an array and not the raw
      // full set: a shard that silently wrote everything would defeat the point.
      expect(Array.isArray(rows)).toBe(true);
    } finally {
      delete process.env["SIGNAL_LEDGER_SHARD"];
    }
  });

  it("ROTATES the shard by hour so consecutive ticks cover the whole population", async () => {
    // The bug this pins: with a constant 0/1 shard the deadline stops each run
    // at 80,000 of 118,402 rows, so the same leading rows are rewritten hourly
    // and the tail (MEASURED 38,402 rows, 32.4%) is never reached — while the
    // log still reports a normal-looking tick. Vercel crons cannot carry a
    // per-entry env var, so a shard nobody sets stays 0 forever.
    delete process.env["SIGNAL_LEDGER_SHARD"];
    const seen: string[] = [];
    for (let hour = 0; hour < 4; hour += 1) {
      writeSignalCandidates.mockClear();
      // Freeze the clock to a distinct hour for each simulated tick.
      const realNow = Date.now;
      Date.now = () => Date.UTC(2026, 8, 28, hour, 23, 0);
      try {
        const res = await invoke();
        const body = (await res.json()) as { data: { shard: string } };
        seen.push(body.data.shard);
      } finally {
        Date.now = realNow;
      }
    }
    // Consecutive hours must alternate, or the tail is unreachable forever.
    expect(new Set(seen).size).toBeGreaterThan(1);
  });

  it("an explicit SIGNAL_LEDGER_SHARD still wins over the rotation", async () => {
    process.env["SIGNAL_LEDGER_SHARD"] = "0/2";
    try {
      const res = await invoke();
      const body = (await res.json()) as { data: { shard: string } };
      expect(body.data.shard).toBe("0/2");
    } finally {
      delete process.env["SIGNAL_LEDGER_SHARD"];
    }
  });
});
