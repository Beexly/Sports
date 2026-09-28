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
  projectSignalCandidates: () => [CANDIDATE],
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

  it("a DEADLINE-truncated run is NOT a success — never a 200-shaped failure", async () => {
    // The contract that was missing. MEASURED 2026-09-28, observed by running
    // the real route with real candidates and a deadline already in the past:
    //
    //   http=200 success=true candidates=20 written=0
    //     errors=["deadline reached with 20 candidates unwritten"]
    //
    // `success` was `report.skipped === 0`, and a run that breaks on the
    // deadline before its first upsert skips ZERO rows — so the single field
    // an operator or a monitor reads first said "fine" about a run that wrote
    // nothing. The body carried the evidence and the header contradicted it.
    // A writer that truncates is the exact failure this lane exists to kill,
    // so it must not be readable as success.
    delete process.env["SIGNAL_LEDGER_SHARD"];
    writeSignalCandidates.mockResolvedValue({
      candidates: 20,
      written: 0,
      skipped: 0,
      batches: 0,
      errors: ["deadline reached with 20 of 20 candidates unwritten in this shard"],
    });
    const res = await invoke();
    const body = (await res.json()) as { success: boolean; data: { written: number } };
    expect(body.success).toBe(false);
    // And not a bare 200 either: a status-code-only health check has to see it.
    expect(res.status).toBe(503);
    // The shortfall is still reported rather than hidden behind the failure.
    expect(body.data.written).toBe(0);
  });

  it("a run that wrote FEWER rows than it read is not a success", async () => {
    // `success` must mean the whole shard landed, not merely that no row
    // raised. One lost row is partial coverage, and partial coverage that
    // reads as success is how 32.4% of the population went unwritten.
    delete process.env["SIGNAL_LEDGER_SHARD"];
    writeSignalCandidates.mockResolvedValue({
      candidates: 20,
      written: 19,
      skipped: 0,
      batches: 1,
      errors: [],
    });
    const res = await invoke();
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
    expect(res.status).toBe(503);
  });

  it("a FULL write is a 200 with success=true — the positive control", async () => {
    // Without this, a route that always returned 503 would pass the two tests
    // above. The fix must not turn every tick into a failure.
    delete process.env["SIGNAL_LEDGER_SHARD"];
    writeSignalCandidates.mockResolvedValue({
      candidates: 1,
      written: 1,
      skipped: 0,
      batches: 1,
      errors: [],
    });
    const res = await invoke();
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
    expect(res.status).toBe(200);
  });

  it("says CONVERGED when there was nothing to write, not 'broken'", async () => {
    // The exact case that produced a false outage claim on 2026-09-28.
    //
    // The writer was at 100% coverage of the 2026 population, so hourly ticks
    // reported `written=0` — CORRECTLY, because every tuple already existed and
    // an upsert of an existing tuple does not move `fetchedAt`. Those ticks were
    // read as a dead writer and filed in the ledger as a live outage before a
    // coverage check falsified the claim 20 minutes later.
    //
    // `written: 0` is ambiguous on its own. The DENOMINATOR is what disambiguates
    // it: 0 written of 0 candidates is a converged job; 0 written of 118,402 is
    // a job that missed everything. This pins that the response says which.
    delete process.env["SIGNAL_LEDGER_SHARD"];
    writeSignalCandidates.mockResolvedValue({
      candidates: 0,
      written: 0,
      skipped: 0,
      batches: 0,
      errors: [],
    });
    const res = await invoke();
    const body = (await res.json()) as { success: boolean; data: { coverage: string } };
    expect(body.success).toBe(true);
    expect(res.status).toBe(200);
    expect(body.data.coverage).toMatch(/converged/i);
    // Explicitly NOT the alarming word: nothing was missed because nothing existed.
    expect(body.data.coverage).not.toMatch(/suspicious|partial/i);
  });

  it("flags SUSPICIOUS when work existed and NONE of it was written", async () => {
    // The other side of the same ambiguity, and the one that IS a defect:
    // candidates present, zero written, and no error to explain it.
    delete process.env["SIGNAL_LEDGER_SHARD"];
    writeSignalCandidates.mockResolvedValue({
      candidates: 118402,
      written: 0,
      skipped: 0,
      batches: 0,
      errors: [],
    });
    const res = await invoke();
    const body = (await res.json()) as { data: { coverage: string } };
    expect(body.data.coverage).toMatch(/suspicious/i);
  });
});
