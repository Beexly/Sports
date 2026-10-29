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
import {
  evaluateCoachSchemePlayerFitMatchup,
  getCoachStaffProfile,
  lockCoachProjection,
  type CoachSchemePlayerFitMatchupInput,
  type CoachSchemePlayerFitMatchupSynthesis,
  type LockedCoachProjection,
} from "../coach-sim/index.js";
import type { InjuryRow } from "./availability-factors.js";
import { coachSupport } from "./coach-support.js";
import { coachTrailFactors } from "./coach-trail.js";
import type { ShadowRow } from "./shadow-coverage-factors.js";
import type { UsageShift } from "./usage-factors.js";

/**
 * Literal prior inside simulateCoachGame's point location: margin 3 + coachShift.
 * Not a measurement. A coach shift smaller than this does not choose a side.
 */
export const STUB_HOME_MARGIN = 3;

/** Location prior inside simulateCoachGame: total 46.5 + coachShift. Not a measurement. */
export const STUB_BASE_TOTAL = 46.5;

export interface CoachLockPacket {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly injuries?: readonly InjuryRow[];
  readonly usageShifts?: readonly UsageShift[];
  readonly shadows?: readonly ShadowRow[];
  /** Measured staff go-rates. Away defaults to STAFF_AGGRESSION.PHI when absent. */
  readonly staffAggressionHome?: number;
  readonly staffAggressionAway?: number;
  /** Optional rich Zone 1/2 scheme & player-fit inputs (WR/DB BDB 2027, RB Zone/Gap, Trench, ClarusC64, Surface/FSM). */
  readonly schemePlayerFitInput?: Omit<CoachSchemePlayerFitMatchupInput, "homeTeam" | "awayTeam">;
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
  /** Full 32-staff, scheme, player-fit, ClarusC64 coherence, and surface/FSM synthesis. */
  readonly schemePlayerFitSynthesis: CoachSchemePlayerFitMatchupSynthesis;
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
  const homeProfile = getCoachStaffProfile(packet.homeTeam);
  const awayProfile = getCoachStaffProfile(packet.awayTeam);
  const schemePlayerFitSynthesis = evaluateCoachSchemePlayerFitMatchup({
    homeTeam: packet.homeTeam,
    awayTeam: packet.awayTeam,
    ...packet.schemePlayerFitInput,
  });
  const locked = lockCoachProjection({
    homeTeam: packet.homeTeam,
    awayTeam: packet.awayTeam,
    week: packet.week,
    coachSupport: homeSupport,
    shadows: weekShadows.map((s) => ({ wr: s.wrName, shadowRate: s.shadowRate })),
    staffAggression: packet.staffAggressionHome,
    staffAggressionAway: packet.staffAggressionAway,
  });
  const coachOverridesStub = Math.abs(locked.marginMean - STUB_HOME_MARGIN) >= STUB_HOME_MARGIN;
  const gaps = [
    "injuryDropOff omitted: availability weights are confidence points, not score points (availability-factors.ts).",
    packet.staffAggressionHome !== undefined || packet.staffAggressionAway !== undefined
      ? `staffAggression supplied (home=${(packet.staffAggressionHome ?? homeProfile.staffAggression).toFixed(2)}, away=${(packet.staffAggressionAway ?? awayProfile.staffAggression).toFixed(2)}).`
      : "staffAggression omitted: not on OddsInput.coachTrail. The drive loop uses STAFF_AGGRESSION.PHI for both staffs, so the staff residual is zero.",
    coachOverridesStub
      ? "Coach shift moves marginMean by at least the stub prior of 3. The margin's sign is the side."
      : "Gap: the drive loop's location still includes the stub home margin of 3. The projection is recorded. It does not choose the side.",
  ];
  return {
    locked,
    homeSupport,
    homeFactors,
    coachOverridesStub,
    marginSide: locked.marginMean >= 0 ? "HOME" : "AWAY",
    gaps,
    schemePlayerFitSynthesis,
  };
}

/** Band center of the locked total. scoreMean is the home-score stub, not this. */
export function projectionTotalCenter(locked: Pick<LockedCoachProjection, "totalP10" | "totalP90">): number {
  return (locked.totalP10 + locked.totalP90) / 2;
}
