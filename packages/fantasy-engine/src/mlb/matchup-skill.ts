/**
 * GSE Matchup Skill Index (MSI) — the MLB skill index ("skills over
 * results"), glass-box.
 *
 * The philosophy: grade what a player CONTROLS (expected stats, batted-ball
 * quality, plate discipline) instead of outcome stats that carry luck. Each
 * component is z-scored against the scored population (population sd, ddof=0),
 * direction-adjusted, weight-blended, and mapped to a readable 50±10 "OVR".
 *
 * Every weight below is public by design — this is the anti-black-box: sealed
 * proprietary ratings hide the formula; GSE publishes it and, because the
 * index is built on xwOBA, it is BACK-TESTABLE against actual outcomes (see
 * the accuracy module) rather than merely asserted.
 *
 * Clean-room implementation computed solely from MLB StatsAPI / Baseball
 * Savant / nflverse public data; methodology provenance documented in the
 * internal competitive-research package.
 */

import { zscores, to100 } from "../core/stats";

export type MsiTier = "ELITE" | "GREEN" | "WHITE" | "RED" | "AVOID";

/** One scored-population member's skill inputs (per-season or windowed). */
export interface HitterSkillInput {
  /** Expected wOBA — the single most skill-descriptive hitting metric. */
  readonly xwoba: number;
  /** Barrel rate per batted-ball event (%). */
  readonly barrelBattedRate: number;
  /** Hard-hit rate (%, 95+ mph exit velocity). */
  readonly hardHitPercent: number;
  /** Strikeout rate (%) — negative signal. */
  readonly kPercent: number;
  /** Walk rate (%). */
  readonly bbPercent: number;
  /** Whiff rate (%) — negative signal. */
  readonly whiffPercent: number;
}

/** Pitcher inputs are the SUPPRESSION view of the same quantities. */
export interface PitcherSkillInput {
  /** xwOBA allowed — lower is better. */
  readonly xwoba: number;
  readonly barrelBattedRate: number;
  readonly hardHitPercent: number;
  /** Strikeout rate generated (%) — positive signal for a pitcher. */
  readonly kPercent: number;
  readonly bbPercent: number;
  readonly whiffPercent: number;
}

export interface MsiComponent<K extends string = string> {
  readonly key: K;
  /** +1 when more is better, −1 when less is better. */
  readonly direction: 1 | -1;
  readonly weight: number;
}

/**
 * Hitter component weights (public, pinned by tests):
 * xwOBA carries the most signal; contact quality next; discipline rounds it out.
 */
export const HITTER_COMPONENTS: readonly MsiComponent<keyof HitterSkillInput>[] = [
  { key: "xwoba", direction: 1, weight: 1.6 },
  { key: "barrelBattedRate", direction: 1, weight: 1.1 },
  { key: "hardHitPercent", direction: 1, weight: 0.9 },
  { key: "kPercent", direction: -1, weight: 1.0 },
  { key: "bbPercent", direction: 1, weight: 0.8 },
  { key: "whiffPercent", direction: -1, weight: 0.8 },
];

/** Pitcher (suppression) weights: K% earns more than the hitter mirror. */
export const PITCHER_COMPONENTS: readonly MsiComponent<keyof PitcherSkillInput>[] = [
  { key: "xwoba", direction: -1, weight: 1.6 },
  { key: "barrelBattedRate", direction: -1, weight: 1.1 },
  { key: "hardHitPercent", direction: -1, weight: 0.9 },
  { key: "kPercent", direction: 1, weight: 1.2 },
  { key: "bbPercent", direction: -1, weight: 1.0 },
  { key: "whiffPercent", direction: 1, weight: 0.9 },
];

/**
 * Tier boundaries on the 50±10 scale (public, pinned by tests). Throws on a
 * non-finite score: missing data must surface as UNRATED (tier null from
 * computeMsi), never fall through to the worst tier.
 */
export function msiTier(score: number): MsiTier {
  if (!Number.isFinite(score)) {
    throw new Error(`msiTier: score must be finite, got ${score}`);
  }
  if (score >= 63) return "ELITE";
  if (score >= 56) return "GREEN";
  if (score >= 44) return "WHITE";
  if (score >= 37) return "RED";
  return "AVOID";
}

export interface MsiScore {
  /** 50±10 OVR-style index over the scored population. NaN = unscoreable. */
  readonly msi: number;
  /** Null = UNRATED (missing inputs) — never conflated with a real AVOID. */
  readonly tier: MsiTier | null;
}

/**
 * Score a full population against ITSELF (the z-scores are relative to the
 * cohort passed in — season-to-date qualifiers, a rolling-30 window, etc.).
 * Returns scores in input order. A row with any non-finite component scores
 * NaN and tiers "WHITE"-adjacent handling is the caller's job — never silently
 * imputed.
 */
function computeMsi<K extends string, T extends Readonly<Record<K, number>>>(
  population: readonly T[],
  components: readonly MsiComponent<K>[],
): MsiScore[] {
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  // Column-wise z-scores over the population, direction-adjusted.
  const zByKey = new Map<K, number[]>();
  for (const c of components) {
    const col = population.map((row) => row[c.key]);
    zByKey.set(
      c.key,
      zscores(col).map((z) => z * c.direction),
    );
  }
  return population.map((_, i) => {
    let acc = 0;
    for (const c of components) {
      acc += zByKey.get(c.key)![i]! * c.weight;
    }
    const msi = to100(acc / totalWeight);
    return { msi, tier: Number.isFinite(msi) ? msiTier(msi) : null };
  });
}

export function computeHitterMsi(population: readonly HitterSkillInput[]): MsiScore[] {
  return computeMsi(population, HITTER_COMPONENTS);
}

export function computePitcherMsi(population: readonly PitcherSkillInput[]): MsiScore[] {
  return computeMsi(population, PITCHER_COMPONENTS);
}
