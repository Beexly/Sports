/**
 * GALILEO ENGINE — Alt-line curvature (Phase 2, check 5).
 *
 * An alternate-line ladder (e.g. rushing yards at 40.5/50.5/60.5/…) is a discretized
 * implied DISTRIBUTION: each rung's de-vigged over price is P(X > point). A coherent ladder
 * must be monotone (a higher line cannot be MORE likely to go over) and have a sane tail
 * (the implied density can't go negative, and a unimodal yardage distribution's tail density
 * shouldn't bulge upward). When a tail rung is far cheaper or richer than the body of the
 * ladder implies, that rung is mispriced relative to the book's own curve — a contradiction
 * the flat over/under view hides.
 *
 * Pure + deterministic. Input is the de-vigged survival probabilities; the caller removes vig
 * (devig() in market-surface) so this module only does the distribution geometry.
 */

export interface AltRung {
  /** The alternate line. */
  readonly point: number;
  /** De-vigged P(X > point), in (0,1). */
  readonly overImplied: number;
}

export type CurvatureFlagType =
  | "monotonicity"
  | "density_negative"
  | "tail_curvature"
  | "tail_mispriced";

export interface CurvatureFlag {
  readonly type: CurvatureFlagType;
  readonly point: number;
  readonly detail: string;
  readonly metric: number;
}

interface FitOptions {
  /** Tolerance for a monotonicity violation (probability scale ~0.5). Default 0.005. */
  readonly tol?: number;
  /** Tolerance for density comparisons (pdf-per-unit scale ~0.01). Default 0.001. */
  readonly densityTol?: number;
  /** Tail rung is "mispriced" if actual/expected is outside [1/k, k]. Default 1.6. */
  readonly mispriceK?: number;
}

function leastSquares(xs: number[], ys: number[]): { a: number; b: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - mx) ** 2;
    sxy += (xs[i]! - mx) * (ys[i]! - my);
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}

/**
 * Check an alt-line ladder for distributional incoherence. Returns a flag per violation:
 *   - monotonicity: a higher line has a HIGHER over prob than a lower line (arbitrage-grade).
 *   - density_negative: implied pdf between two rungs is negative (same root cause).
 *   - tail_curvature: the implied density bulges back UP in the tail (non-unimodal).
 *   - tail_mispriced: a tail rung's survival prob deviates from the ladder's own fitted
 *     log-linear decay by more than mispriceK× — too cheap (under is overpriced) or too rich.
 */
export function checkAltLadder(rungs: readonly AltRung[], options: FitOptions = {}): CurvatureFlag[] {
  const tol = options.tol ?? 0.005;
  const densityTol = options.densityTol ?? 0.001;
  const k = options.mispriceK ?? 1.6;
  const flags: CurvatureFlag[] = [];

  const ladder = [...rungs]
    .filter((r) => Number.isFinite(r.point) && r.overImplied > 0 && r.overImplied < 1)
    .sort((a, b) => a.point - b.point);
  if (ladder.length < 3) return flags;

  // 1) Monotonicity + 2) non-negative density.
  const densities: Array<{ mid: number; d: number; lo: number; hi: number }> = [];
  for (let i = 1; i < ladder.length; i++) {
    const prev = ladder[i - 1]!;
    const cur = ladder[i]!;
    if (cur.overImplied > prev.overImplied + tol) {
      flags.push({
        type: "monotonicity",
        point: cur.point,
        detail: `Over prob rises ${prev.overImplied.toFixed(3)}→${cur.overImplied.toFixed(3)} as line ${prev.point}→${cur.point} — a higher line cannot be more likely to go over.`,
        metric: cur.overImplied - prev.overImplied,
      });
    }
    const dp = cur.point - prev.point;
    const d = dp > 0 ? (prev.overImplied - cur.overImplied) / dp : 0;
    if (d < -densityTol) {
      flags.push({
        type: "density_negative",
        point: cur.point,
        detail: `Implied density between ${prev.point} and ${cur.point} is negative (${d.toFixed(4)}).`,
        metric: d,
      });
    }
    densities.push({ mid: (prev.point + cur.point) / 2, d: Math.max(d, 0), lo: prev.point, hi: cur.point });
  }

  // 3) Tail curvature: a unimodal distribution's density rises to a mode then falls. Any
  // increase AFTER a decrease is a non-unimodal bulge (a too-cheap tail rung pulling mass up).
  let seenDecrease = false;
  for (let i = 1; i < densities.length; i++) {
    const d = densities[i]!.d;
    const prev = densities[i - 1]!.d;
    if (d < prev - densityTol) {
      seenDecrease = true;
    } else if (d > prev + densityTol && seenDecrease) {
      flags.push({
        type: "tail_curvature",
        point: densities[i]!.hi,
        detail: `Tail density bulges up at ${densities[i]!.lo}–${densities[i]!.hi} (${prev.toFixed(4)}→${d.toFixed(4)}) — non-unimodal tail.`,
        metric: d - prev,
      });
    }
  }

  // 4) Tail mispricing vs the ladder's own log-linear survival decay (fit on the body).
  const body = ladder.filter((r) => r.overImplied >= 0.15 && r.overImplied <= 0.85);
  const fit = leastSquares(body.map((r) => r.point), body.map((r) => Math.log(r.overImplied)));
  if (fit) {
    for (const r of ladder.filter((r) => r.overImplied < 0.15)) {
      const expected = Math.exp(fit.a + fit.b * r.point);
      if (expected <= 0) continue;
      const ratio = r.overImplied / expected;
      if (ratio > k || ratio < 1 / k) {
        flags.push({
          type: "tail_mispriced",
          point: r.point,
          detail: `Tail rung ${r.point}: over prob ${r.overImplied.toFixed(4)} vs ladder-implied ${expected.toFixed(4)} (×${ratio.toFixed(2)}) — ${ratio > 1 ? "too rich (over expensive)" : "too cheap (under expensive)"}.`,
          metric: ratio,
        });
      }
    }
  }

  return flags;
}
