/**
 * Galaxy Dynasty — boosts & consumables (Stage 3 revenue).
 *
 * A revenue line that does NOT break the anti-pay-to-win law (§4.1). The bright
 * line: a consumable may only speed the COSMETIC/PROGRESSION economy or add flair
 * — never a graded outcome. Allowed effects touch Credits, Season Points, the
 * daily streak, or pure cosmetics. They can NEVER affect a Signal-Check result,
 * a duel/boss outcome, ladder rating, calibration, or Sports IQ skill XP.
 *
 * The allow-list below IS the enforcement; `galaxy-brand-gates.test.ts` asserts no
 * consumable declares an outcome effect, and `applyReward` only ever multiplies
 * Credits + Season Points (skill/character XP and rating are untouched).
 */

/** The ONLY effects a consumable may have. Outcome/skill/rating are excluded by construction. */
export type ConsumableEffectKind =
  | "credits_boost" // ×magnitude on Galaxy Credits earned, timed
  | "season_boost" // ×magnitude on Season Points earned, timed
  | "streak_shield" // one-time: protects the daily streak from a reset
  | "emote_burst" // one-time cosmetic flair, no mechanical effect
  | "crib_spotlight"; // timed: feature your crib, cosmetic only

export const CONSUMABLE_EFFECT_KINDS: readonly ConsumableEffectKind[] = [
  "credits_boost",
  "season_boost",
  "streak_shield",
  "emote_burst",
  "crib_spotlight",
];

/** Domains a consumable may NEVER affect (asserted by the brand gate). */
export const CONSUMABLE_FORBIDDEN_DOMAINS = [
  "rating",
  "calibration",
  "signal_check_result",
  "duel_result",
  "boss_outcome",
  "skill_xp",
] as const;

export type ConsumableSource = "nova" | "earn";

export interface ConsumableDef {
  readonly id: string;
  readonly name: string;
  readonly kind: ConsumableEffectKind;
  readonly description: string;
  /** Multiplier for boosts (e.g. 1.25 = +25%); 1 for non-boosts. */
  readonly magnitude: number;
  /** Duration for timed effects (hours); 0 for one-time/instant. */
  readonly durationHours: number;
  readonly source: ConsumableSource;
  readonly rarity: "COMMON" | "RARE" | "EPIC";
  readonly novaPrice?: number;
}

export const CONSUMABLES_CATALOG: readonly ConsumableDef[] = [
  {
    id: "credit-surge",
    name: "Credit Surge",
    kind: "credits_boost",
    description: "+25% Galaxy Credits from your reps for 24 hours. (Earns cosmetics faster — never affects outcomes.)",
    magnitude: 1.25,
    durationHours: 24,
    source: "nova",
    rarity: "COMMON",
    novaPrice: 120,
  },
  {
    id: "credit-surge-plus",
    name: "Credit Surge+",
    kind: "credits_boost",
    description: "+50% Galaxy Credits for 24 hours.",
    magnitude: 1.5,
    durationHours: 24,
    source: "nova",
    rarity: "RARE",
    novaPrice: 200,
  },
  {
    id: "season-surge",
    name: "Season Surge",
    kind: "season_boost",
    description: "+25% Season Points for 24 hours — climb the Season Cup track faster.",
    magnitude: 1.25,
    durationHours: 24,
    source: "nova",
    rarity: "COMMON",
    novaPrice: 120,
  },
  {
    id: "streak-shield",
    name: "Streak Shield",
    kind: "streak_shield",
    description: "Protects your daily streak from one missed day. Wellbeing, not pressure.",
    magnitude: 1,
    durationHours: 0,
    source: "nova",
    rarity: "COMMON",
    novaPrice: 80,
  },
  {
    id: "crib-spotlight",
    name: "Crib Spotlight",
    kind: "crib_spotlight",
    description: "Feature your Crib for 24 hours. Pure flair.",
    magnitude: 1,
    durationHours: 24,
    source: "nova",
    rarity: "RARE",
    novaPrice: 60,
  },
  {
    id: "hype-burst",
    name: "Hype Burst",
    kind: "emote_burst",
    description: "A one-time celebratory burst on your profile. Cosmetic only.",
    magnitude: 1,
    durationHours: 0,
    source: "nova",
    rarity: "COMMON",
    novaPrice: 40,
  },
  {
    id: "earned-streak-shield",
    name: "Streak Shield (earned)",
    kind: "streak_shield",
    description: "An earned Streak Shield — protects your streak from one missed day.",
    magnitude: 1,
    durationHours: 0,
    source: "earn",
    rarity: "COMMON",
  },
] as const;

const CATALOG_INDEX: ReadonlyMap<string, ConsumableDef> = new Map(CONSUMABLES_CATALOG.map((c) => [c.id, c]));

export function getConsumable(id: string): ConsumableDef | null {
  return CATALOG_INDEX.get(id) ?? null;
}

export interface ActiveEffect {
  readonly kind: ConsumableEffectKind;
  readonly magnitude: number;
}

/**
 * Combined multiplier for a boost domain ("credits_boost"/"season_boost") from
 * the active effects. Multiplicative, then CAPPED at 2.0 so stacking can't run
 * away. Returns 1 when no relevant boost is active.
 */
export function combinedMultiplier(effects: readonly ActiveEffect[], kind: ConsumableEffectKind): number {
  let m = 1;
  for (const e of effects) if (e.kind === kind) m *= e.magnitude;
  return Math.min(2, Math.round(m * 1000) / 1000);
}

/** True if a kind only ever affects the cosmetic/progression economy (never outcomes). */
export function isNonOutcomeEffect(kind: string): kind is ConsumableEffectKind {
  return (CONSUMABLE_EFFECT_KINDS as readonly string[]).includes(kind);
}
