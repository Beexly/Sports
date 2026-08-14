import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P1d-1 batch 2 (of 3) — extend consumeRateLimit coverage to five more routes
 * that previously had no limiter of any kind:
 *   - gse/v1/truth/fire        (unauthenticated external POST, expensive fire eval, keyed by IP)
 *   - receipts/verify           (unauthenticated external POST, keyring+signature, keyed by IP)
 *   - watchlist/follow          (authenticated DB-write POST, keyed by user id)
 *   - watchlist/unfollow        (authenticated DB-write POST, keyed by user id)
 *   - push/subscribe            (authenticated DB-write POST, keyed by user id)
 *
 * Each now uses the shared in-memory limiter with the SAME bucket shape as the
 * authenticated checkout / explain routes. Unauthenticated routes key by
 * clientIp(req) at 8/min (copied from subscriptions/checkout); authenticated
 * write routes key by session user id at 10/min (also copied from checkout).
 * No invented limits; no auth/schema/gate touched (LAW 4 clean).
 *
 * This suite drives the REAL route handlers and proves, per route:
 *  - up to LIMIT requests pass (not 429ed by the limiter);
 *  - the (LIMIT+1)th request → 429 with a Retry-After header;
 *  - for IP-keyed routes: a different IP is untouched;
 *  - for user-keyed routes: a different user is untouched (and anon 401/403
 *    callers never reach the limiter — no 429 for them).
 *
 * The limiter is module-global; resetRateLimits() keeps buckets clean.
 */

const ANON_LIMIT = 8;
const USER_LIMIT = 10;

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string } } | null>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

import { resetRateLimits } from "@/lib/api/rate-limit";
import { POST as truthFirePost } from "@/app/api/gse/v1/truth/fire/route";
import { POST as receiptsVerifyPost } from "@/app/api/receipts/verify/route";
import { POST as watchlistFollowPost } from "@/app/api/watchlist/follow/route";
import { POST as watchlistUnfollowPost } from "@/app/api/watchlist/unfollow/route";
import { POST as pushSubscribePost } from "@/app/api/push/subscribe/route";

function reqAs(ip: string, body: unknown, authUser?: string): Request {
  const headers: Record<string, string> = {
    "x-forwarded-for": ip,
    "content-type": "application/json",
  };
  if (authUser) headers["x-user-id"] = authUser;
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as unknown as Request;
}

// Minimal well-formed bodies (downstream refusal/default is not what we test).
const TRUTH_FIRE_BODY = {
  dualAsOfOk: true,
  dualAsOfCode: "ok",
  calibrationReady: true,
  quoteFresh: true,
  liveBoardOn: false,
  selectiveWouldFire: false,
};
const RECEIPT_BODY = {
  receiptId: "r1",
  at: "2026-09-14T16:00:00Z",
  decision: "allow",
  reasons: [],
  action: { tool: "t", argsDigest: "d", agentId: "a" },
  signature: { kid: "k", alg: "ed25519", sig: "s" },
};
const WATCHLIST_BODY = { entityType: "TEAM", entityId: "t1" };
const PUSH_BODY = { endpoint: "https://p.example/e", keys: { p256dh: "x", auth: "y" } };

// The three authenticated routes hit @sports/db (a stub in tests) after the
// limiter. For the limiter test we only care about 429 vs not-429; a downstream
// stub error is NOT a limiter block, so tolerate thrown responses.
async function tol(fn: () => Promise<Response>): Promise<number> {
  try {
    return (await fn()).status;
  } catch {
    return -1; // downstream stub error, definitely not a 429
  }
}

// The three authenticated routes call auth(); route them through the mock.
function authedPost(handler: (r: never) => Promise<Response>, user: string | null, ip: string, body: unknown): Promise<Response> {
  mocks.auth.mockResolvedValue(user ? { user: { id: user } } : null);
  return handler(reqAs(ip, body, user ?? undefined) as never);
}

beforeEach(() => {
  resetRateLimits();
  mocks.auth.mockReset();
});

describe("gse v1 truth/fire rate limit (IP-keyed)", () => {
  const call = () => truthFirePost(reqAs("203.0.113.20", TRUTH_FIRE_BODY) as never);
  it("lets up to LIMIT requests through (not 429ed)", async () => {
    for (let i = 0; i < ANON_LIMIT; i += 1) expect((await call()).status).not.toBe(429);
  });
  it("429s the (LIMIT+1)th request with Retry-After", async () => {
    for (let i = 0; i < ANON_LIMIT; i += 1) await call();
    const blocked = await call();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
  it("is PER-IP: a different IP is untouched", async () => {
    for (let i = 0; i < ANON_LIMIT; i += 1) await call();
    expect((await call()).status).toBe(429);
    const other = truthFirePost(reqAs("198.51.100.20", TRUTH_FIRE_BODY) as never);
    expect((await other).status).not.toBe(429);
  });
});

describe("receipts verify rate limit (IP-keyed)", () => {
  const call = () => receiptsVerifyPost(reqAs("203.0.113.21", RECEIPT_BODY) as never);
  it("lets up to LIMIT requests through (not 429ed)", async () => {
    for (let i = 0; i < ANON_LIMIT; i += 1) expect((await call()).status).not.toBe(429);
  });
  it("429s the (LIMIT+1)th request with Retry-After", async () => {
    for (let i = 0; i < ANON_LIMIT; i += 1) await call();
    const blocked = await call();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
  it("is PER-IP: a different IP is untouched", async () => {
    for (let i = 0; i < ANON_LIMIT; i += 1) await call();
    expect((await call()).status).toBe(429);
    expect((await receiptsVerifyPost(reqAs("198.51.100.21", RECEIPT_BODY) as never)).status).not.toBe(429);
  });
});

describe("watchlist/follow rate limit (user-keyed)", () => {
  const call = (user = "u_follow") => authedPost(watchlistFollowPost, user, "203.0.113.22", WATCHLIST_BODY);
  it("lets up to USER_LIMIT requests through for one user", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) expect(await tol(() => call())).not.toBe(429);
  });
  it("429s the (USER_LIMIT+1)th request with Retry-After", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) await tol(() => call());
    const blocked = await call();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
  it("is PER-USER: a different user is untouched", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) await tol(() => call());
    expect((await call()).status).toBe(429);
    expect(await tol(() => call("u_follow_other"))).not.toBe(429);
  });
  it("anon callers get 401, never a 429 (gate precedes limiter)", async () => {
    mocks.auth.mockResolvedValue(null);
    for (let i = 0; i < USER_LIMIT + 3; i += 1) {
      const res = await watchlistFollowPost(reqAs("203.0.113.22", WATCHLIST_BODY) as never);
      expect(res.status).toBe(401);
    }
  });
});

describe("watchlist/unfollow rate limit (user-keyed)", () => {
  const call = (user = "u_unfollow") => authedPost(watchlistUnfollowPost, user, "203.0.113.23", WATCHLIST_BODY);
  it("lets up to USER_LIMIT requests through for one user", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) expect(await tol(() => call())).not.toBe(429);
  });
  it("429s the (USER_LIMIT+1)th request with Retry-After", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) await tol(() => call());
    const blocked = await call();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
  it("is PER-USER: a different user is untouched", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) await tol(() => call());
    expect((await call()).status).toBe(429);
    expect(await tol(() => call("u_unfollow_other"))).not.toBe(429);
  });
});

describe("push/subscribe rate limit (user-keyed)", () => {
  const call = (user = "u_push") => authedPost(pushSubscribePost, user, "203.0.113.24", PUSH_BODY);
  it("lets up to USER_LIMIT requests through for one user", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) expect(await tol(() => call())).not.toBe(429);
  });
  it("429s the (USER_LIMIT+1)th request with Retry-After", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) await tol(() => call());
    const blocked = await call();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
  it("is PER-USER: a different user is untouched", async () => {
    for (let i = 0; i < USER_LIMIT; i += 1) await tol(() => call());
    expect((await call()).status).toBe(429);
    expect(await tol(() => call("u_push_other"))).not.toBe(429);
  });
});
