import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn<(id: string) => Promise<{ id: string; unit_amount: number | null }>>(),
  list: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    prices = { retrieve: mocks.retrieve, list: mocks.list };
  },
}));

import {
  __resetEnvPriceVerdictCache,
  resolveCheckoutPriceId,
  verifyEnvPriceAmount,
} from "@/lib/stripe";
import { advertisedPhaseUnitAmountCents } from "@/lib/billing/price-ids";

/**
 * GSE-SEC-024 verified the Stripe price's amount against the advertised price
 * on the lookup_key branch only. The env branch returned its price ID with no
 * check at all — and that is the branch production runs, because OPERATOR.md
 * tells the operator to set all six STRIPE_*_PRICE_ID vars and the live truth
 * surface reports envPriceSlotsConfigured 6 of 6. The guarded path was
 * effectively dead; the unguarded one took every real checkout.
 *
 * Every value below is a labelled fixture. No real price ID, key or amount.
 */

const PRO_MONTH_CENTS = advertisedPhaseUnitAmountCents("PRO", "month");

describe("verifyEnvPriceAmount", () => {
  beforeEach(() => {
    __resetEnvPriceVerdictCache();
    mocks.retrieve.mockReset();
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fixture";
  });

  afterEach(() => {
    delete process.env["STRIPE_SECRET_KEY"];
  });

  it("matches when the env price charges the advertised amount", async () => {
    mocks.retrieve.mockResolvedValue({ id: "price_fixture", unit_amount: PRO_MONTH_CENTS });
    await expect(verifyEnvPriceAmount("price_fixture", "PRO", "month")).resolves.toBe("match");
  });

  it("reports a mismatch when the env price charges something else", async () => {
    mocks.retrieve.mockResolvedValue({ id: "price_wrong", unit_amount: PRO_MONTH_CENTS + 1000 });
    await expect(verifyEnvPriceAmount("price_wrong", "PRO", "month")).resolves.toBe("mismatch");
  });

  it("reports a mismatch when the price carries no amount at all", async () => {
    mocks.retrieve.mockResolvedValue({ id: "price_null", unit_amount: null });
    await expect(verifyEnvPriceAmount("price_null", "PRO", "month")).resolves.toBe("mismatch");
  });

  it("is unverifiable, not a mismatch, when Stripe errors", async () => {
    // The distinction the whole design rests on: an outage is not evidence.
    mocks.retrieve.mockRejectedValue(new Error("stripe unreachable (fixture)"));
    await expect(verifyEnvPriceAmount("price_fixture", "PRO", "month")).resolves.toBe("unverifiable");
  });

  it("is unverifiable when no secret key is configured", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    await expect(verifyEnvPriceAmount("price_fixture", "PRO", "month")).resolves.toBe("unverifiable");
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });

  it("caches a definite verdict, so the money path does not pay a round-trip per checkout", async () => {
    mocks.retrieve.mockResolvedValue({ id: "price_fixture", unit_amount: PRO_MONTH_CENTS });
    await verifyEnvPriceAmount("price_fixture", "PRO", "month");
    await verifyEnvPriceAmount("price_fixture", "PRO", "month");
    expect(mocks.retrieve).toHaveBeenCalledTimes(1);
  });

  it("does NOT cache an unverifiable result, so an outage cannot pin the answer", async () => {
    // If a transient error were cached, a real mismatch could stay invisible
    // for the whole TTL. The retry is the point.
    mocks.retrieve.mockRejectedValueOnce(new Error("transient (fixture)"));
    mocks.retrieve.mockResolvedValue({ id: "p", unit_amount: PRO_MONTH_CENTS + 500 });
    await expect(verifyEnvPriceAmount("p", "PRO", "month")).resolves.toBe("unverifiable");
    await expect(verifyEnvPriceAmount("p", "PRO", "month")).resolves.toBe("mismatch");
  });
});

describe("resolveCheckoutPriceId — the env branch is guarded", () => {
  beforeEach(() => {
    __resetEnvPriceVerdictCache();
    mocks.retrieve.mockReset();
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fixture";
  });

  afterEach(() => {
    delete process.env["STRIPE_SECRET_KEY"];
  });

  const envWith = (id: string): NodeJS.ProcessEnv =>
    ({ STRIPE_PRO_MONTHLY_PRICE_ID: id }) as NodeJS.ProcessEnv;

  it("returns the env price when its amount matches", async () => {
    mocks.retrieve.mockResolvedValue({ id: "price_ok", unit_amount: PRO_MONTH_CENTS });
    await expect(resolveCheckoutPriceId("PRO", "month", envWith("price_ok"))).resolves.toBe("price_ok");
  });

  it("REFUSES the env price when its amount does not match, rather than charging it", async () => {
    mocks.retrieve.mockResolvedValue({ id: "price_bad", unit_amount: PRO_MONTH_CENTS + 2000 });
    await expect(resolveCheckoutPriceId("PRO", "month", envWith("price_bad"))).resolves.toBe("");
  });

  it("REFUSES the env price when the amount cannot be verified at all", async () => {
    // CORRECTION. An earlier revision returned the price here, arguing an
    // outage is not evidence of a wrong amount so refusing every sale costs
    // availability without buying honesty. That reasoning had a hole (Devin
    // Review, #719): if `prices.retrieve` cannot reach Stripe then
    // `checkout.sessions.create` almost certainly cannot either, so the
    // availability it protected was largely illusory. What it did leave open
    // is the narrow real case — retrieve fails transiently, session create
    // succeeds, price is misconfigured — and on a money path a recoverable 503
    // beats an unrecoverable wrong charge.
    mocks.retrieve.mockRejectedValue(new Error("stripe unreachable (fixture)"));
    await expect(resolveCheckoutPriceId("PRO", "month", envWith("price_ok"))).resolves.toBe("");
  });
});
