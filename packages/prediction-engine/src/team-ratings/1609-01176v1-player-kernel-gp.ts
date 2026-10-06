/**
 * arXiv 1609.01176v1: The Player Kernel: Learning Team Strengths Based on Implicit Player Contributions
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Team strength as a Gaussian process over games related through shared
personnel: k(z, z') = sigma^2 z^T z' with z the signed snap-share vector
(+share for the winner, -share for the loser), multiplied by the time-decay
kernel exp(-|d - d'|/tau). Cold-start September games borrow strength from
prior-season games via retained personnel; backup-QB spots relate through the
QB's other starts; full predictive distributions feed pick-confidence and
Kelly sizing.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a player-kernel GP team-strength overlay: z_p = snap share (signed +share for winner, -share for loser) -> k(z,z') = sigma^2 z^T z' relating games through shared personnel, with the authors' flagged time-decay kernel k_time(d,d') = exp(-|d-d'|/tau) multiplied in -- use cases: early-season cold-start (September games borrow strength from prior-season games via retained personnel), backup-QB/injury spots (relate through the QB's other starts), coaching-change teams (relate through retained players, not franchise label); feed full predictive distributions with uncertainty into pick-confidence and Kelly sizing.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT if either Test 1 or Test 2 passes -- Test 1 (cold-start): player-kernel GP wins by >=0.02 mean log-loss in weeks 1-4 of 2023/2024 vs GSE's current team rating and Elo; Test 2 (backup QBs): log-loss >=0.03 better than team-rating baseline on the 2023-2024 backup-QB subset.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: team_ratings | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2023/2024 cold-start + backup-QB log-loss tests.

export interface PersonnelGame {
  /** Signed snap-share vector: +share for winner's players, -share for loser's. */
  z: number[];
  daysAgo: number;
  /** Observed margin (from the perspective matching z's sign). */
  margin: number;
}

/** Player kernel with time decay: sigma^2 z'z * exp(-|d-d'|/tau). */
export function playerKernel(
  a: { z: number[]; daysAgo: number },
  b: { z: number[]; daysAgo: number },
  sigma2: number,
  tau: number,
): number {
  let dot = 0;
  for (let i = 0; i < a.z.length; i++) dot += a.z[i]! * b.z[i]!;
  return sigma2 * dot * Math.exp(-Math.abs(a.daysAgo - b.daysAgo) / tau);
}

/** Solve A x = b (Gauss-Jordan, partial pivoting). */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c]!;
    if (Math.abs(d) < 1e-12) throw new Error("singular matrix");
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / d;
      for (let k = c; k <= n; k++) M[r]![k] = M[r]![k]! - f * M[c]![k]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}

export interface GPPrediction {
  mean: number;
  variance: number;
}

/** GP posterior predictive mean/variance for a new game's personnel vector. */
export function gpPredict(
  train: PersonnelGame[],
  zNew: number[],
  daysAgoNew: number,
  sigma2: number,
  tau: number,
  noise2: number,
): GPPrediction {
  const n = train.length;
  const K: number[][] = train.map((a, i) =>
    train.map((b, j) => playerKernel(a, b, sigma2, tau) + (i === j ? noise2 : 0)),
  );
  const y = train.map((g) => g.margin);
  const alpha = solveLinear(K, y);
  const knew = { z: zNew, daysAgo: daysAgoNew };
  const ks = train.map((g) => playerKernel(g, knew, sigma2, tau));
  const mean = ks.reduce((s, k, i) => s + k * alpha[i]!, 0);
  const v = solveLinear(K, ks);
  const kss = playerKernel(knew, knew, sigma2, tau);
  return { mean, variance: Math.max(kss - ks.reduce((s, k, i) => s + k * v[i]!, 0), 1e-9) };
}
