import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Point-of-sale consent + auto-renewal disclosure (FTC ROSCA + state
 * auto-renewal-law compliance).
 *
 * createCheckoutSession() must ask Stripe Checkout to collect an affirmative
 * Terms-of-Service consent BEFORE the first recurring charge — and must do so
 * WITHOUT dropping any of the core session params (price, subscription mode,
 * success/cancel URLs, metadata). We mock the Stripe SDK and inspect exactly
 * what is passed to stripe.checkout.sessions.create.
 */

const stripeMocks = vi.hoisted(() => ({
  create:
    vi.fn<
      (params: Stripe.Checkout.SessionCreateParams) => Promise<Stripe.Checkout.Session>
    >(),
}));

vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: stripeMocks.create } },
  }));
  return { default: StripeMock };
});

import { createCheckoutSession } from "@/lib/stripe";

const ARGS = {
  customerId: "cus_test_1",
  priceId: "price_test_1",
  userId: "user_test_1",
  successUrl: "https://app.example.com/dashboard?upgraded=true",
  cancelUrl: "https://app.example.com/pricing",
} as const;

function lastCreateParams(): Stripe.Checkout.SessionCreateParams {
  const call = stripeMocks.create.mock.calls[0];
  expect(call).toBeDefined();
  return call![0];
}

describe("createCheckoutSession — negative-option compliance", () => {
  beforeEach(() => {
    stripeMocks.create.mockReset();
    stripeMocks.create.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    } as Stripe.Checkout.Session);
  });

  it("requires an affirmative Terms-of-Service consent at checkout", async () => {
    await createCheckoutSession({ ...ARGS });

    expect(stripeMocks.create).toHaveBeenCalledTimes(1);
    const params = lastCreateParams();
    expect(params.consent_collection?.terms_of_service).toBe("required");
  });

  it("shows a recurring/auto-renew acceptance line beside the consent checkbox", async () => {
    await createCheckoutSession({ ...ARGS });

    const params = lastCreateParams();
    const message = params.custom_text?.terms_of_service_acceptance;
    // Emptyable<TermsOfServiceAcceptance> is the object form here (we set it).
    const text =
      message && typeof message === "object" ? message.message : "";
    expect(text.toLowerCase()).toContain("recurring");
    expect(text.toLowerCase()).toContain("auto-renew");
  });

  it("preserves the core checkout params (price, mode, urls, metadata)", async () => {
    await createCheckoutSession({ ...ARGS });

    const params = lastCreateParams();
    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([{ price: "price_test_1", quantity: 1 }]);
    expect(params.customer).toBe("cus_test_1");
    expect(params.success_url).toBe(ARGS.successUrl);
    expect(params.cancel_url).toBe(ARGS.cancelUrl);
    expect(params.metadata).toEqual({ userId: "user_test_1" });
    expect(params.subscription_data?.metadata).toEqual({ userId: "user_test_1" });
  });
});
