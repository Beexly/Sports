/**
 * Coach trail — the first thing the reasoning sees.
 *
 * Collects L0 USAGE, L1 HEALTH, and L2 MATCHUPS factors and returns them
 * so the scoring sites can prepend them to the factors array. The trail
 * leads with named coach signals (or named gaps). Market factors come after.
 *
 * Missing inputs emit honest gaps. No invention.
 */

import type { FactorDetail } from "@sports/types";
import { availabilityFactors, type InjuryRow } from "./availability-factors.js";
import { usageFactors, type UsageShift } from "./usage-factors.js";
import { shadowCoverageFactors, type ShadowRow } from "./shadow-coverage-factors.js";

export interface CoachTrailInput {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly pickedSide: "HOME" | "AWAY";
  readonly injuries?: readonly InjuryRow[];
  readonly usageShifts?: readonly UsageShift[];
  readonly shadows?: readonly ShadowRow[];
}

export function coachTrailFactors(input: CoachTrailInput): FactorDetail[] {
  return [
    ...usageFactors({
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      week: input.week,
      shifts: input.usageShifts ?? [],
      pickedSide: input.pickedSide,
    }),
    ...availabilityFactors({
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      week: input.week,
      injuries: input.injuries ?? [],
      pickedSide: input.pickedSide,
    }),
    ...shadowCoverageFactors({
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      week: input.week,
      shadows: input.shadows ?? [],
      pickedSide: input.pickedSide,
    }),
  ];
}
