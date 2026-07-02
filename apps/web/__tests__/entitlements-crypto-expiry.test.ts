import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A crypto pass is fixed-term with no renewal webhook or cron to expire it, so
 * getUserEntitlements MUST gate crypto rows on currentPeriodEnd at read time.
 * These tests lock in that the DB query is term-aware for crypto while leaving
 * Stripe's webhook-driven expiry untouched — an expired pass must resolve FREE.
 */

const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@sports/db", () => ({
  db: { subscription: { findFirst: mocks.findFirst } },
}));

import { getUserEntitlements } from "@/lib/entitlements";

describe("getUserEntitlements crypto pass expiry", () => {
  beforeEach(() => {
    delete process.env["DEV_FAKE_ADMIN"];
    mocks.findFirst.mockReset();
  });

  it("gates crypto rows on currentPeriodEnd but not Stripe rows", async () => {
    mocks.findFirst.mockResolvedValue({ tier: "PRO" });
    await getUserEntitlements("u1");
    const where = mocks.findFirst.mock.calls[0]![0]!.where;
    const activeBranch = where.OR.find(
      (b: Record<string, unknown>) => b.status && (b.status as { in?: string[] }).in,
    );
    // The ACTIVE/TRIALING branch carries a nested OR: non-crypto OR future period.
    expect(activeBranch.OR).toEqual([
      { paymentProvider: { not: "COINBASE_COMMERCE" } },
      { currentPeriodEnd: { gt: expect.any(Date) } },
    ]);
  });

  it("resolves to the row's tier when the query returns one (DB enforces the gate)", async () => {
    mocks.findFirst.mockResolvedValue({ tier: "ELITE" });
    expect((await getUserEntitlements("u2")).tier).toBe("ELITE");
  });

  it("resolves FREE when the gated query matches nothing (expired crypto pass)", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await getUserEntitlements("u3")).tier).toBe("FREE");
  });
});
