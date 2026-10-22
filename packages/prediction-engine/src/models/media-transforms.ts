/**
 * Media transforms from pymc-marketing (Apache-2.0).
 *
 * Source opened: pymc_marketing/mmm/transformers.py and
 * pymc_marketing/mmm/components/adstock.py. The PyMC graph was not copied.
 * Geometric weights are alpha^lag. Half-life maps as alpha = 0.5^(1/h).
 * Hill is 1 - kappa^s / (kappa^s + x^s). Michaelis-Menten is
 * alpha * x / (lambda + x). Logistic saturation is
 * (1 - exp(-lambda x)) / (1 + exp(-lambda x)).
 */

export function alphaFromHalfLife(halfLife: number): number {
  if (!Number.isFinite(halfLife) || halfLife <= 0) {
    throw new Error("half-life must be finite and positive");
  }
  return 0.5 ** (1 / halfLife);
}

export function geometricAdstock(
  series: readonly number[],
  alpha: number,
  lMax: number,
  normalize = false,
): number[] {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error("adstock alpha must be in [0, 1]");
  }
  if (!Number.isInteger(lMax) || lMax < 1) {
    throw new Error("lMax must be an integer of at least 1");
  }
  if (series.some((v) => !Number.isFinite(v))) {
    throw new Error("adstock series must be finite");
  }
  const weights = Array.from({ length: lMax }, (_, lag) => alpha ** lag);
  const scale = normalize ? weights.reduce((sum, w) => sum + w, 0) : 1;
  const kernel = weights.map((w) => w / scale);
  return series.map((_, t) => {
    let acc = 0;
    for (let lag = 0; lag < lMax; lag += 1) {
      const i = t - lag;
      if (i >= 0) acc += series[i] * kernel[lag];
    }
    return acc;
  });
}

export function hillWithSlope(x: number, slope: number, kappa: number): number {
  if (!Number.isFinite(x) || x < 0) throw new Error("x must be finite and non-negative");
  if (!Number.isFinite(slope) || slope <= 0) throw new Error("slope must be finite and positive");
  if (!Number.isFinite(kappa) || kappa <= 0) throw new Error("kappa must be finite and positive");
  const xs = x ** slope;
  const ks = kappa ** slope;
  return 1 - ks / (ks + xs);
}

export function michaelisMenten(x: number, alpha: number, lam: number): number {
  if (!Number.isFinite(x) || x < 0) throw new Error("x must be finite and non-negative");
  if (!Number.isFinite(alpha) || alpha < 0) throw new Error("alpha must be finite and non-negative");
  if (!Number.isFinite(lam) || lam <= 0) throw new Error("lambda must be finite and positive");
  return (alpha * x) / (lam + x);
}

export function logisticSaturation(x: number, lam: number): number {
  if (!Number.isFinite(x) || x < 0) throw new Error("x must be finite and non-negative");
  if (!Number.isFinite(lam) || lam <= 0) throw new Error("lambda must be finite and positive");
  const e = Math.exp(-lam * x);
  return (1 - e) / (1 + e);
}
