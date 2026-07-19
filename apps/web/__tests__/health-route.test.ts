import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";

/**
 * /api/health source-level contract.
 *
 * prod-probe.mjs and any external uptime monitor hit this route. The
 * shape is part of the deploy verification surface; pin it.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/api/health/route.ts"), "utf8");

describe("/api/health", () => {
  it("exports a GET handler", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("opts out of static caching (force-dynamic) so probes see live state", () => {
    // Without this, Next 14 statically caches the no-arg GET handler and the
    // Vercel edge serves hours-old "healthy" snapshots (observed in prod:
    // x-vercel-cache HIT with age ~3h). A cached health check is worse than
    // none — it can report a dead pipeline as fresh.
    expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("returns a Response.json envelope (NextResponse.json)", () => {
    expect(src).toMatch(/NextResponse\.json/);
  });

  it("wraps the DB ping in try/catch (so a DB outage doesn't 500 the health probe)", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*\$queryRaw[\s\S]*\}\s*catch/);
  });

  it("checks ingestion last-success freshness so a stuck pipeline reports unhealthy", () => {
    expect(src).toMatch(/ingestionRun/);
    expect(src).toMatch(/status:\s*["']SUCCESS["']/);
    expect(src).toMatch(/ageMinutes/);
    expect(src).toMatch(/lastSuccessAt/);
  });

  it("does not write to the DB (read-only probe)", () => {
    expect(src).not.toMatch(/\.create\(|\.update\(|\.delete\(|\.upsert\(/);
  });

  it("uses the shared stale threshold, not a hard-coded 2h", () => {
    // Guards against re-introducing the old magic number that caused false 503s.
    expect(src).toMatch(/REFRESH_STALE_AFTER_MINUTES/);
    expect(src).not.toMatch(/ageHours\s*>\s*2/);
  });

  it("reuses the canonical settlement-health evaluator instead of a second hand-rolled query", () => {
    // Must not duplicate apps/web/lib/performance/settlement-health.ts's
    // isPublished/seed-exclusion filtering with a second, differently-scoped
    // implementation (an earlier version of this route did exactly that).
    expect(src).toMatch(/loadSettlementHealth/);
    expect(src).toMatch(/from ["']@\/lib\/performance\/settlement-health["']/);
  });

  it("keeps the settlement-health signal out of `checks`/`allOk` (informational, not a readiness gate)", () => {
    // A single postponed game must not 503 the whole health endpoint for
    // anything that treats it as a traffic/readiness gate.
    expect(src).toMatch(/dataIntegrity/);
    expect(src).not.toMatch(/checks\["settlementHealth"\]/);
  });
});

/**
 * Behavioral test — actually EXERCISE the freshness threshold by executing the
 * GET handler against a mocked @sports/db (following the db-mock pattern used
 * in stripe-webhook-route.test.ts / process-sport.test.ts). The source-level
 * block above only string-matches; this proves the 503 trigger really fires.
 */

const dbMocks = vi.hoisted(() => ({
  queryRaw: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  ingestionRunFindFirst:
    vi.fn<(args: unknown) => Promise<{ completedAt: Date | null } | null>>(),
  pickCount: vi.fn<(args: unknown) => Promise<number>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    $queryRaw: dbMocks.queryRaw,
    ingestionRun: { findFirst: dbMocks.ingestionRunFindFirst },
    pick: { count: dbMocks.pickCount },
  },
}));

describe("/api/health — freshness threshold (executed)", () => {
  beforeEach(() => {
    dbMocks.queryRaw.mockReset();
    dbMocks.ingestionRunFindFirst.mockReset();
    dbMocks.pickCount.mockReset();
    // DB ping always healthy so the ingestion check drives the outcome.
    dbMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    // No stale-PENDING picks by default so the ingestion tests below aren't
    // affected by this unrelated signal.
    dbMocks.pickCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function minutesAgo(m: number): Date {
    return new Date(Date.now() - m * 60 * 1000);
  }

  it("reports error/503 when the last SUCCESS run is older than the stale threshold", async () => {
    dbMocks.ingestionRunFindFirst.mockResolvedValue({
      completedAt: minutesAgo(REFRESH_STALE_AFTER_MINUTES + 5),
    });

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.status).toBe("degraded");
    expect(body.checks.ingestion.status).toBe("error");
  });

  it("reports ok/200 when the last SUCCESS run is fresh", async () => {
    dbMocks.ingestionRunFindFirst.mockResolvedValue({
      completedAt: minutesAgo(10),
    });

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
    expect(body.checks.ingestion.status).toBe("ok");
  });
});

describe("/api/health — settlement health (executed)", () => {
  beforeEach(() => {
    dbMocks.queryRaw.mockReset();
    dbMocks.ingestionRunFindFirst.mockReset();
    dbMocks.pickCount.mockReset();
    dbMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    dbMocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: new Date() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * loadSettlementHealth issues two db.pick.count calls in parallel: one
   * counting ALL commenced (published, non-seed) picks, one counting the
   * PENDING subset of those past the grace window. Distinguish them by
   * inspecting the where clause (a `result: "PENDING"` filter marks the
   * overdue-pending call) rather than relying on call order, so this
   * doesn't silently pass if the two calls were ever reordered or merged.
   */
  function armCounts({ commencedTotal, overduePending }: { commencedTotal: number; overduePending: number }) {
    dbMocks.pickCount.mockImplementation(async (args: unknown) => {
      const where = (args as { where?: { result?: string } } | undefined)?.where ?? {};
      return where.result === "PENDING" ? overduePending : commencedTotal;
    });
  }

  it("surfaces a non-zero overdue-pending count without affecting overall health (still 200/ok/healthy)", async () => {
    armCounts({ commencedTotal: 10, overduePending: 3 });

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    // The signal itself is real...
    expect(body.dataIntegrity.settlementHealth.overduePending).toBe(3);
    expect(body.dataIntegrity.settlementHealth.commencedTotal).toBe(10);
    expect(body.dataIntegrity.settlementHealth.health).not.toBe("HEALTHY");
    // ...but deliberately does not flip overall health, since a settlement
    // lag must not read as "the service is down."
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
  });

  it("reports HEALTHY when nothing is overdue", async () => {
    armCounts({ commencedTotal: 10, overduePending: 0 });

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(body.dataIntegrity.settlementHealth.health).toBe("HEALTHY");
    expect(body.dataIntegrity.settlementHealth.clean).toBe(true);
  });

  it("reports NO_DATA (not a false HEALTHY) when nothing has commenced yet", async () => {
    armCounts({ commencedTotal: 0, overduePending: 0 });

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(body.dataIntegrity.settlementHealth.health).toBe("NO_DATA");
  });

  it("degrades gracefully (error field, not a thrown exception) when the query itself fails", async () => {
    dbMocks.pickCount.mockRejectedValue(new Error("db timeout"));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200); // does not affect overall health
    expect(body.dataIntegrity.settlementHealth.error).toBeTruthy();
  });
});
