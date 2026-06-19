/**
 * Galaxy Dynasty — Merch Foundry + cosmetic store (bible Phase 6).
 *
 * HARD-STOP #1 (real money) is honored architecturally: Stripe stays in TEST
 * MODE. `assertTestModeOnly` refuses to proceed if a LIVE secret key is present,
 * and no code path here ever converts Galaxy currency to cash (Credit
 * Constitution §4.2). Cosmetics are bought with Nova (premium currency, acquired
 * via Stripe test mode); achievement-gated merch is an entitlement unlock, not a
 * purchase.
 *
 * This module is intentionally decoupled from `lib/stripe.ts` (which instantiates
 * a client at import and would throw without a key). Real test-mode Checkout
 * wiring is a logged roadmap item once the owner creates Nova price IDs.
 */

export interface CosmeticItem {
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly novaPrice: number;
  readonly kind: "avatar_frame" | "vault_skin" | "faction_banner" | "card_frame";
}

export const COSMETICS: readonly CosmeticItem[] = [
  {
    sku: "orbital-avatar-frame",
    name: "Orbital Avatar Frame",
    description: "A rotating orbital ring around your avatar in My Dynasty.",
    novaPrice: 200,
    kind: "avatar_frame",
  },
  {
    sku: "gold-vault-skin",
    name: "Gold Vault Skin",
    description: "A gold-leaf finish for your Vault card backs.",
    novaPrice: 350,
    kind: "vault_skin",
  },
  {
    sku: "faction-banner",
    name: "Faction Banner",
    description: "Fly your faction crest on your public profile.",
    novaPrice: 150,
    kind: "faction_banner",
  },
] as const;

export interface NovaPack {
  readonly sku: string;
  readonly nova: number;
  readonly usd: number;
}

/** Nova packs — the only real-money surface, and only ever in Stripe TEST mode. */
export const NOVA_PACKS: readonly NovaPack[] = [
  { sku: "nova-500", nova: 500, usd: 4.99 },
  { sku: "nova-1200", nova: 1200, usd: 9.99 },
] as const;

/** True only when Stripe is unconfigured or configured with a TEST secret key. */
export function isStripeTestModeSafe(): boolean {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return true; // unconfigured → no charge possible → safe
  return key.startsWith("sk_test_");
}

/**
 * Guard: throws if a LIVE Stripe key is present. The entire commerce surface this
 * build must remain test-mode (hard-stop #1). Any future live activation is a
 * human decision, never an autonomous one.
 */
export function assertTestModeOnly(): void {
  if (!isStripeTestModeSafe()) {
    throw new Error(
      "HARD-STOP #1: a LIVE Stripe key is configured. Galaxy Dynasty commerce is " +
        "test-mode only this build. Live activation requires explicit human approval.",
    );
  }
}

export interface CheckoutScaffold {
  readonly status: "test_mode_scaffold";
  readonly sku: string;
  readonly message: string;
}

/**
 * Begin a Nova-pack checkout. Returns a test-mode scaffold (no charge) unless the
 * owner has wired real test-mode price IDs. Never charges, never goes live.
 */
export function beginNovaCheckout(sku: string): CheckoutScaffold {
  assertTestModeOnly();
  const pack = NOVA_PACKS.find((p) => p.sku === sku);
  if (!pack) throw new Error(`Unknown Nova pack: ${sku}`);
  return {
    status: "test_mode_scaffold",
    sku,
    message:
      `Test-mode checkout for ${pack.nova} Nova ($${pack.usd}). Live charges are ` +
      "disabled this build — wire Stripe test price IDs to enable a sandbox purchase.",
  };
}
