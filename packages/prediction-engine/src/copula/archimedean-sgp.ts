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

/** Frank generator. theta != 0. Used for the non-Gaussian SGP joint. */
export function frankCdf(u: number, v: number, theta: number): number {
  const t = Math.abs(theta) < 1e-6 ? 1e-6 : theta;
  const e = Math.exp(-t);
  const num = (Math.exp(-t * u) - 1) * (Math.exp(-t * v) - 1);
  return (-1 / t) * Math.log(1 + num / (e - 1));
}

/** Gumbel generator for upper-tail shootout dependence. theta >= 1. */
export function gumbelCdf(u: number, v: number, theta: number): number {
  const t = Math.max(1, theta);
  const a = Math.pow(-Math.log(Math.min(Math.max(u, 1e-9), 1 - 1e-9)), t);
  const b = Math.pow(-Math.log(Math.min(Math.max(v, 1e-9), 1 - 1e-9)), t);
  return Math.exp(-Math.pow(a + b, 1 / t));
}

export function assertCopulaInBounds(joint: number, us: readonly number[]): void {
  const { lo, hi } = frechetHoeffding(us);
  if (joint < lo - 1e-9 || joint > hi + 1e-9) {
    throw new Error(`[FAIL-CLOSED] copula joint ${joint} outside Frechet [${lo}, ${hi}]`);
  }
}
