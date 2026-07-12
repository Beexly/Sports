import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Behavioral tests for the Stripe entitlement reconciliation backstop — the
 * self-healing path that repairs subscription entitlement when the primary
 * webhook writer misses or fails.
 *
 * Covers, per the contract:
 *   - Missed upgrade  → GRANT (Stripe active-paid, DB FREE ⇒ tier PRO)
 *   - Stale paid      → DOWNGRADE (DB PRO, Stripe canceled/absent ⇒ tier FREE)
 *   - Idempotent      → no writes when already in sync
 *   - Fail-safe       → a list() throw revokes NOTHING and reports the error
 *   - Cron auth       → 401 without the secret, runs with it
 *
 * The Stripe SDK and the db client are mocked; the REAL reconcile function and
 * the REAL cron route handler are exercised end-to-end.
 */

const mocks = vi.hoisted(() => ({
  subscriptionsList: vi.fn<(args: unknown) => Promise<{ data: unknown[]; has_more: boolean }>>(),
  subscriptionsRetrieve: vi.fn<(id: string) => Promise<{ status: string }>>(),
  findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  upsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  update: vi.fn<(args: unknown) => Promise<unknown>>(),
  updateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      list: mocks.subscriptionsList,
      retrieve: mocks.subscriptionsRetrieve,
    },
  },
}));

vi.mock("@sports/db", () => ({
  db: {
    subscription: {
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      upsert: mocks.upsert,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
  },
}));

import { reconcileEntitlements } from "@/lib/billing/reconcile-entitlements";
import { GET as reconcileCron } from "@/app/api/cron/reconcile-entitlements/route";

const PRO_PRICE = "price_pro_test";
const ELITE_PRICE = "price_elite_test";

function stripeSub(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    items: { data: [{ price: { id: PRO_PRICE } }] },
    current_period_start: 1760000000,
    current_period_end: 1762600000,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    metadata: { userId: "user_1" },
    ...overrides,
  };
}

/** Make list() answer only for the given status; every other status is empty. */
function listOnly(status: string, data: unknown[]): void {
  mocks.subscriptionsList.mockImplementation(async (args: unknown) => {
    const params = args as { status?: string };
    return params.status === status ? { data, has_more: false } : { data: [], has_more: false };
  });
}

beforeEach(() => {
  mocks.subscriptionsList.mockReset();
  mocks.subscriptionsRetrieve.mockReset();
  mocks.findUnique.mockReset();
  mocks.findMany.mockReset();
  mocks.upsert.mockReset();
  mocks.update.mockReset();
  mocks.updateMany.mockReset();

  process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_PRICE;
  process.env["STRIPE_ELITE_MONTHLY_PRICE_ID"] = ELITE_PRICE;
  process.env["CRON_SECRET"] = "test-cron-secret";

  // Defaults: no Stripe subs, no DB rows, writes succeed.
  mocks.subscriptionsList.mockResolvedValue({ data: [], has_more: false });
  mocks.subscriptionsRetrieve.mockResolvedValue({ status: "canceled" });
  mocks.findUnique.mockResolvedValue(null);
  mocks.findMany.mockResolvedValue([]);
  mocks.upsert.mockResolvedValue({ id: "s_1" });
  mocks.update.mockResolvedValue({ id: "s_1" });
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("reconcileEntitlements — GRANT (missed/failed webhook recovery)", () => {
  it("grants PRO when Stripe reports an active Pro sub but the DB user is FREE", async () => {
    listOnly("active", [stripeSub()]);
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(1);
    expect(summary.downgraded).toBe(0);
    expect(summary.errors).toBe(0);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeCustomerId: "cus_1" },
        create: expect.objectContaining({ userId: "user_1", stripeCustomerId: "cus_1", tier: "PRO" }),
        update: expect.objectContaining({
          tier: "PRO",
          status: "ACTIVE",
          stripeSubscriptionId: "sub_1",
          stripePriceId: PRO_PRICE,
        }),
      }),
    );
    // A grant must NEVER be a revoke.
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("derives the tier from the price id map (ELITE), never a hardcoded value", async () => {
    listOnly("active", [stripeSub({ items: { data: [{ price: { id: ELITE_PRICE } }] } })]);
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(1);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ tier: "ELITE" }) }),
    );
  });

  it("resolves the user from metadata when no DB row exists yet, across paginated pages", async () => {
    mocks.subscriptionsList.mockImplementation(async (args: unknown) => {
      const params = args as { status?: string; starting_after?: string };
      if (params.status !== "active") return { data: [], has_more: false };
      if (!params.starting_after) {
        return {
          data: [stripeSub({ id: "sub_a", customer: "cus_a", metadata: { userId: "user_a" } })],
          has_more: true,
        };
      }
      return {
        data: [stripeSub({ id: "sub_b", customer: "cus_b", metadata: { userId: "user_b" } })],
        has_more: false,
      };
    });
    mocks.findUnique.mockResolvedValue(null); // no existing rows → metadata userId used

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(2);
    expect(mocks.subscriptionsList).toHaveBeenCalledWith(
      expect.objectContaining({ starting_after: "sub_a" }),
    );
  });

  it("never grants when an active Stripe sub has an unmapped price (grandfathering landmine)", async () => {
    listOnly("active", [stripeSub({ items: { data: [{ price: { id: "price_unconfigured" } }] } })]);
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(0);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("reconcileEntitlements — DOWNGRADE (stale paid rows, positively confirmed)", () => {
  it("downgrades to FREE when the DB shows PRO but Stripe reports the sub canceled", async () => {
    // No active subs anywhere → the confirmed set is empty but reliable.
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "PRO" },
    ]);
    mocks.subscriptionsRetrieve.mockResolvedValue({ status: "canceled" });

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(1);
    expect(summary.granted).toBe(0);
    expect(summary.errors).toBe(0);
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_2");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "row_1" },
        data: expect.objectContaining({ tier: "FREE", status: "CANCELED" }),
      }),
    );
  });

  it("downgrades when Stripe reports the subscription absent (resource_missing)", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "ELITE" },
    ]);
    mocks.subscriptionsRetrieve.mockRejectedValue(
      Object.assign(new Error("No such subscription: sub_2"), {
        code: "resource_missing",
        statusCode: 404,
      }),
    );

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(1);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tier: "FREE" }) }),
    );
  });

  it("does NOT downgrade when the retrieve shows the sub is still active (list just missed it)", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "PRO" },
    ]);
    mocks.subscriptionsRetrieve.mockResolvedValue({ status: "active" });

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(0);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("FAIL-SAFE: a transient retrieve error revokes nothing and reports the error", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "PRO" },
    ]);
    mocks.subscriptionsRetrieve.mockRejectedValue(new Error("503 Service Unavailable"));

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(0);
    expect(summary.errors).toBeGreaterThan(0);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("FAIL-SAFE: never revokes a paid row that has no stripeSubscriptionId to confirm", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: null, tier: "PRO" },
    ]);

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(0);
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("reconcileEntitlements — IDEMPOTENT", () => {
  it("writes nothing when the DB already matches Stripe", async () => {
    listOnly("active", [stripeSub()]);
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "PRO",
      status: "ACTIVE",
      stripeSubscriptionId: "sub_1",
    });
    // The same customer's paid row is in the confirmed active set → not a downgrade.
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", tier: "PRO" },
    ]);

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(0);
    expect(summary.downgraded).toBe(0);
    expect(summary.errors).toBe(0);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});

describe("reconcileEntitlements — FAIL-SAFE on Stripe list failure", () => {
  it("revokes NOTHING, skips the downgrade phase entirely, and reports the error", async () => {
    mocks.subscriptionsList.mockRejectedValue(new Error("stripe.subscriptions.list unavailable"));
    // If the downgrade phase were (wrongly) reached, this row would be a revoke candidate.
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "PRO" },
    ]);

    const summary = await reconcileEntitlements();

    expect(summary.listReliable).toBe(false);
    expect(summary.granted).toBe(0);
    expect(summary.downgraded).toBe(0);
    expect(summary.errors).toBeGreaterThan(0);
    // The core guarantee: no downgrade write, and the downgrade phase never even ran.
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/reconcile-entitlements — auth", () => {
  function cronRequest(authorization?: string): Request {
    const headers: Record<string, string> = {};
    if (authorization) headers["authorization"] = authorization;
    return new Request("http://localhost/api/cron/reconcile-entitlements", { headers });
  }

  it("rejects a request with no Authorization header (401) and does not reconcile", async () => {
    const res = await reconcileCron(cronRequest(undefined));
    expect(res.status).toBe(401);
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer secret (401) and does not reconcile", async () => {
    const res = await reconcileCron(cronRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env["CRON_SECRET"];
    const res = await reconcileCron(cronRequest("Bearer anything"));
    expect(res.status).toBe(500);
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
  });

  it("runs the real reconciliation with the correct secret", async () => {
    const res = await reconcileCron(cronRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toMatchObject({ checked: 0, granted: 0, downgraded: 0, errors: 0, listReliable: true });
    // Proof the REAL reconcile function ran end-to-end (it pulled Stripe state).
    expect(mocks.subscriptionsList).toHaveBeenCalled();
  });
});
