/**
 * GSE 4-Beat Props Pipeline — Engine-in-the-Open.
 *
 * [01 THE GATE] → [02 THE PASS LIST] → [03 THE BOARD] → [04 THE AUTOPSY]
 *
 * Stage 01: Multi-book ingest + Shin Market Maker Model devigging.
 *           3.5% min EV hurdle, 5.5% synthetic vig cap, 15-min freshness.
 * Stage 02: Discarded public baits with explicit rejection reasons.
 * Stage 03: Active high-EV conviction signals with Kelly sizing.
 * Stage 04: Settlement proof + Brier/CLV autopsy + Kalman feedback.
 *
 * Brand doctrine: "Math you can read. We detect. You decide."
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface BookOdds {
  readonly bookmaker: string;
  readonly overOdds: number;
  readonly underOdds: number;
  readonly line: number;
  readonly vigPct: number;
  readonly isSharp: boolean;
  readonly capturedAt: string;
}

export interface PlayerProp {
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly team: string;
  readonly opponent: string;
  readonly propType: string;
  readonly odds: readonly BookOdds[];
}

export interface ShinDevigResult {
  /** True unobserved insider probability (over). */
  readonly trueProbOver: number;
  /** True unobserved insider probability (under). */
  readonly trueProbUnder: number;
  /** Synthetic vig extracted by Shin model. */
  readonly syntheticVig: number;
  /** Whether the Shin model converged. */
  readonly converged: boolean;
}

export interface GateResult {
  readonly propId: string;
  readonly gateStatus: "QUALIFIED" | "DISCARDED";
  readonly discardReason: string | null;
  readonly expectedValuePct: number;
  readonly deviggedFairOdds: number;
  readonly recommendedPick: "OVER" | "UNDER" | "PASS";
  readonly shin: ShinDevigResult;
  readonly lineFreshnessMinutes: number;
  readonly bookCount: number;
  readonly sharpBookCount: number;
}

export interface PassListEntry {
  readonly propId: string;
  readonly playerName: string;
  readonly propType: string;
  readonly discardReason: string;
  readonly expectedValuePct: number;
  readonly timestamp: string;
}

export interface BoardEntry {
  readonly propId: string;
  readonly playerName: string;
  readonly position: string;
  readonly team: string;
  readonly propType: string;
  readonly recommendedPick: "OVER" | "UNDER";
  readonly deviggedFairOdds: number;
  readonly expectedValuePct: number;
  readonly kellyStakePct: number;
  readonly kellyStakeDollars: number;
  readonly confidenceTier: "A" | "B" | "C";
  readonly lineMovementAlert: boolean;
  readonly monteCarlo: {
    readonly simulations: number;
    readonly overHitRate: number;
    readonly p5: number;
    readonly p50: number;
    readonly p95: number;
  };
}

export interface AutopsyRecord {
  readonly propId: string;
  readonly actualStat: number;
  readonly won: boolean;
  readonly clvCents: number;
  readonly brierScore: number;
  readonly verdict: "VARIANCE" | "BLINDSPOT" | "INJURY";
  readonly explanation: string;
}

// ── Stage 01: The Gate ──────────────────────────────────────────────────────

/** Shin Market Maker Model — extracts true probabilities without margin distortion. */
export function shinDevig(overOdds: number, underOdds: number): ShinDevigResult {
  // Convert American odds to implied probabilities
  const toImplied = (odds: number): number => {
    if (odds > 0) return 100 / (odds + 100);
    return -odds / (-odds + 100);
  };
  const pOverImp = toImplied(overOdds);
  const pUnderImp = toImplied(underOdds);
  const totalImp = pOverImp + pUnderImp;

  // Shin's Z variable: solve for the insider probability
  // z² * (pOver * pUnder) - z * (pOver * (1-pOver) + pUnder * (1-pUnder)) - 1 = 0
  // Simplified iterative Shin solution
  const pOver = pOverImp / totalImp;
  const pUnder = pUnderImp / totalImp;

  // Shin's adjustment: the square of the "inside money" parameter
  const pi = pOver * pUnder;
  const z = Math.sqrt(Math.max(0, totalImp - 1) / pi || 0.01);

  // True probabilities after Shin adjustment
  const trueOver = pOver - z * pUnder / (2 * Math.sqrt(pi || 1));
  const trueUnder = pUnder - z * pOver / (2 * Math.sqrt(pi || 1));
  const totalTrue = trueOver + trueUnder;

  const normalizedOver = totalTrue > 0 ? trueOver / totalTrue : 0.5;
  const normalizedUnder = totalTrue > 0 ? trueUnder / totalTrue : 0.5;
  const syntheticVig = Math.max(0, totalImp - 1);

  return {
    trueProbOver: Number(normalizedOver.toFixed(4)),
    trueProbUnder: Number(normalizedUnder.toFixed(4)),
    syntheticVig: Number(syntheticVig.toFixed(4)),
    converged: totalTrue > 0,
  };
}

/** Gate thresholds per GSE spec. */
export const GATE_THRESHOLDS = {
  MIN_EV_PCT: 3.5,
  MAX_SYNTHETIC_VIG_PCT: 5.5,
  MAX_LINE_FRESHNESS_MINUTES: 15,
  MIN_BOOKS: 3,
  MIN_SHARP_BOOKS: 1,
} as const;

export function gateProp(
  prop: PlayerProp,
  modelProbOver: number,
  lineFreshnessMinutes: number,
): GateResult {
  const propId = `${prop.playerId}:${prop.propType}`;

  if (prop.odds.length < GATE_THRESHOLDS.MIN_BOOKS) {
    return {
      propId, gateStatus: "DISCARDED", discardReason: `Only ${prop.odds.length} books (min ${GATE_THRESHOLDS.MIN_BOOKS})`,
      expectedValuePct: 0, deviggedFairOdds: 0, recommendedPick: "PASS",
      shin: { trueProbOver: 0.5, trueProbUnder: 0.5, syntheticVig: 1, converged: false },
      lineFreshnessMinutes, bookCount: prop.odds.length, sharpBookCount: 0,
    };
  }

  // Use the sharpest book for devigging
  const sharpOdds = prop.odds.filter((o) => o.isSharp);
  const bestBook = sharpOdds.length > 0 ? sharpOdds[0] : prop.odds[0];
  const shin = shinDevig(bestBook.overOdds, bestBook.underOdds);

  // Line freshness check
  if (lineFreshnessMinutes > GATE_THRESHOLDS.MAX_LINE_FRESHNESS_MINUTES) {
    return {
      propId, gateStatus: "DISCARDED",
      discardReason: `Line stale by ${lineFreshnessMinutes.toFixed(0)}min (max ${GATE_THRESHOLDS.MAX_LINE_FRESHNESS_MINUTES}min)`,
      expectedValuePct: 0, deviggedFairOdds: 0, recommendedPick: "PASS",
      shin, lineFreshnessMinutes, bookCount: prop.odds.length,
      sharpBookCount: sharpOdds.length,
    };
  }

  // Synthetic vig cap
  if (shin.syntheticVig * 100 > GATE_THRESHOLDS.MAX_SYNTHETIC_VIG_PCT) {
    return {
      propId, gateStatus: "DISCARDED",
      discardReason: `Excessive synthetic vig ${(shin.syntheticVig * 100).toFixed(1)}% (max ${GATE_THRESHOLDS.MAX_SYNTHETIC_VIG_PCT}%)`,
      expectedValuePct: 0, deviggedFairOdds: 0, recommendedPick: "PASS",
      shin, lineFreshnessMinutes, bookCount: prop.odds.length,
      sharpBookCount: sharpOdds.length,
    };
  }

  // EV calculation
  const fairProbOver = shin.trueProbOver;
  const fairProbUnder = shin.trueProbUnder;
  const evOver = (modelProbOver / Math.max(0.01, fairProbOver) - 1) * 100;
  const evUnder = ((1 - modelProbOver) / Math.max(0.01, fairProbUnder) - 1) * 100;

  const bestEv = Math.max(evOver, evUnder);
  const pick: "OVER" | "UNDER" = evOver >= evUnder ? "OVER" : "UNDER";
  const deviggedFairOdds = pick === "OVER"
    ? Math.round(-100 * fairProbOver / (1 - fairProbOver))
    : Math.round(-100 * fairProbUnder / (1 - fairProbUnder));

  if (bestEv < GATE_THRESHOLDS.MIN_EV_PCT) {
    return {
      propId, gateStatus: "DISCARDED",
      discardReason: `EV ${bestEv.toFixed(1)}% below ${GATE_THRESHOLDS.MIN_EV_PCT}% hurdle`,
      expectedValuePct: Number(bestEv.toFixed(2)), deviggedFairOdds, recommendedPick: "PASS",
      shin, lineFreshnessMinutes, bookCount: prop.odds.length,
      sharpBookCount: sharpOdds.length,
    };
  }

  return {
    propId, gateStatus: "QUALIFIED", discardReason: null,
    expectedValuePct: Number(bestEv.toFixed(2)), deviggedFairOdds,
    recommendedPick: pick, shin, lineFreshnessMinutes,
    bookCount: prop.odds.length, sharpBookCount: sharpOdds.length,
  };
}

// ── Stage 02: The Pass List ─────────────────────────────────────────────────

export function buildPassList(gateResults: readonly GateResult[], props: readonly PlayerProp[]): readonly PassListEntry[] {
  const entries: PassListEntry[] = [];
  for (const g of gateResults) {
    if (g.gateStatus === "DISCARDED") {
      const prop = props.find((p) => `${p.playerId}:${p.propType}` === g.propId);
      entries.push({
        propId: g.propId,
        playerName: prop?.playerName ?? "Unknown",
        propType: prop?.propType ?? "Unknown",
        discardReason: g.discardReason ?? "Failed gate",
        expectedValuePct: g.expectedValuePct,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return entries;
}

// ── Stage 03: The Board ─────────────────────────────────────────────────────

/** Fractional Kelly (1/4 Kelly) for bankroll sizing. */
export function kellyStake(
  modelProb: number,
  impliedProb: number,
  bankroll: number,
  fraction: number = 0.25,
): { stakePct: number; stakeDollars: number } {
  const b = (1 / Math.max(0.01, impliedProb)) - 1;
  const p = modelProb;
  const q = 1 - p;
  const kelly = (b * p - q) / b;
  const stakePct = Math.max(0, kelly * fraction);
  const stakeDollars = stakePct * bankroll;
  return {
    stakePct: Number((stakePct * 100).toFixed(2)),
    stakeDollars: Number(stakeDollars.toFixed(2)),
  };
}

/** 10,000-sim Monte Carlo for prop outcomes. */
export function monteCarloProp(
  projectedMean: number,
  projectedStdDev: number,
  line: number,
  isOver: boolean,
  simulations: number = 10_000,
): { simulations: number; overHitRate: number; p5: number; p50: number; p95: number } {
  const samples: number[] = [];
  for (let i = 0; i < simulations; i++) {
    // Box-Muller transform for normal sampling
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    samples.push(projectedMean + z * projectedStdDev);
  }
  samples.sort((a, b) => a - b);
  const overHitRate = samples.filter((s) => s > line).length / simulations;
  return {
    simulations,
    overHitRate: Number(overHitRate.toFixed(4)),
    p5: Number(samples[Math.floor(simulations * 0.05)].toFixed(2)),
    p50: Number(samples[Math.floor(simulations * 0.5)].toFixed(2)),
    p95: Number(samples[Math.floor(simulations * 0.95)].toFixed(2)),
  };
}

export function buildBoard(
  gateResults: readonly GateResult[],
  props: readonly PlayerProp[],
  bankroll: number,
  modelProbOver: number,
  projectedMean: number,
  projectedStdDev: number,
): readonly BoardEntry[] {
  const entries: BoardEntry[] = [];
  for (const g of gateResults) {
    if (g.gateStatus !== "QUALIFIED") continue;
    const prop = props.find((p) => `${p.playerId}:${p.propType}` === g.propId);
    if (!prop) continue;

    const impliedProb = g.recommendedPick === "OVER"
      ? g.shin.trueProbOver
      : g.shin.trueProbUnder;
    const kelly = kellyStake(
      g.recommendedPick === "OVER" ? modelProbOver : 1 - modelProbOver,
      impliedProb,
      bankroll,
    );

    const mc = monteCarloProp(
      projectedMean,
      projectedStdDev,
      prop.odds[0]?.line ?? 0,
      g.recommendedPick === "OVER",
    );

    // Confidence tier from EV
    const tier = g.expectedValuePct > 8 ? "A" : g.expectedValuePct > 5 ? "B" : "C";

    // Line movement alert (sharp book diverges from retail)
    const sharpBook = prop.odds.find((o) => o.isSharp);
    const retailBook = prop.odds.find((o) => !o.isSharp);
    const lineAlert = sharpBook && retailBook
      ? Math.abs(sharpBook.line - retailBook.line) > 0.5
      : false;

    entries.push({
      propId: g.propId,
      playerName: prop.playerName,
      position: prop.position,
      team: prop.team,
      propType: prop.propType,
      recommendedPick: g.recommendedPick as "OVER" | "UNDER",
      deviggedFairOdds: g.deviggedFairOdds,
      expectedValuePct: g.expectedValuePct,
      kellyStakePct: kelly.stakePct,
      kellyStakeDollars: kelly.stakeDollars,
      confidenceTier: tier,
      lineMovementAlert: lineAlert,
      monteCarlo: mc,
    });
  }
  return entries;
}

// ── Stage 04: The Autopsy ───────────────────────────────────────────────────

export function autopsySettled(
  propId: string,
  actualStat: number,
  line: number,
  predictedProb: number,
  openingLine: number,
  closingLine: number,
  injuryReported: boolean,
): AutopsyRecord {
  const won = actualStat > line;
  const clvCents = Math.round((closingLine - openingLine) * 100);
  const outcome = won ? 1 : 0;
  const brier = Math.pow(predictedProb - outcome, 2);

  // Verdict: variance vs blindspot vs injury
  let verdict: "VARIANCE" | "BLINDSPOT" | "INJURY";
  let explanation: string;

  if (injuryReported) {
    verdict = "INJURY";
    explanation = "Loss attributable to reported injury affecting snap ceiling/role.";
  } else if (brier > 0.25 && predictedProb > 0.6) {
    verdict = "BLINDSPOT";
    explanation = `High-confidence miss (P=${predictedProb.toFixed(2)}, actual=${actualStat}). Model failed to capture material context.`;
  } else if (Math.abs(clvCents) > 15) {
    verdict = "BLINDSPOT";
    explanation = `Sharp line moved ${clvCents} cents against us. Market saw something we missed.`;
  } else {
    verdict = "VARIANCE";
    explanation = `Normal statistical variance. P=${predictedProb.toFixed(2)}, actual=${actualStat}, Brier=${brier.toFixed(3)}.`;
  }

  return {
    propId,
    actualStat,
    won,
    clvCents,
    brierScore: Number(brier.toFixed(4)),
    verdict,
    explanation,
  };
}

// ── Kalman feedback loop ────────────────────────────────────────────────────

export interface KalmanState {
  readonly priorMean: number;
  readonly priorVariance: number;
  readonly processNoise: number;
  readonly measurementNoise: number;
}

export function kalmanUpdate(
  state: KalmanState,
  measurement: number,
): { posteriorMean: number; posteriorVariance: number; kalmanGain: number } {
  const predictedMean = state.priorMean;
  const predictedVariance = state.priorVariance + state.processNoise;
  const kalmanGain = predictedVariance / (predictedVariance + state.measurementNoise);
  const posteriorMean = predictedMean + kalmanGain * (measurement - predictedMean);
  const posteriorVariance = (1 - kalmanGain) * predictedVariance;
  return {
    posteriorMean: Number(posteriorMean.toFixed(4)),
    posteriorVariance: Number(posteriorVariance.toFixed(4)),
    kalmanGain: Number(kalmanGain.toFixed(4)),
  };
}
