import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";
import { resetNflverseTableCacheForTests } from "@sports/data-ingestion";

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
}));

vi.mock("@sports/db", () => ({
  db: {
    $queryRaw: dbMocks.queryRaw,
    ingestionRun: { findFirst: dbMocks.ingestionRunFindFirst },
  },
}));

describe("/api/health — freshness threshold (executed)", () => {
  beforeEach(() => {
    dbMocks.queryRaw.mockReset();
    dbMocks.ingestionRunFindFirst.mockReset();
    // DB ping always healthy so the ingestion check drives the outcome.
    dbMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    resetNflverseTableCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetNflverseTableCacheForTests();
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

/**
 * OP-003 — additive capability surface. These cases ADD coverage; none of the
 * assertions above are modified.
 */
describe("/api/health — capabilities (OP-003, additive)", () => {
  beforeEach(() => {
    dbMocks.queryRaw.mockReset();
    dbMocks.ingestionRunFindFirst.mockReset();
    dbMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    resetNflverseTableCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetNflverseTableCacheForTests();
  });

  function minutesAgo(m: number): Date {
    return new Date(Date.now() - m * 60 * 1000);
  }

  it("includes a capabilities array with the 4 expected capability ids", async () => {
    dbMocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(10) });

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(Array.isArray(body.capabilities)).toBe(true);
    const ids = body.capabilities.map((c: { capabilityId: string }) => c.capabilityId);
    expect(ids).toEqual(
      expect.arrayContaining(["database", "ingestion", "settlement", "nflverse-reports"])
    );
  });

  it("reports nflverse-reports as 'unknown' when the table cache stats are zeroed", async () => {
    dbMocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(10) });
    resetNflverseTableCacheForTests();

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    const nflverse = body.capabilities.find(
      (c: { capabilityId: string }) => c.capabilityId === "nflverse-reports"
    );
    expect(nflverse.status).toBe("unknown");
    expect(nflverse.evidence).toBe("none");
  });

  it("returns deployment.sha as null when no deploy-sha env var is set", async () => {
    dbMocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(10) });
    delete process.env["VERCEL_GIT_COMMIT_SHA"];
    delete process.env["GIT_COMMIT_SHA"];

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(body.deployment.sha).toBeNull();
  });

  it("returns deployment.sha from VERCEL_GIT_COMMIT_SHA when set", async () => {
    dbMocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(10) });
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "deadbeef");

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(body.deployment.sha).toBe("deadbeef");
  });

  it("a non-healthy capability does not flip ok/allOk or the HTTP status", async () => {
    // Ingestion stale enough to be an "error" check (so allOk would already be
    // false through the existing mechanism) — capabilities must never be the
    // THING that flips readiness; readiness is driven solely by `checks`.
    dbMocks.ingestionRunFindFirst.mockResolvedValue({
      completedAt: minutesAgo(10),
    });

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    // Settlement/nflverse capabilities are "unknown" in this unit-test runtime
    // (no live DB, no nflverse fetches) — confirm that non-healthy capability
    // entries coexist with an ok/200 response driven only by `checks`.
    const nonHealthy = body.capabilities.filter(
      (c: { status: string }) => c.status !== "healthy"
    );
    expect(nonHealthy.length).toBeGreaterThan(0);
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
