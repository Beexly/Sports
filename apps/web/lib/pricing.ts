/**
 * Customer-facing pricing — the SINGLE source of truth for every number
 * shown anywhere (pricing page, picks CTAs, FAQ, OG metadata).
 *
 * This module is intentionally pure (no Stripe SDK, no env reads) so it can
 * be imported by statically-rendered server components without dragging the
 * Stripe client — and its STRIPE_SECRET_KEY requirement — into the build.
 *
 * `lib/stripe.ts` re-exports PRICE_DISPLAY from here. Keep these amounts in
 * lockstep with the live Stripe prices created by
 * `scripts/seed-stripe-prices.mjs`.
 */

export type PaidTier = "PRO" | "ELITE" | "VIP";

export interface TierPrice {
  amount: number;
  label: string;
  /** Billing cadence. Galaxy bills weekly. */
  period: "week";
}

export const PRICE_DISPLAY: Record<PaidTier, TierPrice> = {
  PRO: { amount: 14.99, label: "Pro", period: "week" },
  ELITE: { amount: 21.99, label: "Elite", period: "week" },
  VIP: { amount: 49.99, label: "VIP", period: "week" },
};

/** "$14.99" — drops the trailing cents only when the amount is whole. */
export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** "$14.99/week" — the canonical inline price string. */
export function formatPricePerPeriod(tier: PaidTier): string {
  const p = PRICE_DISPLAY[tier];
  return `${formatPrice(p.amount)}/${p.period}`;
}
