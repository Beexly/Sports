import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptionsList: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = { list: mocks.subscriptionsList };
  },
}));

import { findLiveStripeSubscription } from "@/lib/stripe";

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
  process.env["STRIPE_SECRET_KEY"] = "sk_test_fixture";
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
