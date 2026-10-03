import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEntitlements, type Entitlements } from "@sports/types";

/**
 * Server-side auth + tier gating for /api/watchlist/* — executed against
 * the REAL route handlers (mocked session + db), not a helper. Mirrors the
 * pattern in __tests__/audit-route-paywall.test.ts.
 *
 * Invariants pinned here:
 *  - Every route 401s with no session (CLAUDE.md rule #3: no
 *    frontend-only gating — auth is checked server-side before any DB read).
 *  - Follow is open to every tier (not tier-gated by itself); the real
 *    tier gate is the per-tier follow CAP, which 403s + returns an upsell
 *    payload once a FREE/FANTASY/PRO caller who isn't already following
 *    the target is at their limit.
 *  - Follow/unfollow are idempotent.
 *  - A table_missing DB result degrades every route to an honest 503, not
 *    a 500.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Entitlements>>(),
  watchlistFindMany: vi.fn(),
  watchlistFindUnique: vi.fn(),
  watchlistCount: vi.fn(),
  watchlistCreate: vi.fn(),
  watchlistDelete: vi.fn(),
  teamFindMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("@sports/db", () => ({
  db: {
    watchlist: {
      findMany: mocks.watchlistFindMany,
      findUnique: mocks.watchlistFindUnique,
      count: mocks.watchlistCount,
      create: mocks.watchlistCreate,
      delete: mocks.watchlistDelete,
    },
    team: { findMany: mocks.teamFindMany },
  },
}));

import { GET as listWatchlist } from "@/app/api/watchlist/route";
import { POST as followRoute } from "@/app/api/watchlist/follow/route";
import { POST as unfollowRoute } from "@/app/api/watchlist/unfollow/route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/watchlist/follow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function row(overrides: Partial<{ id: string; userId: string; entityType: string; entityId: string; createdAt: Date }> = {}) {
  return {
    id: "wl-1",
    userId: "user-1",
    entityType: "TEAM",
    entityId: "team-1",
    createdAt: new Date("2026-07-16T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.getUserEntitlements.mockReset();
  mocks.watchlistFindMany.mockReset();
  mocks.watchlistFindUnique.mockReset();
  mocks.watchlistCount.mockReset();
  mocks.watchlistCreate.mockReset();
  mocks.watchlistDelete.mockReset();
  mocks.teamFindMany.mockReset().mockResolvedValue([]);
});

describe("GET /api/watchlist", () => {
  it("unauth → 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await listWatchlist();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("happy path: signed-in FREE caller gets their list + tier meta", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    mocks.watchlistFindMany.mockResolvedValue([row()]);

    const res = await listWatchlist();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].entityId).toBe("team-1");
    expect(body.meta.tier).toBe("FREE");
    // FREE cannot get real-time alerts (Elite-exclusive per CLAUDE.md).
    expect(body.meta.alertsEligible).toBe(false);
    expect(body.meta.followLimit).toBe(5);
  });

  it("ELITE caller: alertsEligible is true and the follow limit is unlimited (null)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));
    mocks.watchlistFindMany.mockResolvedValue([]);

    const res = await listWatchlist();
    const body = await res.json();
    expect(body.meta.alertsEligible).toBe(true);
    expect(body.meta.followLimit).toBeNull();
  });

  it("table_missing → honest 503, not 500", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    mocks.watchlistFindMany.mockRejectedValue({ code: "P2021" });

    const res = await listWatchlist();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.reason).toBe("table_missing");
  });
});

describe("POST /api/watchlist/follow", () => {
  it("unauth → 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await followRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(401);
  });

  it("invalid body → 400", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await followRoute(postRequest({ entityType: "LEAGUE", entityId: "x" }));
    expect(res.status).toBe(400);
  });

  it("happy path: FREE caller under the cap follows successfully (201, created:true)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    mocks.watchlistFindUnique.mockResolvedValue(null); // not already following
    mocks.watchlistCount.mockResolvedValue(0); // well under the FREE cap of 5
    mocks.watchlistCreate.mockResolvedValue(row());

    const res = await followRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.created).toBe(true);
    expect(body.data.entityId).toBe("team-1");
  });

  it("idempotent: re-following an already-followed entity returns 200, created:false, and never checks the cap", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    mocks.watchlistFindUnique.mockResolvedValue(row());

    const res = await followRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(false);
    // The cap check must never run for an already-followed entity.
    expect(mocks.watchlistCount).not.toHaveBeenCalled();
  });

  it("wrong tier: FREE caller AT their follow cap and not already following → 403 + upsell", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    mocks.watchlistFindUnique.mockResolvedValue(null); // not already following this one
    mocks.watchlistCount.mockResolvedValue(5); // FREE cap is 5 — at the limit

    const res = await followRoute(postRequest({ entityType: "TEAM", entityId: "team-99" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.upsell.currentTier).toBe("FREE");
    expect(body.upsell.followLimit).toBe(5);
    expect(typeof body.upsell.upgradeTier).toBe("string");
    // Never actually created past the cap.
    expect(mocks.watchlistCreate).not.toHaveBeenCalled();
  });

  it("ELITE caller is never capped, even with a huge existing count", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));
    mocks.watchlistFindUnique.mockResolvedValue(null);
    mocks.watchlistCount.mockResolvedValue(9_999);
    mocks.watchlistCreate.mockResolvedValue(row({ entityId: "team-2" }));

    const res = await followRoute(postRequest({ entityType: "TEAM", entityId: "team-2" }));
    expect(res.status).toBe(201);
  });

  it("table_missing on the lookup → honest 503, not 500", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    mocks.watchlistFindUnique.mockRejectedValue({ code: "P2021" });

    const res = await followRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/watchlist/unfollow", () => {
  it("unauth → 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await unfollowRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(401);
  });

  it("invalid body → 400", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await unfollowRoute(postRequest({ entityType: "TEAM" }));
    expect(res.status).toBe(400);
  });

  it("happy path: unfollows an existing entry (200, deleted:true)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.watchlistDelete.mockResolvedValue(row());

    const res = await unfollowRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });

  it("idempotent: unfollowing something you don't follow is 200, deleted:false — not an error", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.watchlistDelete.mockRejectedValue({ code: "P2025" });

    const res = await unfollowRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(false);
  });

  it("table_missing → honest 503, not 500", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.watchlistDelete.mockRejectedValue({ code: "P2021" });

    const res = await unfollowRoute(postRequest({ entityType: "TEAM", entityId: "team-1" }));
    expect(res.status).toBe(503);
  });
});
