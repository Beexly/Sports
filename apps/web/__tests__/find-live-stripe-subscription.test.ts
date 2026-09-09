import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptionsList: vi.fn(),
  sessionsList: vi.fn(),
  sessionsExpire: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = { list: mocks.subscriptionsList };
    checkout = { sessions: { list: mocks.sessionsList, expire: mocks.sessionsExpire } };
  },
}));

import { findLiveStripeSubscription, reconcileOpenCheckoutSessions } from "@/lib/stripe";

/**
 * The Stripe-side half of the double-subscribe guard (C-91 / WP-14). Its answer
 * decides whether we charge a customer a second time, so both directions matter
 * and "none" is the dangerous one: it AUTHORIZES a charge.
 *
 * Two of these pin fixes for defects Devin Review found on #736 before it
 * shipped, and both were mine:
 *
 *   - `incomplete` was excluded from the live set on a false premise (that a
 *     subscription sits in `incomplete` from Checkout Session creation). It
 *     does not — an abandoned session creates no subscription at all — and
 *     `incomplete` in fact means a payment was attempted and can still be
 *     completed, which is exactly when a second checkout collects twice.
 *   - a single 100-row page was read and a miss returned "none", which is an
 *     assumption rather than a proof of absence.
 *
 * Every value below is a labelled fixture. No real customer or subscription id.
 */

const sub = (id: string, status: string) => ({ id, status });

/** One page of Stripe's list response. */
const page = (data: unknown[], hasMore = false) => ({ data, has_more: hasMore });

beforeEach(() => {
  mocks.subscriptionsList.mockReset();
  mocks.sessionsList.mockReset();
  mocks.sessionsExpire.mockReset();
  mocks.sessionsExpire.mockResolvedValue({});
  process.env["STRIPE_SECRET_KEY"] = "sk_test_fixture";
});

/** An open subscription-mode Checkout Session for `price`. */
const openSession = (id: string, price: string, over: Record<string, unknown> = {}) => ({
  id,
  mode: "subscription",
  url: `https://checkout.stripe.com/s/${id}`,
  line_items: { data: [{ price: { id: price } }] },
  ...over,
});

/**
 * C-185, founder-ordered after Devin Review on #736. Two DISTINCT checkout
 * intents for one user could each mint a payable Checkout Session, because the
 * subscription probe only sees a Subscription once a payment has been
 * attempted. A Checkout Session exists from creation, so it is the artifact
 * that can actually be reconciled.
 */
describe("reconcileOpenCheckoutSessions", () => {
  it("hands back an open session for the SAME price instead of minting a second", async () => {
    mocks.sessionsList.mockResolvedValue(page([openSession("cs_same", "price_pro_monthly")]));

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe).toEqual({
      outcome: "reusable",
      sessionId: "cs_same",
      url: "https://checkout.stripe.com/s/cs_same",
    });
    // Never expire the session we are about to reuse.
    expect(mocks.sessionsExpire).not.toHaveBeenCalled();
  });

  it("expires an open session for a DIFFERENT price — an open session is payable", async () => {
    mocks.sessionsList.mockResolvedValue(page([openSession("cs_other", "price_elite_annual")]));

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe).toEqual({ outcome: "superseded", expiredSessionIds: ["cs_other"] });
    expect(mocks.sessionsExpire).toHaveBeenCalledWith("cs_other");
  });

  it("ignores non-subscription sessions", async () => {
    // A one-off payment session is not a recurring double-charge risk and must
    // not be expired out from under the customer.
    mocks.sessionsList.mockResolvedValue(
      page([openSession("cs_payment", "price_one_off", { mode: "payment" })]),
    );

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe).toEqual({ outcome: "none" });
    expect(mocks.sessionsExpire).not.toHaveBeenCalled();
  });

  it("treats an unreadable price as NOT the same plan and expires it (fail closed)", async () => {
    mocks.sessionsList.mockResolvedValue(
      page([openSession("cs_no_items", "price_pro_monthly", { line_items: { data: [] } })]),
    );

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe).toEqual({ outcome: "superseded", expiredSessionIds: ["cs_no_items"] });
  });

  it("answers UNKNOWN when an open session cannot be EXPIRED — never mint alongside it", async () => {
    // The sharpest case: we know a payable session exists and we could not
    // retire it. Minting now is the double-charge.
    mocks.sessionsList.mockResolvedValue(page([openSession("cs_stuck", "price_elite_annual")]));
    mocks.sessionsExpire.mockRejectedValue(new Error("fixture: expire failed"));

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe.outcome).toBe("unknown");
  });

  it("answers UNKNOWN when the listing throws — never none", async () => {
    mocks.sessionsList.mockRejectedValue(new Error("fixture: stripe unreachable"));

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe).toEqual({ outcome: "unknown", reason: "fixture: stripe unreachable" });
  });

  it("returns none only after exhausting the customer's open sessions", async () => {
    mocks.sessionsList
      .mockResolvedValueOnce(page([openSession("cs_pay", "p", { mode: "payment" })], true))
      .mockResolvedValueOnce(page([openSession("cs_pay2", "p", { mode: "payment" })], false));

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe).toEqual({ outcome: "none" });
    expect(mocks.sessionsList).toHaveBeenCalledTimes(2);
  });

  it("finds a reusable session on page two that a single-page read would have missed", async () => {
    mocks.sessionsList
      .mockResolvedValueOnce(page([openSession("cs_pay", "p", { mode: "payment" })], true))
      .mockResolvedValueOnce(page([openSession("cs_same_p2", "price_pro_monthly")], false));

    const probe = await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(probe).toMatchObject({ outcome: "reusable", sessionId: "cs_same_p2" });
  });

  it("requests line_items so the price is actually readable", async () => {
    mocks.sessionsList.mockResolvedValue(page([]));

    await reconcileOpenCheckoutSessions("cus_fixture", "price_pro_monthly");

    expect(mocks.sessionsList).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_fixture",
        status: "open",
        expand: ["data.line_items"],
      }),
    );
  });
});

describe("findLiveStripeSubscription", () => {
  it.each([
    ["active", "sub_active_fixture"],
    ["trialing", "sub_trialing_fixture"],
    ["past_due", "sub_pastdue_fixture"],
    ["unpaid", "sub_unpaid_fixture"],
    ["paused", "sub_paused_fixture"],
  ])("reports a %s subscription as live", async (status, id) => {
    mocks.subscriptionsList.mockResolvedValue(page([sub(id, status)]));

    const probe = await findLiveStripeSubscription("cus_fixture");

    expect(probe).toEqual({ outcome: "live", subscriptionId: id, status });
  });

  it("reports an INCOMPLETE subscription as live — a payment was attempted and can still be collected", async () => {
    // The false-premise fix. A customer here should finish the payment they
    // already started, not buy a second subscription alongside it.
    mocks.subscriptionsList.mockResolvedValue(page([sub("sub_incomplete_fixture", "incomplete")]));

    const probe = await findLiveStripeSubscription("cus_fixture");

    expect(probe).toEqual({
      outcome: "live",
      subscriptionId: "sub_incomplete_fixture",
      status: "incomplete",
    });
  });

  it.each(["canceled", "incomplete_expired"])(
    "does NOT treat a terminal %s subscription as live — nothing can be collected on it",
    async (status) => {
      // The other direction: treating these as live would lock a returning
      // customer out of buying at all.
      mocks.subscriptionsList.mockResolvedValue(page([sub("sub_dead_fixture", status)]));

      const probe = await findLiveStripeSubscription("cus_fixture");

      expect(probe).toEqual({ outcome: "none" });
    },
  );

  it("returns none only after exhausting the customer's subscriptions", async () => {
    mocks.subscriptionsList
      .mockResolvedValueOnce(page([sub("sub_dead_1", "canceled")], true))
      .mockResolvedValueOnce(page([sub("sub_dead_2", "incomplete_expired")], false));

    const probe = await findLiveStripeSubscription("cus_fixture");

    expect(probe).toEqual({ outcome: "none" });
    expect(mocks.subscriptionsList).toHaveBeenCalledTimes(2);
    // The second call continues from the first page's last id.
    expect(mocks.subscriptionsList).toHaveBeenLastCalledWith(
      expect.objectContaining({ starting_after: "sub_dead_1" }),
    );
  });

  it("finds a live subscription that a single-page read would have missed", async () => {
    // The pagination fix, stated as the failure it prevents: page one is all
    // dead rows, the live subscription is on page two, and the old code would
    // have answered "none" and let the customer be charged again.
    mocks.subscriptionsList
      .mockResolvedValueOnce(page([sub("sub_dead_1", "canceled")], true))
      .mockResolvedValueOnce(page([sub("sub_live_page2", "active")], true));

    const probe = await findLiveStripeSubscription("cus_fixture");

    expect(probe).toEqual({
      outcome: "live",
      subscriptionId: "sub_live_page2",
      status: "active",
    });
  });

  it("answers UNKNOWN rather than none when the listing never terminates", async () => {
    // A pathological account must not read as "no subscription, go ahead and
    // charge them". Unknown makes the caller fail closed.
    mocks.subscriptionsList.mockResolvedValue(page([sub("sub_dead_n", "canceled")], true));

    const probe = await findLiveStripeSubscription("cus_fixture");

    expect(probe.outcome).toBe("unknown");
    expect(mocks.subscriptionsList).toHaveBeenCalledTimes(20);
  });

  it("answers UNKNOWN when Stripe throws — never none", async () => {
    mocks.subscriptionsList.mockRejectedValue(new Error("fixture: stripe unreachable"));

    const probe = await findLiveStripeSubscription("cus_fixture");

    expect(probe).toEqual({
      outcome: "unknown",
      reason: "fixture: stripe unreachable",
    });
  });

  it("answers UNKNOWN when a LATER page throws, having already read a clean page", async () => {
    // The subtle one: a partial read is not a proof of absence either.
    mocks.subscriptionsList
      .mockResolvedValueOnce(page([sub("sub_dead_1", "canceled")], true))
      .mockRejectedValueOnce(new Error("fixture: stripe unreachable mid-listing"));

    const probe = await findLiveStripeSubscription("cus_fixture");

    expect(probe.outcome).toBe("unknown");
  });
});
