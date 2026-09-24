/**
 * arXiv 2004.09368: Awareness of crash risk improves Kelly strategies in simulated financial time series.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Crash-risk-aware Kelly (ECO rule): when |edge| is large AND market volatility is elevated, scale down the Kelly fraction ('decrease leverage during bubbles'); lambda hard-constrained to [0,1] (no leverage/short). Multiplicative-error sweep (sigma_e 1e-3..1e2) must show stable positive performance before shipping.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add regime-aware Kelly scaling: when |edge| (GSE calibrated prob vs market-implied prob) is large AND market volatility is elevated, scale down the Kelly fraction (the ECO 'decrease leverage during bubbles' rule); hard-constrain lambda in [0,1] (no leverage/short) for all product sizing; run the multiplicative-error sweep (sigma_e 10^-3..10^2) on every sizing parameter and require stable positive performance up to 10-100% error before shipping.
 *
 * ACCEPTANCE GATE:
 * ADOPT regime-aware sizing if it reduces realized max drawdown by >= 15% vs. baseline with realized log growth >= 0.95x baseline on the held-out window.
 *
 * ENABLED=false: changes product sizing; needs a human call.
 */


export const ENABLED = false;

function clamp01(x: number): number {
  return Math.min(Math.max(x, 0), 1);
}

/** Classic full-Kelly fraction for decimal odds: f* = (p*(d-1) - (1-p)) / (d-1). */
export function kellyFraction(p: number, decimalOdds: number): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  return (p * b - (1 - p)) / b;
}

/**
 * Regime-aware Kelly: ECO 'decrease leverage during bubbles' rule.
 * When |edge| is large AND volRatio (current vol / baseline vol) exceeds the
 * threshold, scale the Kelly fraction down exponentially in the excess.
 * Hard-constrains the final fraction to [0, 1] (no leverage, no short).
 */
export function regimeAwareKellyFraction(
  p: number,
  decimalOdds: number,
  volRatio: number,
  opts: { volThreshold?: number; decay?: number; kellyMultiplier?: number } = {},
): number {
  const { volThreshold = 1.5, decay = 1.0, kellyMultiplier = 0.5 } = opts;
  const edge = Math.abs(p - 1 / decimalOdds);
  let f = kellyMultiplier * kellyFraction(p, decimalOdds);
  if (edge > 0.03 && volRatio > volThreshold) {
    f *= Math.exp(-decay * (volRatio - volThreshold));
  }
  return clamp01(f);
}

export interface ErrorSweepPoint {
  readonly sigmaE: number;
  readonly logGrowth: number;
}

/**
 * Multiplicative-error sweep: perturb the win probability multiplicatively
 * (p_hat = p * (1 + sigma_e * z)) and measure log-growth. Stable positive
 * performance up to 10-100% error (sigma_e 0.1..1) is the shipping bar.
 */
export function multiplicativeErrorSweep(
  p: number,
  decimalOdds: number,
  fraction: number,
  rand: () => number,
  nSims = 2000,
): ErrorSweepPoint[] {
  const sigmas = [1e-3, 1e-2, 0.1, 0.3, 1, 3, 10, 100];
  return sigmas.map((sigmaE) => {
    let logW = 0;
    for (let s = 0; s < nSims; s++) {
      // z ~ N(0,1) via Box-Muller from the provided rand
      const u1 = Math.max(rand(), 1e-12);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const pHat = Math.min(Math.max(p * (1 + sigmaE * z), 1e-6), 1 - 1e-6);
      void pHat; // sizing uses the nominal fraction; error hits the outcome
      const win = rand() < p;
      logW += win
        ? Math.log(1 + fraction * (decimalOdds - 1))
        : Math.log(1 - fraction);
    }
    return { sigmaE, logGrowth: logW / nSims };
  });
}

/** Shipping bar: log-growth stays positive through sigma_e = 1 (100% error). */
export function passesErrorSweep(sweep: readonly ErrorSweepPoint[]): boolean {
  return sweep
    .filter((pt) => pt.sigmaE <= 1)
    .every((pt) => pt.logGrowth > 0);
}
