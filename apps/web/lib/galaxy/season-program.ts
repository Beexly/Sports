/**
 * Galaxy Dynasty — Season Cup server lib (Stage 2).
 *
 * Reads/claims Season Program tiers. Reward credits flow through the earn-only
 * ledger (no cash). Idempotent: re-claiming yields nothing. Crash-safe in stub mode.
 */

import { db, isStubMode } from "@sports/db";
import {
  seasonProgress,
  claimableTiers,
  CURRENT_SEASON_NAME,
  type SeasonTier,
} from "@sports/galaxy-engine";
import { applyReward } from "./profile.js";

export interface SeasonClaimResult {
  readonly claimed: readonly { tier: number; name: string; credits: number }[];
  readonly creditsAwarded: number;
  readonly newSeasonTierClaimed: number;
  readonly seasonName: string;
  readonly persisted: boolean;
}

export async function claimSeasonRewards(profileId: string): Promise<SeasonClaimResult> {
  const base = {
    seasonName: CURRENT_SEASON_NAME,
    persisted: !isStubMode() && profileId !== "stub",
  };

  const row =
    profileId === "stub"
      ? null
      : await db.galaxyProfile
          .findUnique({ where: { id: profileId }, select: { seasonPoints: true, seasonTierClaimed: true } })
          .catch(() => null);

  if (!row) {
    return { claimed: [], creditsAwarded: 0, newSeasonTierClaimed: 0, ...base, persisted: false };
  }

  const tiers: SeasonTier[] = claimableTiers(row.seasonPoints, row.seasonTierClaimed);
  if (tiers.length === 0) {
    return { claimed: [], creditsAwarded: 0, newSeasonTierClaimed: row.seasonTierClaimed, ...base };
  }

  const creditsAwarded = tiers.reduce((s, t) => s + t.rewardCredits, 0);
  const highest = Math.max(...tiers.map((t) => t.tier));

  if (creditsAwarded > 0) {
    await applyReward(profileId, {
      xp: 0,
      credits: creditsAwarded,
      reason: "QUEST_REWARD",
      ref: { type: "season_claim", id: `tier-${highest}` },
    });
  }

  try {
    await db.galaxyProfile.update({
      where: { id: profileId },
      data: { seasonTierClaimed: highest },
    });
  } catch {
    /* no DB */
  }

  return {
    claimed: tiers.map((t) => ({ tier: t.tier, name: t.name, credits: t.rewardCredits })),
    creditsAwarded,
    newSeasonTierClaimed: highest,
    ...base,
  };
}

export function getSeasonSnapshot(points: number) {
  return seasonProgress(points);
}
