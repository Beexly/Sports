
export interface GameScore {
  readonly home: string;
  readonly away: string;
  readonly homeScore: number;
  readonly awayScore: number;
}

export interface LsRatings {
  readonly teams: string[];
  readonly rating: number[];
  readonly se: number[];
  readonly sigma2hat: number;
}

function invert(A: number[][]): number[][] {
  const n = A.length;
  const m = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    if (Math.abs(m[piv]![col]!) < 1e-12) throw new Error("ls-ratings: singular system");
    const tmp = m[col]!;
    m[col] = m[piv]!;
    m[piv] = tmp;
    const d = m[col]![col] ?? 1;
    for (let c = 0; c < 2 * n; c++) m[col]![c] = (m[col]![c] ?? 0) / d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col] ?? 0;
      for (let c = 0; c < 2 * n; c++) m[r]![c] = (m[r]![c] ?? 0) - f * (m[col]![c] ?? 0);
    }
  }
  return m.map((row) => row.slice(n));
}

const phiStd = (z: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
};

/** Least-squares paired-comparison ratings with standard errors. */
export function pairedComparisonLS(games: readonly GameScore[]): LsRatings {
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))];
  const n = teams.length;
  if (n < 2) throw new Error("ls-ratings: need >= 2 teams");
  const idx = new Map(teams.map((t, i) => [t, i]));
  const N: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const S = new Array<number>(n).fill(0);
  for (const g of games) {
    const h = idx.get(g.home) ?? 0;
    const a = idx.get(g.away) ?? 0;
    const diff = g.homeScore - g.awayScore;
    N[h]![h] = (N[h]![h] ?? 0) + 1;
    N[a]![a] = (N[a]![a] ?? 0) + 1;
    N[h]![a] = (N[h]![a] ?? 0) - 1;
    N[a]![h] = (N[a]![h] ?? 0) - 1;
    S[h] = (S[h] ?? 0) + diff;
    S[a] = (S[a] ?? 0) - diff;
  }
  // Pseudoinverse identity for a connected Laplacian: N^+ = (N + 11'/n)^{-1} - 11'/n
  const reg = N.map((row, r) => row.map((v, c) => v + 1 / n));
  const inv = invert(reg);
  const Nplus = inv.map((row, r) => row.map((v, c) => v - 1 / n));
  const rating = Nplus.map((row) => row.reduce((s, v, j) => s + v * (S[j] ?? 0), 0));
  // sigma-hat^2 = Q(mu-hat)/n_games ; Q = sum (diff - (mu_h - mu_a))^2
  let Q = 0;
  for (const g of games) {
    const h = idx.get(g.home) ?? 0;
    const a = idx.get(g.away) ?? 0;
    const resid = g.homeScore - g.awayScore - ((rating[h] ?? 0) - (rating[a] ?? 0));
    Q += resid * resid;
  }
  const sigma2hat = Q / Math.max(games.length, 1);
  const se = Nplus.map((row, i) => Math.sqrt(Math.max((row[i] ?? 0) * sigma2hat, 0)));
  return { teams, rating, se, sigma2hat };
}

export interface ZTestResult {
  readonly z: number;
  readonly pTwoSided: number;
  readonly significant95: boolean;
}

/** Pairwise z-test: 'model says KC is better than BUF at 95% confidence'. */
export function pairwiseZTest(
  muI: number,
  muJ: number,
  varI: number,
  varJ: number,
  covIJ = 0,
): ZTestResult {
  const se = Math.sqrt(Math.max(varI + varJ - 2 * covIJ, 1e-12));
  const z = (muI - muJ) / se;
  const p = 2 * (1 - phiStd(Math.abs(z)));
  return { z, pTwoSided: p, significant95: p < 0.05 };
}
