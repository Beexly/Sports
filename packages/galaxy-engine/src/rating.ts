/**
 * Galaxy Dynasty — ranked rating (bible Stage 2, skill-tiered ladders §4.3).
 *
 * Elo-style rating updated from Signal Duel results. Ladders are skill-tiered so
 * casuals climb against casuals: the tier is derived from rating, and matchmaking
 * (in the app) pairs nearby ratings / Ghost profiles. Pure + deterministic.
 */

export const BASE_RATING = 1200;
const ELO_K = 24;

export type DuelOutcomeScore = 0 | 0.5 | 1; // loss / tie / win

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

/** New rating after a duel. `score` = 1 win, 0.5 tie, 0 loss. */
export function updateRating(
  rating: number,
  opponentRating: number,
  score: DuelOutcomeScore,
): number {
  const expected = expectedScore(rating, opponentRating);
  return Math.round(rating + ELO_K * (score - expected));
}

export interface RatingTier {
  readonly id: string;
  readonly name: string;
  readonly min: number;
}

export const RATING_TIERS: readonly RatingTier[] = [
  { id: "rookie", name: "Rookie", min: 0 },
  { id: "contender", name: "Contender", min: 1100 },
  { id: "sharp", name: "Sharp", min: 1300 },
  { id: "elite", name: "Elite", min: 1500 },
  { id: "legend", name: "Legend", min: 1700 },
] as const;

export function ratingTier(rating: number): RatingTier {
  let tier = RATING_TIERS[0]!;
  for (const t of RATING_TIERS) if (rating >= t.min) tier = t;
  return tier;
}

/** Progress toward the next tier, for the ladder UI. */
export function ratingTierProgress(rating: number): {
  tier: RatingTier;
  next: RatingTier | null;
  progress: number;
} {
  const tier = ratingTier(rating);
  const idx = RATING_TIERS.findIndex((t) => t.id === tier.id);
  const next = RATING_TIERS[idx + 1] ?? null;
  if (!next) return { tier, next: null, progress: 1 };
  const span = next.min - tier.min;
  const into = rating - tier.min;
  return { tier, next, progress: Math.max(0, Math.min(1, into / span)) };
}
