/**
 * Class A lock for a scoring packet. Built only from the coach trail.
 * No bookmaker field is read. No OddsInput. The market is not an argument.
 *
 * coachSupport is the home-perspective sum of the same L0/L1/L2 factors that
 * scoring later passes to coachSupport for the published side. Home perspective
 * is required so the lock can exist before a side does. The market side is
 * not an input.
 *
 * injuryDropOff is not passed. Availability weights are confidence points,
 * not score points. Passing them as points would invent a score drop.
 * staffAggression is not on the coach packet. The simulator's PHI default
 * is a named gap, not a measured staff.
 */
import type { FactorDetail } from "@sports/types";
import { lockCoachProjection, type LockedCoachProjection } from "../coach-sim/index.js";
import type { InjuryRow } from "./availability-factors.js";
import { coachSupport } from "./coach-support.js";
import { coachTrailFactors } from "./coach-trail.js";
import type { ShadowRow } from "./shadow-coverage-factors.js";
import type { UsageShift } from "./usage-factors.js";

/**
 * Literal prior inside simulateCoachGame: `marginMean: 3 + coachShift + …`.
 * packages/prediction-engine/src/coach-sim/markov-simulator.ts line 70.
 * Not a measurement. A coach shift smaller than this does not choose a side.
 */
export const STUB_HOME_MARGIN = 3;

/**
 * Literal prior inside simulateCoachGame: `const baseTotal = 46.5`.
 * packages/prediction-engine/src/coach-sim/markov-simulator.ts line 62.
 */
export const STUB_BASE_TOTAL = 46.5;

export interface CoachLockPacket {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly injuries?: readonly InjuryRow[];
  readonly usageShifts?: readonly UsageShift[];
  readonly shadows?: readonly ShadowRow[];
}

export interface CoachProjectionRead {
  readonly locked: LockedCoachProjection;
  /** Sum of home-perspective L0/L1/L2 weights. Positive favors the home team. */
  readonly homeSupport: number;
  readonly homeFactors: readonly FactorDetail[];
  /**
   * True only when the coach shift moves marginMean by at least the stub
   * prior. Below that, sign(marginMean) is the constant 3, not the trail.
   */
  readonly coachOverridesStub: boolean;
  /** Sign of marginMean. A decision only when coachOverridesStub is true. */
  readonly marginSide: "HOME" | "AWAY";
  readonly gaps: readonly string[];
}

export function projectionFromCoachPacket(packet: CoachLockPacket): CoachProjectionRead {
  const trail = {
    homeTeam: packet.homeTeam,
    awayTeam: packet.awayTeam,
    week: packet.week,
    pickedSide: "HOME" as const,
    injuries: packet.injuries ?? [],
    usageShifts: packet.usageShifts ?? [],
    shadows: packet.shadows ?? [],
  };
  const homeFactors = coachTrailFactors(trail);
  const homeSupport = coachSupport(homeFactors);
  const weekShadows = (packet.shadows ?? []).filter((s) => s.week === packet.week);
  const locked = lockCoachProjection({
    homeTeam: packet.homeTeam,
    awayTeam: packet.awayTeam,
    week: packet.week,
    coachSupport: homeSupport,
    shadows: weekShadows.map((s) => ({ wr: s.wrName, shadowRate: s.shadowRate })),
  });
  const coachOverridesStub = Math.abs(locked.marginMean - STUB_HOME_MARGIN) >= STUB_HOME_MARGIN;
  const gaps = [
    "injuryDropOff omitted: availability weights are confidence points, not score points (availability-factors.ts).",
    "staffAggression omitted: not on OddsInput.coachTrail. markov-simulator.ts defaults to STAFF_AGGRESSION.PHI.",
    coachOverridesStub
      ? "Coach shift moves marginMean by at least the stub prior of 3. The margin's sign is the side."
      : "Gap: markov-simulator.ts:70 adds a constant 3 that still dominates coachSupport*0.15. The projection is recorded. It does not choose the side.",
  ];
  return {
    locked,
    homeSupport,
    homeFactors,
    coachOverridesStub,
    marginSide: locked.marginMean >= 0 ? "HOME" : "AWAY",
    gaps,
  };
}

/** Band center of the locked total. scoreMean is the home-score stub, not this. */
export function projectionTotalCenter(locked: Pick<LockedCoachProjection, "totalP10" | "totalP90">): number {
  return (locked.totalP10 + locked.totalP90) / 2;
}
