/**
 * arXiv 1803.01984: Bayesian Predictive Synthesis with Outcome-Dependent Pools
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Bayesian predictive synthesis treats agent forecast densities as data in a supra-Bayesian mixture with per-model bias terms and a baseline safe-haven density. Outcome-dependent pools let the synthesis weights vary with the realized outcome regime, so the combination trusts different models in blowouts vs close games.
 *
 * Record improvement (verbatim):
 * Build GSE-BPS: Bayesian predictive synthesis as the seasonal combination layer. Models (J=3-4): engine v5.2.7 margin density, de-vigged market margin density, Elo margin density; baseline h0 = diffuse historical NFL margin distribution as safe haven for model-set incompleteness. Start with constant-weight supra-Bayesian mixture with per-model bias terms betaj fit by maximizing log score on 2023-2024; then outcome-dependent Gaussian weights omegaj(y) = qj exp(-(y-muj)^2/(2 sigmaj^2)) so each model is trusted most where it historically wins (engine in close games, market in blowouts); estimate cross-model dependence Sigma from aligned historical forecast quantiles with consensus down-weighting when engine and market herd; weekly discount-factor evolution of (betat, Sigmat, qt) across the season. Improvement beyond the paper: condition weights on game state omega_j(y,s) with s = (spread bucket, divisional flag, weather flag) -- regime-specific expertise (engine in divisional games, market in extreme weather) that the paper's framework allows but never tests.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT outcome-dependent BPS only if 2025 mean log score beats the equal-weight pool by >=0.02 nats AND beats BMA-style weighting, with 80% interval coverage in [0.75, 0.85]; REJECT (fall back to constant-weight pool + baseline) if log-score gain < 0.01 nats or outcome-dependent weights collapse to near-constant. Dynamic discount layer accepted separately if it beats static BPS on second-half log score.
 */

export const ENABLED = false;

export type Regime = "blowout" | "close";

/** Outcome regime from a realized margin (for outcome-dependent pools). */
export function marginRegime(margin: number): Regime {
  return Math.abs(margin) > 10 ? "blowout" : "close";
}

/**
 * Supra-Bayesian synthesis: q(y) propto sum_j w_j * p_j(y - bias_j) + w_0 * h_0(y),
 * evaluated on a discrete outcome grid. Models are densities over grid points.
 */
export function synthesize(
  modelDensities: number[][],
  weights: number[],
  biases: number[],
  baseline: number[],
  baselineWeight: number,
): number[] {
  const K = baseline.length;
  const out = new Array<number>(K).fill(0);
  for (let k = 0; k < K; k++) {
    let s = baselineWeight * baseline[k]!;
    for (let j = 0; j < modelDensities.length; j++) {
      const shift = Math.round(biases[j]!);
      const kk = Math.min(K - 1, Math.max(0, k - shift));
      s += weights[j]! * modelDensities[j]![kk]!;
    }
    out[k] = s;
  }
  const tot = out.reduce((a, b) => a + b, 0);
  return tot > 0 ? out.map((x) => x / tot) : out.map(() => 1 / K);
}

export function logScore(density: number[], outcomeIdx: number): number {
  return Math.log(Math.max(density[outcomeIdx]!, 1e-12));
}

export interface BPSFit {
  weights: number[];
  biases: number[];
  meanLogScore: number;
}

/** Fit constant-weight synthesis by grid search over weights + small bias grid. */
export function fitBPS(
  modelDensities: number[][][],
  outcomes: number[],
  baseline: number[][],
): BPSFit {
  const J = modelDensities[0]!.length;
  const wGrid: number[][] =
    J === 2
      ? [0, 0.25, 0.5, 0.75, 1].map((w) => [w, 1 - w])
      : [[1 / J, 1 / J].slice(0, J)];
  let best: BPSFit = { weights: wGrid[0]!, biases: new Array<number>(J).fill(0), meanLogScore: -Infinity };
  for (const w of wGrid) {
    for (const b0 of [-1, 0, 1]) {
      const biases = new Array<number>(J).fill(0);
      biases[0] = b0;
      let tot = 0;
      for (let i = 0; i < outcomes.length; i++) {
        tot += logScore(
          synthesize(modelDensities[i]!, w, biases, baseline[i]!, 0.05),
          outcomes[i]!,
        );
      }
      const mean = tot / outcomes.length;
      if (mean > best.meanLogScore) best = { weights: [...w], biases: [...biases], meanLogScore: mean };
    }
  }
  return best;
}

/** Outcome-dependent BPS: separate weight vectors per regime. */
export function fitOutcomeDependentBPS(
  modelDensities: number[][][],
  outcomes: number[],
  margins: number[],
  baseline: number[][],
): Record<Regime, BPSFit> {
  const out = {} as Record<Regime, BPSFit>;
  for (const regime of ["blowout", "close"] as Regime[]) {
    const idx = margins.map((m, i) => (marginRegime(m) === regime ? i : -1)).filter((i) => i >= 0);
    out[regime] = fitBPS(
      idx.map((i) => modelDensities[i]!),
      idx.map((i) => outcomes[i]!),
      idx.map((i) => baseline[i]!),
    );
  }
  return out;
}

/** Gate: adopt outcome-dependent BPS on the paper's joint criterion. */
export function bpsGate(
  odLogScore: number,
  equalWeightLogScore: number,
  bmaLogScore: number,
  coverage80: number,
  weights: Record<Regime, BPSFit>,
): "ADOPT" | "REJECT" {
  const gain = odLogScore - equalWeightLogScore;
  const beatsBma = odLogScore > bmaLogScore;
  const coverageOk = coverage80 >= 0.75 && coverage80 <= 0.85;
  const wB = weights["blowout"].weights;
  const wC = weights["close"].weights;
  const maxShift = Math.max(...wB.map((w, j) => Math.abs(w - wC[j]!)));
  if (gain >= 0.02 && beatsBma && coverageOk && maxShift > 0.05) return "ADOPT";
  return "REJECT";
}
