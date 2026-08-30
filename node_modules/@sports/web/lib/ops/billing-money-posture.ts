/**
 * Public-safe money-path posture for ops truth (no secrets, no Stripe network).
 *
 * Answers: "is checkout / webhook / price env positioned for revenue?"
 * Complements credit-stack-posture (AI cost) on the multi-domain founder queue.
 */

import {
  checkoutPriceId,
  STRIPE_LOOKUP_KEYS,
  type BillingInterval,
  type PaidTier,
} from "@/lib/billing/price-ids";

export type Env = Record<string, string | undefined>;

const PAID_TIERS = ["FANTASY", "PRO", "ELITE"] as const satisfies readonly PaidTier[];
const INTERVALS = ["month", "year"] as const satisfies readonly BillingInterval[];

export type PriceEnvSlot = {
  readonly tier: PaidTier;
  readonly interval: BillingInterval;
  readonly envConfigured: boolean;
  readonly lookupKey: string;
};

export interface BillingMoneyPosture {
  /** STRIPE_SECRET_KEY present (boolean only). */
  readonly stripeSecretConfigured: boolean;
  /** STRIPE_WEBHOOK_SECRET present (boolean only). */
  readonly webhookSecretConfigured: boolean;
  /** Count of tier×interval env price ids currently set (0–6). */
  readonly envPriceSlotsConfigured: number;
  /** Max tier×interval slots (always 6). */
  readonly envPriceSlotsTotal: number;
  /** Per-slot env presence + lookup_key fallback name (no price id values). */
  readonly priceSlots: readonly PriceEnvSlot[];
  /**
   * True when secret is set — checkout can resolve via env price id OR
   * Stripe lookup_key (gse-*-monthly/annual) at request time.
   */
  readonly checkoutCreatable: boolean;
  /**
   * Full money-path readiness for entitlements: secret + webhook present.
   * Env price ids optional when Stripe Dashboard has lookup_keys.
   */
  readonly moneyPathReady: boolean;
  readonly checkoutApiPath: "/api/subscriptions/checkout";
  readonly webhookApiPath: "/api/webhooks/stripe";
  readonly portalApiPath: "/api/subscriptions/portal";
  readonly operatorHint: string;
}

function has(env: Env, key: string): boolean {
  return Boolean(env[key]?.trim());
}

export function loadBillingMoneyPosture(env: Env = process.env): BillingMoneyPosture {
  const stripeSecretConfigured = has(env, "STRIPE_SECRET_KEY");
  const webhookSecretConfigured = has(env, "STRIPE_WEBHOOK_SECRET");

  const priceSlots: PriceEnvSlot[] = [];
  for (const tier of PAID_TIERS) {
    for (const interval of INTERVALS) {
      const id = checkoutPriceId(tier, interval, env);
      priceSlots.push({
        tier,
        interval,
        envConfigured: Boolean(id),
        lookupKey: STRIPE_LOOKUP_KEYS[tier][interval],
      });
    }
  }

  const envPriceSlotsConfigured = priceSlots.filter((s) => s.envConfigured).length;
  const checkoutCreatable = stripeSecretConfigured;
  const moneyPathReady = stripeSecretConfigured && webhookSecretConfigured;

  let operatorHint: string;
  if (!stripeSecretConfigured) {
    operatorHint =
      "STRIPE_SECRET_KEY missing — checkout API will fail closed. Wire secret + prices/lookup_keys.";
  } else if (!webhookSecretConfigured) {
    operatorHint =
      "Stripe secret present but STRIPE_WEBHOOK_SECRET missing — sessions may create without durable entitlements.";
  } else if (envPriceSlotsConfigured === 0) {
    operatorHint =
      "Webhook ready; no STRIPE_*_PRICE_ID envs — checkout relies on Stripe lookup_keys (gse-*-monthly/annual).";
  } else if (envPriceSlotsConfigured < 6) {
    operatorHint = `Money path ready (${envPriceSlotsConfigured}/6 env price slots). Missing slots fall back to lookup_key.`;
  } else {
    operatorHint =
      "Money path ready: secret + webhook + full env price matrix. Confirm Dashboard webhook endpoints point at galaxysportsedge.com only.";
  }

  return {
    stripeSecretConfigured,
    webhookSecretConfigured,
    envPriceSlotsConfigured,
    envPriceSlotsTotal: 6,
    priceSlots,
    checkoutCreatable,
    moneyPathReady,
    checkoutApiPath: "/api/subscriptions/checkout",
    webhookApiPath: "/api/webhooks/stripe",
    portalApiPath: "/api/subscriptions/portal",
    operatorHint,
  };
}
