/**
 * Statistically enhanced learning via latent team strengths
 * (arXiv 2307.11777).
 *
 * The SEL feature-engineering philosophy: augment a base predictor
 * with latent team-strength features estimated STRICTLY as-of-date
 * (no future leakage) — offensive/defensive strengths from a
 * Massey-style least-squares fit over games played before the target
 * date — plus a provenance audit that rejects any feature whose
 * computation window touches or postdates the prediction target.
 *
 * Portable core: as-of-date strength estimation, the SEL feature
 * vector (base prediction + off/def strengths + strength
 * differential), and the leakage provenance audit.
 *
 * ACCEPTANCE GATE: ADAPT iff adding SEL features improves log-loss
 * / Brier by >= 0.004 on the backtest AND no feature leaks (audit
 * passes); REJECT if gain < 0.002 or any leakage is detected.
 *
 * Research-only module. Not wired into any live feature path.
 */

export interface GameResult {
  date: string; // ISO date
  home: string;
  away: string;
  homePoints: number;
  awayPoints: number;
}

/** As-of-date filter: only games strictly before the target date. */
export function asOfDate(games: readonly GameResult[], targetDate: string): GameResult[] {
  return games.filter((g) => g.date < targetDate);
}

export interface TeamStrengths {
  team: string;
  /** Offensive strength: points scored above average. */
  offense: number;
  /** Defensive strength: points allowed below average (higher = better). */
  defense: number;
}

/**
 * Least-squares latent strengths over as-of-date games: solves for
 * offensive ratings r_i with sum(r) = 0 minimizing squared error of
 * (homePoints - awayPoints) - (r_home - r_away + hfa); defensive
 * strength from points allowed.
 */
export function estimateStrengths(
  games: readonly GameResult[],
  targetDate: string,
  hfa = 2.5,
): TeamStrengths[] {
  const past = asOfDate(games, targetDate);
  if (past.length === 0) throw new Error("estimateStrengths: no games before target");
  const teams = [...new Set(past.flatMap((g) => [g.home, g.away]))];
  const idx = new Map(teams.map((t, i) => [t, i]));
  const n = teams.length;
  // Normal equations for offense: (X'X) r = X'(y - hfa), with
  // sum-to-zero constraint folded in via a Lagrange row.
  const xtx: number[][] = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
  const xty: number[] = new Array(n + 1).fill(0);
  for (const g of past) {
    const h = idx.get(g.home) as number;
    const a = idx.get(g.away) as number;
    const y = g.homePoints - g.awayPoints - hfa;
    xtx[h]![h]! += 1;
    xtx[a]![a]! += 1;
    xtx[h]![a]! -= 1;
    xtx[a]![h]! -= 1;
    xty[h]! += y;
    xty[a]! -= y;
  }
  // Lagrange: sum(r) = 0.
  for (let i = 0; i < n; i++) {
    xtx[i]![n]! = 1;
    xtx[n]![i]! = 1;
  }
  const r = solveLinear(xtx, xty).slice(0, n);
  // Defense: average points allowed, centered (higher = better).
  const allowed = new Map<string, number[]>();
  for (const g of past) {
    allowed.set(g.home, [...(allowed.get(g.home) ?? []), g.awayPoints]);
    allowed.set(g.away, [...(allowed.get(g.away) ?? []), g.homePoints]);
  }
  const avgAllowed =
    [...allowed.values()].reduce((s, v) => s + v.reduce((a, x) => a + x, 0) / v.length, 0) /
    allowed.size;
  return teams.map((t, i) => {
    const pa = allowed.get(t) as number[];
    return {
      team: t,
      offense: r[i] as number,
      defense: avgAllowed - pa.reduce((s, x) => s + x, 0) / pa.length,
    };
  });
}

export interface SelFeatures {
  baseProb: number;
  homeOffense: number;
  awayOffense: number;
  homeDefense: number;
  awayDefense: number;
  strengthDiff: number; // (homeOff + homeDef) - (awayOff + awayDef)
}

/** Build the SEL feature vector for one matchup. */
export function selFeatures(
  baseProb: number,
  home: TeamStrengths,
  away: TeamStrengths,
): SelFeatures {
  return {
    baseProb,
    homeOffense: home.offense,
    awayOffense: away.offense,
    homeDefense: home.defense,
    awayDefense: away.defense,
    strengthDiff: home.offense + home.defense - (away.offense + away.defense),
  };
}

export interface FeatureProvenance {
  feature: string;
  /** Latest data date the feature computation touched. */
  maxDataDate: string;
  /** Date of the prediction target the feature serves. */
  targetDate: string;
}

/**
 * Leakage provenance audit: every feature's max data date must be
 * strictly before its target date. Returns the leaking features.
 */
export function auditProvenance(provenance: readonly FeatureProvenance[]): FeatureProvenance[] {
  return provenance.filter((p) => p.maxDataDate >= p.targetDate);
}

/** Brier score of probabilistic predictions. */
export function brierScore(probs: readonly number[], outcomes: readonly number[]): number {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("brierScore: mismatched/empty");
  }
  return (
    probs.reduce((s, p, i) => s + (p - (outcomes[i] as number)) ** 2, 0) / probs.length
  );
}

/** Gaussian elimination with partial pivoting. */
function solveLinear(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i] as number]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col] as number) > Math.abs(m[piv]![col] as number)) piv = r;
    }
    if (Math.abs(m[piv]![col] as number) < 1e-12) throw new Error("solveLinear: singular");
    [m[col], m[piv]] = [m[piv] as number[], m[col] as number[]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = (m[r]![col] as number) / (m[col]![col] as number);
      for (let c = col; c <= n; c++) m[r]![c]! -= f * (m[col]![c] as number);
    }
  }
  return m.map((row, i) => (row[n] as number) / (row[i] as number));
}
