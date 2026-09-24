/**
 * Leave-one-player-out validation gate + signed-residual efficiency metric
 *
 * Research port: arXiv:2605.05487
 * Normalized lane: experimental | Doctrine: PROPRIETARY_EDGE
 *
 * Pure evaluation-discipline utilities from the paper: leave-one-player-out
 * (LOPO) fold generation for player-level prop models — report LOPO R2/MAE
 * alongside pooled CV as the honest generalization estimate for new players
 * — plus the signed-residual "efficiency" metric flagging players who
 * systematically outperform their statistical inputs. The gate decision
 * (pooled->LOPO MAE degradation >= 10% relative) is computed from the two
 * MAE numbers the operator's model runs produce.
 *
 * ACCEPTANCE GATE: Adopt LOPO as a mandatory validation gate for all GSE
 * player-level models if the pooled->LOPO MAE degradation is material
 * (>= 10% relative) on the 2023-2024 test.
 */

export interface PlayerObservation {
  playerId: string;
  features: number[];
  target: number;
}

export interface LopoFold {
  heldOutPlayer: string;
  train: PlayerObservation[];
  test: PlayerObservation[];
}

/** One fold per player: train on everyone else, test on the held-out player. */
export function lopoFolds(data: PlayerObservation[]): LopoFold[] {
  const byPlayer = new Map<string, PlayerObservation[]>();
  for (const d of data) {
    const list = byPlayer.get(d.playerId);
    if (list) list.push(d);
    else byPlayer.set(d.playerId, [d]);
  }
  const folds: LopoFold[] = [];
  for (const [playerId, test] of byPlayer) {
    const train = data.filter((d) => d.playerId !== playerId);
    folds.push({ heldOutPlayer: playerId, train, test });
  }
  return folds.sort((a, b) => a.heldOutPlayer.localeCompare(b.heldOutPlayer));
}

export interface FoldScore {
  playerId: string;
  mae: number;
  r2: number;
  n: number;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? Number.NaN : xs.reduce((s, v) => s + v, 0) / xs.length;
}

/** Score one fold's predictions: MAE and R2 against the player's targets. */
export function scoreFold(playerId: string, targets: number[], preds: number[]): FoldScore {
  const n = targets.length;
  if (n === 0 || preds.length !== n) return { playerId, mae: Number.NaN, r2: Number.NaN, n };
  const mae = targets.reduce((s, t, i) => s + Math.abs(t - (preds[i] ?? 0)), 0) / n;
  const m = mean(targets);
  const ssTot = targets.reduce((s, t) => s + (t - m) * (t - m), 0);
  const ssRes = targets.reduce((s, t, i) => s + (t - (preds[i] ?? 0)) * (t - (preds[i] ?? 0)), 0);
  return { playerId, mae, r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot, n };
}

export interface LopoReport {
  folds: FoldScore[];
  /** mean of per-player MAEs */
  lopoMae: number;
  /** mean of per-player R2s */
  lopoR2: number;
  pooledMae: number;
}

/**
 * Aggregate fold scores into the LOPO report. pooledMae is the MAE of the
 * pooled-CV predictions supplied by the operator for the degradation gate.
 */
export function lopoReport(folds: FoldScore[], pooledMae: number): LopoReport {
  const maes = folds.map((f) => f.mae).filter(Number.isFinite);
  const r2s = folds.map((f) => f.r2).filter(Number.isFinite);
  return {
    folds,
    lopoMae: maes.length === 0 ? Number.NaN : maes.reduce((s, v) => s + v, 0) / maes.length,
    lopoR2: r2s.length === 0 ? Number.NaN : r2s.reduce((s, v) => s + v, 0) / r2s.length,
    pooledMae,
  };
}

/**
 * Gate: adopt LOPO as mandatory if pooled->LOPO MAE degradation is material
 * (>= 10% relative).
 */
export function lopoGateAdopt(report: LopoReport): boolean {
  const { lopoMae, pooledMae } = report;
  if (!Number.isFinite(lopoMae) || !Number.isFinite(pooledMae) || pooledMae <= 0) return false;
  return (lopoMae - pooledMae) / pooledMae >= 0.1;
}

export interface EfficiencyFlag {
  playerId: string;
  /** mean signed residual (actual - predicted): positive = outperforms inputs */
  meanSignedResidual: number;
  n: number;
  efficient: boolean;
}

/**
 * Signed-residual "efficiency" metric: players whose mean signed residual is
 * materially positive systematically outperform their statistical inputs.
 */
export function efficiencyFlags(
  data: PlayerObservation[],
  preds: Map<string, number[]>,
  threshold = 0,
): EfficiencyFlag[] {
  const byPlayer = new Map<string, PlayerObservation[]>();
  for (const d of data) {
    const list = byPlayer.get(d.playerId);
    if (list) list.push(d);
    else byPlayer.set(d.playerId, [d]);
  }
  const out: EfficiencyFlag[] = [];
  for (const [playerId, rows] of byPlayer) {
    const p = preds.get(playerId) ?? [];
    let sum = 0;
    let n = 0;
    rows.forEach((r, i) => {
      const pred = p[i];
      if (pred === undefined || !Number.isFinite(pred)) return;
      sum += r.target - pred;
      n++;
    });
    out.push({
      playerId,
      meanSignedResidual: n === 0 ? Number.NaN : sum / n,
      n,
      efficient: n > 0 && sum / n > threshold,
    });
  }
  return out.sort((a, b) => (b.meanSignedResidual || 0) - (a.meanSignedResidual || 0));
}

export const GSE_LOPO_GATE_ENABLED = false;
