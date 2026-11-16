import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sports/db", () => ({
  db: {
    subscription: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    revenueEvent: {
      create: vi.fn().mockResolvedValue({ id: "rev_mock_1" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { getUserEntitlements } from "@/lib/entitlements";
import {
  clearPurchaseLedgerCacheForTests,
  recordPurchaseLedgerEntry,
} from "@/lib/packages/purchase-ledger";

describe("entitlements bridge for one-time package purchases", () => {
  beforeEach(() => {
    clearPurchaseLedgerCacheForTests();
  });

  it("keeps unpurchased users on FREE tier with teaser-only access", async () => {
    const ent = await getUserEntitlements("user_free_1", "free@example.com");
    expect(ent.tier).toBe("FREE");
    expect(ent.canSeePremiumPicks).toBe(false);
    expect(ent.canSeeConfidence).toBe(false);
    expect(ent.dailyPickLimit).toBe(2);
  });

  it("upgrades week8-all-access buyers to ELITE across web and mobile", async () => {
    await recordPurchaseLedgerEntry({
      sessionId: "cs_test_all_access_1",
      packageSlug: "week8-all-access",
      customerEmail: "Buyer@Example.com",
      userId: "user_elite_1",
      amountCents: 4999,
      currency: "usd",
    });

    const ent = await getUserEntitlements("user_elite_1", "buyer@example.com");
    expect(ent.tier).toBe("ELITE");
    expect(ent.canSeePremiumPicks).toBe(true);
    expect(ent.canSeeConfidence).toBe(true);
    expect(ent.canUseClvLedger).toBe(true);
    expect(ent.canUseFantasyFull).toBe(true);
  });

  it("upgrades redzone-dfs-pro-pack buyers to FANTASY suite access", async () => {
    await recordPurchaseLedgerEntry({
      sessionId: "cs_test_dfs_1",
      packageSlug: "redzone-dfs-pro-pack",
      customerEmail: "dfs@example.com",
      userId: "user_dfs_1",
      amountCents: 2499,
      currency: "usd",
    });

    const ent = await getUserEntitlements("user_dfs_1", "dfs@example.com");
    expect(ent.tier).toBe("FANTASY");
    expect(ent.canUseFantasyDraftSuite).toBe(true);
    expect(ent.canUseFantasyFull).toBe(true);
    expect(ent.canSeePremiumPicks).toBe(false);
  });

  it("upgrades week8-tnf-pack buyers to PRO tier", async () => {
    await recordPurchaseLedgerEntry({
      sessionId: "cs_test_tnf_1",
      packageSlug: "week8-tnf-pack",
      customerEmail: "tnf@example.com",
      userId: "user_tnf_1",
      amountCents: 1999,
      currency: "usd",
    });

    const ent = await getUserEntitlements("user_tnf_1", "tnf@example.com");
    expect(ent.tier).toBe("PRO");
    expect(ent.canSeePremiumPicks).toBe(true);
    expect(ent.canSeeConfidence).toBe(true);
    expect(ent.dailyPickLimit).toBeNull();
  });
});
