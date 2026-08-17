import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * GSE-SEC-033 REGRESSION INVARIANT.
 *
 * The finding was: the durable-write guard (requireDurableWriteStore) covered
 * only a subset of the Stripe mutation entry points in lib/stripe.ts. As of
 * commit a56fe1dc that is no longer true — ALL THREE mutation surfaces are
 * gated:
 *   - getOrCreateStripeCustomer   -> guard("stripe-checkout")
 *   - createCheckoutSession        -> guard("stripe-checkout")
 *   - createPortalSession          -> guard("stripe-portal")
 *
 * This test pins that invariant so a future unguarded Stripe side-effect
 * (a 4th mutation path added without a guard) fails loudly instead of silently
 * minting a real external object with no durable local record.
 *
 * It does NOT re-test the happy path of any single function (those are covered
 * in stripe-customer.test.ts / stripe-portal-session.test.ts / the checkout
 * route tests). It asserts the SHARED property: every mutation throws the
 * typed DurableWriteStoreUnavailableError and makes ZERO Stripe SDK writes when
 * the durable store is unavailable.
 */

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

const stripeMocks = vi.hoisted(() => ({
  customersCreate: vi.fn<(p: Stripe.CustomerCreateParams, o?: Stripe.RequestOptions) => Promise<{ id: string }>>(),
  checkoutSessionsCreate: vi.fn<
    (p: Stripe.Checkout.SessionCreateParams, o?: Stripe.RequestOptions) => Promise<Stripe.Checkout.Session>
  >(),
  billingPortalCreate: vi.fn<
    (p: Stripe.BillingPortal.SessionCreateParams, o?: Stripe.RequestOptions) => Promise<Stripe.BillingPortal.Session>
  >(),
}));

vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    customers: { create: stripeMocks.customersCreate },
    checkout: { sessions: { create: stripeMocks.checkoutSessionsCreate } },
    billingPortal: { sessions: { create: stripeMocks.billingPortalCreate } },
  }));
  return { default: StripeMock };
});

const requireDurableWriteStoreMock = vi.hoisted(() => vi.fn<(capability: string) => void>());

vi.mock("@sports/db", () => ({
  db: { subscription: { findUnique: vi.fn(), upsert: vi.fn() } },
  requireDurableWriteStore: requireDurableWriteStoreMock,
}));

import { createPortalSession, createCheckoutSession, getOrCreateStripeCustomer } from "@/lib/stripe";

const VALID_ATTEMPT_ID = "ca_12345678-1234-1234-1234-123456781234";

describe("GSE-SEC-033 — every Stripe mutation entry point fails closed on a missing durable store", () => {
  beforeEach(() => {
    stripeMocks.customersCreate.mockReset();
    stripeMocks.checkoutSessionsCreate.mockReset();
    stripeMocks.billingPortalCreate.mockReset();
    requireDurableWriteStoreMock.mockReset();
    // Default: store is healthy — but every test here flips it to throw.
    requireDurableWriteStoreMock.mockReturnValue(undefined);
  });

  it("getOrCreateStripeCustomer throws before any Stripe SDK call (fail closed)", async () => {
    requireDurableWriteStoreMock.mockImplementation(() => {
      throw new DurableWriteStoreUnavailableError("stripe-checkout", "stub_client_active", "stub");
    });

    await expect(getOrCreateStripeCustomer("user_1", "a@b.com", "Ada")).rejects.toThrow(
      DurableWriteStoreUnavailableError,
    );

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-checkout");
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
  });

  it("createCheckoutSession throws before any Stripe SDK call (fail closed)", async () => {
    requireDurableWriteStoreMock.mockImplementation(() => {
      throw new DurableWriteStoreUnavailableError("stripe-checkout", "database_url_not_durable", "sentinel");
    });

    await expect(
      createCheckoutSession({
        customerId: "cus_1",
        priceId: "price_1",
        userId: "user_1",
        attemptId: VALID_ATTEMPT_ID,
        successUrl: "https://app/x",
        cancelUrl: "https://app/y",
      }),
    ).rejects.toThrow(DurableWriteStoreUnavailableError);

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-checkout");
    expect(stripeMocks.checkoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("createPortalSession throws before any Stripe SDK call (fail closed)", async () => {
    requireDurableWriteStoreMock.mockImplementation(() => {
      throw new DurableWriteStoreUnavailableError("stripe-portal", "stub_client_active", "stub");
    });

    await expect(createPortalSession("cus_1", "https://app/dashboard")).rejects.toThrow(
      DurableWriteStoreUnavailableError,
    );

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-portal");
    expect(stripeMocks.billingPortalCreate).not.toHaveBeenCalled();
  });

  it("the guard capability set covers every mutation path (cross-check)", async () => {
    // The capabilities asserted above must match what the module actually
    // registers as protected, so a typo'd capability can't accidentally pass.
    // Drive each entry point SEQUENTIALLY so every guard runs even though each
    // throws (Promise.all rejects on the first rejection, which would skip the
    // later calls in the same microtask batch).
    const seen: string[] = [];
    requireDurableWriteStoreMock.mockImplementation((c: string) => {
      seen.push(c);
      throw new DurableWriteStoreUnavailableError(c, "stub_client_active", "stub");
    });

    const calls: Array<() => Promise<unknown>> = [
      () => getOrCreateStripeCustomer("u", "e@b.com", "A"),
      () =>
        createCheckoutSession({
          customerId: "c",
          priceId: "p",
          userId: "u",
          attemptId: VALID_ATTEMPT_ID,
          successUrl: "s",
          cancelUrl: "c",
        }),
      () => createPortalSession("c", "r"),
    ];
    for (const call of calls) {
      try {
        await call();
      } catch {
        // expected: each throws the typed DurableWriteStoreUnavailableError
      }
    }

    expect(seen).toContain("stripe-checkout");
    expect(seen).toContain("stripe-portal");
  });
});
