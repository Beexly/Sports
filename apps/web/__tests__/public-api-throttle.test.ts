import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * R-12 — route-level proof for the public-API throttle + validation.
 *
 * Runs the REAL route handlers in stub mode (DATABASE_URL=stub) with the
 * in-memory limiter backend:
 *   - normal requests are unaffected (board/passes answers 200 under limit)
 *   - past the per-IP threshold the route answers 429 + Retry-After
 *   - a different IP is NOT throttled by the first IP's burst
 *   - junk query params get a clean 400 invalid-query (performance,
 *     promotions) — never the degraded/mislabeled 503 path
 *   - argless invocation (legacy test convention) still works
 *
 * Scope note: only the six public GETs are wired; cron/auth/admin routes
 * are intentionally untouched by R-12.
 */

function publicReq(path: string, ip: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

async function importFresh<T>(path: string): Promise<T> {
  // Fresh module registry per test → fresh in-memory limiter store.
  return (await import(path)) as T;
}

type GetHandler = (req?: NextRequest) => Promise<Response>;

beforeEach(() => {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode =
    undefined;
  vi.stubEnv("DATABASE_URL", "stub");
  vi.stubEnv("DEMO_PICKS_ENABLED", "true");
  vi.stubEnv("PERFORMANCE_STATS_ENABLED", "false");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/board/passes — per-IP throttle (in-memory backend)", () => {
  it("serves normal traffic, then 429s the same IP past the threshold", async () => {
    vi.stubEnv("RATE_LIMIT_MAX_REQUESTS", "3");
    const mod = await importFresh<{ GET: GetHandler }>("@/app/api/board/passes/route");

    // Normal requests unaffected — three calls under the limit all succeed.
    for (let i = 0; i < 3; i++) {
      const res = await mod.GET(publicReq("/api/board/passes", "203.0.113.7"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body["success"]).toBe(true);
    }

    // Fourth call from the SAME IP breaches the window → 429 + Retry-After.
    const limited = await mod.GET(publicReq("/api/board/passes", "203.0.113.7"));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(limited.headers.get("x-ratelimit-limit")).toBe("3");
    const body = (await limited.json()) as Record<string, unknown>;
    expect(body["success"]).toBe(false);
    expect(body["error"]).toBe("rate-limited");

    // A DIFFERENT IP is isolated from the burst and still gets a 200.
    const other = await mod.GET(publicReq("/api/board/passes", "203.0.113.99"));
    expect(other.status).toBe(200);
  }, 15_000);

  it("still answers an argless invocation (legacy test convention)", async () => {
    const mod = await importFresh<{ GET: GetHandler }>("@/app/api/board/passes/route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
  }, 15_000);
});

describe("/api/performance — junk query params → clean 400", () => {
  it("400s on an unsafe period instead of a mislabeled 503", async () => {
    const mod = await importFresh<{ GET: GetHandler }>("@/app/api/performance/route");
    const res = await mod.GET(
      publicReq("/api/performance?period=%3Cscript%3Ex%3C/script%3E", "203.0.113.10")
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["success"]).toBe(false);
    expect(body["error"]).toBe("invalid-query");
  });

  it("leaves well-formed requests on the normal path (gate 503 while stats are off)", async () => {
    const mod = await importFresh<{ GET: GetHandler }>("@/app/api/performance/route");
    const res = await mod.GET(publicReq("/api/performance?period=all-time", "203.0.113.11"));
    // PERFORMANCE_STATS_ENABLED=false → the intentional readiness 503,
    // proving validation didn't hijack the normal control flow.
    expect(res.status).toBe(503);
  });
});

describe("/api/promotions — state param contract", () => {
  it("400s a malformed state instead of silently ignoring it", async () => {
    const mod = await importFresh<{ GET: GetHandler }>("@/app/api/promotions/route");
    const res = await mod.GET(publicReq("/api/promotions?state=12", "203.0.113.12"));
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["error"]).toBe("invalid-query");
  });

  it("serves a normal request (valid state, stub DB → safe 200 payload)", async () => {
    const mod = await importFresh<{ GET: GetHandler }>("@/app/api/promotions/route");
    const res = await mod.GET(publicReq("/api/promotions?state=nj", "203.0.113.13"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const meta = body["meta"] as Record<string, unknown>;
    expect(meta["state"]).toBe("NJ");
  }, 15_000);
});
