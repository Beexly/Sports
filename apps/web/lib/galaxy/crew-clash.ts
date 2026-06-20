/**
 * Galaxy Dynasty — Crew Clash (Stage 2, computed prototype).
 *
 * A crew's "clash power" is the average calibration of its members' graded Signal
 * Checks, weighted by activity. A clash compares it to a seeded rival crew
 * benchmark (anti-ghost-town). Computed from existing attempts — no new model.
 */

import { db } from "@sports/db";

export interface CrewClashState {
  readonly crewId: string;
  readonly memberCount: number;
  readonly reps: number;
  readonly avgCalibration: number | null;
  readonly clashPower: number;
  readonly rivalName: string;
  readonly rivalPower: number;
  readonly verdict: "ahead" | "behind" | "even";
}

const RIVAL = { name: "Night Signal", power: 64 };

export async function getCrewClashState(crewId: string): Promise<CrewClashState> {
  let memberIds: string[] = [];
  try {
    const members = await db.crewMembership.findMany({
      where: { crewId },
      select: { profileId: true },
    });
    memberIds = members.map((m) => m.profileId);
  } catch {
    memberIds = [];
  }

  let reps = 0;
  let avg: number | null = null;
  if (memberIds.length > 0) {
    try {
      const agg = await db.signalCheckAttempt.aggregate({
        where: { profileId: { in: memberIds }, calibrationScore: { not: null } },
        _avg: { calibrationScore: true },
        _count: true,
      });
      reps = agg._count;
      avg = agg._avg.calibrationScore;
    } catch {
      /* no DB */
    }
  }

  const activityFactor = Math.min(1.15, 1 + Math.log10(Math.max(1, reps)) / 20);
  const clashPower = avg != null ? Math.round(avg * activityFactor) : 0;
  const verdict: CrewClashState["verdict"] =
    clashPower > RIVAL.power ? "ahead" : clashPower < RIVAL.power ? "behind" : "even";

  return {
    crewId,
    memberCount: memberIds.length,
    reps,
    avgCalibration: avg != null ? Math.round(avg) : null,
    clashPower,
    rivalName: RIVAL.name,
    rivalPower: RIVAL.power,
    verdict,
  };
}
