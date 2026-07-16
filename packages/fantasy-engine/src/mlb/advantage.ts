/**
 * GSE Advantage Score — a PRINCIPLED hitter-vs-pitcher matchup, not a vibe.
 *
 * Uses the Log5 / odds-ratio family's standard rate-interaction form on the
 * xwOBA scale (the same scale the Matchup Skill Index grades skills on):
 *
 *   expected_matchup_xwOBA = (hitter_xwOBA × pitcher_xwOBA_allowed) / league_xwOBA
 *
 * Reading: above the league line → hitter edge; below → pitcher edge. Because
 * the output is an EXPECTED RATE (not an opaque score), it back-tests directly
 * against realized outcomes — the accuracy module can prove or disprove it on
 * live data, which is the entire GSE difference: calibrated, not asserted.
 *
 * "vs the whole staff" = the batters-faced-weighted xwOBA-allowed across the
 * opposing pitchers expected to appear. Platoon adjustment multiplies the base
 * matchup by the hitter's OPS split ratio for the starter's throwing hand
 * (source: MLB Stats API statSplits sitCodes=vl/vr — per-player, on demand).
 */

export interface StaffPitcher {
  /** xwOBA allowed by this pitcher. */
  readonly xwobaAllowed: number;
  /** Batters faced — the exposure weight. */
  readonly battersFaced: number;
}

/** Base Log5 matchup on the xwOBA scale. */
export function matchupXwoba(
  hitterXwoba: number,
  pitcherXwobaAllowed: number,
  leagueXwoba: number,
): number {
  if (
    !Number.isFinite(hitterXwoba) ||
    !Number.isFinite(pitcherXwobaAllowed) ||
    !Number.isFinite(leagueXwoba) ||
    leagueXwoba <= 0
  ) {
    return Number.NaN;
  }
  return (hitterXwoba * pitcherXwobaAllowed) / leagueXwoba;
}

/** Batters-faced-weighted staff xwOBA-allowed ("vs the whole staff"). */
export function staffXwobaAllowed(staff: readonly StaffPitcher[]): number {
  let num = 0;
  let den = 0;
  for (const p of staff) {
    if (Number.isFinite(p.xwobaAllowed) && Number.isFinite(p.battersFaced) && p.battersFaced > 0) {
      num += p.xwobaAllowed * p.battersFaced;
      den += p.battersFaced;
    }
  }
  return den === 0 ? Number.NaN : num / den;
}

/**
 * Platoon-adjusted matchup: base Log5 × (hitter OPS vs the starter's hand ÷
 * hitter overall OPS). The single biggest same-day sharpener — a hitter with
 * a .855-vs-LHP / 1.069-vs-RHP profile is a materially different bet
 * depending on who starts. Degrades to the base matchup when splits are
 * unavailable (never fabricates a split).
 */
export function platoonAdjustedMatchup(
  baseMatchupXwoba: number,
  hitterOpsVsHand: number | null,
  hitterOpsOverall: number | null,
): number {
  if (
    hitterOpsVsHand === null ||
    hitterOpsOverall === null ||
    !Number.isFinite(hitterOpsVsHand) ||
    !Number.isFinite(hitterOpsOverall) ||
    hitterOpsOverall <= 0
  ) {
    return baseMatchupXwoba;
  }
  return baseMatchupXwoba * (hitterOpsVsHand / hitterOpsOverall);
}

export type MatchupEdge = "HITTER" | "PITCHER" | "NEUTRAL";

/** Which side of the league line the expected matchup lands on. */
export function matchupEdge(expectedXwoba: number, leagueXwoba: number): MatchupEdge {
  // Same invalid-league handling as matchupXwoba: a missing baseline
  // defaulted to 0 must never label every matchup a hitter edge.
  if (!Number.isFinite(expectedXwoba) || !Number.isFinite(leagueXwoba) || leagueXwoba <= 0) {
    return "NEUTRAL";
  }
  if (expectedXwoba > leagueXwoba) return "HITTER";
  if (expectedXwoba < leagueXwoba) return "PITCHER";
  return "NEUTRAL";
}
