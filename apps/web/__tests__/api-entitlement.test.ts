import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server-side gate for premium analytics API routes. Proves the raw
 * `/api/intelligence/*` + `/api/nflverse/*` JSON cannot be pulled without
 * the same Pro/Elite entitlement the linking pages require — closing the
 * "premium page, open API one URL away" bypass.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string } } | null>>(),
  getUserEntitlements: vi.fn<(id: string) => Promise<unknown>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

import { requirePremiumApi, requireFantasyApiRateLimited } from "@/lib/api-entitlement";
import { getEntitlements } from "@sports/types";
import { resetRateLimits } from "@/lib/api/rate-limit";

describe("requirePremiumApi", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getUserEntitlements.mockReset();
  });

  it("returns 401 for an anonymous request (no session)", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await requirePremiumApi();

    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled();
    await expect(res!.json()).resolves.toMatchObject({ error: "authentication_required" });
  });

  it("returns 403 for an authenticated FREE-tier user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "free_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));

    const res = await requirePremiumApi();

    expect(res!.status).toBe(403);
    await expect(res!.json()).resolves.toMatchObject({ error: "insufficient_tier" });
  });

  it("grants access (null) to a PRO user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "pro_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));

    expect(await requirePremiumApi()).toBeNull();
  });

  it("grants access (null) to an ELITE user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "elite_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));

    expect(await requirePremiumApi()).toBeNull();
  });

  it("returns 403 for a FANTASY user — the paid fantasy tier is NOT the premium-analytics tier", async () => {
    // Regression guard: FANTASY is a paid tier for the fantasy suite only. It must
    // not reach /api/intelligence/* or /api/nflverse/* Pro analytics. A predicate of
    // `tier !== "FREE"` leaked the full Pro slate to $4.99 FANTASY subscribers.
    mocks.auth.mockResolvedValue({ user: { id: "fantasy_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));

    const res = await requirePremiumApi();

    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    await expect(res!.json()).resolves.toMatchObject({ error: "insufficient_tier" });
  });

  it("fails closed to 403 when the entitlement lookup throws", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user" } });
    mocks.getUserEntitlements.mockRejectedValue(new Error("db down"));

    const res = await requirePremiumApi();

    expect(res!.status).toBe(403);
  });

  it("fails closed to 401 when auth() itself throws", async () => {
    mocks.auth.mockRejectedValue(new Error("auth boom"));

    const res = await requirePremiumApi();

    expect(res!.status).toBe(401);
  });
});

describe("requireFantasyApiRateLimited", () => {
  const LIMIT = 120;

  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getUserEntitlements.mockReset();
    resetRateLimits(); // module-global limiter — deterministic across tests
  });

  it("returns 401 for an anonymous request (no session)", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await requireFantasyApiRateLimited("test-bucket");

    expect(res!.status).toBe(401);
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated FREE-tier user (canUseFantasyFull: false)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "free_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));

    const res = await requireFantasyApiRateLimited("test-bucket");

    expect(res!.status).toBe(403);
  });

  it("grants access (null) to a FANTASY-tier user (canUseFantasyFull: true)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "fantasy_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));

    expect(await requireFantasyApiRateLimited("test-bucket")).toBeNull();
  });

  it(`429s the same user's ${LIMIT + 1}th call within one window, with a Retry-After header`, async () => {
    mocks.auth.mockResolvedValue({ user: { id: "fantasy_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));

    for (let i = 0; i < LIMIT; i += 1) {
      const res = await requireFantasyApiRateLimited("shared-bucket");
      expect(res).toBeNull();
    }
    const blocked = await requireFantasyApiRateLimited("shared-bucket");
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
    expect(Number(blocked!.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("the entitlement gate precedes the limiter — a 403'd user is never rate-limited first", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "free_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));

    // Far more than LIMIT calls — if the limiter ran first, this would 429
    // eventually instead of denying every single call with 403.
    for (let i = 0; i < LIMIT + 5; i += 1) {
      const res = await requireFantasyApiRateLimited("shared-bucket-2");
      expect(res!.status).toBe(403);
    }
  });

  it("two different bucketIds do not share a budget for the same user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "fantasy_user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));

    for (let i = 0; i < LIMIT; i += 1) {
      expect(await requireFantasyApiRateLimited("bucket-a")).toBeNull();
    }
    expect((await requireFantasyApiRateLimited("bucket-a"))!.status).toBe(429);
    // A fresh bucket for the same user is NOT exhausted.
    expect(await requireFantasyApiRateLimited("bucket-b")).toBeNull();
  });
});
