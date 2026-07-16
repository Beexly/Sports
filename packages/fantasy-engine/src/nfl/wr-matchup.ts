/**
 * GSE WR/TE Matchup Index — receiving skill ("skills over results") on the
 * 50±10 scale, tiered like the MLB Matchup Skill Index family.
 *
 * Components (direction, weight — public, pinned by tests):
 *   receiving yards/game (+1.4) · target share (+1.1) · aDOT (+0.6) ·
 *   YAC/reception (+0.8) · broken tackles (+0.6) · passer rating when
 *   targeted (+0.9) · drop% (−0.4) · receiving EPA (+1.0)
 *
 * Missing-data posture — a DELIBERATE improvement over the reference
 * implementation: the reference lets a row with missing advanced stats fall
 * through to the worst tier (its live output labels e.g. injured-season
 * receivers AVOID purely because PFR advanced columns were absent). Here a
 * non-finite component makes the score NaN and the tier NULL (unrated) —
 * missing data is never a skill judgment. The golden test verifies scored
 * rows against the reference and pins this deviation explicitly.
 *
 * Clean-room implementation computed solely from MLB StatsAPI / Baseball
 * Savant / nflverse public data; methodology provenance documented in the
 * internal competitive-research package.
 */

import { zscores, to100 } from "../core/stats";
import { msiTier, type MsiTier } from "../mlb/matchup-skill";

export interface ReceiverSeason {
  /** Stable identifier (display key; not used in math). */
  readonly id: string;
  /** Receiving yards per game. */
  readonly recYardsPerGame: number;
  /** Share of team targets (0–1). */
  readonly targetShare: number;
  /** Average depth of target (air yards). */
  readonly adot: number;
  /** Yards after catch per reception. */
  readonly yacPerReception: number;
  /** Broken tackles on receptions. */
  readonly brokenTackles: number;
  /** Passer rating when targeted. */
  readonly ratingWhenTargeted: number;
  /** Drop rate (%). Negative signal. */
  readonly dropPercent: number;
  /** Receiving EPA. */
  readonly receivingEpa: number;
}

interface WrComponent {
  readonly read: (r: ReceiverSeason) => number;
  readonly weight: number;
}

const WR_COMPONENTS: readonly WrComponent[] = [
  { read: (r) => r.recYardsPerGame, weight: 1.4 },
  { read: (r) => r.targetShare, weight: 1.1 },
  { read: (r) => r.adot, weight: 0.6 },
  { read: (r) => r.yacPerReception, weight: 0.8 },
  { read: (r) => r.brokenTackles, weight: 0.6 },
  { read: (r) => r.ratingWhenTargeted, weight: 0.9 },
  { read: (r) => -r.dropPercent, weight: 0.4 },
  { read: (r) => r.receivingEpa, weight: 1.0 },
];

const WR_WEIGHT_TOTAL = WR_COMPONENTS.reduce((s, c) => s + c.weight, 0);

export interface WrMatchupScore {
  readonly id: string;
  /** 50±10 index over the scored population. NaN = unscoreable. */
  readonly msi: number;
  /** Null = UNRATED (missing inputs) — never conflated with a real AVOID. */
  readonly tier: MsiTier | null;
}

/**
 * Score a receiver population against itself (season qualifiers, a positional
 * cohort, a rolling window). Returns input order. Population z-scores exclude
 * non-finite values, so one receiver's missing column never distorts the
 * league baseline for everyone else.
 */
export function computeWrMatchup(population: readonly ReceiverSeason[]): WrMatchupScore[] {
  const zByComponent = WR_COMPONENTS.map((c) => zscores(population.map(c.read)));
  return population.map((r, i) => {
    let acc = 0;
    for (let k = 0; k < WR_COMPONENTS.length; k++) {
      acc += zByComponent[k]![i]! * WR_COMPONENTS[k]!.weight;
    }
    const msi = to100(acc / WR_WEIGHT_TOTAL);
    return {
      id: r.id,
      msi,
      tier: Number.isFinite(msi) ? msiTier(msi) : null,
    };
  });
}
