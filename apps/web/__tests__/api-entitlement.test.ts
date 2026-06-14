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

import { requirePremiumApi } from "@/lib/api-entitlement";
import { getEntitlements } from "@sports/types";

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
