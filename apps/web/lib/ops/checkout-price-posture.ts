/**
 * Checkout price-consistency posture — the visibility issue #822 was missing.
 *
 * Checkout has returned 503 since 2026-09-09 and written nothing: no
 * `checkout_attempts` row, no Stripe session, no log anyone reads.
 * `PRICING_PHASE=PROVEN` advertises Pro at 1999c; the Stripe Price
 * `resolveCheckoutPriceId` (lib/stripe.ts) resolves is immutable at 1499c
 * (minted under FOUNDING); `verifyEnvPriceAmount` correctly refuses to return
 * a price whose amount does not match what we advertise, `stripe.ts:248`
 * fails closed, and `checkout/route.ts` returns 503 before the
 * `checkout_attempts` row 268 lines later is ever written. Fail-closed here is
 * CORRECT — the alternative charges an amount the customer never agreed to —
 * but the failure was invisible: nothing surfaced that the advertised phase
 * and the configured Stripe Prices had drifted apart.
 *
 * This module is that surface. It reports the CONFIG SHAPE only and makes
 * ZERO Stripe network calls, so it can sit on the public, unauthenticated
 * `/api/ops/public-surface-truth` route without adding latency or an
 * external dependency to every hit. That is also its limit: it cannot
 * confirm a configured price ID actually charges the advertised amount —
 * only `lib/stripe.ts`'s live `verifyEnvPriceAmount` (which does call
 * Stripe, deliberately, inside a real checkout attempt) can do that. What
 * this surfaces instead is the RISK the outage came from: which phase is
 * currently advertised, what it advertises in cents per tier × interval (the
 * same number `advertisedPhaseUnitAmountCents` feeds into the live check),
 * and whether an explicit env price id is configured for that slot — never
 * the price id value itself, never a secret.
 *
 * Booleans and cent amounts only, per issue #822's own scope note. Fixing an
 * actual mismatch is founder-only (AGENTS.md: editing pricing-phases.ts
 * amounts or loosening stripe.ts:248 mis-states a price to a customer) — this
 * module never touches either.
 */

import {
  getCurrentPricingPhaseId,
  type PricingPhaseId,
} from "@/lib/pricing/pricing-phases";
import {
  advertisedPhaseUnitAmountCents,
  checkoutPriceId,
  type BillingInterval,
  type PaidTier,
} from "@/lib/billing/price-ids";

const PAID_TIERS = ["FANTASY", "PRO", "ELITE"] as const satisfies readonly PaidTier[];
const INTERVALS = ["month", "year"] as const satisfies readonly BillingInterval[];

export type CheckoutPriceSlotPosture = {
  readonly tier: PaidTier;
  readonly interval: BillingInterval;
  /** What the live phase currently advertises, in whole cents. Never a Stripe call. */
  readonly advertisedCents: number;
  /** STRIPE_<TIER>_[MONTHLY|ANNUAL]_PRICE_ID present (boolean only — never the value). */
  readonly envPriceIdConfigured: boolean;
};

export interface CheckoutPricePosture {
  readonly phase: PricingPhaseId;
  /**
   * FOUNDING is the phase every price id was presumably minted under; any
   * later phase is the exact risk window #822 lived in — a Stripe Price is
   * immutable, so it never updates itself when the phase steps up.
   */
  readonly phaseAdvancedPastFounding: boolean;
  readonly slots: readonly CheckoutPriceSlotPosture[];
  readonly operatorHint: string;
}

export function loadCheckoutPricePosture(
  env: Record<string, string | undefined> = process.env,
): CheckoutPricePosture {
  const phase = getCurrentPricingPhaseId();
  const phaseAdvancedPastFounding = phase !== "FOUNDING";

  const slots: CheckoutPriceSlotPosture[] = [];
  for (const tier of PAID_TIERS) {
    for (const interval of INTERVALS) {
      slots.push({
        tier,
        interval,
        advertisedCents: advertisedPhaseUnitAmountCents(tier, interval),
        envPriceIdConfigured: Boolean(checkoutPriceId(tier, interval, env)),
      });
    }
  }

  const operatorHint = phaseAdvancedPastFounding
    ? `PRICING_PHASE is ${phase}, not FOUNDING. Every configured STRIPE_*_PRICE_ID must charge exactly the cents listed for its tier/interval — Stripe Prices are immutable, so a price minted under an earlier phase does not update itself when the phase steps up. This surface cannot confirm a match (it makes no Stripe calls); verify each configured price's unit_amount in the Stripe Dashboard against the cents below. A mismatch fails checkout closed with a 503 and writes no checkout_attempts row (issue #822).`
    : `PRICING_PHASE is FOUNDING, the phase every price id was presumably minted under. Stepping the phase is a founder-only action (law 3, docs/ops/OPERATOR.md §5) — re-check this surface immediately after any step-up, before a real customer hits checkout.`;

  return { phase, phaseAdvancedPastFounding, slots, operatorHint };
}
