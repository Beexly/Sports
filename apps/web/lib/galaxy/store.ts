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

// ── Merch Foundry seasonal DROPS (Stage 2) ───────────────────────────────────
// Achievement-gated, not purchasable — "merch as proof". Unlocked by clearing a
// boss, reaching a Season tier, or hitting a ladder tier.

export interface SeasonDrop {
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly requirement:
    | { kind: "boss_clear"; bossKey: string; label: string }
    | { kind: "season_tier"; tier: number; label: string }
    | { kind: "rating_tier"; tier: string; label: string };
}

export const SEASON_DROPS: readonly SeasonDrop[] = [
  {
    sku: "drop-signal-cup-banner",
    name: "Signal Cup Banner",
    description: "Season 1 banner for your My Dynasty room.",
    requirement: { kind: "season_tier", tier: 3, label: "Reach Season Tier 3" },
  },
  {
    sku: "drop-depths-clear-pin",
    name: "Depths Conqueror Pin",
    description: "Awarded for clearing The Injury Fog.",
    requirement: { kind: "boss_clear", bossKey: "injury_fog", label: "Clear The Injury Fog" },
  },
  {
    sku: "drop-sharp-ladder-frame",
    name: "Sharp Ladder Frame",
    description: "A ranked frame for reaching the Sharp tier.",
    requirement: { kind: "rating_tier", tier: "Sharp", label: "Reach the Sharp ladder tier" },
  },
] as const;

export function isDropUnlocked(
  drop: SeasonDrop,
  ctx: { seasonTier: number; bossCleared: ReadonlySet<string>; ratingTierName: string },
): boolean {
  const r = drop.requirement;
  if (r.kind === "boss_clear") return ctx.bossCleared.has(r.bossKey);
  if (r.kind === "season_tier") return ctx.seasonTier >= r.tier;
  // rating_tier: unlocked if the player is at or above that named tier.
  const order = ["Rookie", "Contender", "Sharp", "Elite", "Legend"];
  return order.indexOf(ctx.ratingTierName) >= order.indexOf(r.tier);
}

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
