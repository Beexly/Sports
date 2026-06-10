import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkRateLimit,
  checkRateLimitInMemory,
  enforcePublicApiRateLimit,
  getClientIp,
  getRestBackend,
  resetRateLimitStoreForTests,
  resolveRateLimitConfig,
} from "@/lib/rate-limit";
import {
  parsePublicQuery,
  picksQuerySchema,
  performanceQuerySchema,
  promotionsQuerySchema,
} from "@/lib/public-query";

/**
 * R-12 — inbound rate limiter + shared public-query validation.
 *
 * Limiter contract pinned here:
 *   - fixed-window math: admit up to max, deny past it, reset on window roll
 *   - per-key (per-IP / per-route) isolation
 *   - FAIL OPEN: REST backend errors / bad shapes / non-200s always admit
 *   - backend selection: REST only when its env keys are PRESENT
 *   - env tunables parse defensively (garbage → defaults)
 *
 * Validation contract pinned here:
 *   - junk params → ok:false with a clean 400 "invalid-query" response
 *   - valid + absent params parse; unknown params are ignored, never rejected
 */

const CONFIG = { maxRequests: 3, windowMs: 60_000 };
// Deliberately mid-window so retryAfterSeconds is a real partial value.
const NOW = 1_000_000; // windowIndex 16; window ends at 1_020_000 → 20s left

beforeEach(() => {
  resetRateLimitStoreForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("checkRateLimitInMemory — fixed-window math", () => {
  it("admits up to maxRequests and decrements remaining", () => {
    const r1 = checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW);
    const r2 = checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW + 1);
    const r3 = checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW + 2);
    expect([r1.ok, r2.ok, r3.ok]).toEqual([true, true, true]);
    expect([r1.remaining, r2.remaining, r3.remaining]).toEqual([2, 1, 0]);
  });

  it("denies the request past the threshold with a window-honest Retry-After", () => {
    for (let i = 0; i < 3; i++) checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW);
    const denied = checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW);
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.limit).toBe(3);
    // Window 16 ends at 1_020_000ms → ceil(20_000 / 1000) = 20s.
    expect(denied.retryAfterSeconds).toBe(20);
  });

  it("resets the counter when the window rolls over", () => {
    for (let i = 0; i < 4; i++) checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW);
    expect(checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW).ok).toBe(false);

    const nextWindow = NOW + CONFIG.windowMs; // windowIndex 17
    const fresh = checkRateLimitInMemory("picks:1.1.1.1", CONFIG, nextWindow);
    expect(fresh.ok).toBe(true);
    expect(fresh.remaining).toBe(2);
  });

  it("isolates counters per IP and per route", () => {
    for (let i = 0; i < 4; i++) checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW);
    expect(checkRateLimitInMemory("picks:1.1.1.1", CONFIG, NOW).ok).toBe(false);

    // Different IP, same route — unaffected.
    expect(checkRateLimitInMemory("picks:2.2.2.2", CONFIG, NOW).ok).toBe(true);
    // Same IP, different route — unaffected.
    expect(checkRateLimitInMemory("board-state:1.1.1.1", CONFIG, NOW).ok).toBe(true);
  });
});

describe("checkRateLimit — backend selection + fail-open", () => {
  it("uses the in-memory backend when no REST keys are present (fetch untouched)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const decision = await checkRateLimit("picks:3.3.3.3", { config: CONFIG, nowMs: NOW });
    expect(decision.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the REST backend when Upstash keys are present", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-limiter.upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-only-token");
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: 2 }, { result: 1 }]), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const decision = await checkRateLimit("picks:4.4.4.4", { config: CONFIG, nowMs: NOW });
    expect(decision.ok).toBe(true); // INCR returned 2 ≤ max 3
    expect(decision.remaining).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://fake-limiter.upstash.test/pipeline");
  });

  it("denies via the REST backend when INCR exceeds the limit", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://fake-kv.vercel.test");
    vi.stubEnv("KV_REST_API_TOKEN", "test-only-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ result: 9 }, { result: 1 }]), { status: 200 })
      )
    );

    const decision = await checkRateLimit("picks:5.5.5.5", { config: CONFIG, nowMs: NOW });
    expect(decision.ok).toBe(false);
    expect(decision.remaining).toBe(0);
  });

  it("FAILS OPEN when the REST backend throws", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-limiter.upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-only-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const decision = await checkRateLimit("picks:6.6.6.6", { config: CONFIG, nowMs: NOW });
    expect(decision.ok).toBe(true);
  });

  it("FAILS OPEN on a non-200 REST response", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-limiter.upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-only-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const decision = await checkRateLimit("picks:7.7.7.7", { config: CONFIG, nowMs: NOW });
    expect(decision.ok).toBe(true);
  });

  it("FAILS OPEN on a malformed REST payload", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-limiter.upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-only-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ weird: true }), { status: 200 }))
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const decision = await checkRateLimit("picks:8.8.8.8", { config: CONFIG, nowMs: NOW });
    expect(decision.ok).toBe(true);
  });
});

describe("enforcePublicApiRateLimit — route helper", () => {
  it("returns null (admit) under the limit and a 429 with Retry-After past it", async () => {
    vi.stubEnv("RATE_LIMIT_MAX_REQUESTS", "2");
    const req = new Request("http://localhost/api/picks", {
      headers: { "x-forwarded-for": "198.51.100.7" },
    });

    expect(await enforcePublicApiRateLimit(req, "helper-test")).toBeNull();
    expect(await enforcePublicApiRateLimit(req, "helper-test")).toBeNull();

    const limited = await enforcePublicApiRateLimit(req, "helper-test");
    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);
    expect(Number(limited!.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    const body = (await limited!.json()) as Record<string, unknown>;
    expect(body["success"]).toBe(false);
    expect(body["error"]).toBe("rate-limited");
  });

  it("is inert when RATE_LIMIT_DISABLED=true", async () => {
    vi.stubEnv("RATE_LIMIT_DISABLED", "true");
    vi.stubEnv("RATE_LIMIT_MAX_REQUESTS", "1");
    const req = new Request("http://localhost/api/picks", {
      headers: { "x-forwarded-for": "198.51.100.8" },
    });
    for (let i = 0; i < 5; i++) {
      expect(await enforcePublicApiRateLimit(req, "helper-test-disabled")).toBeNull();
    }
  });

  it("tolerates an absent request (argless test invocation) via the unknown bucket", async () => {
    expect(await enforcePublicApiRateLimit(undefined, "helper-test-argless")).toBeNull();
  });
});

describe("getClientIp / config / backend presence helpers", () => {
  it("prefers the first x-forwarded-for hop, then x-real-ip, then 'unknown'", () => {
    const xff = new Request("http://x.test", {
      headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" },
    });
    expect(getClientIp(xff)).toBe("9.9.9.9");

    const realIp = new Request("http://x.test", { headers: { "x-real-ip": "8.8.8.8" } });
    expect(getClientIp(realIp)).toBe("8.8.8.8");

    expect(getClientIp(new Request("http://x.test"))).toBe("unknown");
    expect(getClientIp(undefined)).toBe("unknown");
  });

  it("defaults to ~60 req/min and survives garbage env values", () => {
    expect(resolveRateLimitConfig({})).toEqual({ maxRequests: 60, windowMs: 60_000 });
    expect(
      resolveRateLimitConfig({
        RATE_LIMIT_MAX_REQUESTS: "abc",
        RATE_LIMIT_WINDOW_SECONDS: "-5",
      })
    ).toEqual({ maxRequests: 60, windowMs: 60_000 });
    expect(
      resolveRateLimitConfig({
        RATE_LIMIT_MAX_REQUESTS: "120",
        RATE_LIMIT_WINDOW_SECONDS: "30",
      })
    ).toEqual({ maxRequests: 120, windowMs: 30_000 });
  });

  it("REST backend is selected on key PRESENCE only (either naming pair)", () => {
    expect(getRestBackend({})).toBeNull();
    expect(getRestBackend({ UPSTASH_REDIS_REST_URL: "https://u.test" })).toBeNull();
    expect(
      getRestBackend({
        UPSTASH_REDIS_REST_URL: "https://u.test",
        UPSTASH_REDIS_REST_TOKEN: "t",
      })
    ).not.toBeNull();
    expect(
      getRestBackend({ KV_REST_API_URL: "https://kv.test", KV_REST_API_TOKEN: "t" })
    ).not.toBeNull();
  });
});

describe("parsePublicQuery — shared zod validation", () => {
  function reqWith(qs: string): Request {
    return new Request(`http://localhost/api/anything${qs}`);
  }

  it("parses valid picks params and passes absent ones through as undefined", () => {
    const parsed = parsePublicQuery(
      reqWith("?sport=nfl&date=2026-06-10&grade=LEAN"),
      picksQuerySchema
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual({ sport: "nfl", date: "2026-06-10", grade: "LEAN" });
    }

    const empty = parsePublicQuery(reqWith(""), picksQuerySchema);
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.data).toEqual({});
  });

  it("rejects junk with a clean 400 invalid-query response (not a 503)", async () => {
    const parsed = parsePublicQuery(
      reqWith("?date=banana&grade=SUPER_LOCK"),
      picksQuerySchema
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
      const body = (await parsed.response.json()) as Record<string, unknown>;
      expect(body["success"]).toBe(false);
      expect(body["error"]).toBe("invalid-query");
      const issues = body["issues"] as Array<{ param: string }>;
      // zod may emit more than one issue per param (regex + refine); the
      // contract is the SET of offending params, not the issue count.
      expect(Array.from(new Set(issues.map((i) => i.param))).sort()).toEqual([
        "date",
        "grade",
      ]);
    }
  });

  it("rejects an impossible calendar date that matches the format", () => {
    const parsed = parsePublicQuery(reqWith("?date=2026-13-45"), picksQuerySchema);
    expect(parsed.ok).toBe(false);
  });

  it("ignores unknown params (utm tags never 400)", () => {
    const parsed = parsePublicQuery(
      reqWith("?utm_source=newsletter&sport=nba"),
      performanceQuerySchema
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data).toEqual({ sport: "nba" });
  });

  it("rejects unsafe characters in echoed params (performance period)", () => {
    const parsed = parsePublicQuery(
      reqWith("?period=%3Cscript%3Ealert(1)%3C/script%3E"),
      performanceQuerySchema
    );
    expect(parsed.ok).toBe(false);
  });

  it("normalizes a valid promotions state and 400s a malformed one", () => {
    const ok = parsePublicQuery(reqWith("?state=nj"), promotionsQuerySchema);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.state).toBe("NJ");

    const bad = parsePublicQuery(reqWith("?state=NEWJERSEY"), promotionsQuerySchema);
    expect(bad.ok).toBe(false);
  });

  it("tolerates an absent request as 'no params'", () => {
    const parsed = parsePublicQuery(undefined, picksQuerySchema);
    expect(parsed.ok).toBe(true);
  });
});
