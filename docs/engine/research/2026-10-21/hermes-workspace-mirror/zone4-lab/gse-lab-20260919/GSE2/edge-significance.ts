/**
 * Edge-significance self-grader — does the model's hit rate beat luck, or are we
 * fooling ourselves? A Monte-Carlo permutation test: under the NULL that each pick
 * only wins with its market-implied (no-edge) probability, how often would we see
 * at least as many wins as we actually did? A low p-value means the model's wins
 * exceed what a no-edge baseline produces — evidence of real skill.
 *
 * This is the engine grading ITSELF honestly (introspection) — it pairs with the
 * tamper-evident proof-of-record: prove the picks AND prove the edge isn't luck.
 *
 * Pure (RNG injectable for deterministic tests). Reference: paper-betting-tracker's
 * Monte-Carlo-vs-random-EV null. Gating any public "statistically significant edge"
 * claim is founder-gated and must clear the honesty/copy scanners.
 */

export interface SettledPick {
  /** Did the model's chosen side win? */
  readonly won: boolean;
  /** Null-hypothesis P(the chosen side wins) with NO edge — typically market-implied. */
  readonly nullProb: number;
}

export interface SignificanceOptions {
  /** Monte-Carlo iterations. Default 2000. */
  readonly trials?: number;
  /** Significance threshold. Default 0.05. */
  readonly alpha?: number;
  /**
   * Injectable RNG in [0,1). Defaults to a fixed-seed deterministic PRNG so the
   * Monte-Carlo p-value is reproducible in library code (no Math.random).
   */
  readonly random?: () => number;
}

export interface SignificanceResult {
  readonly picks: number;
  readonly observedWins: number;
  /** Sum of null win probabilities — the no-edge expectation. */
  readonly expectedWins: number;
  /** P(simulated wins ≥ observed) under the null. Lower = stronger evidence of edge. */
  readonly winRatePValue: number;
  readonly trials: number;
  readonly significant: boolean;
}

export function edgeSignificance(
  picks: readonly SettledPick[],
  options: SignificanceOptions = {},
): SignificanceResult {
  const trials = options.trials ?? 2000;
  const alpha = options.alpha ?? 0.05;
  // Default to a fixed-seed deterministic PRNG (not Math.random) so identical
  // picks always yield the same p-value — a proof-of-record must not flip runs.
  const rnd = options.random ?? mulberry32(DEFAULT_SEED);

  const observedWins = picks.reduce((n, p) => n + (p.won ? 1 : 0), 0);
  const expectedWins = picks.reduce((s, p) => s + clamp01(p.nullProb), 0);

  let atLeastAsExtreme = 0;
  for (let t = 0; t < trials; t++) {
    let wins = 0;
    for (const p of picks) {
      if (rnd() < clamp01(p.nullProb)) wins += 1;
    }
    if (wins >= observedWins) atLeastAsExtreme += 1;
  }
  // +1 smoothing → never reports an impossible p-value of exactly 0.
  const winRatePValue = (atLeastAsExtreme + 1) / (trials + 1);

  return {
    picks: picks.length,
    observedWins,
    expectedWins: round2(expectedWins),
    winRatePValue: round4(winRatePValue),
    trials,
    significant: picks.length > 0 && winRatePValue <= alpha,
  };
}

/** Fixed seed for the default deterministic PRNG. Constant → reproducible output. */
const DEFAULT_SEED = 0x9e3779b9;

/** Deterministic seedable PRNG in [0,1). Pure — no Math.random / Date.now. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function round2(x: number): number {
  return Number(x.toFixed(2));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
