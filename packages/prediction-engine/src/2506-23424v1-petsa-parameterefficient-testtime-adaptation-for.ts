/**
 * arXiv:2506.23424v1 — PETSA: Parameter-Efficient Test-Time Adaptation for Time Series Forecasting
 *
 * AOSS dual-rate online learning for live game-state value: fast rate alpha on loss decreases (instant
 * reaction), slow rate beta on increases (averaging out noise) — the asymmetric response to regime shifts
 * and outlier ticks.
 *
 * Improvement: GSE freezes the main win-prob model after preseason and updates only a tiny weekly overlay (64 per-team adjustment terms + 2-3 global calibration parameters) on the prior week's games with Huber-robust loss.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if on 2020-2025 walk-forward the overlay beats the frozen model on anytime Brier by >=0.002 with ECE neutral-or-better AND captures >=80% of the full-refit gain.
 */

/**
 * AOSS dual-rate scalar update: alpha on loss decrease, beta on increase.
 * Returns { value, rate } after one observation.
 */
export function aossUpdate(
  value: number,
  grad: number,
  prevLoss: number,
  curLoss: number,
  alpha: number,
  beta: number,
): { value: number; rate: number } {
  if (alpha <= 0 || beta <= 0) throw new Error("aossUpdate: alpha, beta > 0");
  const rate = curLoss < prevLoss ? alpha : beta;
  return { value: value - rate * grad, rate };
}

/** Online run over a sequence of (grad, loss) observations. */
export function aossRun(
  init: number,
  obs: readonly { grad: number; loss: number }[],
  alpha: number,
  beta: number,
): { values: number[]; fastSteps: number } {
  const values: number[] = [init];
  let fastSteps = 0;
  let prevLoss = obs[0]?.loss ?? 0;
  for (const o of obs) {
    const { value, rate } = aossUpdate(values[values.length - 1] ?? 0, o.grad, prevLoss, o.loss, alpha, beta);
    if (rate === alpha) fastSteps++;
    values.push(value);
    prevLoss = o.loss;
  }
  return { values, fastSteps };
}
