/** Fréchet–Hoeffding bounds. Joint SGP probability must sit inside them. */
export function frechetHoeffding(us: readonly number[]): { lo: number; hi: number } {
  const hi = Math.min(...us);
  const lo = Math.max(0, us.reduce((a, u) => a + u, 0) - (us.length - 1));
  return { lo, hi };
}

/** Clayton generator inverse for lower-tail stall dependence. theta > 0. */
export function claytonCdf(u: number, v: number, theta: number): number {
  const t = Math.max(0.05, theta);
  const inner = Math.pow(u, -t) + Math.pow(v, -t) - 1;
  return Math.pow(Math.max(inner, 1e-9), -1 / t);
}

export function assertCopulaInBounds(joint: number, us: readonly number[]): void {
  const { lo, hi } = frechetHoeffding(us);
  if (joint < lo - 1e-9 || joint > hi + 1e-9) {
    throw new Error(`[FAIL-CLOSED] copula joint ${joint} outside Frechet [${lo}, ${hi}]`);
  }
}
