/**
 * Ensemble conflict monitor + abstention rule (arXiv 2212.12092).
 *
 * Per-game ensemble conflict from component-model probability vectors:
 *  (a) UQ_P = Prod_i(1 - p_i(win)) — the "unanimous doubt" mass;
 *  (b) Dempster-Shafer conflict mass from pairwise evidence combination,
 *      with evidence m_i = [p_i * w_i, (1 - p_i) * w_i, 1 - w_i] and
 *      w_i = trailing-season log-loss skill weights.
 * Dual thresholds (tau_DS, tau_UQ) are calibrated on trailing seasons so
 * flagged games are those where the unflagged ensemble has historically
 * negative CLV; on flagged games the rule abstains (no pick) or caps the
 * stake. If the dual-threshold rule adds nothing over the simpler
 * disagreement dividend (sum w_i D_G(p*||p_i)), prefer the simpler one.
 *
 * ACCEPTANCE GATE: ADAPT iff flagged games have significantly worse
 * ensemble Brier than unflagged games AND abstaining improves
 * full-season log-loss; REJECT the raw thresholds if the gap is
 * insignificant.
 *
 * Research-only module. Not wired into any live pick path.
 */

export interface ModelProb {
  /** Win probability from component model i. */
  p: number;
  /** Trailing-season log-loss skill weight. */
  w: number;
}

/** (a) UQ_P = Prod_i(1 - p_i): unanimous-doubt mass. */
export function uqP(models: readonly ModelProb[]): number {
  if (models.length === 0) throw new Error("uqP: no models");
  return models.reduce((s, m) => s * (1 - m.p), 1);
}

/**
 * (b) Dempster-Shafer conflict mass from pairwise combination.
 * Evidence per model: m_i = [p_i*w_i, (1-p_i)*w_i, 1-w_i] over the frame
 * {win, lose, uncertain}. Returns the accumulated conflict mass K
 * (Yager-style: conflict retained, not renormalized).
 */
export function dsConflict(models: readonly ModelProb[]): number {
  if (models.length === 0) throw new Error("dsConflict: no models");
  // Combined mass [win, lose, uncertain].
  let combined = [0, 0, 1];
  let conflict = 0;
  for (const m of models) {
    const e = [m.p * m.w, (1 - m.p) * m.w, 1 - m.w];
    const next = [0, 0, 0];
    let k = 0;
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        const mass = (combined[a] as number) * (e[b] as number);
        if (a === 2) next[b] = (next[b] as number) + mass;
        else if (b === 2) next[a] = (next[a] as number) + mass;
        else if (a === b) next[a] = (next[a] as number) + mass;
        else k += mass; // win vs lose: conflict
      }
    }
    combined = next;
    conflict = conflict + k - conflict * k; // accumulate union-style
  }
  return Math.min(1, conflict);
}

/** Disagreement dividend (simpler alternative): sum w_i * |p* - p_i|. */
export function disagreementDividend(
  models: readonly ModelProb[],
  consensus: number,
): number {
  if (models.length === 0) throw new Error("disagreementDividend: no models");
  const wSum = models.reduce((s, m) => s + m.w, 0);
  if (wSum <= 0) throw new Error("disagreementDividend: non-positive weights");
  return models.reduce((s, m) => s + (m.w / wSum) * Math.abs(consensus - m.p), 0);
}

export interface ConflictThresholds {
  tauDs: number;
  tauUq: number;
}

/** Flag a game when BOTH conflict signals exceed their thresholds. */
export function flagGame(
  models: readonly ModelProb[],
  thresholds: ConflictThresholds,
): { flagged: boolean; ds: number; uq: number } {
  const ds = dsConflict(models);
  const uq = uqP(models);
  return {
    flagged: ds >= thresholds.tauDs && uq >= thresholds.tauUq,
    ds,
    uq,
  };
}

export interface FlaggedGame {
  brier: number; // ensemble Brier on the game
  flagged: boolean;
}

/**
 * Calibrate dual thresholds on trailing seasons: grid-search the pair
 * maximizing the flagged/unflagged Brier gap subject to flagging at
 * least `minFlagRate` of games.
 */
export function calibrateThresholds(
  games: ReadonlyArray<{ models: ModelProb[]; brier: number }>,
  minFlagRate = 0.05,
): ConflictThresholds & { gap: number; flagRate: number } {
  if (games.length === 0) throw new Error("calibrateThresholds: no games");
  const dsVals = games.map((g) => dsConflict(g.models));
  const uqVals = games.map((g) => uqP(g.models));
  const quantile = (vs: number[], q: number): number => {
    const s = [...vs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))] as number;
  };
  let best = { tauDs: 0, tauUq: 0, gap: -Infinity, flagRate: 0 };
  for (const qd of [0.7, 0.8, 0.9]) {
    for (const qu of [0.7, 0.8, 0.9]) {
      const tauDs = quantile(dsVals, qd);
      const tauUq = quantile(uqVals, qu);
      let sf = 0;
      let nf = 0;
      let cf = 0;
      let cu = 0;
      for (const g of games) {
        if (flagGame(g.models, { tauDs, tauUq }).flagged) {
          sf += g.brier;
          cf++;
        } else {
          nf += g.brier;
          cu++;
        }
      }
      const flagRate = cf / games.length;
      if (flagRate < minFlagRate || cu === 0) continue;
      const gap = sf / Math.max(1, cf) - nf / cu;
      if (gap > best.gap) best = { tauDs, tauUq, gap, flagRate };
    }
  }
  if (best.gap === -Infinity) throw new Error("calibrateThresholds: no feasible pair");
  return best;
}

/**
 * Abstention evaluation: full-season log-loss with and without
 * abstaining on flagged games (abstained games contribute the
 * no-bet baseline log-loss of ln 2 per game... they are excluded from
 * the average instead: fewer, better games).
 */
export function abstentionEval(
  games: ReadonlyArray<{ consensus: number; outcome: number; flagged: boolean }>,
): { logLossAll: number; logLossKept: number; keptRate: number } {
  if (games.length === 0) throw new Error("abstentionEval: no games");
  const ll = (p: number, y: number): number => {
    const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
    return -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
  };
  const all = games.map((g) => ll(g.consensus, g.outcome));
  const kept = games.filter((g) => !g.flagged).map((g) => ll(g.consensus, g.outcome));
  return {
    logLossAll: all.reduce((s, x) => s + x, 0) / all.length,
    logLossKept: kept.length === 0 ? Infinity : kept.reduce((s, x) => s + x, 0) / kept.length,
    keptRate: kept.length / games.length,
  };
}
