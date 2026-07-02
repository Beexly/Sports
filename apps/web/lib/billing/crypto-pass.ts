import { createHmac, timingSafeEqual } from "node:crypto";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";

/**
 * Crypto fixed-term passes (owner-approved; CRYPTO-PAYMENTS-SPEC.md).
 *
 * Crypto has no card-style auto-renewal, so the honest product is an ANNUAL
 * PASS: pay once, hold the tier until period end, renew deliberately. Prices
 * come from the live pricing phase — the single source of truth — never a
 * second price list that can drift.
 *
 * Everything here is pure (no I/O) so the grant math and the webhook
 * signature check are unit-testable exactly like the rest of the engine.
 */

export type CryptoPassTier = "PRO" | "ELITE";

export const CRYPTO_PASS_DAYS = 365;

export function cryptoPaymentsEnabled(): boolean {
  return (
    process.env["CRYPTO_PAYMENTS_ENABLED"] === "true" &&
    Boolean(process.env["COINBASE_COMMERCE_API_KEY"]) &&
    Boolean(process.env["COINBASE_COMMERCE_WEBHOOK_SECRET"])
  );
}

/** USD price for an annual crypto pass, straight from the live phase ladder. */
export function cryptoPassPriceUsd(tier: CryptoPassTier): number {
  const phase = getCurrentPricingPhase();
  return tier === "PRO" ? phase.pro.annual : phase.elite.annual;
}

/** Pass window: start now, end exactly CRYPTO_PASS_DAYS later. */
export function cryptoPassPeriod(now: Date): { start: Date; end: Date } {
  return {
    start: now,
    end: new Date(now.getTime() + CRYPTO_PASS_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function isCryptoPassTier(value: unknown): value is CryptoPassTier {
  return value === "PRO" || value === "ELITE";
}

/**
 * Verify a Coinbase Commerce webhook signature: hex HMAC-SHA256 of the RAW
 * request body with the shared secret (X-CC-Webhook-Signature header).
 * Timing-safe compare; malformed input verifies false, never throws.
 */
export function verifyCommerceSignature(
  rawBody: string,
  signatureHeader: string | null,
  sharedSecret: string,
): boolean {
  if (!signatureHeader || !sharedSecret) return false;
  try {
    const expected = createHmac("sha256", sharedSecret).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signatureHeader.trim().toLowerCase(), "hex");
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Extract the grant instruction from a Commerce webhook event. Returns null
 * for anything that must NOT grant access: wrong event type (pending,
 * failed), missing/invalid metadata, unknown tier. Grant-on-confirmed-only
 * is the hard rule — an underpaid or dropped charge never unlocks a tier.
 */
export function grantFromCommerceEvent(event: unknown): {
  chargeCode: string;
  userId: string;
  tier: CryptoPassTier;
} | null {
  if (typeof event !== "object" || event === null) return null;
  const e = event as {
    type?: unknown;
    data?: { code?: unknown; metadata?: { userId?: unknown; tier?: unknown } };
  };
  if (e.type !== "charge:confirmed") return null;
  const code = e.data?.code;
  const userId = e.data?.metadata?.userId;
  const tier = e.data?.metadata?.tier;
  if (typeof code !== "string" || code.trim() === "") return null;
  if (typeof userId !== "string" || userId.trim() === "") return null;
  if (!isCryptoPassTier(tier)) return null;
  return { chargeCode: code, userId, tier };
}
