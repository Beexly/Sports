/**
 * Bernoulli e-process toolkit — R&D, dark, unwired.
 *
 * Test-martingale for a simple alternative against a known Bernoulli null
 * mean y0 (typically the market-implied win probability). Increment:
 *
 *   1 + λ (X − y0)
 *
 * where X ∈ {0,1} is the settled outcome and λ is a predictable bet size
 * with 0 < λ < 1/y0 so every factor stays strictly positive.
 *
 * Ville: under H0 (E[X] = y0) the product M is a nonnegative martingale
 * with M_0 = 1, so P(sup M ≥ 1/α) ≤ α under continuous monitoring.
 *
 * pHat is the model's probability. It is accepted so a caller can form a
 * predictable λ from it (Kelly-style), but it does not enter the increment
 * itself — the increment is a bet against y0, not a calibration residual.
 *
 * Do not import this from a live path. Do not flip any gate.
 */
export type BernoulliOutcome = 0 | 1;

export type EStepInput = {
  readonly pHat: number;
  readonly y: BernoulliOutcome;
  readonly y0: number;
  readonly lambda: number;
  /** Previous wealth. Default 1. */
  readonly M0?: number;
};

export type EStepResult = {
  readonly M: number;
  readonly logM: number;
  readonly factor: number;
};

export type MixtureEProcessResult = {
  readonly M: number;
  readonly logM: number;
  readonly supM: number;
  readonly n: number;
};

function isUnitIntervalOpen(v: number): boolean {
  return Number.isFinite(v) && v > 0 && v < 1;
}

function isOutcome(y: number): y is BernoulliOutcome {
  return y === 0 || y === 1;
}

/**
 * One wealth update. Refuses (returns null) on non-positive factor or
 * out-of-range inputs rather than silently leaving the martingale family.
 */
export function eStep(input: EStepInput): EStepResult | null {
  const { pHat, y, y0, lambda } = input;
  const M0 = input.M0 ?? 1;
  if (!isUnitIntervalOpen(pHat) || !isUnitIntervalOpen(y0)) return null;
  if (!isOutcome(y)) return null;
  if (!Number.isFinite(lambda) || lambda <= 0) return null;
  if (!Number.isFinite(M0) || M0 <= 0) return null;
  // Strict positivity: 1 + λ(X − y0) > 0 for both X=0 and X=1.
  // Worst case is X=0 → 1 − λ y0 > 0 → λ < 1/y0.
  if (lambda >= 1 / y0) return null;
  const factor = 1 + lambda * (y - y0);
  if (!(factor > 0) || !Number.isFinite(factor)) return null;
  const M = M0 * factor;
  if (!(M > 0) || !Number.isFinite(M)) return null;
  return { M, logM: Math.log(M), factor };
}

/**
 * Product e-process over a settled sequence. lambdas[i] must be predictable
 * (a function of information available before y[i]). Lengths must match.
 */
export function mixtureEProcess(
  pHats: readonly number[],
  ys: readonly BernoulliOutcome[],
  y0: number,
  lambdas: readonly number[],
): MixtureEProcessResult | null {
  if (pHats.length !== ys.length || ys.length !== lambdas.length) return null;
  if (ys.length === 0) return { M: 1, logM: 0, supM: 1, n: 0 };
  let M = 1;
  let supM = 1;
  for (let i = 0; i < ys.length; i++) {
    const step = eStep({
      pHat: pHats[i]!,
      y: ys[i]!,
      y0,
      lambda: lambdas[i]!,
      M0: M,
    });
    if (step === null) return null;
    M = step.M;
    if (M > supM) supM = M;
  }
  return { M, logM: Math.log(M), supM, n: ys.length };
}

/** Mulberry32 — deterministic, no extra dependency. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bernoulli(rand: () => number, p: number): BernoulliOutcome {
  return rand() < p ? 1 : 0;
}
