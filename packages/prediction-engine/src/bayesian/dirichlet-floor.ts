/**
 * Multinomial-Dirichlet floor forecaster — GSE's "simplest defensible
 * forecaster".
 *
 * For each team, maintains multinomial-Dirichlet posteriors over
 * {cover, push, no-cover} (or {win, loss} for moneyline) from ATS results,
 * split home/away, combined by linear opinion pooling of the two teams'
 * predictive distributions with w fitted on a validation season. Used as
 * (a) a calibration reference curve for the engine, (b) a prior for the
 * full model, (c) a floor in the model-comparison harness: any engine
 * upgrade must beat Mn-Dir on log loss before shipping.
 *
 * @see arXiv:1705.04356v1 — "Comparing probabilistic predictive models applied to football"
 *
 * ACCEPTANCE GATE: adopt as the permanent GSE floor model iff on 2020–2024
 * second-half ATS it beats the trivial forecaster on all three proper
 * scoring rules with paired-test p < 0.05. The gate is a backtest concern;
 * this module is the pure Dirichlet kernel, not wired into any live path.
 */

export type AtsOutcome = "cover" | "push" | "nocover";

const OUTCOMES: AtsOutcome[] = ["cover", "push", "nocover"];

/**
 * Posterior predictive distribution from a Dirichlet-multinomial update:
 * (counts + prior) / total. Uniform prior by default.
 */
export function dirichletPredictive(
  counts: Record<AtsOutcome, number>,
  prior = 1,
): Record<AtsOutcome, number> {
  for (const o of OUTCOMES) {
    if (!((counts[o] ?? 0) >= 0)) throw new Error("dirichletPredictive: counts ≥ 0");
  }
  const total = OUTCOMES.reduce((s, o) => s + (counts[o] ?? 0) + prior, 0);
  return Object.fromEntries(
    OUTCOMES.map((o) => [o, ((counts[o] ?? 0) + prior) / total]),
  ) as Record<AtsOutcome, number>;
}

/** Update ATS counts with one observed result. */
export function updateCounts(
  counts: Record<AtsOutcome, number>,
  outcome: AtsOutcome,
): Record<AtsOutcome, number> {
  return { ...counts, [outcome]: (counts[outcome] ?? 0) + 1 };
}

/**
 * Linear opinion pool of the two teams' predictive distributions:
 * pool = w · homeDist + (1 − w) · awayDistComplement, where the away team's
 * distribution is mirrored (away cover = home no-cover).
 */
export function opinionPool(
  homeDist: Record<AtsOutcome, number>,
  awayDist: Record<AtsOutcome, number>,
  w: number,
): Record<AtsOutcome, number> {
  if (!(w >= 0 && w <= 1)) throw new Error("opinionPool: w ∈ [0,1]");
  const mirror: Record<AtsOutcome, AtsOutcome> = {
    cover: "nocover",
    push: "push",
    nocover: "cover",
  };
  const out = {} as Record<AtsOutcome, number>;
  for (const o of OUTCOMES) {
    out[o] = w * (homeDist[o] ?? 0) + (1 - w) * (awayDist[mirror[o]] ?? 0);
  }
  return out;
}

/**
 * Fit the pooling weight w on a validation season by grid search on mean
 * log loss. Returns the best w and its score.
 */
export function fitPoolingWeight(
  games: ReadonlyArray<{
    homeDist: Record<AtsOutcome, number>;
    awayDist: Record<AtsOutcome, number>;
    outcome: AtsOutcome;
  }>,
  gridSteps = 21,
): { w: number; logLoss: number } {
  if (games.length === 0) throw new Error("fitPoolingWeight: no games");
  let best = { w: 0.5, logLoss: Infinity };
  for (let i = 0; i < gridSteps; i++) {
    const w = i / (gridSteps - 1);
    let ll = 0;
    for (const g of games) {
      const pool = opinionPool(g.homeDist, g.awayDist, w);
      ll += -Math.log(Math.max(1e-12, pool[g.outcome] ?? 0));
    }
    ll /= games.length;
    if (ll < best.logLoss) best = { w, logLoss: ll };
  }
  return best;
}

/** Brier score for a single outcome (for the gate's scoring-rule trio). */
export function brierScore(dist: Record<AtsOutcome, number>, outcome: AtsOutcome): number {
  return OUTCOMES.reduce((s, o) => s + ((o === outcome ? 1 : 0) - (dist[o] ?? 0)) ** 2, 0);
}
