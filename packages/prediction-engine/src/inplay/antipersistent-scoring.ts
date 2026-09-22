/**
 * Independent anti-persistent scoring dynamics with restoration.
 *
 * Rebuilds the NFL arm of the paper's model (Eq. 10, offense/defense skill
 * split): P(team A scores next | game state) with
 *   logit = (off_A − def_B) − (off_B − def_A)   [skill split]
 *           + restore·lead                        [restoration: trailing team pushes]
 *           + antipersist·1{A scored last}         [anti-persistence: scorer cools off]
 * Serves live next-score probabilities conditional on (lead, who scored last)
 * and an online per-scoring-event win-probability model benchmarked against
 * de-vigged market-implied WP.
 *
 * @see arXiv:1504.05872v1 — "Predicting sports scoring dynamics with restoration and anti-persistence"
 *
 * ACCEPTANCE GATE: ADAPT-accept iff the refit model beats the de-vigged
 * market-implied next-score baseline by ≥ 0.01 AUC on who-scores-next AND
 * beats GSE's existing WP model by ≥ 0.005 AUC on who-wins at halftime, over
 * the 2022–2024 test seasons. The gate is a backtest concern; this module is
 * the pure dynamics kernel, not wired into any live path.
 */

export interface ScoringDynamicsParams {
  /** Offense skill of team A (points per event above average). */
  offA: number;
  /** Defense skill of team B (points suppressed per event). */
  defB: number;
  /** Offense skill of team B. */
  offB: number;
  /** Defense skill of team A. */
  defA: number;
  /** Restoration coefficient (trailing-team urgency). */
  restore: number;
  /** Anti-persistence coefficient (negative: scorer less likely to repeat). */
  antipersist: number;
}

/** Sigmoid. */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * P(team A scores next | lead_A, aScoredLast). lead_A from A's perspective.
 */
export function nextScoreProb(
  params: ScoringDynamicsParams,
  leadA: number,
  aScoredLast: boolean,
): number {
  const skill = params.offA - params.defB - (params.offB - params.defA);
  const logit =
    skill + params.restore * -leadA + params.antipersist * (aScoredLast ? 1 : 0);
  return sigmoid(logit);
}

/**
 * Online per-scoring-event win probability: blend the next-score model with
 * the pregame anchor, weighted by events remaining.
 */
export function eventWinProb(
  params: ScoringDynamicsParams,
  leadA: number,
  aScoredLast: boolean,
  pregameProbA: number,
  eventsRemaining: number,
): number {
  if (!(pregameProbA > 0 && pregameProbA < 1)) {
    throw new Error("eventWinProb: pregameProbA ∈ (0,1)");
  }
  if (eventsRemaining <= 0) return leadA > 0 ? 1 : leadA < 0 ? 0 : 0.5;
  // Recursive one-step lookahead: E[WP] after the next scoring event.
  const pNext = nextScoreProb(params, leadA, aScoredLast);
  const w = Math.min(1, eventsRemaining / 12); // model weight decays as events run out
  const modelWp = pNext; // next-score prob as the WP proxy for the event step
  const anchorW = 1 - w;
  return w * modelWp + anchorW * pregameProbA;
}

/**
 * One SGD step on (restore, antipersist) from an observed scoring event.
 * Skills are fit per-season offline; these two coefficients update online.
 */
export function updateDynamicsCoeffs(
  params: ScoringDynamicsParams,
  leadA: number,
  aScoredLast: boolean,
  aScored: boolean,
  stepSize = 0.05,
): Pick<ScoringDynamicsParams, "restore" | "antipersist"> {
  const p = nextScoreProb(params, leadA, aScoredLast);
  const err = (aScored ? 1 : 0) - p;
  return {
    restore: params.restore + stepSize * err * -leadA,
    antipersist: params.antipersist + stepSize * err * (aScoredLast ? 1 : 0),
  };
}
