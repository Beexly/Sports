/**
 * GSE SMASH — the MLB skill index ("skills over results"), glass-box.
 *
 * The philosophy: grade what a player CONTROLS (expected stats, batted-ball
 * quality, plate discipline) instead of outcome stats that carry luck. Each
 * component is z-scored against the scored population (population sd, ddof=0),
 * direction-adjusted, weight-blended, and mapped to a readable 50±10 "OVR".
 *
 * Every weight below is public by design — this is the anti-black-box: the
 * incumbents sell an equivalent number as a sealed proprietary rating; GSE
 * publishes the formula and, because the index is built on xwOBA, it is
 * BACK-TESTABLE against actual outcomes (see the accuracy module) rather than
 * merely asserted.
 *
 * Port of the validated clean-room reference implementation; verified
 * row-for-row against its live-season golden outputs in the test suite.
 */

import { zscores, to100 } from "../core/stats";

export type SmashTier = "ELITE" | "GREEN" | "WHITE" | "RED" | "AVOID";

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

export interface SmashComponent<K extends string = string> {
  readonly key: K;
  /** +1 when more is better, −1 when less is better. */
  readonly direction: 1 | -1;
  readonly weight: number;
}

/**
 * Hitter component weights (public, pinned by tests):
 * xwOBA carries the most signal; contact quality next; discipline rounds it out.
 */
export const HITTER_COMPONENTS: readonly SmashComponent<keyof HitterSkillInput>[] = [
  { key: "xwoba", direction: 1, weight: 1.6 },
  { key: "barrelBattedRate", direction: 1, weight: 1.1 },
  { key: "hardHitPercent", direction: 1, weight: 0.9 },
  { key: "kPercent", direction: -1, weight: 1.0 },
  { key: "bbPercent", direction: 1, weight: 0.8 },
  { key: "whiffPercent", direction: -1, weight: 0.8 },
];

/** Pitcher (suppression) weights: K% earns more than the hitter mirror. */
export const PITCHER_COMPONENTS: readonly SmashComponent<keyof PitcherSkillInput>[] = [
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
 * computeSmash), never fall through to the worst tier.
 */
export function smashTier(score: number): SmashTier {
  if (!Number.isFinite(score)) {
    throw new Error(`smashTier: score must be finite, got ${score}`);
  }
  if (score >= 63) return "ELITE";
  if (score >= 56) return "GREEN";
  if (score >= 44) return "WHITE";
  if (score >= 37) return "RED";
  return "AVOID";
}

export interface SmashScore {
  /** 50±10 OVR-style index over the scored population. NaN = unscoreable. */
  readonly smash: number;
  /** Null = UNRATED (missing inputs) — never conflated with a real AVOID. */
  readonly tier: SmashTier | null;
}

/**
 * Score a full population against ITSELF (the z-scores are relative to the
 * cohort passed in — season-to-date qualifiers, a rolling-30 window, etc.).
 * Returns scores in input order. A row with any non-finite component scores
 * NaN and tiers "WHITE"-adjacent handling is the caller's job — never silently
 * imputed.
 */
function computeSmash<K extends string, T extends Readonly<Record<K, number>>>(
  population: readonly T[],
  components: readonly SmashComponent<K>[],
): SmashScore[] {
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
    const smash = to100(acc / totalWeight);
    return { smash, tier: Number.isFinite(smash) ? smashTier(smash) : null };
  });
}

export function computeHitterSmash(population: readonly HitterSkillInput[]): SmashScore[] {
  return computeSmash(population, HITTER_COMPONENTS);
}

export function computePitcherSmash(population: readonly PitcherSkillInput[]): SmashScore[] {
  return computeSmash(population, PITCHER_COMPONENTS);
}
