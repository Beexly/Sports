/**
 * /api/sleeper/leagues — rate limiting + result caching.
 *
 * This route is an anonymous, unauthenticated proxy to Sleeper's public API
 * (two sequential upstream fetches per request at a 15s timeout). These tests
 * assert:
 *  - the 21st request from one IP within the window gets 429 (rate limit at 20/min)
 *  - two identical (username, season) requests within the cache TTL trigger only
 *    one upstream `loadSleeperLeagues` call (short result cache)
 *
 * Follows the executed-handler + vi.mock pattern used by ops-public-surface-truth-rate-limit.test.ts
 * and api-p9-04-rate-limit.test.ts: the REAL consumeRateLimit + resetRateLimits are used
 * (not mocked), only the Sleeper data dependency is mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

const sleeperMock = vi.hoisted(() => ({
  loadSleeperLeagues: vi.fn(),
}));

vi.mock("@/lib/integrations/sleeper-sync", () => ({
  loadSleeperLeagues: sleeperMock.loadSleeperLeagues,
}));

function makeRequest(url: string, ip = "203.0.113.1"): Request {
  return new Request(url, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("/api/sleeper/leagues — rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    sleeperMock.loadSleeperLeagues.mockResolvedValue({
      status: "ok",
      user: { id: "u1", username: "Test" },
      leagues: [],
      error: null,
      generatedAt: new Date().toISOString(),
      season: "2025",
      attribution: null,
      readOnlyNote: "",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within the 20/min per-IP quota", async () => {
    const mod = await import("@/app/api/sleeper/leagues/route");
    const req = makeRequest("http://localhost/api/sleeper/leagues?username=test");

    const res = await mod.GET(req as never);
    expect(res.status).toBe(200);
    expect(sleeperMock.loadSleeperLeagues).toHaveBeenCalledTimes(1);
  });

  it("returns 429 on the 21st request from the same IP within the window", async () => {
    const mod = await import("@/app/api/sleeper/leagues/route");
    const req = makeRequest("http://localhost/api/sleeper/leagues?username=test");

    // First 20 requests succeed (within quota).
    for (let i = 0; i < 20; i++) {
      const res = await mod.GET(req as never);
      expect(res.status).toBe(200);
    }

    // 21st request: rate-limited.
    const blocked = await mod.GET(req as never);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.code).toBe("rate_limited");
    expect(blocked.headers.get("Retry-After")).toEqual(expect.any(String));
  });

  it("different IPs have independent quotas", async () => {
    const mod = await import("@/app/api/sleeper/leagues/route");

    // Exhaust IP 1's quota.
    const req1 = makeRequest("http://localhost/api/sleeper/leagues?username=test", "203.0.113.1");
    for (let i = 0; i < 20; i++) {
      await mod.GET(req1 as never);
    }
    const blocked = await mod.GET(req1 as never);
    expect(blocked.status).toBe(429);

    // IP 2 should still be allowed.
    const req2 = makeRequest("http://localhost/api/sleeper/leagues?username=test", "203.0.113.2");
    const ok = await mod.GET(req2 as never);
    expect(ok.status).toBe(200);
  });
});

describe("/api/sleeper/leagues — result cache", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
    sleeperMock.loadSleeperLeagues.mockResolvedValue({
      status: "ok",
      user: { id: "u1", username: "Test" },
      leagues: [],
      error: null,
      generatedAt: new Date().toISOString(),
      season: "2025",
      attribution: null,
      readOnlyNote: "",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves two identical requests from cache (one upstream fetch)", async () => {
    const mod = await import("@/app/api/sleeper/leagues/route");
    const req = makeRequest("http://localhost/api/sleeper/leagues?username=test&season=2025");

    const res1 = await mod.GET(req as never);
    expect(res1.status).toBe(200);

    const res2 = await mod.GET(req as never);
    expect(res2.status).toBe(200);

    // Only the first call should hit loadSleeperLeagues; the second is cached.
    expect(sleeperMock.loadSleeperLeagues).toHaveBeenCalledTimes(1);
  });

  it("re-fetches when a different username is requested", async () => {
    const mod = await import("@/app/api/sleeper/leagues/route");

    const req1 = makeRequest("http://localhost/api/sleeper/leagues?username=nova");
    await mod.GET(req1 as never);

    const req2 = makeRequest("http://localhost/api/sleeper/leagues?username=rival");
    await mod.GET(req2 as never);

    // Two distinct cache keys → two upstream fetches.
    expect(sleeperMock.loadSleeperLeagues).toHaveBeenCalledTimes(2);
  });
});
