/**
 * L1 HEALTH — availability factor emitter.
 *
 * Doctrine: injuries with names reach the published reasoning trail.
 * Missing data is a named gap, never a zero.
 *
 * This module reads structured injury rows (from nflverse / ESPN / the
 * committed injuries_2026.csv) and emits FactorDetail entries that the
 * reasoning trail can render. A player ruled Out is a positive or negative
 * factor depending on which side is being scored.
 */

import type { FactorDetail } from "@sports/types";

export interface InjuryRow {
  readonly team: string;
  readonly week: number;
  readonly fullName: string;
  readonly position: string;
  readonly status: "Out" | "Doubtful" | "Questionable" | "IR" | "Healthy";
  readonly primaryInjury?: string;
  readonly source: string;
  readonly fetchedAt: string;
}

export interface AvailabilityInput {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly injuries: readonly InjuryRow[];
  readonly pickedSide: "HOME" | "AWAY";
}

/**
 * Emit one FactorDetail per material outage (Out / Doubtful / IR).
 * Questionable is recorded but weight 0 (watched, not weighted) until
 * practice participation data is present.
 *
 * Weight is intentionally small (5) so this is trail content, not a
 * decision override. The decision layer is a later step.
 */
export function availabilityFactors(input: AvailabilityInput): FactorDetail[] {
  const out: FactorDetail[] = [];
  const material = new Set(["Out", "Doubtful", "IR"]);

  for (const row of input.injuries) {
    if (row.week !== input.week) continue;
    if (!material.has(row.status)) continue;

    const isHome = row.team === input.homeTeam;
    const isAway = row.team === input.awayTeam;
    if (!isHome && !isAway) continue;

    // For the picked side: an outage on our side is negative, on theirs is positive.
    const onOurSide = (input.pickedSide === "HOME" && isHome) || (input.pickedSide === "AWAY" && isAway);
    const impact = onOurSide ? "negative" : "positive";
    const weight = onOurSide ? -5 : 5;

    out.push({
      name: `Availability: ${row.fullName}`,
      impact,
      weight,
      description: `${row.fullName} (${row.position}, ${row.team}) is ${row.status}${row.primaryInjury ? ` — ${row.primaryInjury}` : ""}. Source: ${row.source}, fetched ${row.fetchedAt}.`,
    });
  }

  if (out.length === 0) {
    out.push({
      name: "Availability",
      impact: "neutral",
      weight: 0,
      description: `No material outages (Out/Doubtful/IR) for ${input.homeTeam} or ${input.awayTeam} in week ${input.week}. Source: ${input.injuries[0]?.source ?? "none"}.`,
    });
  }

  return out;
}
