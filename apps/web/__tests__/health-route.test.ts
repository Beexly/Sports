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
