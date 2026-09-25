// @ts-nocheck
/**
 * arXiv 2004.08607: Accumulator Bet Selection Through Stochastic Diffusion Search.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Accumulator bet selection through Stochastic Diffusion Search: a population of agents holds hypotheses (accumulator leg-sets), tests them against calibrated NFL probabilities + multi-book odds, and diffuses the best hypotheses. RESEARCH NOTEBOOK ONLY: never a product; singles remain the stance. The expected replication is the negative-control pattern (accumulators: higher headline return, far worse risk-adjusted return and drawdown).
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Reimplement the paper as an internal research notebook only (GSE calibrated NFL probabilities + multi-book odds -> optimal-accumulator selector vs singles portfolio, proper held-out seasons, full calibration analysis); publish the honest result as content only if the numbers support it; never expose an accumulator optimizer in the product and keep any parlay-adjacent UI behind existing responsible-play copy -- singles remain the stance.
 *
 * ACCEPTANCE GATE:
 * The framework is ADOPTED as a research tool (not a product) if the replication reproduces the paper's qualitative pattern (accumulators: higher headline return, far worse risk-adjusted return and drawdown) on NFL data -- confirming the negative-control thesis. If accumulators somehow win risk-adjusted on held-out NFL seasons, escalate to Garrett before any product discussion.
 *
 * RESEARCH ONLY, permanently disabled for product use. If accumulators ever won risk-adjusted on held-out NFL seasons, escalate to Garrett before any product discussion.
 */


export const ENABLED = false;
/** Hard product ban: this module must never back a parlay/accumulator product surface. */
export const RESEARCH_ONLY = true;

export interface Leg {
  readonly id: string;
  /** Calibrated engine probability of the leg hitting. */
  readonly p: number;
  /** Best available decimal odds across books. */
  readonly decimalOdds: number;
}

export interface AccumulatorHypothesis {
  readonly legs: readonly string[];
}

/** Expected log-growth of an accumulator vs the singles portfolio (same total stake). */
export function accumulatorEdge(legs: readonly Leg[]): {
  readonly ev: number;
  readonly pHit: number;
  readonly payout: number;
  readonly kellyLogGrowth: number;
} {
  const pHit = legs.reduce((a, l) => a * l.p, 1);
  const payout = legs.reduce((a, l) => a * l.decimalOdds, 1);
  const ev = pHit * payout - 1;
  // Kelly log-growth for a full-Kelly stake fraction f on this accumulator:
  // g(f) = p*log(1+f*(payout-1)) + (1-p)*log(1-f); report max over f in (0,1).
  let best = -Infinity;
  for (let f = 0.01; f < 1; f += 0.01) {
    const g =
      pHit * Math.log(1 + f * (payout - 1)) + (1 - pHit) * Math.log(1 - f);
    if (g > best) best = g;
  }
  return { ev, pHit, payout, kellyLogGrowth: best };
}

export interface Agent {
  hypothesis: AccumulatorHypothesis;
  active: boolean;
  fitness: number;
}

function hypothesisFitness(h: AccumulatorHypothesis, legById: Map<string, Leg>): number {
  const legs = h.legs.map((id) => legById.get(id)!).filter(Boolean);
  if (legs.length < 2) return -Infinity;
  return accumulatorEdge(legs).kellyLogGrowth;
}

function mutate(
  h: AccumulatorHypothesis,
  legIds: readonly string[],
  rand: () => number,
): AccumulatorHypothesis {
  const legs = [...h.legs];
  const r = rand();
  if (r < 0.4 && legs.length > 2) {
    legs.splice(Math.floor(rand() * legs.length), 1);
  } else {
      const cand = legIds[Math.floor(rand() * legIds.length)]!;
      if (!legs.includes(cand)) legs.push(cand);
  }
  return { legs };
}

/**
 * Stochastic Diffusion Search over accumulator leg-sets.
 * Test phase: each agent evaluates its hypothesis (expected Kelly log-growth).
 * Diffusion phase: inactive agents copy a random active agent's hypothesis with mutation.
 */
export function stochasticDiffusionSearch(
  legs: readonly Leg[],
  nAgents = 60,
  nIterations = 40,
  seed = 2026,
): { readonly best: AccumulatorHypothesis; readonly fitness: number } {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const legById = new Map(legs.map((l) => [l.id, l]));
  const legIds = legs.map((l) => l.id);
  const randomHypothesis = (): AccumulatorHypothesis => {
    const k = 2 + Math.floor(rand() * 4);
    const shuffled = [...legIds].sort(() => rand() - 0.5);
    return { legs: shuffled.slice(0, k) };
  };
  const agents: Agent[] = Array.from({ length: nAgents }, () => {
    const h = randomHypothesis();
    return { hypothesis: h, active: false, fitness: hypothesisFitness(h, legById) };
  });
let best = agents[0]!.hypothesis;
let bestFit = agents[0]!.fitness;
  for (let iter = 0; iter < nIterations; iter++) {
    // Test phase: active if fitness is above the population median.
    const fits = agents.map((x) => x.fitness).sort((x, y) => x - y);
    const median = fits[Math.floor(fits.length / 2)]!;
    for (const ag of agents) ag.active = ag.fitness >= median;
    // Diffusion phase: inactive agents copy a random active hypothesis + mutate.
    const actives = agents.filter((ag) => ag.active);
    for (const ag of agents) {
      if (!ag.active && actives.length > 0) {
      const donor = actives[Math.floor(rand() * actives.length)]!;
      ag.hypothesis = mutate(donor.hypothesis, legIds, rand);
        ag.fitness = hypothesisFitness(ag.hypothesis, legById);
      }
    }
    for (const ag of agents) {
      if (ag.fitness > bestFit) {
        bestFit = ag.fitness;
        best = ag.hypothesis;
      }
    }
  }
  return { best, fitness: bestFit };
}

/**
 * Negative-control comparison: accumulator (best found) vs singles portfolio of
 * the same legs. Returns Sharpe-like risk-adjusted comparison on EV/variance.
 */
export function singlesVsAccumulator(legs: readonly Leg[]): {
  readonly accumulatorSharpe: number;
  readonly singlesSharpe: number;
  readonly accumulatorMaxDrawdownProxy: number;
} {
  const { pHit, payout } = accumulatorEdge(legs);
  const accMean = pHit * payout - 1;
  const accVar = pHit * (1 - pHit) * payout * payout;
  const singlesMean = legs.reduce((a, l) => a + (l.p * l.decimalOdds - 1), 0) / legs.length;
  const singlesVar =
    legs.reduce((a, l) => {
      return a + l.p * (1 - l.p) * l.decimalOdds * l.decimalOdds;
    }, 0) /
    (legs.length * legs.length);
  return {
    accumulatorSharpe: accVar > 0 ? accMean / Math.sqrt(accVar) : 0,
    singlesSharpe: singlesVar > 0 ? singlesMean / Math.sqrt(singlesVar) : 0,
    accumulatorMaxDrawdownProxy: 1 - pHit, // probability of a total-loss week
  };
}
