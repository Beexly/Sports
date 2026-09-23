/**
 * arXiv:2512.05271v1 — Robust Forecast Aggregation via Additional Queries
 *
 * Structured model interrogation: base forecasts plus difference queries under player-out and line-move
 * perturbations and conditional forecasts, with a covariance-overlap diagnostic pruning redundant
 * components before aggregation.
 *
 * Improvement: GSE interrogates its engine components with structured queries: base forecasts plus difference queries under player-out and line-move perturbations and conditional forecasts, with a covariance-overlap diagnostic pruning redundant components before aggregation.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT structured model interrogation if adding difference-query features improves 2025 walk-forward log-loss by >=0.003 over base-forecast aggregation (DM p<0.05) AND the overlap diagnostic's redundancy calls are confirmed by ablation, with a cost veto if inference cost >5x.
 */

/** Base forecasts from each engine component. */
export interface ComponentForecast {
  component: string;
  p: number;
}

/** A difference query: forecast under a perturbation. */
export interface DifferenceQuery {
  component: string;
  perturbation: string; // e.g. "qb-out", "line-move-2pt"
  pBase: number;
  pPerturbed: number;
}

/** Sensitivity of a component to a perturbation class. */
export function perturbationSensitivity(q: DifferenceQuery): number {
  return Math.abs(q.pPerturbed - q.pBase);
}

/**
 * Covariance-overlap diagnostic: for each pair, the overlap =
 * |Cov(err_i, err_j)| / sqrt(Var_i Var_j). Pairs above the threshold are
 * redundant — keep the one with lower mean loss.
 */
export function overlapPrune(
  components: readonly string[],
  errors: readonly number[][],
  meanLoss: readonly number[],
  threshold: number,
): string[] {
  if (components.length !== errors.length) throw new Error("overlapPrune: length mismatch");
  const keep = new Set(components);
  const corr = (a: readonly number[], b: readonly number[]): number => {
    const ma = a.reduce((s, v) => s + v, 0) / a.length;
    const mb = b.reduce((s, v) => s + v, 0) / b.length;
    let c = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < a.length; i++) {
      c += ((a[i] ?? 0) - ma) * ((b[i] ?? 0) - mb);
      va += ((a[i] ?? 0) - ma) ** 2;
      vb += ((b[i] ?? 0) - mb) ** 2;
    }
    return va > 1e-12 && vb > 1e-12 ? Math.abs(c) / Math.sqrt(va * vb) : 0;
  };
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (!keep.has(components[i]!) || !keep.has(components[j]!)) continue;
      if (corr(errors[i]!, errors[j]!) > threshold) {
        const drop = (meanLoss[i] ?? 0) <= (meanLoss[j] ?? 0) ? j : i;
        keep.delete(components[drop]!);
      }
    }
  }
  return components.filter((c) => keep.has(c));
}
