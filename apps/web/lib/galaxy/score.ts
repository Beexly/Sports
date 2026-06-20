/**
 * Galaxy Dynasty — Galaxy Score server lib (Stage 2 deepening).
 *
 * Computes the universal identity score for a profile from its view + a light
 * attempts aggregate (avg calibration + graded reps). Crash-safe in stub mode.
 */

import { db } from "@sports/db";
import { computeGalaxyScore, type GalaxyScore } from "@sports/galaxy-engine";
import type { ProfileView } from "./types.js";

export async function getGalaxyScoreFor(profile: ProfileView): Promise<GalaxyScore> {
  let avgCalibration: number | null = null;
  let gradedChecks = 0;
  try {
    const agg = await db.signalCheckAttempt.aggregate({
      where: { profileId: profile.id, calibrationScore: { not: null } },
      _avg: { calibrationScore: true },
      _count: true,
    });
    gradedChecks = agg._count ?? 0;
    avgCalibration = agg._avg.calibrationScore;
  } catch {
    /* no DB */
  }

  const levels = profile.skills.map((s) => s.level);
  const avgSkillLevel = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 1;

  return computeGalaxyScore({
    avgSkillLevel,
    avgCalibration,
    rating: profile.rating,
    bossClears: profile.bossCleared.length,
    crewContribution: profile.crew ? Math.min(100, avgCalibration ?? 0) : 0,
    factionRank: null,
    cardCount: profile.cards.length,
    gradedChecks,
    merchCount: profile.merch.length,
    seasonTier: profile.seasonTier,
  });
}
