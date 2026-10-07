/**
 * /api/sleeper/league — rate limiting + result caching.
 *
 * ABUSE REGRESSION: this route was anonymous, `force-dynamic`, and had NEITHER
 * a limiter NOR a cache, while its own sibling `/api/sleeper/leagues` had both.
 * Each call fans out to THREE upstream Sleeper endpoints — league, rosters and
 * leagueUsers, issued together in `loadSleeperLeague` (lib/integrations/
 * sleeper-sync.ts) at a 15s timeout each. That is a 3x amplifier available to
 * any anonymous caller in a loop: proxy abuse / denial-of-third-party against
 * Sleeper, from GSE's IP, plus unbounded outbound sockets on our side.
 *
 * The `userId` query param is a SLEEPER platform id selecting which public
 * roster to highlight — not a GSE identity — so this is a DoS/abuse exposure,
 * not an IDOR. The route stays public by design; it just stops being unbounded.
 *
 * Mirrors sleeper-leagues-route.test.ts: the REAL consumeRateLimit +
 * resetRateLimits are used (not mocked), only the Sleeper data dependency is
 * mocked, so nothing here touches the network. Assertions are at RUNTIME
 * against the executed handler — apps/web/tsconfig.json excludes test files, so
 * a type-level assertion would prove nothing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

const sleeperMock = vi.hoisted(() => ({
  loadSleeperLeague: vi.fn(),
}));

vi.mock("@/lib/integrations/sleeper-sync", () => ({
  loadSleeperLeague: sleeperMock.loadSleeperLeague,
}));

function makeRequest(url: string, ip = "203.0.113.10"): Request {
  return new Request(url, { headers: { "x-forwarded-for": ip } });
}

function okLeague() {
  return {
    status: "ok",
    league: { id: "123", name: "Test League" },
    standings: [],
    you: null,
    playerPool: 0,
    error: null,
    generatedAt: new Date().toISOString(),
    canPublishPicks: false,
    note: "",
    attribution: null,
    readOnlyNote: "",
  };
}

beforeEach(() => {
  vi.resetModules();
  resetRateLimits();
  sleeperMock.loadSleeperLeague.mockReset();
  sleeperMock.loadSleeperLeague.mockResolvedValue(okLeague());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/sleeper/league — rate limiting", () => {
  it("allows requests within the 20/min per-IP quota", async () => {
    const mod = await import("@/app/api/sleeper/league/route");
    const res = await mod.GET(
      makeRequest("http://localhost/api/sleeper/league?leagueId=123") as never,
    );

    expect(res.status).toBe(200);
    expect(sleeperMock.loadSleeperLeague).toHaveBeenCalledTimes(1);
  });

  it("returns 429 on the 21st request from the same IP within the window", async () => {
    const mod = await import("@/app/api/sleeper/league/route");

    // Distinct leagueIds so the result cache cannot absorb the burst — the
    // LIMITER has to be what stops it, which is the point of this case.
    for (let i = 0; i < 20; i++) {
      const res = await mod.GET(
        makeRequest(`http://localhost/api/sleeper/league?leagueId=${1000 + i}`) as never,
      );
      expect(res.status).toBe(200);
    }

    const blocked = await mod.GET(
      makeRequest("http://localhost/api/sleeper/league?leagueId=9999") as never,
    );
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.code).toBe("rate_limited");
    expect(blocked.headers.get("Retry-After")).toEqual(expect.any(String));

    // The 21st request must not have reached Sleeper at all.
    expect(sleeperMock.loadSleeperLeague).toHaveBeenCalledTimes(20);
  });

  it("the limiter runs BEFORE the leagueId validation, so junk input is throttled too", async () => {
    // A caller looping `?leagueId=` (400) would otherwise be unlimited, and a
    // 400-loop is still a request-handling cost. Fail closed on the cheap path.
    const mod = await import("@/app/api/sleeper/league/route");

    for (let i = 0; i < 20; i++) {
      const res = await mod.GET(makeRequest("http://localhost/api/sleeper/league") as never);
      expect(res.status).toBe(400);
    }

    const blocked = await mod.GET(makeRequest("http://localhost/api/sleeper/league") as never);
    expect(blocked.status).toBe(429);
  });

  it("different IPs have independent quotas", async () => {
    const mod = await import("@/app/api/sleeper/league/route");

    for (let i = 0; i < 20; i++) {
      await mod.GET(
        makeRequest(`http://localhost/api/sleeper/league?leagueId=${2000 + i}`, "203.0.113.10") as never,
      );
    }
    const blocked = await mod.GET(
      makeRequest("http://localhost/api/sleeper/league?leagueId=777", "203.0.113.10") as never,
    );
    expect(blocked.status).toBe(429);

    const other = await mod.GET(
      makeRequest("http://localhost/api/sleeper/league?leagueId=777", "203.0.113.11") as never,
    );
    expect(other.status).toBe(200);
  });

  it("a forged leftmost X-Forwarded-For cannot mint a fresh bucket", async () => {
    // clientIp() reads XFF from the RIGHT (TRUSTED_PROXY_HOPS), so the entry a
    // caller prepends is ignored. Hand-rolled leftmost parsing — which a
    // separate branch is currently removing from five other routes — would let
    // a caller reset their own quota at will, making the limiter decorative.
    const mod = await import("@/app/api/sleeper/league/route");

    for (let i = 0; i < 20; i++) {
      await mod.GET(
        new Request(`http://localhost/api/sleeper/league?leagueId=${3000 + i}`, {
          headers: { "x-forwarded-for": "203.0.113.20" },
        }) as never,
      );
    }

    const forged = await mod.GET(
      new Request("http://localhost/api/sleeper/league?leagueId=555", {
        // Attacker-supplied entry on the left; the real hop is still the right one.
        headers: { "x-forwarded-for": "198.51.100.99, 203.0.113.20" },
      }) as never,
    );
    expect(forged.status).toBe(429);
  });
});

describe("/api/sleeper/league — result cache", () => {
  it("serves two identical requests from cache — one 3-endpoint fan-out, not two", async () => {
    const mod = await import("@/app/api/sleeper/league/route");
    const req = makeRequest("http://localhost/api/sleeper/league?leagueId=123&userId=456");

    const res1 = await mod.GET(req as never);
    expect(res1.status).toBe(200);
    const res2 = await mod.GET(req as never);
    expect(res2.status).toBe(200);

    // The second call must not have re-fetched upstream.
    expect(sleeperMock.loadSleeperLeague).toHaveBeenCalledTimes(1);
    expect(await res2.json()).toEqual(await res1.json());
  });

  it("keys the cache on the sanitised ids, so cosmetic variants share one entry", async () => {
    const mod = await import("@/app/api/sleeper/league/route");

    await mod.GET(makeRequest("http://localhost/api/sleeper/league?leagueId=123") as never);
    // Non-digits are stripped by the existing sanitiser; both resolve to "123".
    await mod.GET(makeRequest("http://localhost/api/sleeper/league?leagueId=1-2-3") as never);

    expect(sleeperMock.loadSleeperLeague).toHaveBeenCalledTimes(1);
  });

  it("re-fetches for a different league", async () => {
    const mod = await import("@/app/api/sleeper/league/route");

    await mod.GET(makeRequest("http://localhost/api/sleeper/league?leagueId=123") as never);
    await mod.GET(makeRequest("http://localhost/api/sleeper/league?leagueId=456") as never);

    expect(sleeperMock.loadSleeperLeague).toHaveBeenCalledTimes(2);
  });

  it("re-fetches for a different userId on the same league (userId selects the highlighted roster)", async () => {
    const mod = await import("@/app/api/sleeper/league/route");

    await mod.GET(makeRequest("http://localhost/api/sleeper/league?leagueId=123&userId=1") as never);
    await mod.GET(makeRequest("http://localhost/api/sleeper/league?leagueId=123&userId=2") as never);

    expect(sleeperMock.loadSleeperLeague).toHaveBeenCalledTimes(2);
  });

  it("caches across IPs — the cache is a fan-out bound, not a per-caller convenience", async () => {
    const mod = await import("@/app/api/sleeper/league/route");

    await mod.GET(
      makeRequest("http://localhost/api/sleeper/league?leagueId=123", "203.0.113.30") as never,
    );
    await mod.GET(
      makeRequest("http://localhost/api/sleeper/league?leagueId=123", "203.0.113.31") as never,
    );

    // A botnet spread across IPs defeats the limiter but not the cache.
    expect(sleeperMock.loadSleeperLeague).toHaveBeenCalledTimes(1);
  });
});
