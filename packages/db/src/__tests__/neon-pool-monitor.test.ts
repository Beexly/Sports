import { describe, it, expect, beforeEach } from "vitest";
import {
  probeNeonPool,
  classifyLatency,
  getNeonPoolCounters,
  resetNeonPoolCountersForTests,
} from "../neon-pool-monitor.js";
import type { PrismaClient } from "@prisma/client";

/** Minimal $queryRaw stub — the probe only ever uses that one method. */
function fakeDb(handlers: {
  clock?: () => Promise<unknown>;
  activity?: () => Promise<unknown>;
}): PrismaClient {
  let call = 0;
  return {
    $queryRaw: async () => {
      call += 1;
      if (call === 1) {
        return handlers.clock
          ? await handlers.clock()
          : [{ t: new Date("2026-07-28T12:00:00.000Z") }];
      }
      if (handlers.activity) return await handlers.activity();
      throw new Error("no activity handler");
    },
  } as unknown as PrismaClient;
}

beforeEach(() => {
  resetNeonPoolCountersForTests();
});

describe("classifyLatency", () => {
  it("an error is always 'down', whatever the latency", () => {
    expect(classifyLatency(1, "boom")).toBe("down");
    expect(classifyLatency(null, "boom")).toBe("down");
  });

  it("a null latency with no error is still 'down' — unmeasured is not healthy", () => {
    expect(classifyLatency(null, null)).toBe("down");
  });

  it("fast is ok", () => {
    expect(classifyLatency(10, null)).toBe("ok");
  });

  it("past the degraded threshold is degraded", () => {
    expect(classifyLatency(501, null)).toBe("degraded");
  });

  it("past the critical threshold is degraded", () => {
    expect(classifyLatency(5000, null)).toBe("degraded");
  });

  it("thresholds are configurable and exclusive at the boundary", () => {
    expect(classifyLatency(100, null, { degradedMs: 100 })).toBe("ok");
    expect(classifyLatency(101, null, { degradedMs: 100 })).toBe("degraded");
  });
});

describe("probeNeonPool", () => {
  it("reports ok and records a success on a healthy probe", async () => {
    const r = await probeNeonPool(
      fakeDb({ activity: async () => [{ total: 3, active: 1, idle: 2, waiting: 0 }] }),
    );
    expect(r.status).toBe("ok");
    expect(r.error).toBeNull();
    expect(r.serverTime).toBe("2026-07-28T12:00:00.000Z");
    expect(r.activity.totalBackends).toBe(3);
    expect(getNeonPoolCounters().successes).toBe(1);
    expect(getNeonPoolCounters().failures).toBe(0);
  });

  it("a failing probe is 'down', records a failure, and never fabricates activity numbers", async () => {
    const r = await probeNeonPool(
      fakeDb({
        clock: async () => {
          throw new Error("connection refused");
        },
      }),
    );
    expect(r.status).toBe("down");
    expect(r.error).toMatch(/connection refused/);
    expect(r.serverTime).toBeNull();
    expect(r.activity).toEqual({
      totalBackends: null,
      active: null,
      idle: null,
      waiting: null,
    });
    expect(getNeonPoolCounters().failures).toBe(1);
  });

  it("flags a suspected stub client rather than reporting a real outage", async () => {
    const r = await probeNeonPool(
      fakeDb({
        clock: async () => {
          throw new Error("stub Prisma client active");
        },
      }),
    );
    expect(r.status).toBe("down");
    expect(r.stubSuspected).toBe(true);
  });

  it("a real connection failure is NOT mislabelled as a stub", async () => {
    const r = await probeNeonPool(
      fakeDb({
        clock: async () => {
          throw new Error("ECONNRESET");
        },
      }),
    );
    expect(r.stubSuspected).toBe(false);
  });

  // ── F2: an outage that RESOLVES is still an outage ────────────────────────
  // The stub Prisma client ($queryRaw → []) is the real shape of this failure:
  // the query succeeds, there is no database, and the old code counted it as a
  // success with status "ok". A probe that measured nothing has not passed.
  it("a clock probe that returns zero rows is 'down', not 'ok'", async () => {
    const r = await probeNeonPool(fakeDb({ clock: async () => [] }));
    expect(r.status).toBe("down");
    expect(r.error).toMatch(/no rows/i);
    expect(r.serverTime).toBeNull();
    expect(r.stubSuspected).toBe(true);
  });

  it("an empty clock result is counted as a FAILURE and never as a success", async () => {
    await probeNeonPool(fakeDb({ clock: async () => [] }));
    const c = getNeonPoolCounters();
    expect(c.successes).toBe(0);
    expect(c.failures).toBe(1);
    // The dangerous field: the old code refreshed lastOkAt on an empty result,
    // so the incident timestamp advanced while the database was gone.
    expect(c.lastOkAt).toBeNull();
    expect(c.lastError).toMatch(/no rows/i);
  });

  it("an empty clock result does not poison a previously healthy lastOkAt", async () => {
    await probeNeonPool(fakeDb({}), { sampleActivity: false });
    const healthy = getNeonPoolCounters().lastOkAt;
    expect(healthy).not.toBeNull();
    await probeNeonPool(fakeDb({ clock: async () => [] }));
    expect(getNeonPoolCounters().lastOkAt).toBe(healthy);
  });

  it("a row whose timestamp is unusable is 'down' — no evidence is not a pass", async () => {
    const r = await probeNeonPool(fakeDb({ clock: async () => [{ t: null }] }));
    expect(r.status).toBe("down");
    expect(getNeonPoolCounters().successes).toBe(0);
  });

  it("a healthy database that answers is still 'ok' (the fix is not red-by-default)", async () => {
    const r = await probeNeonPool(
      fakeDb({ activity: async () => [{ total: 2, active: 1, idle: 1, waiting: 0 }] }),
    );
    expect(r.status).toBe("ok");
    expect(r.serverTime).toBe("2026-07-28T12:00:00.000Z");
    expect(getNeonPoolCounters().successes).toBe(1);
  });

  it("classifyLatency agrees: no evidence is never 'ok'", () => {
    // The classifier already refused a null latency; the probe now refuses the
    // same thing one layer earlier, so both agree that unmeasured ≠ healthy.
    expect(classifyLatency(null, null)).toBe("down");
    expect(classifyLatency(0, "clock probe returned no rows")).toBe("down");
  });

  it("an activity-sample failure degrades to nulls without failing the whole probe", async () => {
    const r = await probeNeonPool(
      fakeDb({
        activity: async () => {
          throw new Error("pg_stat_activity not permitted");
        },
      }),
    );
    expect(r.status).toBe("ok"); // the connection itself is healthy
    expect(r.activity.totalBackends).toBeNull();
    expect(r.error).toBeNull();
  });

  it("sampleActivity:false skips the activity query entirely", async () => {
    const r = await probeNeonPool(fakeDb({}), { sampleActivity: false });
    expect(r.status).toBe("ok");
    expect(r.activity.totalBackends).toBeNull();
  });

  it("heavy waiting backends degrade an otherwise-fast probe", async () => {
    const r = await probeNeonPool(
      fakeDb({ activity: async () => [{ total: 20, active: 10, idle: 4, waiting: 9 }] }),
    );
    expect(r.activity.waiting).toBe(9);
    expect(r.status).toBe("degraded");
  });

  it("counts every probe attempt, successful or not", async () => {
    await probeNeonPool(fakeDb({}), { sampleActivity: false });
    await probeNeonPool(
      fakeDb({
        clock: async () => {
          throw new Error("down");
        },
      }),
    );
    const c = getNeonPoolCounters();
    expect(c.probes).toBe(2);
    expect(c.successes).toBe(1);
    expect(c.failures).toBe(1);
  });

  it("resetNeonPoolCountersForTests clears accumulated state", async () => {
    await probeNeonPool(fakeDb({}), { sampleActivity: false });
    expect(getNeonPoolCounters().probes).toBe(1);
    resetNeonPoolCountersForTests();
    expect(getNeonPoolCounters().probes).toBe(0);
  });
});
