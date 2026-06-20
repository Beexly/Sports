/**
 * Galaxy Dynasty — Season Program (bible Stage 2 "Signal Cup").
 *
 * A seasonal progression track: earn Season Points from any graded Signal Check,
 * climb tiers, claim rewards. The honest retention spine — points come from real
 * reps, not idle time, and rewards are cosmetics/credits/merch (never cash).
 */

export const CURRENT_SEASON_KEY = "rookie-season-1";
export const CURRENT_SEASON_NAME = "Signal Cup — Season 1";

export interface SeasonTier {
  readonly tier: number;
  readonly name: string;
  readonly pointsRequired: number; // cumulative points to reach this tier
  readonly rewardCredits: number;
  readonly rewardLabel: string;
}

export const SEASON_TIERS: readonly SeasonTier[] = [
  { tier: 1, name: "Rookie Pass", pointsRequired: 0, rewardCredits: 0, rewardLabel: "Welcome to the Cup" },
  { tier: 2, name: "Signal I", pointsRequired: 150, rewardCredits: 40, rewardLabel: "+40 Credits" },
  { tier: 3, name: "Signal II", pointsRequired: 400, rewardCredits: 60, rewardLabel: "+60 Credits" },
  { tier: 4, name: "Sharp Track", pointsRequired: 800, rewardCredits: 80, rewardLabel: "+80 Credits · Vault skin preview" },
  { tier: 5, name: "Contender", pointsRequired: 1400, rewardCredits: 120, rewardLabel: "+120 Credits" },
  { tier: 6, name: "Legend Run", pointsRequired: 2200, rewardCredits: 200, rewardLabel: "+200 Credits · Season badge" },
] as const;

/** Season points awarded for a graded check = XP earned (1:1, capped per check). */
export function seasonPointsForXp(xp: number): number {
  return Math.max(0, Math.min(150, Math.round(xp)));
}

export interface SeasonProgress {
  readonly seasonKey: string;
  readonly seasonName: string;
  readonly points: number;
  readonly tier: SeasonTier;
  readonly next: SeasonTier | null;
  readonly progress: number; // 0..1 toward next tier
  readonly tiersUnlocked: number;
}

export function seasonProgress(points: number): SeasonProgress {
  let tier = SEASON_TIERS[0]!;
  for (const t of SEASON_TIERS) if (points >= t.pointsRequired) tier = t;
  const idx = SEASON_TIERS.findIndex((t) => t.tier === tier.tier);
  const next = SEASON_TIERS[idx + 1] ?? null;
  const progress = next
    ? Math.max(0, Math.min(1, (points - tier.pointsRequired) / (next.pointsRequired - tier.pointsRequired)))
    : 1;
  return {
    seasonKey: CURRENT_SEASON_KEY,
    seasonName: CURRENT_SEASON_NAME,
    points,
    tier,
    next,
    progress: Math.round(progress * 10000) / 10000,
    tiersUnlocked: idx + 1,
  };
}

/**
 * Tiers newly claimable given current points and the highest tier already
 * claimed. Returns the tiers (with rewards) the player can now claim, in order.
 */
export function claimableTiers(points: number, highestClaimed: number): SeasonTier[] {
  const reached = SEASON_TIERS.filter((t) => points >= t.pointsRequired);
  return reached.filter((t) => t.tier > highestClaimed);
}
