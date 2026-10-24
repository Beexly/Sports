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
import { travelFactor } from "./travel-factor.js";

export interface CoachTrailInput {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly pickedSide: "HOME" | "AWAY";
  readonly injuries?: readonly InjuryRow[];
  readonly usageShifts?: readonly UsageShift[];
  readonly shadows?: readonly ShadowRow[];
  /** Team CODES (BAL, CIN, ...). When both resolve, the L3 travel distance joins the trail. */
  readonly homeTeamCode?: string;
  readonly awayTeamCode?: string;
}

export function coachTrailFactors(input: CoachTrailInput): FactorDetail[] {
  const out: FactorDetail[] = [
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

  // L3 travel: only when the packet carries team codes. A missing code becomes a
  // named gap factor so the trail shows why there is no distance.
  if (input.homeTeamCode || input.awayTeamCode) {
    const t = travelFactor(input.homeTeamCode ?? "", input.awayTeamCode ?? "");
    if (t.factor) out.push(t.factor);
    else out.push({
      name: "Travel: unavailable",
      impact: "neutral",
      weight: 0,
      description: "Gap: " + (t.gap ?? "unknown"),
    });
  }
  return out;
}
