/**
 * L2 MATCHUPS — Shadow Coverage Matrix emitter.
 *
 * Doctrine: player vs player with names reaches the published reasoning trail.
 * A coach asks: does this CB shadow this WR, and at what rate?
 * Missing data is a named gap, never a zero.
 *
 * This module reads structured shadow rows (from FTN Shadow Coverage Matrix
 * or equivalent charting) and emits FactorDetail entries that the reasoning
 * trail can render. It does not invent rates. If the matrix is absent for the
 * matchup, it says so.
 */

import type { FactorDetail } from "@sports/types";

export interface ShadowRow {
  readonly week: number;
  readonly defTeam: string;
  readonly cbName: string;
  readonly offTeam: string;
  readonly wrName: string;
  readonly shadowRate: number; // 0–1, share of snaps the CB shadowed the WR
  readonly snaps: number;
  readonly source: string;
  readonly fetchedAt: string;
}

export interface ShadowCoverageInput {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly shadows: readonly ShadowRow[];
  readonly pickedSide: "HOME" | "AWAY";
}

const MATERIAL_RATE = 0.55; // shadow on majority of snaps is material
const MIN_SNAPS = 20;

/**
 * Emit one FactorDetail per material shadow (rate ≥ 0.55, snaps ≥ 20).
 * Weight is intentionally small so this is trail content. The decision layer
 * is a later step. Missing matrix is a named gap.
 */
export function shadowCoverageFactors(input: ShadowCoverageInput): FactorDetail[] {
  const out: FactorDetail[] = [];

  for (const row of input.shadows) {
    if (row.week !== input.week) continue;
    if (row.shadowRate < MATERIAL_RATE || row.snaps < MIN_SNAPS) continue;

    const isDefHome = row.defTeam === input.homeTeam;
    const isDefAway = row.defTeam === input.awayTeam;
    if (!isDefHome && !isDefAway) continue;

    // For the picked side: a shadow on our WR is negative (harder matchup);
    // a shadow on their WR is positive (their preferred target is locked).
    const shadowOnOurSide = (input.pickedSide === "HOME" && row.offTeam === input.homeTeam)
      || (input.pickedSide === "AWAY" && row.offTeam === input.awayTeam);
    const impact = shadowOnOurSide ? "negative" : "positive";
    const weight = shadowOnOurSide ? -7 : 7;

    out.push({
      name: `Shadow: ${row.cbName} on ${row.wrName}`,
      impact,
      weight,
      description: `${row.cbName} (${row.defTeam}) shadowed ${row.wrName} (${row.offTeam}) on ${(row.shadowRate * 100).toFixed(0)}% of snaps (${row.snaps} snaps). Source: ${row.source}, fetched ${row.fetchedAt}.`,
    });
  }

  if (out.length === 0) {
    out.push({
      name: "Shadow Coverage",
      impact: "neutral",
      weight: 0,
      description: `No material shadow coverage (rate ≥ ${(MATERIAL_RATE * 100).toFixed(0)}%, snaps ≥ ${MIN_SNAPS}) for ${input.homeTeam} or ${input.awayTeam} in week ${input.week}. Source: ${input.shadows[0]?.source ?? "none"}.`,
    });
  }

  return out;
}
