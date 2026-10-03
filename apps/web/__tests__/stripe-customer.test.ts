import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * getOrCreateStripeCustomer — the money-path customer resolver every checkout
 * runs before creating a Checkout Session. Two invariants matter for revenue:
 *
 *   1. It must return the EXISTING Stripe customer id when one is already stored,
 *      making no second `customers.create` call — a duplicate customer breaks the
 *      webhook upsert (keyed on stripeCustomerId) and can strand a paid user
 *      (charged-but-not-entitled).
 *   2. When it does create, it must send the userId-keyed IDEMPOTENCY KEY and the
 *      { userId } metadata — the idempotency key collapses two concurrent
 *      first-checkouts (double-click / two tabs) onto ONE customer, and the
 *      metadata is what the webhook later reads to resolve the user.
 *
 * The function was previously exercised only as a mocked dependency of the
 * checkout route; its own logic had no direct coverage. We mock the Stripe SDK
 * and the db client and assert exactly what it calls.
 */

const stripeMocks = vi.hoisted(() => ({
  customersCreate: vi.fn<(params: Stripe.CustomerCreateParams, opts?: Stripe.RequestOptions) => Promise<{ id: string }>>(),
}));

vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    customers: { create: stripeMocks.customersCreate },
    // Unused by these tests but present on the real client the module builds.
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  }));
  return { default: StripeMock };
});

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn<(args: unknown) => Promise<{ stripeCustomerId: string | null } | null>>(),
  upsert: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

const requireDurableWriteStoreMock = vi.hoisted(() => vi.fn<(capability: string) => void>());

vi.mock("@sports/db", () => ({
  db: { subscription: { findUnique: dbMocks.findUnique, upsert: dbMocks.upsert } },
  requireDurableWriteStore: requireDurableWriteStoreMock,
}));

import { getOrCreateStripeCustomer } from "@/lib/stripe";

describe("getOrCreateStripeCustomer", () => {
  beforeEach(() => {
    stripeMocks.customersCreate.mockReset();
    dbMocks.findUnique.mockReset();
    dbMocks.upsert.mockReset();
    dbMocks.upsert.mockResolvedValue({ id: "s_1" });
    requireDurableWriteStoreMock.mockReset();
    requireDurableWriteStoreMock.mockReturnValue(undefined); // available by default
  });

  it("returns the stored customer id and creates NOTHING when one already exists", async () => {
    dbMocks.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

    const id = await getOrCreateStripeCustomer("user_1", "a@b.com", "Ada");

    expect(id).toBe("cus_existing");
    // No duplicate customer, no redundant upsert — the reuse path must be inert.
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    expect(dbMocks.upsert).not.toHaveBeenCalled();
  });

  it("creates a customer with the userId idempotency key + metadata, then upserts a FREE/ACTIVE row", async () => {
    dbMocks.findUnique.mockResolvedValue(null);
    stripeMocks.customersCreate.mockResolvedValue({ id: "cus_new" });

    const id = await getOrCreateStripeCustomer("user_1", "a@b.com", "Ada");

    expect(id).toBe("cus_new");
    // The idempotency key is the anti-duplicate guarantee — assert it explicitly.
    expect(stripeMocks.customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.com", name: "Ada", metadata: { userId: "user_1" } }),
      { idempotencyKey: "gse-customer-user_1" },
    );
    expect(dbMocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        create: expect.objectContaining({
          userId: "user_1",
          stripeCustomerId: "cus_new",
          tier: "FREE",
          status: "ACTIVE",
        }),
        update: { stripeCustomerId: "cus_new" },
      }),
    );
  });

  it("also creates when a row exists but carries no customer id (stripeCustomerId null)", async () => {
    dbMocks.findUnique.mockResolvedValue({ stripeCustomerId: null });
    stripeMocks.customersCreate.mockResolvedValue({ id: "cus_new2" });

    const id = await getOrCreateStripeCustomer("user_2", "c@d.com");

    expect(id).toBe("cus_new2");
    // Name omitted → passed through as undefined (never null) to Stripe, still
    // keyed on the per-user idempotency key.
    expect(stripeMocks.customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "c@d.com", name: undefined, metadata: { userId: "user_2" } }),
      { idempotencyKey: "gse-customer-user_2" },
    );
  });

  // GSE-SEC-033: durable-write guard must cover customer creation — an external
  // Stripe side effect gated by a local DB upsert. Fail closed before any SDK call.
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

  it("STUB MODE: throws before any Stripe SDK call is made (fail closed)", async () => {
    requireDurableWriteStoreMock.mockImplementation(() => {
      throw new DurableWriteStoreUnavailableError(
        "stripe-checkout",
        "stub_client_active",
        "stub client active",
      );
    });

    await expect(getOrCreateStripeCustomer("user_1", "a@b.com", "Ada")).rejects.toThrow(
      DurableWriteStoreUnavailableError,
    );

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-checkout");
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    expect(dbMocks.upsert).not.toHaveBeenCalled();
  });

  it("DATABASE_URL NOT DURABLE: throws before any Stripe SDK call is made (fail closed)", async () => {
    requireDurableWriteStoreMock.mockImplementation(() => {
      throw new DurableWriteStoreUnavailableError(
        "stripe-checkout",
        "database_url_not_durable",
        "DATABASE_URL is unset or sentinel",
      );
    });

    await expect(getOrCreateStripeCustomer("user_1", "a@b.com", "Ada")).rejects.toThrow(
      DurableWriteStoreUnavailableError,
    );

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-checkout");
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    expect(dbMocks.upsert).not.toHaveBeenCalled();
  });

  it("guard runs BEFORE the DB lookup and any Stripe call (call order)", async () => {
    let guardCalled = false;
    requireDurableWriteStoreMock.mockImplementation(() => {
      guardCalled = true;
    });
    // Provide an existing customer so the function returns the stored id
    // without calling stripe.customers.create.
    dbMocks.findUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

    await getOrCreateStripeCustomer("user_1", "a@b.com", "Ada");

    expect(guardCalled).toBe(true);
    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-checkout");
    expect(dbMocks.findUnique).toHaveBeenCalled();
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
  });
});
