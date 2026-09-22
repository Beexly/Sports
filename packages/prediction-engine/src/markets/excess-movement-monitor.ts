/**
 * In-game excess-movement monitor (arXiv 2109.09871).
 *
 * The paper's over/under-inference finding becomes a live-market monitor:
 * for each game block (quarter or 5-minute), compute rolling movement M
 * (total absolute change in implied win probability) and uncertainty
 * reduction R (drop in outcome entropy / variance), then excess movement
 * E = M - R. Early game (Q1-Q2) E > 0 means the market overreacts -> fade
 * moves (expect reversal); late game (Q4) E < 0 means underreaction ->
 * follow moves (expect continuation). The crossover point (paper's NBA
 * crossover ~= end of Q3; NFL's discrete scoring may shift it) is
 * calibrated per league, and signals are conditioned on leverage
 * (high/low game-minutes).
 *
 * ACCEPTANCE GATE: ADAPT is confirmed if, on 2024 NFL in-play data,
 * excess movement is significantly positive in Q1-Q2 and significantly
 * negative in Q4 (t-test, p < 0.05), AND the fade-early/follow-late rule
 * beats the baseline on CLV.
 *
 * Research-only module. Not wired into any live trading path.
 */

export interface GameBlock {
  /** Implied home-win probabilities sampled through the block. */
  probs: number[];
  /** 1-4 quarter, or 5-minute block index. */
  block: number;
  /** High-leverage minutes flag (close + late, or per the leverage split). */
  highLeverage: boolean;
}

function binaryEntropy(p: number): number {
  const c = Math.min(1 - 1e-12, Math.max(1e-12, p));
  return -(c * Math.log2(c) + (1 - c) * Math.log2(1 - c));
}

/**
 * Rolling movement M: total absolute implied-probability movement within
 * the block.
 */
export function movement(probs: readonly number[]): number {
  if (probs.length < 2) throw new Error("movement: need >= 2 samples");
  let m = 0;
  for (let i = 1; i < probs.length; i++) m += Math.abs((probs[i] as number) - (probs[i - 1] as number));
  return m;
}

/**
 * Uncertainty reduction R: drop in binary outcome entropy from block
 * start to block end (floored at 0).
 */
export function uncertaintyReduction(probs: readonly number[]): number {
  if (probs.length < 2) throw new Error("uncertaintyReduction: need >= 2 samples");
  return Math.max(
    0,
    binaryEntropy(probs[0] as number) - binaryEntropy(probs[probs.length - 1] as number),
  );
}

/** Excess movement E = M - R for one block. */
export function excessMovement(block: GameBlock): number {
  return movement(block.probs) - uncertaintyReduction(block.probs);
}

export type InGameSignal = "fade" | "follow" | "none";

/**
 * Fade-early / follow-late rule. crossoverBlock: blocks <= crossover fade
 * on positive excess (overinference -> reversal); blocks > crossover
 * follow on negative excess (underinference -> continuation).
 */
export function inGameSignal(
  block: GameBlock,
  crossoverBlock: number,
  minExcess = 0.02,
): InGameSignal {
  const e = excessMovement(block);
  if (block.block <= crossoverBlock) {
    return e > minExcess ? "fade" : "none";
  }
  return e < -minExcess ? "follow" : "none";
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
}

function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
    0.284496736) * t + 0.254829592) * t;
  return s * (1 - poly * Math.exp(-ax * ax));
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * One-sample t-test of mean(excess) against 0 (two-sided). Used for the
 * gate: E significantly positive early, significantly negative late.
 */
export function excessTTest(excess: readonly number[]): {
  t: number;
  pValue: number;
  mean: number;
} {
  const n = excess.length;
  if (n < 2) throw new Error("excessTTest: need >= 2 observations");
  const m = mean(excess);
  const sd = Math.sqrt(excess.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1));
  if (sd < 1e-300) throw new Error("excessTTest: degenerate series");
  const t = m / (sd / Math.sqrt(n));
  return { t, pValue: 2 * (1 - normalCdf(Math.abs(t))), mean: m };
}

/**
 * Calibrate the crossover block: the first block index after which mean
 * excess turns negative and stays negative (fade-early before, follow-late
 * after). Returns null when no clean crossover exists.
 */
export function calibrateCrossover(
  blocks: ReadonlyArray<{ block: number; excess: number }>,
): number | null {
  if (blocks.length === 0) throw new Error("calibrateCrossover: no blocks");
  const byBlock = new Map<number, number[]>();
  for (const b of blocks) {
    const arr = byBlock.get(b.block) ?? [];
    arr.push(b.excess);
    byBlock.set(b.block, arr);
  }
  const idx = [...byBlock.keys()].sort((a, b) => a - b);
  const means = idx.map((i) => mean(byBlock.get(i) as number[]));
  for (let k = 0; k < idx.length - 1; k++) {
    if (
      (means[k] as number) > 0 &&
      means.slice(k + 1).every((m) => m < 0)
    ) {
      return idx[k] as number;
    }
  }
  return null;
}
