/**
 * Prospective LLM benchmark harness — arXiv 2607.24573
 * ("LLM-SoccerArena: Benchmarking LLMs on Real-World Predictions in Sports").
 *
 * ADDITIVE utility. The harness is a QA/benchmark tool; wiring an LLM
 * into any engine input or opinion pool is a NEEDS HUMAN CALL — see
 * tracking report.
 *
 * Paper mechanism: lock LLM probability forecasts at T-24h and T-2h,
 * score Brier/log-loss against the GSE engine and the closing market, and
 * only wire the LLM into an opinion pool with the engine if it adds
 * incremental value. The harness replicates the paper's open-vs-closed
 * book effect (Brier delta >= 0.02) as a sanity check that the benchmark
 * is measuring real information, not prompt noise.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT the harness if (a) the
 * open-vs-closed book effect replicates at >=0.02 Brier on NFL games AND
 * (b) an LLM+engine opinion pool improves mean Brier over the engine alone
 * by >=0.005 on the test season. REJECT as an engine input if neither;
 * keep only as a QA/benchmark tool.
 */

export interface LockedForecast {
  readonly gameId: string;
  readonly prob: number;
  /** Hours before kickoff the forecast was locked (24 or 2). */
  readonly lockHorizonHours: 24 | 2;
  readonly book: "open" | "closed";
  readonly lockedAt: string; // ISO timestamp
}

/** Lock a forecast: validates the horizon and records the timestamp. */
export function lockForecast(
  gameId: string,
  prob: number,
  lockHorizonHours: 24 | 2,
  book: "open" | "closed",
  lockedAt: string = new Date().toISOString(),
): LockedForecast {
  return {
    gameId,
    prob: Math.min(Math.max(prob, 0), 1),
    lockHorizonHours,
    book,
    lockedAt,
  };
}

/** Brier score for one forecast. */
export function brierScore(prob: number, outcome: 0 | 1): number {
  return (prob - outcome) * (prob - outcome);
}

/** Log loss (cross-entropy) for one forecast, eps-clipped. */
export function logLoss(prob: number, outcome: 0 | 1, eps = 1e-9): number {
  const p = Math.min(Math.max(prob, eps), 1 - eps);
  return -(outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p));
}

/** Mean of a scoring function over locked forecasts with outcomes. */
export function meanScore(
  forecasts: ReadonlyArray<LockedForecast>,
  outcomes: Readonly<Record<string, 0 | 1>>,
  scoreFn: (prob: number, outcome: 0 | 1) => number = brierScore,
): number {
  let s = 0;
  let n = 0;
  for (const f of forecasts) {
    const o = outcomes[f.gameId];
    if (o === undefined) continue;
    s += scoreFn(f.prob, o);
    n++;
  }
  return n === 0 ? Number.NaN : s / n;
}

/**
 * Open-vs-closed book effect: mean Brier(open) - mean Brier(closed).
 * Positive = closed book is better (the paper's sanity check, >= 0.02).
 */
export function openClosedBookEffect(
  forecasts: ReadonlyArray<LockedForecast>,
  outcomes: Readonly<Record<string, 0 | 1>>,
): number {
  const open = forecasts.filter((f) => f.book === "open");
  const closed = forecasts.filter((f) => f.book === "closed");
  return meanScore(open, outcomes) - meanScore(closed, outcomes);
}

/**
 * Linear opinion pool: w * llm + (1 - w) * engine. Grid-search w on the
 * validation set to minimize mean log-loss.
 */
export function fitPoolWeight(
  llmProbs: readonly number[],
  engineProbs: readonly number[],
  outcomes: ReadonlyArray<0 | 1>,
  gridN = 21,
): { readonly weight: number; readonly meanLogLoss: number } {
  let best = { weight: 0, meanLogLoss: Number.POSITIVE_INFINITY };
  for (let i = 0; i < gridN; i++) {
    const w = i / (gridN - 1);
    let s = 0;
    for (let k = 0; k < outcomes.length; k++) {
      s += logLoss(w * llmProbs[k]! + (1 - w) * engineProbs[k]!, outcomes[k]!);
    }
    const mean = s / Math.max(outcomes.length, 1);
    if (mean < best.meanLogLoss) best = { weight: w, meanLogLoss: mean };
  }
  return best;
}

/**
 * Pool adoption gate: wire the LLM pool only if it improves mean Brier
 * over the engine alone by >= minImprovement on the test season.
 */
export function poolAdoptionGate(
  llmProbs: readonly number[],
  engineProbs: readonly number[],
  outcomes: ReadonlyArray<0 | 1>,
  weight: number,
  minImprovement = 0.005,
): boolean {
  if (outcomes.length === 0) return false;
  let engine = 0;
  let pool = 0;
  for (let k = 0; k < outcomes.length; k++) {
    engine += brierScore(engineProbs[k]!, outcomes[k]!);
    pool += brierScore(weight * llmProbs[k]! + (1 - weight) * engineProbs[k]!, outcomes[k]!);
  }
  return engine / outcomes.length - pool / outcomes.length >= minImprovement;
}
