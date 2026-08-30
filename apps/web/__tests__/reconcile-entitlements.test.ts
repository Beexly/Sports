import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const mocks = vi.hoisted(() => {
  /** Local mirror of DurableWriteStoreUnavailableError — passed through the @sports/db
   *  mock so the cron route's `instanceof` check sees the SAME constructor tests use. */
  class DurableWriteStoreUnavailableError extends Error {
    readonly kind = "durable_write_store_unavailable" as const;
    readonly httpStatus = 503 as const;
    readonly capability: string;
    readonly reason: string;
    constructor(capability: string, reason: string, detail: string) {
      super(`Durable write store unavailable for capability "${capability}": ${detail}`);
      this.name = "DurableWriteStoreUnavailableError";
      this.capability = capability;
      this.reason = reason;
    }
  }
  return {
    subscriptionsList: vi.fn<(args: unknown) => Promise<{ data: unknown[]; has_more: boolean }>>(),
    subscriptionsRetrieve: vi.fn<(id: string) => Promise<{ status: string }>>(),
    findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
    findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
    upsert: vi.fn<(args: unknown) => Promise<unknown>>(),
    update: vi.fn<(args: unknown) => Promise<unknown>>(),
    updateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
    requireDurableWriteStore: vi.fn<(capability: string) => void>(),
    DurableWriteStoreUnavailableError,
  };
});

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
  requireDurableWriteStore: mocks.requireDurableWriteStore,
  DurableWriteStoreUnavailableError: mocks.DurableWriteStoreUnavailableError,
}));

import { reconcileEntitlements, reconcileUserEntitlement } from "@/lib/billing/reconcile-entitlements";
import { GET as reconcileCron } from "@/app/api/cron/reconcile-entitlements/route";

const PRO_PRICE = "price_pro_test";
const ELITE_PRICE = "price_elite_test";
const FANTASY_PRICE = "price_fantasy_test";

function stripeSub(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    items: { data: [{ price: { id: PRO_PRICE } }] },
    created: 1759900000,
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
  mocks.requireDurableWriteStore.mockReset();
  mocks.requireDurableWriteStore.mockReturnValue(undefined); // available by default

  process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_PRICE;
  process.env["STRIPE_ELITE_MONTHLY_PRICE_ID"] = ELITE_PRICE;
  process.env["STRIPE_FANTASY_MONTHLY_PRICE_ID"] = FANTASY_PRICE;
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

afterEach(() => {
  vi.useRealTimers();
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
    // FINDING 3: the revoke is a GUARDED updateMany, not an unconditional update.
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "row_1",
          stripeSubscriptionId: "sub_2",
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        }),
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
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tier: "FREE" }) }),
    );
  });

  it("FINDING 1: downgrades a paid row when Stripe positively reports 'unpaid' (confirmed non-access)", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "PRO" },
    ]);
    mocks.subscriptionsRetrieve.mockResolvedValue({ status: "unpaid" });

    const summary = await reconcileEntitlements();

    // A paid ACTIVE row backed by an 'unpaid' Stripe sub must NOT keep access forever.
    expect(summary.downgraded).toBe(1);
    expect(summary.errors).toBe(0);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "row_1", stripeSubscriptionId: "sub_2" }),
        data: expect.objectContaining({ tier: "FREE", status: "CANCELED" }),
      }),
    );
  });

  it("FINDING 1: downgrades a paid row when Stripe positively reports 'paused'", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "ELITE" },
    ]);
    mocks.subscriptionsRetrieve.mockResolvedValue({ status: "paused" });

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(1);
    expect(summary.errors).toBe(0);
    expect(mocks.updateMany).toHaveBeenCalledWith(
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
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("FAIL-SAFE (FINDING 1): a transient retrieve error revokes nothing and reports the error", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "PRO" },
    ]);
    // A NON-terminal Stripe API error (503) — the fail-safe applies to errors ONLY.
    mocks.subscriptionsRetrieve.mockRejectedValue(new Error("503 Service Unavailable"));

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(0);
    expect(summary.errors).toBeGreaterThan(0);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("FINDING 3: a concurrent resubscribe (updateMany WHERE count 0) is NOT clobbered", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: "sub_2", tier: "PRO" },
    ]);
    // Stripe confirms the OLD sub is dead...
    mocks.subscriptionsRetrieve.mockResolvedValue({ status: "canceled" });
    // ...but between the read and the write, a resubscribe repointed the row to a NEW
    // active sub, so the guarded WHERE (id + old sub id + paid status) matches nothing.
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const summary = await reconcileEntitlements();

    // The fresh paid row is preserved — no revoke counted, no error.
    expect(summary.downgraded).toBe(0);
    expect(summary.errors).toBe(0);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "row_1",
          stripeSubscriptionId: "sub_2",
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        }),
      }),
    );
  });

  it("FAIL-SAFE: never revokes a paid row that has no stripeSubscriptionId to confirm", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "row_1", stripeCustomerId: "cus_2", stripeSubscriptionId: null, tier: "PRO" },
    ]);

    const summary = await reconcileEntitlements();

    expect(summary.downgraded).toBe(0);
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});

describe("reconcileEntitlements — FINDING 2 past-due grace anchor", () => {
  it("stamps the Stripe-derived anchor (period start), never the current reconcile time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z")); // "now" — weeks after the failure
    const anchorUnix = 1748736000; // 2025-06-01: the current period start / first failure

    listOnly("past_due", [
      stripeSub({ status: "past_due", current_period_start: anchorUnix }),
    ]);
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(1);
    // The backfill stamps the REAL anchor where absent — not now().
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pastDueSince: null }),
        data: { pastDueSince: new Date(anchorUnix * 1000) },
      }),
    );
    const backfill = mocks.updateMany.mock.calls.find(
      ([arg]) => (arg as { where?: { pastDueSince?: unknown } }).where?.pastDueSince === null,
    );
    const stamped = (backfill?.[0] as { data: { pastDueSince: Date } }).data.pastDueSince;
    expect(stamped.getTime()).toBe(anchorUnix * 1000);
    expect(stamped.getTime()).not.toBe(Date.now()); // categorically not the reconcile time
  });

  it("FAILS CLOSED (epoch anchor, not now) when the true anchor can't be reconstructed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));

    listOnly("past_due", [
      stripeSub({ status: "past_due", current_period_start: null }),
    ]);
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(1);
    // No fresh grace window: epoch is older than any grace cutoff ⇒ access resolves FREE.
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pastDueSince: null }),
        data: { pastDueSince: new Date(0) },
      }),
    );
  });
});

describe("reconcileEntitlements — FINDING 4 one canonical subscription per customer", () => {
  it("grants the highest tier (active PRO + past_due FANTASY ⇒ PRO), one upsert only", async () => {
    mocks.subscriptionsList.mockImplementation(async (args: unknown) => {
      const { status } = args as { status?: string };
      if (status === "active") {
        return {
          data: [
            stripeSub({
              id: "sub_pro",
              customer: "cus_1",
              status: "active",
              items: { data: [{ price: { id: PRO_PRICE } }] },
            }),
          ],
          has_more: false,
        };
      }
      if (status === "past_due") {
        return {
          data: [
            stripeSub({
              id: "sub_fan",
              customer: "cus_1",
              status: "past_due",
              items: { data: [{ price: { id: FANTASY_PRICE } }] },
            }),
          ],
          has_more: false,
        };
      }
      return { data: [], has_more: false };
    });
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(1);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ tier: "PRO", stripeSubscriptionId: "sub_pro" }),
      }),
    );
  });

  it("higher tier wins even as the LATER-processed past_due sub (active FANTASY + past_due PRO ⇒ PRO)", async () => {
    mocks.subscriptionsList.mockImplementation(async (args: unknown) => {
      const { status } = args as { status?: string };
      if (status === "active") {
        return {
          data: [
            stripeSub({
              id: "sub_fan",
              customer: "cus_1",
              status: "active",
              items: { data: [{ price: { id: FANTASY_PRICE } }] },
            }),
          ],
          has_more: false,
        };
      }
      if (status === "past_due") {
        return {
          data: [
            stripeSub({
              id: "sub_pro",
              customer: "cus_1",
              status: "past_due",
              items: { data: [{ price: { id: PRO_PRICE } }] },
            }),
          ],
          has_more: false,
        };
      }
      return { data: [], has_more: false };
    });
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(1);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          tier: "PRO",
          status: "PAST_DUE",
          stripeSubscriptionId: "sub_pro",
        }),
      }),
    );
  });

  it("breaks a same-tier tie by newest subscription (created)", async () => {
    listOnly("active", [
      stripeSub({ id: "sub_old", customer: "cus_1", created: 1000, items: { data: [{ price: { id: PRO_PRICE } }] } }),
      stripeSub({ id: "sub_new", customer: "cus_1", created: 2000, items: { data: [{ price: { id: PRO_PRICE } }] } }),
    ]);
    mocks.findUnique.mockResolvedValue({
      userId: "user_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    const summary = await reconcileEntitlements();

    expect(summary.granted).toBe(1);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ stripeSubscriptionId: "sub_new" }),
      }),
    );
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

/**
 * reconcileUserEntitlement — the ON-DEMAND, single-user post-checkout grant
 * (dashboard/page.tsx `?upgraded=true`). It is the instant-access backstop when
 * the webhook is slow or 500s. Its contract (per the module doc): confirm-or-
 * GRANT only — it NEVER revokes (the success page must never strand a buyer) and
 * NEVER throws (a Stripe hiccup must not break the dashboard render). The whole
 * function was previously unexercised; these pin every branch of that contract.
 */
describe("reconcileUserEntitlement — post-checkout single-user grant", () => {
  it("grants the paid tier when Stripe reports an active paid sub but the DB row is FREE", async () => {
    mocks.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });
    mocks.subscriptionsList.mockResolvedValue({ data: [stripeSub()], has_more: false });

    await reconcileUserEntitlement("user_1");

    // Queried Stripe for THIS customer only (all statuses), then granted PRO.
    expect(mocks.subscriptionsList).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1", status: "all" }),
    );
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeCustomerId: "cus_1" },
        update: expect.objectContaining({
          tier: "PRO",
          status: "ACTIVE",
          stripeSubscriptionId: "sub_1",
          stripePriceId: PRO_PRICE,
        }),
      }),
    );
    // A grant is NEVER a revoke.
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does nothing (no Stripe call, no write) when the user has no Stripe customer yet", async () => {
    mocks.findUnique.mockResolvedValue({
      stripeCustomerId: null,
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });

    await reconcileUserEntitlement("user_1");

    // Nothing has been paid for → never touch Stripe or the DB.
    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("NEVER revokes: a paid DB row whose Stripe subs are all non-granting is left untouched", async () => {
    // The buyer's landing page must never strand them — even if Stripe currently
    // shows only a canceled sub, reconcileUserEntitlement grants-or-nothing.
    mocks.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_1",
      tier: "PRO",
      status: "ACTIVE",
      stripeSubscriptionId: "sub_old",
    });
    mocks.subscriptionsList.mockResolvedValue({
      data: [stripeSub({ status: "canceled" })],
      has_more: false,
    });

    await reconcileUserEntitlement("user_1");

    // No paid LIVE sub to confirm → no grant, and categorically no downgrade.
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent: no write when the DB row already matches the live Stripe sub", async () => {
    mocks.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_1",
      tier: "PRO",
      status: "ACTIVE",
      stripeSubscriptionId: "sub_1",
    });
    mocks.subscriptionsList.mockResolvedValue({ data: [stripeSub()], has_more: false });

    await reconcileUserEntitlement("user_1");

    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("grants the highest tier when the customer holds several live paid subs (canonical selection)", async () => {
    mocks.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });
    mocks.subscriptionsList.mockResolvedValue({
      data: [
        stripeSub({ id: "sub_fan", status: "active", items: { data: [{ price: { id: FANTASY_PRICE } }] } }),
        stripeSub({ id: "sub_elite", status: "active", items: { data: [{ price: { id: ELITE_PRICE } }] } }),
      ],
      has_more: false,
    });

    await reconcileUserEntitlement("user_1");

    // ELITE outranks FANTASY regardless of list order — one grant, the best tier.
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ tier: "ELITE", stripeSubscriptionId: "sub_elite" }),
      }),
    );
  });

  it("never grants on an unmapped price id (grandfathering landmine), and never throws", async () => {
    mocks.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });
    mocks.subscriptionsList.mockResolvedValue({
      data: [stripeSub({ items: { data: [{ price: { id: "price_unmapped" } }] } })],
      has_more: false,
    });

    await expect(reconcileUserEntitlement("user_1")).resolves.toBeUndefined();

    // An unmapped price resolves to FREE → filtered out of the paid-live set → no grant.
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("fail-safe: swallows a Stripe error (never throws, never writes) so the dashboard still renders", async () => {
    mocks.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_1",
      tier: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
    });
    mocks.subscriptionsList.mockRejectedValue(new Error("stripe.subscriptions.list unavailable"));

    await expect(reconcileUserEntitlement("user_1")).resolves.toBeUndefined();

    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
