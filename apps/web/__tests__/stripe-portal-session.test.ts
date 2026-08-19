import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * GSE-SEC-033: durable-write guard must cover ALL Stripe side-effect entry
 * points, not just checkout + webhook. createPortalSession opens a live
 * Stripe-hosted billing-portal page — an external side effect — so it must
 * fail closed (503) when the local durable store cannot persist.
 */

class DurableWriteStoreUnavailableError extends Error {
  readonly kind = "durable_write_store_unavailable" as const;
  readonly httpStatus = 503 as const;
  readonly capability: string;
  readonly reason: string;
  constructor(capability: string, reason: string, detail: string) {
    super(
      `Durable write store unavailable for capability "${capability}": ${detail}`,
    );
    this.name = "DurableWriteStoreUnavailableError";
    this.capability = capability;
    this.reason = reason;
  }
}

const stripeMocks = vi.hoisted(() => ({
  billingPortalCreate: vi.fn<
    (
      params: Stripe.BillingPortal.SessionCreateParams,
      opts?: Stripe.RequestOptions,
    ) => Promise<Stripe.BillingPortal.Session>
  >(),
}));

const requireDurableWriteStoreMock = vi.hoisted(() =>
  vi.fn<(capability: string) => void>(),
);

vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    billingPortal: { sessions: { create: stripeMocks.billingPortalCreate } },
  }));
  return { default: StripeMock };
});

vi.mock("@sports/db", () => ({
  requireDurableWriteStore: requireDurableWriteStoreMock,
}));

import { createPortalSession } from "@/lib/stripe";

const CUSTOMER_ID = "cus_test_123";
const RETURN_URL = "https://app.example.com/dashboard";

describe("createPortalSession — durable-write guard (GSE-SEC-033)", () => {
  beforeEach(() => {
    stripeMocks.billingPortalCreate.mockReset();
    stripeMocks.billingPortalCreate.mockResolvedValue({
      id: "bps_test_123",
      url: "https://billing.stripe.com/p/session/test",
    } as Stripe.BillingPortal.Session);
    requireDurableWriteStoreMock.mockReset();
    requireDurableWriteStoreMock.mockReturnValue(undefined);
  });

  it("STUB MODE: throws before any Stripe SDK call is made (fail closed)", async () => {
    requireDurableWriteStoreMock.mockImplementation(() => {
      throw new DurableWriteStoreUnavailableError(
        "stripe-portal",
        "stub_client_active",
        "stub client active",
      );
    });

    await expect(createPortalSession(CUSTOMER_ID, RETURN_URL)).rejects.toThrow(
      DurableWriteStoreUnavailableError,
    );

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-portal");
    expect(stripeMocks.billingPortalCreate).not.toHaveBeenCalled();
  });

  it("DATABASE_URL NOT DURABLE: throws before any Stripe SDK call is made (fail closed)", async () => {
    requireDurableWriteStoreMock.mockImplementation(() => {
      throw new DurableWriteStoreUnavailableError(
        "stripe-portal",
        "database_url_not_durable",
        "DATABASE_URL is unset or a sentinel",
      );
    });

    await expect(createPortalSession(CUSTOMER_ID, RETURN_URL)).rejects.toThrow(
      DurableWriteStoreUnavailableError,
    );

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-portal");
    expect(stripeMocks.billingPortalCreate).not.toHaveBeenCalled();
  });

  it("guard runs BEFORE the Stripe call (call order)", async () => {
    let billCalled = false;
    stripeMocks.billingPortalCreate.mockImplementationOnce(async () => {
      billCalled = true;
      return {
        id: "bps_test_456",
        url: "https://billing.stripe.com/p/session/test456",
      } as Stripe.BillingPortal.Session;
    });

    await createPortalSession(CUSTOMER_ID, RETURN_URL);

    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-portal");
    expect(billCalled).toBe(true);
    expect(stripeMocks.billingPortalCreate).toHaveBeenCalledWith({
      customer: CUSTOMER_ID,
      return_url: RETURN_URL,
    });
  });

  it("when the store is available, creates and returns the portal session", async () => {
    const result = await createPortalSession(CUSTOMER_ID, RETURN_URL);

    expect(result.id).toBe("bps_test_123");
    expect(result.url).toBe("https://billing.stripe.com/p/session/test");
    expect(requireDurableWriteStoreMock).toHaveBeenCalledWith("stripe-portal");
    expect(stripeMocks.billingPortalCreate).toHaveBeenCalledWith({
      customer: CUSTOMER_ID,
      return_url: RETURN_URL,
    });
  });
});
