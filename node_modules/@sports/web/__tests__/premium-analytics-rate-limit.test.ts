import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Per-user rate limiting on the premium analytics endpoints.
 *
 * These routes are PRO/ELITE-gated (`requirePremiumApiRateLimited`) but were
 * previously unlimited, so one paid caller could loop an expensive compute
 * unbounded (cost + abuse). This suite drives the REAL route handlers against
 * the REAL in-memory limiter (only auth / entitlements / the data loaders are
 * mocked) and proves, for a representative sample of routes:
 *
 *  - a burst past the ceiling for one user → 429 with the same shape/headers as
 *    the explain & model-court routes;
 *  - a normal request count sails through (200);
 *  - the limit is PER-USER — user A exhausting their bucket does not block B;
 *  - the limit is PER-ENDPOINT — exhausting one route does not block another;
 *  - anon / FREE callers get the entitlement denial (401 / 403), never a 429 —
 *    the gate strictly precedes the limiter and the limiter is never consumed.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string } } | null>>(),
  getUserEntitlements: vi.fn<(id: string) => Promise<unknown>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("@/lib/intelligence/expected-points", () => ({ loadExpectedPoints: vi.fn() }));
vi.mock("@/lib/nflverse/combine", () => ({ loadNflverseCombine: vi.fn() }));
vi.mock("@/lib/projections/player-projections", () => ({ loadPlayerProjections: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { getEntitlements } from "@sports/types";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { GET as expectedPointsGet } from "@/app/api/intelligence/expected-points/route";
import { GET as combineGet } from "@/app/api/nflverse/combine/route";
import { GET as projectionsGet } from "@/app/api/projections/route";
import { loadExpectedPoints } from "@/lib/intelligence/expected-points";
import { loadNflverseCombine } from "@/lib/nflverse/combine";
import { loadPlayerProjections } from "@/lib/projections/player-projections";

// Mirrors PREMIUM_ANALYTICS_RATE_MAX in lib/api-entitlement.ts. Generous on
// purpose: a real subscriber never approaches 120 hits/min on a single endpoint.
const LIMIT = 120;

/** Impersonate a caller for the auth()-backed gate. */
function signInAs(id: string): void {
  mocks.auth.mockResolvedValue({ user: { id } });
}

const routes = {
  "intelligence/expected-points": () => expectedPointsGet(),
  "nflverse/combine": () => combineGet(),
  projections: () => projectionsGet(new Request("http://x/api/projections")),
} as const;

/** Drive one route until the limiter blocks, returning the pass count + 429. */
async function runUntilBlocked(call: () => Promise<Response>): Promise<{
  successes: number;
  blocked: Response;
}> {
  let successes = 0;
  for (let i = 0; i < LIMIT * 3; i++) {
    const res = await call();
    if (res.status === 429) return { successes, blocked: res };
    expect(res.status).toBe(200);
    successes += 1;
  }
  throw new Error("limiter never blocked");
}

beforeEach(() => {
  resetRateLimits();
  mocks.auth.mockReset();
  mocks.getUserEntitlements.mockReset();
  // PRO by default; FREE only for the explicitly free user id.
  mocks.getUserEntitlements.mockImplementation(async (id: string) =>
    id === "free_user" ? getEntitlements("FREE") : getEntitlements("PRO"),
  );
  (loadExpectedPoints as Mock).mockReset().mockResolvedValue({ status: "live" });
  (loadNflverseCombine as Mock).mockReset().mockResolvedValue({ status: "live" });
  (loadPlayerProjections as Mock).mockReset().mockResolvedValue({ status: "ok" });
  signInAs("user_a");
});

describe.each(Object.entries(routes))("premium analytics rate limit — %s", (name, call) => {
  it("lets a normal request count through (200)", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await call();
      expect(res.status).toBe(200);
    }
  });

  it("429s a single user's burst past the ceiling, with the explain/model-court shape", async () => {
    const { successes, blocked } = await runUntilBlocked(call);

    // Exactly LIMIT requests pass before the (LIMIT+1)th is blocked.
    expect(successes).toBe(LIMIT);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    const body = (await blocked.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ success: false, error: "rate-limited" });
    expect(typeof body["message"]).toBe("string");
  });

  it("is PER-USER: user A hitting the limit does not block user B", async () => {
    signInAs("user_a");
    const { successes } = await runUntilBlocked(call);
    expect(successes).toBe(LIMIT);

    // A is now blocked...
    signInAs("user_a");
    expect((await call()).status).toBe(429);

    // ...but B, sharing the same endpoint bucket by name, is untouched.
    signInAs("user_b");
    expect((await call()).status).toBe(200);
  });
});

describe("premium analytics rate limit — cross-cutting", () => {
  it("is PER-ENDPOINT: exhausting one route does not throttle another", async () => {
    signInAs("user_a");
    const { successes } = await runUntilBlocked(routes["intelligence/expected-points"]);
    expect(successes).toBe(LIMIT);

    // Same user, different endpoint bucket → still allowed.
    expect((await routes["nflverse/combine"]()).status).toBe(200);
    expect((await routes["projections"]()).status).toBe(200);
  });

  it("anon callers get the 401 entitlement denial, never a 429 (gate precedes limiter)", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await expectedPointsGet();

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["error"]).toBe("authentication_required");
    expect(loadExpectedPoints).not.toHaveBeenCalled();
  });

  it("FREE callers always get 403 — even under a burst the limiter never fires", async () => {
    signInAs("free_user");

    // Well past the ceiling: the gate rejects first every time, so the limiter
    // bucket is never consumed and a FREE user can never coax out a 429.
    for (let i = 0; i < LIMIT + 5; i++) {
      const res = await expectedPointsGet();
      expect(res.status).toBe(403);
    }
    const last = await expectedPointsGet();
    const body = (await last.json()) as Record<string, unknown>;
    expect(body["error"]).toBe("insufficient_tier");
    expect(loadExpectedPoints).not.toHaveBeenCalled();
  });
});
