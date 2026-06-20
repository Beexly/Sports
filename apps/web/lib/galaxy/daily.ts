/**
 * Galaxy Dynasty — daily streak with STREAK INSURANCE (wellbeing, bible §4.3).
 *
 * "Streak insurance so life doesn't punish a player": a single missed day does
 * NOT reset the streak. Two+ missed days resets to 1. No fake scarcity, no
 * pressure — just a gentle daily nudge. Reward flows through the earn-only ledger.
 */

import { db, isStubMode } from "@sports/db";
import { DAILY_STREAK_CREDITS, DAILY_STREAK_XP } from "@sports/galaxy-engine";
import { applyReward } from "./profile.js";

function dayIndex(d: Date): number {
  return Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
}

export interface DailyResult {
  readonly claimed: boolean;
  readonly alreadyClaimedToday: boolean;
  readonly streak: number;
  readonly insuranceUsed: boolean;
  readonly creditsAwarded: number;
  readonly xpAwarded: number;
  readonly persisted: boolean;
}

export async function claimDaily(profileId: string): Promise<DailyResult> {
  if (profileId === "stub") {
    return {
      claimed: true,
      alreadyClaimedToday: false,
      streak: 1,
      insuranceUsed: false,
      creditsAwarded: DAILY_STREAK_CREDITS,
      xpAwarded: DAILY_STREAK_XP,
      persisted: false,
    };
  }

  const row = await db.galaxyProfile
    .findUnique({ where: { id: profileId }, select: { lastDailyAt: true, dailyStreak: true } })
    .catch(() => null);
  if (!row) {
    return { claimed: false, alreadyClaimedToday: false, streak: 0, insuranceUsed: false, creditsAwarded: 0, xpAwarded: 0, persisted: false };
  }

  const today = dayIndex(new Date());
  const last = row.lastDailyAt ? dayIndex(row.lastDailyAt) : null;

  if (last === today) {
    return { claimed: false, alreadyClaimedToday: true, streak: row.dailyStreak, insuranceUsed: false, creditsAwarded: 0, xpAwarded: 0, persisted: true };
  }

  const gap = last == null ? Infinity : today - last;
  let streak: number;
  let insuranceUsed = false;
  if (last == null) {
    streak = 1;
  } else if (gap <= 2) {
    // gap of 1 = consecutive; gap of 2 = one missed day, covered by insurance.
    streak = row.dailyStreak + 1;
    insuranceUsed = gap === 2;
  } else {
    streak = 1; // 2+ missed days resets — but no penalty beyond starting over.
  }

  await applyReward(profileId, {
    xp: DAILY_STREAK_XP,
    credits: DAILY_STREAK_CREDITS,
    reason: "DAILY_STREAK",
    sportKey: "americanfootball_nfl",
    ref: { type: "daily", id: `day-${today}` },
  });

  try {
    await db.galaxyProfile.update({
      where: { id: profileId },
      data: { lastDailyAt: new Date(), dailyStreak: streak },
    });
  } catch {
    /* no DB */
  }

  return {
    claimed: true,
    alreadyClaimedToday: false,
    streak,
    insuranceUsed,
    creditsAwarded: DAILY_STREAK_CREDITS,
    xpAwarded: DAILY_STREAK_XP,
    persisted: !isStubMode(),
  };
}
