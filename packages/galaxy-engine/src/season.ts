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

// ── Season objectives — daily / weekly / seasonal cadence (Stage 2 deepening) ──
// The retention layer that answers "what am I chasing today / this week / this
// season". A Pro track adds DEPTH (more vision/tools), never outcome advantage.

export type ObjectiveCadence = "daily" | "weekly" | "seasonal";
export type ObjectiveTrack = "free" | "pro";

export interface SeasonObjective {
  readonly id: string;
  readonly cadence: ObjectiveCadence;
  readonly track: ObjectiveTrack;
  readonly label: string;
  readonly detail: string;
  readonly href: string;
}

export const SEASON_OBJECTIVES: readonly SeasonObjective[] = [
  // Daily — free
  { id: "d-signal", cadence: "daily", track: "free", label: "Daily Signal Check", detail: "Run one War Room read.", href: "/galaxy/war-room" },
  { id: "d-blacktop", cadence: "daily", track: "free", label: "Blacktop rep", detail: "One quick stat check.", href: "/galaxy/blacktop" },
  { id: "d-streak", cadence: "daily", track: "free", label: "Claim your streak", detail: "Keep the daily streak alive.", href: "/galaxy" },
  // Weekly — free
  { id: "w-duel", cadence: "weekly", track: "free", label: "Signal Duel ladder", detail: "Win a ranked Signal Duel.", href: "/galaxy/duel" },
  { id: "w-boss", cadence: "weekly", track: "free", label: "Boss rotation", detail: "Clear the week's featured boss.", href: "/galaxy/depths" },
  { id: "w-crew", cadence: "weekly", track: "free", label: "Crew contribution", detail: "Add to your Crew's clash power.", href: "/galaxy/crew" },
  { id: "w-faction", cadence: "weekly", track: "free", label: "Faction contribution", detail: "Push your faction up the board.", href: "/galaxy/factions" },
  { id: "w-card", cadence: "weekly", track: "free", label: "Card watchlist", detail: "Watch a card and track its value.", href: "/galaxy/market" },
  // Weekly — Pro (depth, not outcomes)
  { id: "w-pro-scout", cadence: "weekly", track: "pro", label: "Duel opponent scouting", detail: "Pro: study a rival's calibration before you duel.", href: "/galaxy/duel" },
  { id: "w-pro-prep", cadence: "weekly", track: "pro", label: "Boss prep report", detail: "Pro: a deeper War Room read on the week's boss.", href: "/galaxy/depths" },
  // Seasonal
  { id: "s-rank", cadence: "seasonal", track: "free", label: "Earn a ranked title", detail: "Climb to a new ladder tier.", href: "/galaxy/leaderboard" },
  { id: "s-merch", cadence: "seasonal", track: "free", label: "Merch unlock path", detail: "Unlock a season drop.", href: "/galaxy/store" },
  { id: "s-score", cadence: "seasonal", track: "free", label: "Raise your Galaxy Score", detail: "Improve your overall identity score.", href: "/galaxy/score" },
] as const;

export function objectivesByCadence(cadence: ObjectiveCadence): readonly SeasonObjective[] {
  return SEASON_OBJECTIVES.filter((o) => o.cadence === cadence);
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
