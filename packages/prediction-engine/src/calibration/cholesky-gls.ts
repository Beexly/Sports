/**
 * Ridge-stabilized Cholesky GLS for the 17 game-context features.
 * Refuses to invent a covariance from a single card: n must be at least p + 1.
 */

export const GAME_CONTEXT_FEATURE_NAMES = [
  "temperatureF",
  "windMph",
  "precipMmHr",
  "altitudeFt",
  "traction",
  "restHome",
  "restAway",
  "tzShift",
  "homeIlbOut",
  "awayOlOut",
  "homeSackRate",
  "awayCb1Out",
  "nickelActive",
  "steamPts",
  "spreadAbs",
  "rookieRamp",
  "kneelHazard",
] as const;

export function choleskyLower(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = matrix[i]![j]!;
      for (let k = 0; k < j; k++) sum -= L[i]![k]! * L[j]![k]!;
      if (i === j) {
        if (sum <= 0) throw new Error(`[FAIL-CLOSED] covariance not positive definite at ${i}`);
        L[i]![j] = Math.sqrt(sum);
      } else {
        L[i]![j] = sum / L[j]![j]!;
      }
    }
  }
  return L;
}

export function choleskyGls(
  design: readonly (readonly number[])[],
  y: readonly number[],
  ridge = 1e-4,
): { beta: number[]; cholesky: number[][] } {
  const n = design.length;
  const p = design[0]?.length ?? 0;
  if (p !== GAME_CONTEXT_FEATURE_NAMES.length) {
    throw new Error(`GLS expects ${GAME_CONTEXT_FEATURE_NAMES.length} features, got ${p}`);
  }
  if (n < p + 1) {
    throw new Error(`[FAIL-CLOSED] GLS parked: n=${n} < p+1=${p + 1}. One card is not a covariance.`);
  }
  const xtx = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    const row = design[i]!;
    const yi = y[i] ?? 0;
    for (let a = 0; a < p; a++) {
      xty[a] += row[a]! * yi;
      for (let b = 0; b < p; b++) xtx[a]![b] += row[a]! * row[b]!;
    }
  }
  for (let a = 0; a < p; a++) xtx[a]![a] += ridge;
  const L = choleskyLower(xtx);
  const z = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sum = xty[i]!;
    for (let k = 0; k < i; k++) sum -= L[i]![k]! * z[k]!;
    z[i] = sum / L[i]![i]!;
  }
  const beta = new Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) {
    let sum = z[i]!;
    for (let k = i + 1; k < p; k++) sum -= L[k]![i]! * beta[k]!;
    beta[i] = sum / L[i]![i]!;
  }
  return { beta, cholesky: L };
}
