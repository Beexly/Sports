/**
 * Home-field advantage (HFA) estimators robust to nonrandom scheduling.
 *
 * Research source: arXiv:1806.08059v2 — "Avoiding Bias Due to Nonrandom
 * Scheduling When Modeling Trends in Home-Field Advantage".
 *
 * The paper shows that fixed-HFA estimates (a single fixed home-effect
 * parameter with no team controls — the "fixed-effects" specification) are
 * biased when schedules are nonrandom (strong teams host disproportionately
 * many games: E[home margin] = gamma + E[theta_home - theta_away] > gamma),
 * while a mixed-effects design with team strengths as random intercepts
 * recovers the truth in simulation. This module ports both estimators plus
 * the comparison as a standing audit: any HFA claim must pass the
 * mixed-vs-unadjusted agreement check before it ships.
 *
 * Estimators (all fit homeMargin = gamma + theta[home] - theta[away] + e):
 * - unadjustedHFA: pooled mean home margin (the paper's fixed specification;
 *   biased upward under nonrandom scheduling).
 * - teamFixedEffectsHFA: OLS with one dummy per team (unbiased reference;
 *   noisier in short panels).
 * - mixedEffectsHFA: random team intercepts ~ N(0, sigmaT^2) via Henderson's
 *   mixed-model equations with method-of-moments variance components
 *   (the paper's bias-robust estimator).
 *
 * ACCEPTANCE GATE: ADAPT iff the bias replicates on NFL data — the
 * mixed-effects HFA estimate on 2020-2025 NFL seasons must differ from the
 * unadjusted estimate by a material margin (direction and magnitude
 * consistent with the paper's simulation: unadjusted biased upward) before
 * the HFA module is rewritten on the mixed-effects design; if the two
 * estimators agree, keep the current HFA design.
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface HFAGame {
  homeTeam: string;
  awayTeam: string;
  /** Home score minus away score. */
  homeMargin: number;
}

export interface HFAEstimate {
  /** Home-field advantage in points. */
  gamma: number;
  /** Per-team strength (sum-to-zero / shrunk toward zero). */
  theta: Record<string, number>;
  /** Residual standard error. */
  sigmaE: number;
  /** Random-effect SD (mixed-effects only; 0 otherwise). */
  sigmaT: number;
}

function teamList(games: readonly HFAGame[]): string[] {
  const s = new Set<string>();
  for (const g of games) {
    s.add(g.homeTeam);
    s.add(g.awayTeam);
  }
  return [...s].sort();
}

/** Solve A x = b by Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);
  const row = (i: number): number[] => M[i] as number[];
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(row(r)[col] ?? 0) > Math.abs(row(piv)[col] ?? 0)) piv = r;
    }
    if (Math.abs(row(piv)[col] ?? 0) < 1e-12) continue;
    const tmp = M[col] as number[];
    M[col] = M[piv] as number[];
    M[piv] = tmp;
    const d = row(col)[col] ?? 0;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = (row(r)[col] ?? 0) / d;
      for (let c = col; c <= n; c++) row(r)[c] = (row(r)[c] ?? 0) - f * (row(col)[c] ?? 0);
    }
  }
  return M.map((r, i) => {
    const diag = r[i] ?? 0;
    return Math.abs(diag) < 1e-12 ? 0 : (r[n] ?? 0) / diag;
  });
}

/**
 * Unadjusted HFA: the pooled mean home margin. This is the paper's
 * fixed-HFA specification — no team controls, so under nonrandom scheduling
 * it absorbs E[theta_home - theta_away] and overstates the true advantage.
 */
export function unadjustedHFA(games: readonly HFAGame[]): number {
  if (games.length === 0) throw new Error("unadjustedHFA: no games");
  return games.reduce((a, g) => a + g.homeMargin, 0) / games.length;
}

function designRow(g: HFAGame, teams: readonly string[]): number[] {
  // Columns: [home indicator, team dummies...] with home +1 / away -1 coding.
  const row = new Array<number>(1 + teams.length).fill(0);
  row[0] = 1;
  row[1 + teams.indexOf(g.homeTeam)] = 1;
  row[1 + teams.indexOf(g.awayTeam)] = -1;
  return row;
}

/**
 * Team fixed-effects HFA: OLS with one dummy per team (ridge-stabilized for
 * the sum-to-zero rank deficiency). Unbiased under nonrandom scheduling but
 * noisy when teams play few games.
 */
export function teamFixedEffectsHFA(games: readonly HFAGame[]): HFAEstimate {
  if (games.length === 0) throw new Error("teamFixedEffectsHFA: no games");
  const teams = teamList(games);
  const p = 1 + teams.length;
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (const g of games) {
    const x = designRow(g, teams);
    for (let i = 0; i < p; i++) {
      const xi = x[i] ?? 0;
      Xty[i] = (Xty[i] ?? 0) + xi * g.homeMargin;
      const Xi = XtX[i] as number[];
      for (let j = 0; j < p; j++) Xi[j] = (Xi[j] ?? 0) + xi * (x[j] ?? 0);
    }
  }
  const ridge = 1e-8;
  for (let i = 0; i < p; i++) {
    const r = XtX[i] as number[];
    r[i] = (r[i] ?? 0) + ridge;
  }
  const beta = solveLinear(XtX, Xty);
  const theta: Record<string, number> = {};
  const raw = teams.map((_, i) => beta[1 + i] ?? 0);
  const mean = raw.reduce((a: number, b) => a + b, 0) / Math.max(1, raw.length);
  teams.forEach((t, i) => {
    theta[t] = (raw[i] ?? 0) - mean;
  });
  let sse = 0;
  for (const g of games) {
    const pred = (beta[0] ?? 0) + (theta[g.homeTeam] ?? 0) - (theta[g.awayTeam] ?? 0);
    sse += (g.homeMargin - pred) ** 2;
  }
  return {
    gamma: beta[0] ?? 0,
    theta,
    sigmaE: Math.sqrt(sse / Math.max(1, games.length - p)),
    sigmaT: 0,
  };
}

/**
 * Mixed-effects HFA via Henderson's mixed-model equations. Team strengths
 * are random intercepts ~ N(0, sigmaT^2); variance components come from a
 * one-step method-of-moments pass on the team fixed-effects fit. This is
 * the paper's bias-robust estimator under nonrandom scheduling.
 */
export function mixedEffectsHFA(games: readonly HFAGame[]): HFAEstimate {
  if (games.length === 0) throw new Error("mixedEffectsHFA: no games");
  const teams = teamList(games);
  const T = teams.length;
  const fe = teamFixedEffectsHFA(games);
  // Method-of-moments variance components.
  const counts: Record<string, number> = {};
  for (const g of games) {
    counts[g.homeTeam] = (counts[g.homeTeam] ?? 0) + 1;
    counts[g.awayTeam] = (counts[g.awayTeam] ?? 0) + 1;
  }
  const avgN = (games.length * 2) / Math.max(1, T);
  const thetaVals = teams.map((t) => fe.theta[t] ?? 0);
  const varTheta = thetaVals.reduce((a, b) => a + b * b, 0) / Math.max(1, T);
  const sigmaE2 = Math.max(1e-6, fe.sigmaE ** 2);
  const sigmaT2 = Math.max(1e-6, varTheta - sigmaE2 / Math.max(1, avgN));
  const lambda = sigmaE2 / sigmaT2;

  // Henderson's equations: [X'X, X'Z; Z'X, Z'Z + lambda I] [b; u] = [X'y; Z'y].
  // X = home column, Z = team design (home +1, away -1).
  const p = 1 + T;
  const C: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const rhs = new Array<number>(p).fill(0);
  for (const g of games) {
    const x = designRow(g, teams);
    for (let i = 0; i < p; i++) {
      const xi = x[i] ?? 0;
      rhs[i] = (rhs[i] ?? 0) + xi * g.homeMargin;
      const Ci = C[i] as number[];
      for (let j = 0; j < p; j++) Ci[j] = (Ci[j] ?? 0) + xi * (x[j] ?? 0);
    }
  }
  for (let i = 1; i < p; i++) {
    const r = C[i] as number[];
    r[i] = (r[i] ?? 0) + lambda;
  }
  const sol = solveLinear(C, rhs);
  const theta: Record<string, number> = {};
  teams.forEach((t, i) => {
    theta[t] = sol[1 + i] ?? 0;
  });
  return {
    gamma: sol[0] ?? 0,
    theta,
    sigmaE: Math.sqrt(sigmaE2),
    sigmaT: Math.sqrt(sigmaT2),
  };
}

export interface HFABiasAudit {
  /** The paper's fixed (unadjusted) specification. */
  unadjusted: number;
  teamFE: HFAEstimate;
  mixed: HFAEstimate;
  /** mixed.gamma - unadjusted: the scheduling-bias gap (paper's comparison). */
  gap: number;
  /** True when |gap| exceeds the materiality threshold. */
  material: boolean;
}

/**
 * Standing audit: run the paper's two estimators and flag a material
 * disagreement. The team-FE estimate is reported as an unbiased reference.
 * @param materiality minimum |gap| (points) that counts as material.
 */
export function hfaBiasAudit(games: readonly HFAGame[], materiality = 0.5): HFABiasAudit {
  const unadjusted = unadjustedHFA(games);
  const teamFE = teamFixedEffectsHFA(games);
  const mixed = mixedEffectsHFA(games);
  const gap = mixed.gamma - unadjusted;
  return { unadjusted, teamFE, mixed, gap, material: Math.abs(gap) >= materiality };
}

/** Tiny seeded PRNG (mulberry32) for the scheduling simulator. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ScheduleSimOpts {
  teams?: number;
  games?: number;
  trueGamma?: number;
  teamSd?: number;
  noiseSd?: number;
  /** 0 = balanced schedule; larger = strong teams host more often. */
  hostBias?: number;
  seed?: number;
}

/**
 * Simulate games under nonrandom scheduling (the paper's mechanism): each
 * team's hosting probability rises with its strength. Returns games and the
 * true HFA for estimator horse-races.
 */
export function simulateNonrandomSchedule(opts: ScheduleSimOpts = {}): {
  games: HFAGame[];
  trueGamma: number;
} {
  const teams = opts.teams ?? 12;
  const nGames = opts.games ?? 240;
  const trueGamma = opts.trueGamma ?? 3;
  const teamSd = opts.teamSd ?? 6;
  const noiseSd = opts.noiseSd ?? 10;
  const hostBias = opts.hostBias ?? 0.9;
  const rand = mulberry32(opts.seed ?? 42);
  const gauss = (): number => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const names = Array.from({ length: teams }, (_, i) => `T${i}`);
  const strength = names.map(() => gauss() * teamSd);
  const order = [...names].sort(
    (a, b) => (strength[names.indexOf(b)] ?? 0) - (strength[names.indexOf(a)] ?? 0),
  );
  const hostWeight = new Map<string, number>();
  order.forEach((t, rank) => {
    hostWeight.set(t, 1 + hostBias * (teams - rank));
  });
  const totalWeight = [...hostWeight.values()].reduce((a, b) => a + b, 0);
  const games: HFAGame[] = [];
  for (let g = 0; g < nGames; g++) {
    let r = rand() * totalWeight;
    let home = names[0] as string;
    for (const [t, w] of hostWeight) {
      r -= w;
      if (r <= 0) {
        home = t;
        break;
      }
    }
    let away = names[Math.floor(rand() * teams)] as string;
    if (away === home) away = names[(names.indexOf(home) + 1) % teams] as string;
    games.push({
      homeTeam: home,
      awayTeam: away,
      homeMargin:
        trueGamma +
        ((strength[names.indexOf(home)] ?? 0) - (strength[names.indexOf(away)] ?? 0)) +
        gauss() * noiseSd,
    });
  }
  return { games, trueGamma };
}
