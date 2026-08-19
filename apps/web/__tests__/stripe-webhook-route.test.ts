import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

/**
 * Behavioral tests for the Stripe webhook handler — the critical path
 * that keeps subscription tier/status in the DB aligned with Stripe.
 *
 * Covers: signature verification, idempotency, every handled event
 * type, price→tier mapping, Stripe→DB status mapping, the
 * userId-metadata upsert path, and the legacy updateMany fallback.
 */

const mocks = vi.hoisted(() => ({
  // vi.mock factories are hoisted above imports, so the error class used by
  // the @sports/db mock must be minted inside vi.hoisted as well.
  DurableWriteStoreUnavailableError: class extends Error {
    readonly kind = "durable_write_store_unavailable" as const;
    readonly httpStatus = 503 as const;
  },
  // Hoisted so the test and the mocked @/lib/stripe module share the SAME
  // class instance — the route uses `instanceof StripeConfigError`.
  StripeConfigError: class extends Error {
    readonly name = "StripeConfigError" as const;
    constructor(public readonly capability: string) {
      super(
        `Stripe is not configured for "${capability}" (STRIPE_SECRET_KEY is missing or blank)`,
      );
    }
  },
  constructEvent: vi.fn<(body: string, sig: string, secret: string) => Stripe.Event>(),
  subscriptionsRetrieve: vi.fn<(id: string) => Promise<unknown>>(),
  invoicesRetrieve: vi.fn<(id: string) => Promise<unknown>>(),
  webhookEventFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  webhookEventCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  subscriptionUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  subscriptionUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  subscriptionFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  checkoutAttemptUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  requireDurableWriteStore: vi.fn<(capability: string) => void>(),
  // getStripe is the explicit client-acquisition entry point used by the webhook
  // route to fail-closed on a missing STRIPE_SECRET_KEY before signature verification.
  getStripe: vi.fn<() => Stripe>(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    invoices: { retrieve: mocks.invoicesRetrieve },
  },
  getStripe: mocks.getStripe,
  StripeConfigError: mocks.StripeConfigError,
  __esModule: true,
}));

vi.mock("@sports/db", () => ({
  requireDurableWriteStore: mocks.requireDurableWriteStore,
  DurableWriteStoreUnavailableError: mocks.DurableWriteStoreUnavailableError,
  db: {
    // $transaction([...]) executes the array of prisma promises atomically in prod;
    // the mock just awaits them so the underlying updateMany calls are recorded.
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    webhookEvent: {
      findUnique: mocks.webhookEventFindUnique,
      create: mocks.webhookEventCreate,
    },
    subscription: {
      upsert: mocks.subscriptionUpsert,
      updateMany: mocks.subscriptionUpdateMany,
      findUnique: mocks.subscriptionFindUnique,
    },
    checkoutAttempt: {
      updateMany: mocks.checkoutAttemptUpdateMany,
    },
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

const PRO_MONTHLY = "price_pro_monthly_test";
const ELITE_ANNUAL = "price_elite_annual_test";

function webhookRequest(body = "{}", signature: string | null = "sig_valid"): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("stripe-signature", signature);
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  });
}

function stripeEvent(type: string, object: Record<string, unknown>, id = "evt_test_1"): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

function stripeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    items: { data: [{ price: { id: PRO_MONTHLY } }] },
    current_period_start: 1760000000,
    current_period_end: 1762600000,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    metadata: { userId: "user_1" },
    ...overrides,
  };
}

/**
 * Arm a subscription lifecycle event AND the fresh re-retrieve the handler
 * performs on it (M-F5: embedded snapshots are never synced directly).
 * `retrieved` defaults to the embedded snapshot; pass a different object to
 * simulate a stale event whose current Stripe state has moved on.
 */
function armSubscriptionEvent(
  type: "customer.subscription.created" | "customer.subscription.updated",
  sub: Record<string, unknown>,
  id = "evt_test_1",
  retrieved: Record<string, unknown> = sub,
): void {
  mocks.constructEvent.mockReturnValue(stripeEvent(type, sub, id));
  mocks.subscriptionsRetrieve.mockResolvedValue(retrieved);
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    mocks.constructEvent.mockReset();
    mocks.subscriptionsRetrieve.mockReset();
    mocks.invoicesRetrieve.mockReset();
    mocks.webhookEventFindUnique.mockReset();
    mocks.webhookEventCreate.mockReset();
    mocks.subscriptionUpsert.mockReset();
    mocks.subscriptionUpdateMany.mockReset();
    mocks.subscriptionFindUnique.mockReset();
    mocks.checkoutAttemptUpdateMany.mockReset();
    mocks.requireDurableWriteStore.mockReset();
    mocks.requireDurableWriteStore.mockReturnValue(undefined);
    mocks.getStripe.mockReset();

    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_MONTHLY;
    process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"] = ELITE_ANNUAL;
    // Refund revocation flag: DEFAULT OFF — each test opts in explicitly.
    delete process.env["REFUND_REVOKES_ACCESS"];

    // Default: getStripe returns a client whose webhooks/subscriptions are wired
    // to the same mock fns the existing tests assert against.
    const stripeClient = {
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    };
    mocks.getStripe.mockReturnValue(stripeClient as unknown as Stripe);

    // Default: event not yet processed, no prior subscription row, writes succeed
    mocks.webhookEventFindUnique.mockResolvedValue(null);
    mocks.webhookEventCreate.mockResolvedValue({ id: "wh_1" });
    mocks.subscriptionUpsert.mockResolvedValue({ id: "s_1" });
    mocks.subscriptionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    mocks.checkoutAttemptUpdateMany.mockResolvedValue({ count: 1 });
  });

  describe("out-of-order delivery", () => {
    it("does NOT reactivate a subscription already cancelled-by-delete (same id)", async () => {
      // Our DB already recorded the terminal delete for sub_123.
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "CANCELED",
        canceledAt: new Date(),
        stripeSubscriptionId: "sub_123",
      });
      // A delayed updated event arrives with an OLD active snapshot of the SAME sub.
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "active" }), "evt_late");

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      // The reactivation must be skipped — no write that re-grants premium.
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    });

    it("still syncs a genuinely NEW subscription id for a previously-cancelled customer", async () => {
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "CANCELED",
        canceledAt: new Date(),
        stripeSubscriptionId: "sub_OLD",
      });
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ id: "sub_NEW", status: "active" }), "evt_resub");

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionUpsert).toHaveBeenCalled(); // resubscribe is not blocked
    });

    it("full chain: deleted → late payment_failed → stale ACTIVE updated leaves the member FREE (never resurrected)", async () => {
      // This is the launch-blocker (B5). A stateful in-memory row lets the three
      // deliveries compose exactly as they would in production, so the assertion
      // is on the FINAL persisted state, not a single call shape. On main this
      // ends at tier PRO (access without payment); the fix keeps it FREE.
      type Row = {
        status: string;
        tier: string;
        canceledAt: Date | null;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        pastDueSince: Date | null;
      };
      const asArgs = (a: unknown) =>
        a as { where?: Record<string, unknown>; data?: Record<string, unknown>; update?: Record<string, unknown> };

      let row: Row = {
        status: "ACTIVE",
        tier: "ELITE",
        canceledAt: null,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        pastDueSince: null,
      };

      mocks.subscriptionFindUnique.mockImplementation(async () => ({ ...row }));
      // Model Prisma updateMany's WHERE — including the terminal-CANCELED guard —
      // so a write only lands when the row actually matches.
      mocks.subscriptionUpdateMany.mockImplementation(async (argsUnknown) => {
        const { where = {}, data = {} } = asArgs(argsUnknown);
        const okSub =
          where["stripeSubscriptionId"] === undefined || where["stripeSubscriptionId"] === row.stripeSubscriptionId;
        const okCust =
          where["stripeCustomerId"] === undefined || where["stripeCustomerId"] === row.stripeCustomerId;
        const statusNot = (where["status"] as { not?: string } | undefined)?.not;
        const okStatus = statusNot === undefined || row.status !== statusNot;
        const okPastDue =
          where["pastDueSince"] === undefined ? true : where["pastDueSince"] === null ? row.pastDueSince === null : true;
        if (okSub && okCust && okStatus && okPastDue) {
          row = { ...row, ...(data as Partial<Row>) };
          return { count: 1 };
        }
        return { count: 0 };
      });
      mocks.subscriptionUpsert.mockImplementation(async (argsUnknown) => {
        const { update = {} } = asArgs(argsUnknown);
        row = { ...row, ...(update as Partial<Row>) };
        return { ...row };
      });

      // 1) customer.subscription.deleted → terminal CANCELED / FREE.
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.deleted", stripeSubscription(), "evt_chain_del"),
      );
      expect((await POST(webhookRequest())).status).toBe(200);
      expect(row.status).toBe("CANCELED");
      expect(row.tier).toBe("FREE");

      // 2) A LATE invoice.payment_failed for the now-dead sub. The terminal-CANCELED
      //    guard must stop it flipping CANCELED → PAST_DUE (which would defeat the
      //    resurrection guard downstream).
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: "sub_123" }, "evt_chain_pf"),
      );
      expect((await POST(webhookRequest())).status).toBe(200);
      expect(row.status).toBe("CANCELED"); // NOT PAST_DUE
      expect(row.tier).toBe("FREE");

      // 3) A DELAYED customer.subscription.updated carrying a stale ACTIVE snapshot.
      //    Even in the worst case where the fresh retrieve still returns ACTIVE, the
      //    same-id resurrection guard blocks the write.
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription({ status: "active" }), "evt_chain_stale"),
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription({ status: "active" }));
      expect((await POST(webhookRequest())).status).toBe(200);

      // FINAL persisted state: still FREE / CANCELED. Access was never re-granted,
      // and no upsert ever wrote a paid tier over the terminal row.
      expect(row.status).toBe("CANCELED");
      expect(row.tier).toBe("FREE");
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });

    it("ignores a late event for a SUPERSEDED subscription — sub_OLD noise cannot revoke sub_NEW (Codex P1)", async () => {
      // The member cancelled sub_OLD and resubscribed as sub_NEW (row is active).
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "ACTIVE",
        canceledAt: null,
        stripeSubscriptionId: "sub_NEW",
        tier: "ELITE",
      });
      // A delayed `updated` for sub_OLD arrives; Stripe's current state for it
      // is canceled. Syncing it would overwrite the sub_NEW row as CANCELED.
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ id: "sub_OLD", status: "canceled" }),
        "evt_superseded",
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    });

    it("a delayed PAST_DUE `updated` for a SUPERSEDED sub_OLD cannot adopt the paying sub_NEW row, and the later sub_OLD cancel cannot revoke it (Codex P2)", async () => {
      // Regression for the PAST_DUE hole in the superseded guard. PAST_DUE is
      // access-granting, so on main a delayed `updated` for the dead sub_OLD
      // (current Stripe state past_due) slipped through, overwrote the row back
      // onto sub_OLD, and stamped a grace window — then sub_OLD's later cancel
      // revoked the PAYING sub_NEW. A stateful in-memory row composes both
      // deliveries exactly as production would.
      type Row = {
        status: string;
        tier: string;
        canceledAt: Date | null;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        pastDueSince: Date | null;
      };
      const asArgs = (a: unknown) =>
        a as { where?: Record<string, unknown>; data?: Record<string, unknown>; update?: Record<string, unknown> };

      // The member resubscribed: the row now tracks sub_NEW, active + paying (PRO).
      let row: Row = {
        status: "ACTIVE",
        tier: "PRO",
        canceledAt: null,
        stripeSubscriptionId: "sub_NEW",
        stripeCustomerId: "cus_123",
        pastDueSince: null,
      };

      mocks.subscriptionFindUnique.mockImplementation(async () => ({ ...row }));
      // Model Prisma updateMany's WHERE so a write only lands when the row matches.
      mocks.subscriptionUpdateMany.mockImplementation(async (argsUnknown) => {
        const { where = {}, data = {} } = asArgs(argsUnknown);
        const okSub =
          where["stripeSubscriptionId"] === undefined || where["stripeSubscriptionId"] === row.stripeSubscriptionId;
        const okCust =
          where["stripeCustomerId"] === undefined || where["stripeCustomerId"] === row.stripeCustomerId;
        const statusNot = (where["status"] as { not?: string } | undefined)?.not;
        const okStatus = statusNot === undefined || row.status !== statusNot;
        const okPastDue =
          where["pastDueSince"] === undefined ? true : where["pastDueSince"] === null ? row.pastDueSince === null : true;
        if (okSub && okCust && okStatus && okPastDue) {
          row = { ...row, ...(data as Partial<Row>) };
          return { count: 1 };
        }
        return { count: 0 };
      });
      mocks.subscriptionUpsert.mockImplementation(async (argsUnknown) => {
        const { update = {} } = asArgs(argsUnknown);
        row = { ...row, ...(update as Partial<Row>) };
        return { ...row };
      });

      // 1) A DELAYED customer.subscription.updated for the superseded sub_OLD whose
      //    authoritative (re-retrieved) Stripe state is past_due.
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ id: "sub_OLD", status: "past_due" }),
        "evt_superseded_pastdue",
      );
      expect((await POST(webhookRequest())).status).toBe(200);

      // The guard skips it: the paying row is UNCHANGED — still sub_NEW / PRO /
      // ACTIVE — and NO grace window was stamped on it.
      expect(row.stripeSubscriptionId).toBe("sub_NEW");
      expect(row.tier).toBe("PRO");
      expect(row.status).toBe("ACTIVE");
      expect(row.pastDueSince).toBeNull();
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();

      // 2) sub_OLD is finally cancelled in Stripe → customer.subscription.deleted.
      //    The delete matches BY subscription id; the row tracks sub_NEW, so it
      //    matches nothing — the paying member is never revoked.
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.deleted", stripeSubscription({ id: "sub_OLD" }), "evt_superseded_del"),
      );
      expect((await POST(webhookRequest())).status).toBe(200);

      // FINAL persisted state: still PRO / sub_NEW / ACTIVE. Access preserved.
      expect(row.stripeSubscriptionId).toBe("sub_NEW");
      expect(row.tier).toBe("PRO");
      expect(row.status).toBe("ACTIVE");
    });

    it("adopts a genuinely NEW active subscription id over a cancelled row (legit resubscribe still works)", async () => {
      // The row is the terminal state of a prior cancellation (CANCELED / FREE),
      // tracking sub_OLD. A real resubscribe brings a NEW id whose authoritative
      // status is active — this MUST be adopted (the tightened guard only skips
      // NON-active different-id events, never a genuinely current one).
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "CANCELED",
        canceledAt: new Date("2026-06-01T00:00:00Z"),
        stripeSubscriptionId: "sub_OLD",
        tier: "FREE",
      });
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ id: "sub_NEW", status: "active" }),
        "evt_adopt",
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      // The row adopts sub_NEW at the paid tier — access restored for a paying resub.
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            stripeSubscriptionId: "sub_NEW",
            tier: "PRO",
            status: "ACTIVE",
          }),
        }),
      );
    });

    it("a late same-id canceled update CONVERGES on the delete handler's terminal state (Codex P2)", async () => {
      const stampedAt = new Date("2026-07-01T00:00:00Z");
      // The delete handler already recorded the terminal state.
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "CANCELED",
        canceledAt: stampedAt,
        stripeSubscriptionId: "sub_123",
        tier: "FREE",
      });
      // A delayed `updated` for the SAME id retrieves the canceled object,
      // which still carries the old paid price.
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ status: "canceled" }),
        "evt_late_cancel",
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      // Terminal record preserved: FREE tier, original cancellation stamp —
      // never a paid-tier canceled row with canceledAt wiped to null.
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            tier: "FREE",
            status: "CANCELED",
            canceledAt: stampedAt,
          }),
        }),
      );
    });

    it("an immediate cancel arriving via `updated` stamps canceledAt and drops to FREE", async () => {
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "ACTIVE",
        canceledAt: null,
        stripeSubscriptionId: "sub_123",
        tier: "PRO",
      });
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ status: "canceled" }),
        "evt_immediate_cancel",
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            tier: "FREE",
            status: "CANCELED",
            canceledAt: expect.any(Date),
          }),
        }),
      );
    });

    it("syncs the RETRIEVED current state, never the embedded snapshot (stale event cannot regress tier)", async () => {
      // A delayed `updated` event carries the OLD state: PRO + past_due.
      // Stripe's CURRENT state (the member upgraded and recovered): ELITE + active.
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ status: "past_due" }), // embedded stale snapshot (PRO price)
        "evt_stale",
        stripeSubscription({
          status: "active",
          items: { data: [{ price: { id: ELITE_ANNUAL } }] },
        }),
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      // The write reflects CURRENT Stripe state — the stale snapshot's
      // PRO/PAST_DUE regression never reaches the DB.
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ tier: "ELITE", status: "ACTIVE" }),
        }),
      );
    });

    it("fails closed (500, event unrecorded) when the fresh retrieve fails — Stripe retries", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription(), "evt_retrieve_down"),
      );
      mocks.subscriptionsRetrieve.mockRejectedValue(new Error("stripe api unreachable"));

      const res = await POST(webhookRequest());

      expect(res.status).toBe(500);
      // Not recorded as processed — the retry must not be idempotency-skipped.
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });
  });

  describe("signature verification", () => {
    it("returns 503 (not 400) when STRIPE_SECRET_KEY is missing, naming the correct env var", async () => {
      // Unset STRIPE_SECRET_KEY and make getStripe throw StripeConfigError.
      // The route must catch this OUTSIDE the signature try/catch and return 503
      // with a log naming STRIPE_SECRET_KEY — not misreport it as a 400
      // "Invalid signature" error pointing at STRIPE_WEBHOOK_SECRET.
      const savedKey = process.env["STRIPE_SECRET_KEY"];
      delete process.env["STRIPE_SECRET_KEY"];
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      // Use the hoisted class so the route's `instanceof StripeConfigError` matches.
      mocks.getStripe.mockImplementation(() => {
        throw new mocks.StripeConfigError("stripe");
      });
      try {
        mocks.constructEvent.mockReturnValue(stripeEvent("unhandled.event", {}));
        const res = await POST(webhookRequest());
        expect(res.status).toBe(503);
        // constructEvent must NEVER be reached — the client wasn't available.
        expect(mocks.constructEvent).not.toHaveBeenCalled();
        // The error log must name STRIPE_SECRET_KEY, not STRIPE_WEBHOOK_SECRET.
        const logged = errSpy.mock.calls.map((c) => String(c[0])).join(" ");
        expect(logged).toContain("STRIPE_SECRET_KEY");
      } finally {
        errSpy.mockRestore();
        if (savedKey !== undefined) process.env["STRIPE_SECRET_KEY"] = savedKey;
      }
    });

    it("returns 400 when the stripe-signature header is missing", async () => {
      const res = await POST(webhookRequest("{}", null));
      expect(res.status).toBe(400);
      expect(mocks.constructEvent).not.toHaveBeenCalled();
    });

    it("returns 400 when signature verification fails", async () => {
      mocks.constructEvent.mockImplementation(() => {
        throw new Error("No signatures found matching the expected signature");
      });
      const res = await POST(webhookRequest("{}", "sig_bad"));
      expect(res.status).toBe(400);
      expect(mocks.webhookEventFindUnique).not.toHaveBeenCalled();
    });

    it("verifies against the configured webhook secret and raw body", async () => {
      mocks.constructEvent.mockReturnValue(stripeEvent("unhandled.event", {}));
      await POST(webhookRequest('{"raw":true}', "sig_valid"));
      expect(mocks.constructEvent).toHaveBeenCalledWith('{"raw":true}', "sig_valid", "whsec_test");
    });
  });

  describe("durable-write guard (5.2 / section 14 — entitlement writes fail closed)", () => {
    it("asserts the stripe-webhook-entitlement capability after signature verification", async () => {
      mocks.constructEvent.mockReturnValue(stripeEvent("unhandled.event", {}));

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.requireDurableWriteStore).toHaveBeenCalledWith("stripe-webhook-entitlement");
    });

    it("returns 503 (so Stripe retries) with ZERO entitlement writes when the store is not durable", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription());
      mocks.requireDurableWriteStore.mockImplementation(() => {
        throw new mocks.DurableWriteStoreUnavailableError("stub client active");
      });

      const res = await POST(webhookRequest());
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.code).toBe("durable_write_store_unavailable");
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
      expect(mocks.checkoutAttemptUpdateMany).not.toHaveBeenCalled();
    });

    it("an unsigned request never reaches the guard (no store-health probing)", async () => {
      const res = await POST(webhookRequest("{}", null));
      expect(res.status).toBe(400);
      expect(mocks.requireDurableWriteStore).not.toHaveBeenCalled();
    });
  });

  describe("idempotency", () => {
    it("skips events that were already processed", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription(), "evt_dup");
      mocks.webhookEventFindUnique.mockResolvedValue({ id: "wh_existing" });

      const res = await POST(webhookRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.skipped).toBe(true);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });

    it("records the event id after successful processing", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription(), "evt_new");

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.webhookEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripeEventId: "evt_new",
            type: "customer.subscription.updated",
          }),
        })
      );
    });

    it("returns 500 and does NOT record the event when handling fails (Stripe will retry)", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription());
      mocks.subscriptionUpsert.mockRejectedValue(new Error("db down"));

      const res = await POST(webhookRequest());
      expect(res.status).toBe(500);
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });

    it("acks 200 (skipped) when a CONCURRENT duplicate delivery races past the findUnique check (P2002 on record)", async () => {
      // Two deliveries of the SAME event id both pass the findUnique idempotency
      // check, then one loses the unique-constraint race on webhookEvent.create.
      // The handler already synced (idempotently), so a P2002 on stripeEventId is
      // benign — ack 200 instead of 500-ing into a Stripe retry storm.
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription(), "evt_race");
      mocks.webhookEventCreate.mockRejectedValue(
        Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
          meta: { target: ["stripeEventId"] },
        }),
      );

      const res = await POST(webhookRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.skipped).toBe(true);
      // The event WAS handled before the benign conflict — the sync still ran.
      expect(mocks.subscriptionUpsert).toHaveBeenCalled();
    });

    it("returns 500 when recording the event fails for a NON-conflict reason (Stripe retries)", async () => {
      // A create failure that is NOT the benign stripeEventId unique-constraint
      // race must surface as a 500 so Stripe retries — never swallowed as skipped.
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription(), "evt_create_down");
      mocks.webhookEventCreate.mockRejectedValue(new Error("db write timeout"));

      const res = await POST(webhookRequest());

      expect(res.status).toBe(500);
    });
  });

  describe("checkout.session.completed", () => {
    it("retrieves the subscription and syncs it", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("checkout.session.completed", { subscription: "sub_123" })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(mocks.subscriptionUpsert).toHaveBeenCalled();
    });

    it("ignores sessions without a subscription (one-time payments)", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("checkout.session.completed", { subscription: null })
      );
      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    });

    it("reconciles the durable CheckoutAttempt: COMPLETED + subscription id attached", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("checkout.session.completed", {
          id: "cs_live_1",
          subscription: "sub_123",
          metadata: { userId: "user_1", checkoutAttemptId: "ca_11111111-2222-4333-8444-555566667777" },
        })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.checkoutAttemptUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { id: "ca_11111111-2222-4333-8444-555566667777" },
              { stripeSessionId: "cs_live_1" },
            ],
          },
          data: expect.objectContaining({
            status: "COMPLETED",
            stripeSubscriptionId: "sub_123",
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it("falls back to the stripeSessionId lookup when metadata carries no attempt id", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("checkout.session.completed", {
          id: "cs_live_2",
          subscription: "sub_123",
          metadata: { userId: "user_1" },
        })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.checkoutAttemptUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ stripeSessionId: "cs_live_2" }] },
        })
      );
    });

    it("tolerates an UNKNOWN attempt id — warns, still acks 200, sync unaffected", async () => {
      mocks.checkoutAttemptUpdateMany.mockResolvedValue({ count: 0 });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(
          stripeEvent("checkout.session.completed", {
            id: "cs_live_3",
            subscription: "sub_123",
            metadata: { checkoutAttemptId: "ca_99999999-8888-4777-8666-555544443333" },
          })
        );
        mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

        const res = await POST(webhookRequest());
        expect(res.status).toBe(200);
        expect(mocks.subscriptionUpsert).toHaveBeenCalled(); // entitlement sync intact
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("unknown checkout attempt"));
      } finally {
        warn.mockRestore();
      }
    });

    it("a reconciliation DB failure never fails the webhook (no Stripe retry storm)", async () => {
      mocks.checkoutAttemptUpdateMany.mockRejectedValue(new Error("db down"));
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(
          stripeEvent("checkout.session.completed", {
            id: "cs_live_4",
            subscription: "sub_123",
            metadata: { checkoutAttemptId: "ca_11111111-2222-4333-8444-555566667777" },
          })
        );
        mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

        const res = await POST(webhookRequest());
        expect(res.status).toBe(200);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("reconciliation failed"));
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe("checkout.session.expired (5.6)", () => {
    it("converges the attempt: EXPIRED + active key RELEASED, original intent untouched", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("checkout.session.expired", {
          id: "cs_expired_1",
          metadata: { userId: "user_1", checkoutAttemptId: "ca_11111111-2222-4333-8444-555566667777" },
        })
      );

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.checkoutAttemptUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { id: "ca_11111111-2222-4333-8444-555566667777" },
              { stripeSessionId: "cs_expired_1" },
            ],
            // Only non-terminal states converge — a COMPLETED attempt can
            // never be regressed by a late expiry event.
            status: { in: ["CREATED", "REQUEST_IN_FLIGHT", "SESSION_CREATED", "AMBIGUOUS"] },
          }),
          data: expect.objectContaining({
            status: "EXPIRED",
            activeClientIntentId: null,
            lastErrorKind: "session_expired",
          }),
        })
      );
      // The immutable audit identity is NEVER part of the release.
      const call = mocks.checkoutAttemptUpdateMany.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(call.data).not.toHaveProperty("originalClientIntentId");
    });

    it("tolerates an unknown/terminal attempt — warns, still acks 200", async () => {
      mocks.checkoutAttemptUpdateMany.mockResolvedValue({ count: 0 });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(
          stripeEvent("checkout.session.expired", { id: "cs_expired_2", metadata: {} })
        );

        const res = await POST(webhookRequest());
        expect(res.status).toBe(200);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("checkout.session.expired"));
      } finally {
        warn.mockRestore();
      }
    });

    it("an expiry-reconciliation DB failure never fails the webhook (repair job is the durable backstop)", async () => {
      mocks.checkoutAttemptUpdateMany.mockRejectedValue(new Error("db down"));
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(
          stripeEvent("checkout.session.expired", {
            id: "cs_expired_3",
            metadata: { checkoutAttemptId: "ca_11111111-2222-4333-8444-555566667777" },
          })
        );

        const res = await POST(webhookRequest());
        expect(res.status).toBe(200);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("expiry reconciliation failed"));
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe("customer.subscription.created / updated — syncSubscription", () => {
    it("upserts by stripeCustomerId with PRO tier for a pro monthly price", async () => {
      armSubscriptionEvent("customer.subscription.created", stripeSubscription());

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: "cus_123" },
          create: expect.objectContaining({
            userId: "user_1",
            stripeCustomerId: "cus_123",
            tier: "PRO",
            status: "ACTIVE",
          }),
          update: expect.objectContaining({
            stripeSubscriptionId: "sub_123",
            stripePriceId: PRO_MONTHLY,
            tier: "PRO",
            status: "ACTIVE",
            currentPeriodStart: new Date(1760000000 * 1000),
            currentPeriodEnd: new Date(1762600000 * 1000),
            cancelAtPeriodEnd: false,
          }),
        })
      );
    });

    it("maps an elite annual price to the ELITE tier", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ items: { data: [{ price: { id: ELITE_ANNUAL } }] } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ tier: "ELITE" }) })
      );
    });

    it("maps an unknown price id to FREE (never grants unpaid access) when there is no paid record", async () => {
      mocks.subscriptionFindUnique.mockResolvedValue(null);
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ items: { data: [{ price: { id: "price_unknown" } }] } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ tier: "FREE" }) })
      );
    });

    it("does NOT downgrade a grandfathered PAID member to FREE on an unmapped (repointed) price id", async () => {
      // A member whose original price id was dropped from the env after a phase
      // advance: the sub is still active + paid, so retain their tier, don't revoke.
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "ACTIVE",
        canceledAt: null,
        stripeSubscriptionId: "sub_test",
        tier: "PRO",
      });
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "active", items: { data: [{ price: { id: "price_orphaned_founding" } }] } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ tier: "PRO" }) })
      );
    });

    it.each([
      ["trialing", "TRIALING"],
      ["past_due", "PAST_DUE"],
      ["unpaid", "PAST_DUE"],
      ["canceled", "CANCELED"],
      ["incomplete_expired", "CANCELED"],
      ["incomplete", "INCOMPLETE"],
      ["paused", "PAUSED"],
    ])("maps Stripe status %s to %s", async (stripeStatus, dbStatus) => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: stripeStatus }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ status: dbStatus }) })
      );
    });

    it("clears the past-due grace anchor when the subscription recovers", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "active" }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: "ACTIVE", pastDueSince: null }),
        })
      );
    });

    it("backfills the grace anchor when a sync arrives already PAST_DUE", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "past_due" }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: "cus_123", pastDueSince: null },
          data: { pastDueSince: expect.any(Date) },
        })
      );
      // The sync itself must not overwrite an existing anchor.
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.not.objectContaining({ pastDueSince: expect.anything() }),
        })
      );
    });

    it("falls back to updateMany by stripeCustomerId when userId metadata is missing", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ metadata: {} }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripeCustomerId: "cus_123" } })
      );
    });

    it("resolves the customer id from an expanded customer object", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ customer: { id: "cus_expanded" } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripeCustomerId: "cus_expanded" } })
      );
    });
  });

  describe("customer.subscription.deleted", () => {
    it("downgrades to FREE / CANCELED and stamps canceledAt — skipping already-CANCELED rows", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.deleted", stripeSubscription())
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // status guard: an already-CANCELED row is never re-stamped — a later
          // revocation for the same id must not shift the audited canceledAt.
          // For this (first-delete) caller the guard is harmless idempotence.
          where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
          data: expect.objectContaining({
            status: "CANCELED",
            tier: "FREE",
            canceledAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("invoice events", () => {
    it("payment_succeeded re-syncs the subscription from Stripe", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_succeeded", { subscription: "sub_123" })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(mocks.subscriptionUpsert).toHaveBeenCalled();
    });

    it("payment_failed marks the subscription PAST_DUE, stamps the first failure, and never touches a CANCELED row", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: "sub_123" })
      );

      await POST(webhookRequest());

      // First-failure stamp: only rows without an existing anchor —
      // retries must not slide the grace window.
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: "sub_123", pastDueSince: null, status: { not: "CANCELED" } },
          data: { pastDueSince: expect.any(Date) },
        })
      );
      // Adversarial-review regression: CANCELED is terminal and excluded, so a
      // late payment_failed after subscription.deleted cannot resurrect access.
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
          data: { status: "PAST_DUE" },
        })
      );
    });

    it("payment_action_required re-syncs so the DB captures the pending status", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_action_required", { subscription: "sub_123" })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription({ status: "past_due" }));

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ status: "PAST_DUE" }) })
      );
    });

    it("ignores invoices without a subscription", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: null })
      );

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    });
  });

  describe("charge.refunded — refund revocation behind REFUND_REVOKES_ACCESS (H-K)", () => {
    // The canonical terminal downgrade — the EXACT write customer.subscription.deleted
    // performs. Refund revocation must flow through the same path, never a second one.
    // The status guard skips already-CANCELED rows so a later distinct-id refund can
    // never re-stamp canceledAt on a row that already carries the audited timestamp.
    const CANONICAL_REVOKE = {
      where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
      data: {
        status: "CANCELED",
        tier: "FREE",
        canceledAt: expect.any(Date),
        pastDueSince: null,
      },
    };

    function stripeCharge(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: "ch_1",
        amount: 1499,
        amount_refunded: 1499,
        refunded: true,
        invoice: "in_1",
        customer: "cus_123",
        ...overrides,
      };
    }

    /**
     * Arm a charge.refunded event, the invoice → subscription resolution, AND
     * the live-status check (`subscriptions.retrieve`). `subStatus` defaults to
     * "canceled" — the genuinely-dead state in which revocation is permitted —
     * so tests exercising the revoke path get it; live-subscription tests pass
     * an alive status explicitly. Arming is free: log-only tests additionally
     * assert these mocks were NEVER CALLED despite being armed.
     */
    function armRefundEvent(
      charge: Record<string, unknown> = stripeCharge(),
      id = "evt_refund_1",
      subscriptionId: string | null = "sub_123",
      subStatus = "canceled",
    ): void {
      mocks.constructEvent.mockReturnValue(stripeEvent("charge.refunded", charge, id));
      mocks.invoicesRetrieve.mockResolvedValue({ id: "in_1", subscription: subscriptionId });
      mocks.subscriptionsRetrieve.mockResolvedValue({
        id: subscriptionId ?? "sub_123",
        status: subStatus,
      });
    }

    function expectNoEntitlementMutation(): void {
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    }

    /** Log-only must cost nothing: not one Stripe API call, armed or not. */
    function expectZeroStripeApiCalls(): void {
      expect(mocks.invoicesRetrieve).not.toHaveBeenCalled();
      expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    }

    afterEach(() => {
      // Never leak the enforcement flag into other suites in this worker.
      delete process.env["REFUND_REVOKES_ACCESS"];
    });

    it("flag ABSENT: a clean full refund logs the payload facts, mutates NOTHING, and makes ZERO Stripe API calls (default OFF is hard AND free)", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent();

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expectNoEntitlementMutation();
        // Log-only must cost nothing: the invoice REFERENCE comes straight from
        // the payload — never a retrieve — and the status check never runs.
        expectZeroStripeApiCalls();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("enforcement disabled"));
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("ch_1"));
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("in_1"));
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("1499"));
        // Acked and recorded — log-only is a handled outcome, not an error.
        expect(mocks.webhookEventCreate).toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('flag "false": same — full refund mutates nothing and calls nothing', async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "false";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent();

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expectNoEntitlementMutation();
        expectZeroStripeApiCalls();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("enforcement disabled"));
      } finally {
        warn.mockRestore();
      }
    });

    it("flag off: an EXPANDED invoice object logs its id from the payload — still zero Stripe API calls", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge({ invoice: { id: "in_expanded" } }), "evt_refund_exp");

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expectNoEntitlementMutation();
        expectZeroStripeApiCalls();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("in_expanded"));
      } finally {
        warn.mockRestore();
      }
    });

    it.each(["1", "yes", "on", "enabled"])(
      'flag %j never enables enforcement — only a trimmed "true" does — and stays call-free',
      async (value) => {
        process.env["REFUND_REVOKES_ACCESS"] = value;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
          armRefundEvent();

          const res = await POST(webhookRequest());

          expect(res.status).toBe(200);
          expectNoEntitlementMutation();
          expectZeroStripeApiCalls();
        } finally {
          warn.mockRestore();
        }
      },
    );

    it("flag ON + subscription CANCELED in Stripe: a FULL refund revokes via the CANONICAL path — exactly once, same write as subscription.deleted", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge(), "evt_refund_1", "sub_123", "canceled");

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        // The live-status guard actually ran: the subscription was re-retrieved.
        expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
          expect.objectContaining(CANONICAL_REVOKE),
        );
        // No second write path: never the upsert, never a bespoke shape.
        expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it("flag ON + subscription incomplete_expired: also genuinely dead — revokes once", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge(), "evt_refund_incexp", "sub_123", "incomplete_expired");

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
          expect.objectContaining(CANONICAL_REVOKE),
        );
      } finally {
        warn.mockRestore();
      }
    });

    it.each(["active", "trialing", "past_due", "unpaid", "paused", "incomplete"])(
      "flag ON: FULL refund on a LIVE subscription (%s) revokes NOTHING — human-review escalation, ack 200 (lock-in guard)",
      async (liveStatus) => {
        process.env["REFUND_REVOKES_ACCESS"] = "true";
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        try {
          armRefundEvent(stripeCharge(), `evt_refund_live_${liveStatus}`, "sub_123", liveStatus);

          const res = await POST(webhookRequest());

          expect(res.status).toBe(200);
          // A terminal revoke here would let the out-of-order resurrection
          // guard swallow the next PAID renewal — a paying member locked to
          // FREE. Nothing may be mutated.
          expectNoEntitlementMutation();
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining("refund on LIVE subscription — human review required"),
          );
          expect(error).toHaveBeenCalledWith(expect.stringContaining("ch_1"));
          expect(error).toHaveBeenCalledWith(expect.stringContaining("sub_123"));
          expect(error).toHaveBeenCalledWith(expect.stringContaining(liveStatus));
          // Handled outcome: acked and recorded, no retry storm.
          expect(mocks.webhookEventCreate).toHaveBeenCalled();
        } finally {
          error.mockRestore();
        }
      },
    );

    it('a trimmed " true " (whitespace) also counts as on — envFlag convention', async () => {
      process.env["REFUND_REVOKES_ACCESS"] = " true ";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent();

        await POST(webhookRequest());

        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
      }
    });

    it.each([
      // Stripe partial refund: refunded stays false until fully refunded.
      { refunded: false, amount_refunded: 500 },
      // Defensive: refunded=true but amounts disagree — treat as NOT full.
      { refunded: true, amount_refunded: 1498 },
    ])("flag ON: PARTIAL refund (%j) is log-only ALWAYS — no mutation, no API spend", async (overrides) => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge(overrides));

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expectNoEntitlementMutation();
        // A partial refund can never revoke, so resolving it would be a
        // pure-waste API call — and a needless transient-500 surface.
        expectZeroStripeApiCalls();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("PARTIAL"));
      } finally {
        warn.mockRestore();
      }
    });

    it.each([
      { amount: undefined },
      { amount_refunded: undefined },
      { amount: 0, amount_refunded: 0 },
      { refunded: undefined },
      { amount: "1499", amount_refunded: "1499" },
    ])(
      "flag ON: AMBIGUOUS payload (%j) must not revoke — fail-safe negative test",
      async (overrides) => {
        process.env["REFUND_REVOKES_ACCESS"] = "true";
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
          armRefundEvent(stripeCharge(overrides));

          const res = await POST(webhookRequest());

          expect(res.status).toBe(200);
          expectNoEntitlementMutation();
        } finally {
          warn.mockRestore();
        }
      },
    );

    it("flag ON: charge with NO invoice (one-off payment) — never guess, no mutation, no invoice fetch", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge({ invoice: null }));

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expectNoEntitlementMutation();
        expect(mocks.invoicesRetrieve).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("no invoice"));
      } finally {
        warn.mockRestore();
      }
    });

    it("flag ON: invoice with NO subscription — STRUCTURAL: never guess, no mutation, no status check, ack 200", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge(), "evt_refund_nosub", null);

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expectNoEntitlementMutation();
        // Structural dead-end: nothing to status-check, so no retrieve either.
        expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("no subscription"));
        // Retries cannot cure a subscription-less invoice — recorded, not retried.
        expect(mocks.webhookEventCreate).toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it("flag ON: invoices.retrieve THROWS — TRANSIENT: 500 with the event UNRECORDED so Stripe redelivers", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(
          stripeEvent("charge.refunded", stripeCharge(), "evt_refund_inv_down"),
        );
        mocks.invoicesRetrieve.mockRejectedValue(new Error("stripe api unreachable"));

        const res = await POST(webhookRequest());

        // A transient outage must NOT be absorbed as log-and-200: recording the
        // event would let dedup permanently consume a legitimate revocation.
        expect(res.status).toBe(500);
        expectNoEntitlementMutation();
        expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
      } finally {
        error.mockRestore();
      }
    });

    it("flag ON: subscriptions.retrieve THROWS — TRANSIENT: 500 unrecorded; the REDELIVERY (retrieve healthy) then revokes", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge(), "evt_refund_sub_down", "sub_123", "canceled");
        // First delivery: the status check dies mid-outage.
        mocks.subscriptionsRetrieve.mockRejectedValueOnce(new Error("stripe 503"));

        const first = await POST(webhookRequest());

        expect(first.status).toBe(500);
        expectNoEntitlementMutation();
        expect(mocks.webhookEventCreate).not.toHaveBeenCalled();

        // Stripe redelivers the SAME event id. It was never recorded, so dedup
        // does not swallow it, and with the API healthy the revocation lands.
        const second = await POST(webhookRequest());

        expect(second.status).toBe(200);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
          expect.objectContaining(CANONICAL_REVOKE),
        );
        expect(mocks.webhookEventCreate).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
        error.mockRestore();
      }
    });

    it("flag ON: full refund for a subscription NO DB row tracks — warns, acks 200, nothing revoked elsewhere", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        // The row moved on (superseded) or never existed: the canonical WHERE
        // (keyed on stripeSubscriptionId) matches nothing.
        mocks.subscriptionUpdateMany.mockResolvedValue({ count: 0 });
        armRefundEvent(stripeCharge(), "evt_refund_unknown");

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);
        expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("matched no DB row"));
      } finally {
        warn.mockRestore();
      }
    });

    it("flag ON: a row that is ALREADY CANCELED is not re-stamped — the status guard yields count 0 and the handler acks", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        // A second, DISTINCT-event-id refund arrives for a subscription whose
        // row already carries status CANCELED (+ audited canceledAt). The
        // canonical WHERE's `status: { not: "CANCELED" }` filters it out, so
        // the DB reports count 0 — canceledAt is never shifted.
        mocks.subscriptionUpdateMany.mockResolvedValue({ count: 0 });
        armRefundEvent(stripeCharge(), "evt_refund_restamp", "sub_123", "canceled");

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);
        // The guard is IN the write — not post-hoc handler logic.
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
          }),
        );
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("nothing re-stamped"));
        expect(mocks.webhookEventCreate).toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it("DUPLICATE delivery of the same refund event revokes exactly once (route-level dedup)", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        armRefundEvent(stripeCharge(), "evt_refund_dup");

        // First delivery: processed and recorded.
        const first = await POST(webhookRequest());
        expect(first.status).toBe(200);
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);

        // Redelivery of the SAME event id: the dedup check now finds it.
        mocks.webhookEventFindUnique.mockResolvedValue({ id: "wh_refund_dup" });
        const second = await POST(webhookRequest());
        const body = await second.json();

        expect(second.status).toBe(200);
        expect(body.skipped).toBe(true);
        // Single effect total — the revocation did NOT run twice.
        expect(mocks.subscriptionUpdateMany).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
      }
    });

    it("flag ON: a revocation WRITE failure 500s with the event unrecorded — Stripe retries, the confirmed revocation is never silently lost", async () => {
      process.env["REFUND_REVOKES_ACCESS"] = "true";
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        mocks.subscriptionUpdateMany.mockRejectedValue(new Error("db down"));
        armRefundEvent(stripeCharge(), "evt_refund_db_down");

        const res = await POST(webhookRequest());

        expect(res.status).toBe(500);
        expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
      } finally {
        error.mockRestore();
      }
    });
  });

  describe("unhandled events", () => {
    it("acknowledges unknown event types without touching subscriptions", async () => {
      mocks.constructEvent.mockReturnValue(stripeEvent("customer.created", {}));

      const res = await POST(webhookRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.received).toBe(true);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
      // Still recorded for idempotency
      expect(mocks.webhookEventCreate).toHaveBeenCalled();
    });
  });
});
