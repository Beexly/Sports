import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Point-of-sale consent + auto-renewal disclosure (FTC ROSCA + state
 * auto-renewal-law compliance).
 *
 * createCheckoutSession() may ask Stripe Checkout to collect an affirmative
 * Terms-of-Service consent BEFORE the first recurring charge — but that
 * REQUIRES the operator to have set a public Terms-of-Service URL in the Stripe
 * Dashboard first; otherwise Stripe rejects the session (every checkout 500s).
 * So the consent is OPT-IN behind STRIPE_TERMS_CONSENT_ENABLED, DEFAULT OFF:
 *   - flag off  → no consent_collection at all (byte-behaviour-identical to the
 *                 pre-consent checkout: safe to deploy before the URL is set),
 *   - flag on   → consent_collection.terms_of_service = "required", and we must
 *                 NOT override Stripe's linked ToS-acceptance checkbox copy.
 * Either way, the honest recurring-billing line lives under custom_text.submit
 * (near the submit button) so it never clobbers the ToS checkbox link — and the
 * core session params (price, mode, urls, metadata) are always preserved.
 * We mock the Stripe SDK and inspect exactly what is passed to
 * stripe.checkout.sessions.create.
 */

const stripeMocks = vi.hoisted(() => ({
  create:
    vi.fn<
      (
        params: Stripe.Checkout.SessionCreateParams,
        options?: { idempotencyKey?: string },
      ) => Promise<Stripe.Checkout.Session>
    >(),
}));

vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: stripeMocks.create } },
  }));
  return { default: StripeMock };
});

import { createCheckoutSession } from "@/lib/stripe";

const CONSENT_FLAG = "STRIPE_TERMS_CONSENT_ENABLED";

const ARGS = {
  customerId: "cus_test_1",
  priceId: "price_test_1",
  userId: "user_test_1",
  successUrl: "https://app.example.com/dashboard?upgraded=true",
  cancelUrl: "https://app.example.com/pricing",
  checkoutAttemptId: "11111111-1111-4111-8111-111111111111",
} as const;

function lastCreateParams(): Stripe.Checkout.SessionCreateParams {
  const call = stripeMocks.create.mock.calls[0];
  expect(call).toBeDefined();
  return call![0];
}

function submitMessage(params: Stripe.Checkout.SessionCreateParams): string {
  const submit = params.custom_text?.submit;
  return submit && typeof submit === "object" ? submit.message ?? "" : "";
}

describe("createCheckoutSession — negative-option compliance", () => {
  let originalFlag: string | undefined;

  beforeEach(() => {
    originalFlag = process.env[CONSENT_FLAG];
    // Default the flag OFF for every case; individual cases opt in explicitly.
    delete process.env[CONSENT_FLAG];
    stripeMocks.create.mockReset();
    stripeMocks.create.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    } as Stripe.Checkout.Session);
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env[CONSENT_FLAG];
    } else {
      process.env[CONSENT_FLAG] = originalFlag;
    }
  });

  describe("with the Terms-consent flag OFF (safe default)", () => {
    it("omits consent_collection entirely when the flag is unset", async () => {
      await createCheckoutSession({ ...ARGS });

      expect(stripeMocks.create).toHaveBeenCalledTimes(1);
      const params = lastCreateParams();
      expect(params.consent_collection).toBeUndefined();
    });

    it('omits consent_collection when the flag is explicitly "false"', async () => {
      process.env[CONSENT_FLAG] = "false";

      await createCheckoutSession({ ...ARGS });

      const params = lastCreateParams();
      expect(params.consent_collection).toBeUndefined();
    });

    it("still never overrides Stripe's linked ToS-acceptance checkbox copy", async () => {
      await createCheckoutSession({ ...ARGS });

      const params = lastCreateParams();
      expect(params.custom_text?.terms_of_service_acceptance).toBeUndefined();
    });
  });

  describe('with the Terms-consent flag ON ("true")', () => {
    beforeEach(() => {
      process.env[CONSENT_FLAG] = "true";
    });

    it("requires an affirmative Terms-of-Service consent at checkout", async () => {
      await createCheckoutSession({ ...ARGS });

      expect(stripeMocks.create).toHaveBeenCalledTimes(1);
      const params = lastCreateParams();
      expect(params.consent_collection?.terms_of_service).toBe("required");
    });

    it("does NOT override Stripe's default linked ToS-acceptance text", async () => {
      await createCheckoutSession({ ...ARGS });

      const params = lastCreateParams();
      // Removing the custom_text.terms_of_service_acceptance override keeps
      // Stripe's default copy — which includes the LINK to the configured Terms.
      expect(params.custom_text?.terms_of_service_acceptance).toBeUndefined();
    });
  });

  it("keeps any recurring/auto-renew line under custom_text.submit (not the ToS checkbox)", async () => {
    await createCheckoutSession({ ...ARGS });

    const params = lastCreateParams();
    // The ToS-acceptance override must never be set (it would clobber the link).
    expect(params.custom_text?.terms_of_service_acceptance).toBeUndefined();
    const text = submitMessage(params).toLowerCase();
    expect(text).toContain("recurring");
    expect(text).toContain("auto-renew");
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

  it("keys idempotency on userId + the per-intent attempt id (not user+price)", async () => {
    await createCheckoutSession({ ...ARGS });
    const options = stripeMocks.create.mock.calls[0]![1];
    expect(options?.idempotencyKey).toBe(
      `gse-checkout-${ARGS.userId}-${ARGS.checkoutAttemptId}`,
    );
    // The price id must NOT appear in the key — that was the collapse-bug.
    expect(options?.idempotencyKey).not.toContain(ARGS.priceId);
  });

  it("rejects a malformed checkoutAttemptId before calling Stripe", async () => {
    await expect(
      createCheckoutSession({ ...ARGS, checkoutAttemptId: "nope" }),
    ).rejects.toThrow(/checkoutAttemptId/);
    expect(stripeMocks.create).not.toHaveBeenCalled();
  });
});
