/**
 * GSE Reliever Value Score (RVS) — the forward-looking upgrade of raw Solds.
 *
 * Raw Solds (saves + holds) is backward-looking volume: it can't tell a
 * secure, skilled closer from a volume-only arm, treats a save and a hold as
 * equal, and ignores whether the pitcher keeps the job. RVS blends:
 *
 *   volume      — leverage-weighted opportunities: SV·1.0 + HLD·0.7
 *                 (a save is worth more than a hold), percentile-ranked
 *   skill       — 0.60·pct(K−BB%) + 0.40·pct(−FIP): the two most
 *                 skill-descriptive reliever stats
 *   reliability — Solds% = (SV+HLD)/(SV+HLD+BS), conversion of chances
 *                 (population-median fill when a reliever has no chances yet)
 *
 *   RVS = 100 · clamp01( 0.55·pct(volume) + 0.25·skill + 0.20·Solds% )
 *
 * Role tags classify usage from saves/holds/opportunities so the board reads
 * at a glance who is the 9th-inning arm, the committee piece, or the
 * next-save-in-waiting setup man. Glass-box: every input column is visible.
 *
 * Port of the validated clean-room reference implementation; verified against
 * its live-season reliever table in the test suite.
 */

import { percentileRanks } from "../core/stats";

export interface RelieverSeason {
  /** Stable identifier (display key; not used in math). */
  readonly id: string;
  /** Games pitched. */
  readonly gamesPitched: number;
  readonly saves: number;
  readonly holds: number;
  readonly blownSaves: number;
  /** Save opportunities (SV + BS as reported by the source). */
  readonly saveOpportunities: number;
  /** K% − BB% per batter faced (fraction, e.g. 0.18). */
  readonly kMinusBb: number;
  /** FIP (with the league constant already applied). */
  readonly fip: number;
}

export type RelieverRole =
  | "Closer"
  | "Committee/9th"
  | "Setup (high-lev)"
  | "Middle/Hold"
  | "Low-leverage";

/** Usage-based role tag (public rules, pinned by tests). */
export function relieverRole(r: {
  readonly saves: number;
  readonly holds: number;
  readonly saveOpportunities: number;
}): RelieverRole {
  if (r.saves >= 3 || (r.saveOpportunities >= 5 && r.saves >= r.holds)) return "Closer";
  if (r.saves >= 1 && r.saveOpportunities >= 2) return "Committee/9th";
  if (r.holds >= 5) return "Setup (high-lev)";
  if (r.holds >= 1) return "Middle/Hold";
  return "Low-leverage";
}

export interface RvsScore {
  readonly id: string;
  readonly role: RelieverRole;
  /** Saves + holds — the raw incumbent metric, kept for reference. */
  readonly solds: number;
  /** Conversion reliability in [0,1]; null when the reliever has no chances. */
  readonly soldsPct: number | null;
  /** 0–100 Reliever Value Score. */
  readonly rvs: number;
}

function median(values: readonly number[]): number {
  const finite = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = finite.length;
  if (n === 0) return Number.NaN;
  return n % 2 === 1 ? finite[(n - 1) / 2]! : (finite[n / 2 - 1]! + finite[n / 2]!) / 2;
}

/**
 * Score a reliever population (percentile ranks are relative to the cohort
 * passed in — season qualifiers, a team's pen, etc.). Returns input order.
 */
export function computeRvs(population: readonly RelieverSeason[]): RvsScore[] {
  const volume = population.map((r) => r.saves * 1.0 + r.holds * 0.7);
  const volumeRank = percentileRanks(volume);
  const kmbbRank = percentileRanks(population.map((r) => r.kMinusBb));
  const invFipRank = percentileRanks(population.map((r) => -r.fip));

  const soldsPct = population.map((r) => {
    const chances = r.saves + r.holds + r.blownSaves;
    return chances > 0 ? (r.saves + r.holds) / chances : null;
  });
  // No-chances relievers get the population median — neutral, never a free 100%.
  const reliabilityFill = median(soldsPct.filter((v): v is number => v !== null));

  return population.map((r, i) => {
    const skill = kmbbRank[i]! * 0.6 + invFipRank[i]! * 0.4;
    const reliability = soldsPct[i] ?? reliabilityFill;
    const raw = 0.55 * volumeRank[i]! + 0.25 * skill + 0.2 * reliability;
    const rvs = Math.min(1, Math.max(0, raw)) * 100;
    return {
      id: r.id,
      role: relieverRole(r),
      solds: r.saves + r.holds,
      soldsPct: soldsPct[i] ?? null,
      rvs,
    };
  });
}
