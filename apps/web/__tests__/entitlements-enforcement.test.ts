import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Production-path tests for the server-side entitlement system —
 * the single source of truth for every paywall decision.
 *
 * Covers: the DB lookup + status filter, the fail-closed FREE
 * fallback when the DB is unreachable, error propagation for
 * unexpected failures, and requireEntitlement's gate behavior.
 */

const mocks = vi.hoisted(() => ({
  subscriptionFindFirst: vi.fn<(args: unknown) => Promise<{ tier: string } | null>>(),
}));

vi.mock("@sports/db", () => ({
  db: { subscription: { findFirst: mocks.subscriptionFindFirst } },
}));

import {
  getUserEntitlements,
  requireEntitlement,
  EntitlementError,
  PAST_DUE_GRACE_DAYS,
} from "@/lib/entitlements";

describe("getUserEntitlements — production DB path", () => {
  beforeEach(() => {
    mocks.subscriptionFindFirst.mockReset();
    delete process.env["DEV_FAKE_ADMIN"];
  });

  it("returns PRO entitlements for an active PRO subscription", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue({ tier: "PRO" });

    const ent = await getUserEntitlements("user_1");

    expect(ent.tier).toBe("PRO");
    expect(ent.canSeePremiumPicks).toBe(true);
    expect(ent.canSeeConfidence).toBe(true);
    expect(ent.canGetAlerts).toBe(false);
    expect(ent.dailyPickLimit).toBeNull();
  });

  it("returns ELITE entitlements including alerts", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue({ tier: "ELITE" });

    const ent = await getUserEntitlements("user_1");

    expect(ent.tier).toBe("ELITE");
    expect(ent.canGetAlerts).toBe(true);
  });

  it("honors ACTIVE/TRIALING, plus PAST_DUE only within the grace window", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue(null);
    const before = Date.now() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;

    await getUserEntitlements("user_1");
    const after = Date.now() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;

    expect(mocks.subscriptionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user_1",
          OR: [
            { status: { in: ["ACTIVE", "TRIALING"] } },
            {
              status: "PAST_DUE",
              pastDueSince: { gte: expect.any(Date) },
            },
          ],
        }),
      })
    );

    // The cutoff must be exactly PAST_DUE_GRACE_DAYS in the past.
    const call = mocks.subscriptionFindFirst.mock.calls[0]![0] as {
      where: { OR: Array<{ pastDueSince?: { gte: Date } }> };
    };
    const cutoff = call.where.OR[1]!.pastDueSince!.gte.getTime();
    expect(cutoff).toBeGreaterThanOrEqual(before);
    expect(cutoff).toBeLessThanOrEqual(after);
  });

  it("returns the paid tier for a PAST_DUE subscription inside the grace window", async () => {
    // The window itself is enforced by the DB filter; when the query
    // matches, the member keeps their paid tier.
    mocks.subscriptionFindFirst.mockResolvedValue({ tier: "PRO" });

    const ent = await getUserEntitlements("dunning_user");

    expect(ent.tier).toBe("PRO");
    expect(ent.canSeeConfidence).toBe(true);
  });

  it("falls back to FREE when no qualifying subscription exists", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue(null);

    const ent = await getUserEntitlements("lapsed_user");

    expect(ent.tier).toBe("FREE");
    expect(ent.canSeePremiumPicks).toBe(true); // picks are free for all tiers; fail-closed is asserted via tier==="FREE"
    expect(ent.canSeeConfidence).toBe(true); // confidence freed for FREE (calibrated-honest, Step 3)
    expect(ent.dailyPickLimit).toBeNull();
  });

  it("fails closed to FREE when the database is unreachable (P1001)", async () => {
    mocks.subscriptionFindFirst.mockRejectedValue(
      Object.assign(new Error("Can't reach database server"), { code: "P1001" })
    );

    const ent = await getUserEntitlements("user_1");

    expect(ent.tier).toBe("FREE");
    expect(ent.canSeePremiumPicks).toBe(true); // picks are free for all tiers; fail-closed is asserted via tier==="FREE"
  });

  it("rethrows unexpected database errors instead of masking them", async () => {
    mocks.subscriptionFindFirst.mockRejectedValue(new Error("unique constraint violation"));

    await expect(getUserEntitlements("user_1")).rejects.toThrow("unique constraint violation");
  });
});

describe("requireEntitlement", () => {
  beforeEach(() => {
    mocks.subscriptionFindFirst.mockReset();
    delete process.env["DEV_FAKE_ADMIN"];
  });

  it("returns entitlements when the check passes", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue({ tier: "PRO" });

    const ent = await requireEntitlement("user_1", (e) => e.canSeeConfidence);

    expect(ent.tier).toBe("PRO");
  });

  it("throws EntitlementError when the check fails", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue(null);

    // FREE can now see confidence (it is calibrated-honest); gate on a flag FREE
    // still lacks (factor breakdown is Pro+) to exercise the throw path.
    await expect(requireEntitlement("free_user", (e) => e.canSeeFactorBreakdown)).rejects.toThrow(
      EntitlementError
    );
  });
});

describe("getUserEntitlements — DEV_FAKE_ADMIN gating", () => {
  beforeEach(() => {
    mocks.subscriptionFindFirst.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("grants ELITE to the dev-admin shortcut outside production (and skips the DB)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");

    const ent = await getUserEntitlements("dev-admin");

    expect(ent.tier).toBe("ELITE");
    // Must short-circuit before any DB lookup.
    expect(mocks.subscriptionFindFirst).not.toHaveBeenCalled();
  });

  it("NEVER escalates dev-admin in production, even with DEV_FAKE_ADMIN=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    mocks.subscriptionFindFirst.mockResolvedValue(null);

    const ent = await getUserEntitlements("dev-admin");

    // Falls through to the real DB path → fails closed to FREE.
    expect(ent.tier).toBe("FREE");
    expect(ent.canSeePremiumPicks).toBe(true); // picks are free for all tiers; fail-closed is asserted via tier==="FREE"
    expect(mocks.subscriptionFindFirst).toHaveBeenCalledTimes(1);
  });

  it("does not escalate a non-dev-admin id even in dev with the flag on", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    mocks.subscriptionFindFirst.mockResolvedValue(null);

    const ent = await getUserEntitlements("attacker");

    expect(ent.tier).toBe("FREE");
    expect(mocks.subscriptionFindFirst).toHaveBeenCalledTimes(1);
  });
});
