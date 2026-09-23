/**
 * arXiv 2108.02419v1: Implementing the BBE Agent-Based Model of a Sports-Betting Exchange.
 *
 * ACCEPTANCE GATE: ACCEPT the synthetic-live-market simulator if the synthetic-trained live-total model achieves within 10% relative log-loss of the real-trained model on the 2024 test window AND the simulator reproduces closing-line-move distributions within +-0.5 points MAD.
 */

export const ENABLED = false;

export type OutcomeSet = readonly number[];

export interface JointMarketState {
  readonly moneyline: OutcomeSet;
  readonly spread: OutcomeSet;
  readonly total: OutcomeSet;
}

export interface MarketTapeOptions {
  readonly steps: number;
  readonly seed: number;
  readonly commonShockScale?: number;
  readonly idiosyncraticShockScale?: number;
}

export interface MarketTapePoint {
  readonly step: number;
  readonly moneylineProbabilities: OutcomeSet;
  readonly spreadProbabilities: OutcomeSet;
  readonly totalProbabilities: OutcomeSet;
  readonly moneylineAmerican: readonly number[];
  readonly spreadAmerican: readonly number[];
  readonly totalAmerican: readonly number[];
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function validateOutcomes(label: string, outcomes: OutcomeSet): void {
  if (outcomes.length < 2 || outcomes.some((probability) => !Number.isFinite(probability) || probability <= 0)) {
    throw new Error(`${label} must contain at least two finite positive probabilities`);
  }
  const total = outcomes.reduce((sum, probability) => sum + probability, 0);
  if (Math.abs(total - 1) > 1e-8) {
    throw new Error(`${label} probabilities must sum to 1`);
  }
}

function shockedOutcomes(
  outcomes: OutcomeSet,
  commonShock: number,
  random: () => number,
  commonScale: number,
  idiosyncraticScale: number,
): OutcomeSet {
  const adjusted = outcomes.map((probability) => {
    const varianceScale = Math.sqrt(probability * (1 - probability));
    return Math.max(
      1e-6,
      probability + varianceScale * (commonShock * commonScale + (random() - 0.5) * idiosyncraticScale),
    );
  });
  const total = adjusted.reduce((sum, probability) => sum + probability, 0);
  return adjusted.map((probability) => probability / total);
}

export function probabilityToAmerican(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new Error("probability must be finite and strictly between 0 and 1");
  }
  return Math.round(probability >= 0.5 ? -100 * probability / (1 - probability) : 100 * (1 - probability) / probability);
}

export function simulateJointMarketTape(
  initial: JointMarketState,
  options: MarketTapeOptions,
): readonly MarketTapePoint[] {
  validateOutcomes("moneyline", initial.moneyline);
  validateOutcomes("spread", initial.spread);
  validateOutcomes("total", initial.total);
  if (!Number.isInteger(options.steps) || options.steps < 1) {
    throw new Error("steps must be a positive integer");
  }
  if (!Number.isFinite(options.seed)) {
    throw new Error("seed must be finite");
  }

  const commonScale = options.commonShockScale ?? 0.04;
  const idiosyncraticScale = options.idiosyncraticShockScale ?? 0.03;
  if (commonScale < 0 || idiosyncraticScale < 0) {
    throw new Error("shock scales must be non-negative");
  }

  const random = mulberry32(options.seed);
  const points: MarketTapePoint[] = [];
  let moneyline = initial.moneyline;
  let spread = initial.spread;
  let total = initial.total;

  for (let step = 0; step <= options.steps; step += 1) {
    const commonShock = random() * 2 - 1;
    moneyline = shockedOutcomes(moneyline, commonShock, random, commonScale, idiosyncraticScale);
    spread = shockedOutcomes(spread, commonShock, random, commonScale, idiosyncraticScale);
    total = shockedOutcomes(total, commonShock, random, commonScale, idiosyncraticScale);
    points.push({
      step,
      moneylineProbabilities: moneyline,
      spreadProbabilities: spread,
      totalProbabilities: total,
      moneylineAmerican: moneyline.map(probabilityToAmerican),
      spreadAmerican: spread.map(probabilityToAmerican),
      totalAmerican: total.map(probabilityToAmerican),
    });
  }

  return points;
}
