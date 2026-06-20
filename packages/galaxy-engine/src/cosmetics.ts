/**
 * Galaxy Dynasty — cosmetics economy (bible §4.2 sanctioned monetization).
 *
 * Cosmetics are the clean revenue surface: EARN them through achievements, claim
 * SEASON drops, or buy with Nova (Stripe TEST mode only this build). Cosmetics
 * NEVER affect outcomes (no XP/rating/skill/credits) — pure identity/status, so
 * the Galaxy Standard + anti-pay-to-win law hold. One item equips per slot.
 *
 * Categories span the things players want to wear/show: kicks, outfits, emotes
 * (dances), anthems, avatar frames, profile scenes, banners, titles, ticket
 * stubs, and card frames. No real athlete likenesses or league marks — all
 * original Galaxy designs.
 */

export type CosmeticCategory =
  | "avatar_frame"
  | "profile_scene"
  | "banner"
  | "kicks"
  | "outfit"
  | "emote"
  | "anthem"
  | "title"
  | "ticket_stub"
  | "card_frame";

export type CosmeticSource = "earn" | "nova" | "season_drop" | "starter";

export type CosmeticRequirement =
  | { kind: "free" }
  | { kind: "boss_clear"; bossKey: string; label: string }
  | { kind: "season_tier"; tier: number; label: string }
  | { kind: "rating_tier"; tier: string; label: string }
  | { kind: "boss_all"; label: string };

export interface CosmeticDef {
  readonly id: string;
  readonly name: string;
  readonly category: CosmeticCategory;
  readonly source: CosmeticSource;
  readonly rarity: "COMMON" | "RARE" | "EPIC" | "LEGEND";
  readonly description: string;
  /** Nova price (test mode) when source = "nova". */
  readonly novaPrice?: number;
  /** Unlock requirement when source = "earn"/"season_drop". */
  readonly requirement?: CosmeticRequirement;
}

/** The equip slot for a category (one equipped item per slot). */
export type CosmeticSlot = CosmeticCategory;

export const COSMETICS_CATALOG: readonly CosmeticDef[] = [
  // Starter (free, owned on onboarding)
  { id: "frame-orbital", name: "Orbital Ring", category: "avatar_frame", source: "starter", rarity: "COMMON", description: "A clean orbital ring around your avatar.", requirement: { kind: "free" } },
  { id: "title-rookie", name: "Rookie", category: "title", source: "starter", rarity: "COMMON", description: "Everyone starts somewhere.", requirement: { kind: "free" } },
  { id: "scene-campus", name: "Campus Skyline", category: "profile_scene", source: "starter", rarity: "COMMON", description: "The Galaxy Campus at night.", requirement: { kind: "free" } },

  // Earn (achievement-gated)
  { id: "title-calibrated", name: "The Calibrated", category: "title", source: "earn", rarity: "RARE", description: "For reading value over the crowd.", requirement: { kind: "boss_clear", bossKey: "public_trap", label: "Clear The Public Trap" } },
  { id: "title-trap-breaker", name: "Trap Breaker", category: "title", source: "earn", rarity: "EPIC", description: "You beat every bad-logic boss.", requirement: { kind: "boss_all", label: "Clear all five Depths bosses" } },
  { id: "kicks-orbit-runners", name: "Orbit Runners", category: "kicks", source: "earn", rarity: "RARE", description: "Sharp-tier kicks for the climb.", requirement: { kind: "rating_tier", tier: "Sharp", label: "Reach the Sharp ladder tier" } },
  { id: "emote-cold-read", name: "Cold Read", category: "emote", source: "earn", rarity: "RARE", description: "A calm, ice-cold celebration.", requirement: { kind: "season_tier", tier: 3, label: "Reach Season Tier 3" } },
  { id: "banner-founders", name: "Founders Banner", category: "banner", source: "earn", rarity: "EPIC", description: "Flown by the first Signal Cup season.", requirement: { kind: "season_tier", tier: 5, label: "Reach Season Tier 5" } },
  { id: "stub-founders", name: "Founders Stub", category: "ticket_stub", source: "earn", rarity: "LEGEND", description: "A collectible stub from Rookie Season.", requirement: { kind: "rating_tier", tier: "Legend", label: "Reach the Legend ladder tier" } },

  // Season drop
  { id: "scene-night-stadium", name: "Night Stadium", category: "profile_scene", source: "season_drop", rarity: "EPIC", description: "Stadium lights, deep blue, gold.", requirement: { kind: "season_tier", tier: 4, label: "Reach Season Tier 4" } },

  // Nova (Stripe TEST mode purchase)
  { id: "frame-gold-leaf", name: "Gold Leaf Frame", category: "avatar_frame", source: "nova", rarity: "EPIC", description: "A gold-leaf avatar frame.", novaPrice: 250 },
  { id: "frame-nova-pulse", name: "Nova Pulse", category: "avatar_frame", source: "nova", rarity: "LEGEND", description: "A pulsing nova-energy frame.", novaPrice: 400 },
  { id: "kicks-gold-lows", name: "Gold Standard Lows", category: "kicks", source: "nova", rarity: "EPIC", description: "Black & gold low-tops.", novaPrice: 220 },
  { id: "outfit-sharp-suit", name: "Sharp Suit", category: "outfit", source: "nova", rarity: "EPIC", description: "Front-office fit for a sharp.", novaPrice: 300 },
  { id: "outfit-war-room", name: "War Room Fit", category: "outfit", source: "nova", rarity: "RARE", description: "Ready for the intelligence floor.", novaPrice: 180 },
  { id: "emote-signal-flex", name: "Signal Flex", category: "emote", source: "nova", rarity: "RARE", description: "Flex the read.", novaPrice: 150 },
  { id: "anthem-night-frequency", name: "Night Frequency", category: "anthem", source: "nova", rarity: "RARE", description: "An original Galaxy anthem (instrumental).", novaPrice: 160 },
  { id: "anthem-totality", name: "Totality Theme", category: "anthem", source: "nova", rarity: "LEGEND", description: "The Totality anthem (instrumental).", novaPrice: 360 },
  { id: "scene-the-vault", name: "The Vault Scene", category: "profile_scene", source: "nova", rarity: "EPIC", description: "Card-vault glow backdrop.", novaPrice: 260 },
  { id: "cardframe-foil", name: "Foil Edge", category: "card_frame", source: "nova", rarity: "RARE", description: "A foil edge for your Vault cards.", novaPrice: 200 },
  { id: "cardframe-vault-grade", name: "Vault Grade", category: "card_frame", source: "nova", rarity: "LEGEND", description: "Vault-grade card framing.", novaPrice: 420 },
  { id: "banner-faction-colors", name: "Faction Colors", category: "banner", source: "nova", rarity: "RARE", description: "Fly your faction's colors.", novaPrice: 140 },
] as const;

const CATALOG_INDEX: ReadonlyMap<string, CosmeticDef> = new Map(COSMETICS_CATALOG.map((c) => [c.id, c]));

export function getCosmetic(id: string): CosmeticDef | null {
  return CATALOG_INDEX.get(id) ?? null;
}

export function cosmeticsByCategory(category: CosmeticCategory): readonly CosmeticDef[] {
  return COSMETICS_CATALOG.filter((c) => c.category === category);
}

export const COSMETIC_CATEGORIES: readonly { id: CosmeticCategory; label: string }[] = [
  { id: "avatar_frame", label: "Avatar Frames" },
  { id: "outfit", label: "Outfits" },
  { id: "kicks", label: "Kicks" },
  { id: "emote", label: "Emotes" },
  { id: "anthem", label: "Anthems" },
  { id: "profile_scene", label: "Profile Scenes" },
  { id: "banner", label: "Banners" },
  { id: "card_frame", label: "Card Frames" },
  { id: "ticket_stub", label: "Ticket Stubs" },
  { id: "title", label: "Titles" },
];

/** Starter cosmetics every profile owns from onboarding. */
export function starterCosmetics(): readonly CosmeticDef[] {
  return COSMETICS_CATALOG.filter((c) => c.source === "starter");
}

export interface CosmeticUnlockContext {
  readonly bossCleared: ReadonlySet<string>;
  readonly bossClearedCount: number;
  readonly bossTotal: number;
  readonly seasonTier: number;
  readonly ratingTierName: string;
}

const RATING_ORDER = ["Rookie", "Contender", "Sharp", "Elite", "Legend"];

/** Whether an EARN/season cosmetic's requirement is met. */
export function isCosmeticUnlocked(c: CosmeticDef, ctx: CosmeticUnlockContext): boolean {
  if (c.source === "starter") return true;
  if (c.source === "nova") return false; // owned only via (test) purchase, not "unlocked"
  const r = c.requirement;
  if (!r) return false;
  switch (r.kind) {
    case "free":
      return true;
    case "boss_clear":
      return ctx.bossCleared.has(r.bossKey);
    case "boss_all":
      return ctx.bossClearedCount >= ctx.bossTotal && ctx.bossTotal > 0;
    case "season_tier":
      return ctx.seasonTier >= r.tier;
    case "rating_tier":
      return RATING_ORDER.indexOf(ctx.ratingTierName) >= RATING_ORDER.indexOf(r.tier);
    default:
      return false;
  }
}
