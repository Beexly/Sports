import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * REGRESSION — GSE-SEC-024, env path.
 *
 * `resolveCheckoutPriceId` used to return the env-configured Stripe price ID
 * *unvalidated*, and only ran the amount guard on the lookup_key FALLBACK. Env
 * IDs are the preferred path AND the documented production config, so in
 * production the guard effectively never ran.
 *
 * Concrete failure it allowed: an operator pastes the MONTHLY price id into
 * STRIPE_PRO_ANNUAL_PRICE_ID. The pricing page advertises $99/yr; Stripe bills
 * $14.99 every month. Nothing detected it. The mirror case (an annual id in a
 * `_MONTHLY_` var) was equally silent because no `recurring.interval` check
 * existed anywhere.
 *
 * The two mismatch axes are asserted SEPARATELY: a price can agree on amount
 * and lie about interval, or vice versa.
 */

const stripeMock = vi.hoisted(() => ({
  pricesRetrieve: vi.fn<(id: string) => Promise<unknown>>(),
  pricesList: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("stripe", () => {
  class FakeStripe {
    prices = { retrieve: stripeMock.pricesRetrieve, list: stripeMock.pricesList };
    webhooks = { constructEvent: vi.fn() };
  }
  return { default: FakeStripe };
});

import { resolveCheckoutPriceId } from "@/lib/stripe";

const ENV_PRO_ANNUAL = "price_env_pro_annual";

/** Advertised founding rates (pricing-phases.ts): PRO $14.99/mo, $99/yr. */
const PRO_MONTH_CENTS = 1499;
const PRO_YEAR_CENTS = 9900;

function price(overrides: Record<string, unknown> = {}) {
  return {
    id: ENV_PRO_ANNUAL,
    unit_amount: PRO_YEAR_CENTS,
    recurring: { interval: "year" },
    ...overrides,
  };
}

const ORIGINAL_SECRET = process.env["STRIPE_SECRET_KEY"];

describe("resolveCheckoutPriceId — env price IDs are validated, not trusted", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stripeMock.pricesRetrieve.mockReset();
    stripeMock.pricesList.mockReset();
    process.env["STRIPE_SECRET_KEY"] = "sk_test_guard";
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    if (ORIGINAL_SECRET === undefined) delete process.env["STRIPE_SECRET_KEY"];
    else process.env["STRIPE_SECRET_KEY"] = ORIGINAL_SECRET;
  });

  const annualEnv = { STRIPE_PRO_ANNUAL_PRICE_ID: ENV_PRO_ANNUAL } as NodeJS.ProcessEnv;

  it("returns the env price ID when BOTH amount and interval match the advertised plan", async () => {
    stripeMock.pricesRetrieve.mockResolvedValue(price());

    await expect(resolveCheckoutPriceId("PRO", "year", annualEnv)).resolves.toBe(
      ENV_PRO_ANNUAL,
    );
    expect(stripeMock.pricesRetrieve).toHaveBeenCalledWith(ENV_PRO_ANNUAL);
  });

  // ── Axis 1: AMOUNT ───────────────────────────────────────────────────────
  it("AXIS 1 (amount): refuses an env price whose unit_amount is not the advertised $99/yr", async () => {
    // Interval is correct — only the money is wrong. Charging $149 for a plan
    // the page sells at $99 must never reach Stripe Checkout.
    stripeMock.pricesRetrieve.mockResolvedValue(
      price({ unit_amount: 14900, recurring: { interval: "year" } }),
    );

    await expect(resolveCheckoutPriceId("PRO", "year", annualEnv)).resolves.toBe("");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("unit_amount mismatch for PRO/year (env)"),
    );
  });

  it("AXIS 1 (amount): refuses an env price with a null unit_amount (unverifiable → fail closed)", async () => {
    stripeMock.pricesRetrieve.mockResolvedValue(price({ unit_amount: null }));

    await expect(resolveCheckoutPriceId("PRO", "year", annualEnv)).resolves.toBe("");
  });

  // ── Axis 2: INTERVAL ─────────────────────────────────────────────────────
  it("AXIS 2 (interval): refuses an env price billed monthly when checkout is selling the annual plan", async () => {
    // THE reported bug, exactly: the MONTHLY price id pasted into
    // STRIPE_PRO_ANNUAL_PRICE_ID. Page says $99/yr; Stripe would bill
    // $14.99/month forever. Note the amount here is a *valid advertised* PRO
    // amount — the amount guard alone cannot catch this, which is why the
    // interval is its own axis.
    stripeMock.pricesRetrieve.mockResolvedValue(
      price({ unit_amount: PRO_MONTH_CENTS, recurring: { interval: "month" } }),
    );

    await expect(resolveCheckoutPriceId("PRO", "year", annualEnv)).resolves.toBe("");
  });

  it("AXIS 2 (interval): refuses an ANNUAL price wired into the MONTHLY slot (mirror case)", async () => {
    const monthlyEnv = {
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_env_pro_monthly",
    } as NodeJS.ProcessEnv;
    stripeMock.pricesRetrieve.mockResolvedValue(
      price({
        id: "price_env_pro_monthly",
        unit_amount: PRO_YEAR_CENTS,
        recurring: { interval: "year" },
      }),
    );

    await expect(resolveCheckoutPriceId("PRO", "month", monthlyEnv)).resolves.toBe("");
  });

  it("AXIS 2 (interval): refuses a ONE-TIME env price (no recurring block)", async () => {
    // Amount agrees; there is simply no subscription interval. A one-time
    // charge for a subscription is a silent product mismatch.
    stripeMock.pricesRetrieve.mockResolvedValue(
      price({ unit_amount: PRO_YEAR_CENTS, recurring: null }),
    );

    await expect(resolveCheckoutPriceId("PRO", "year", annualEnv)).resolves.toBe("");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("recurring.interval mismatch for PRO/year (env)"),
    );
  });

  // ── Surrounding fail-closed behaviour ────────────────────────────────────
  it("returns '' (never the raw env value) when the Stripe retrieve throws", async () => {
    stripeMock.pricesRetrieve.mockRejectedValue(new Error("No such price"));

    await expect(resolveCheckoutPriceId("PRO", "year", annualEnv)).resolves.toBe("");
  });

  it("returns '' when STRIPE_SECRET_KEY is absent — an env price cannot be verified", async () => {
    delete process.env["STRIPE_SECRET_KEY"];

    await expect(resolveCheckoutPriceId("PRO", "year", annualEnv)).resolves.toBe("");
    expect(stripeMock.pricesRetrieve).not.toHaveBeenCalled();
  });

  it("still validates the lookup_key fallback on both axes", async () => {
    stripeMock.pricesList.mockResolvedValue({
      data: [
        { id: "price_lookup", unit_amount: PRO_MONTH_CENTS, recurring: { interval: "month" } },
      ],
    });

    // Selling the ANNUAL plan; the lookup_key price is monthly → refused.
    await expect(resolveCheckoutPriceId("PRO", "year", {} as NodeJS.ProcessEnv)).resolves.toBe(
      "",
    );
  });
});
