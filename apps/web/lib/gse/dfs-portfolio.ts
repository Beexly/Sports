/**
 * GSE DFS Portfolio — exposure, correlation, and duplication-aware leverage
 * primitives for daily-fantasy lineup construction. Pure, dependency-free, tested.
 *
 * Addresses the DFS competitive set (SaberSim's "Dupes" leverage metric;
 * FantasyLabs/Stokastic correlation + exposure management) with transparent,
 * auditable math instead of a black box:
 *   - riskParityWeights      — equal-risk-contribution exposure (not concentration in disguise)
 *   - buildCorrelationMatrix — correlation from same-team / same-game structure
 *   - lineupOverlap / portfolioUniqueness — duplication-aware leverage (Dupes proxy)
 *   - exposureCounts / withinExposureCaps  — per-player exposure + cap enforcement
 *
 * Companion doc: docs/research/GSE_2026_DFS_PORTFOLIO.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Correlation
// ─────────────────────────────────────────────────────────────────────────────

export interface CorrelationHint {
  /** Same team → positively correlated (a shared game script lifts teammates). */
  readonly sameTeamRho: number;
  /** Opposing players in the same game → typically slightly negative. */
  readonly opponentRho: number;
}

export interface PlayerMeta {
  readonly id: string;
  readonly team: string;
  readonly gameId: string;
}

/**
 * Build an n×n correlation matrix from roster structure: 1 on the diagonal,
 * `sameTeamRho` for teammates, `opponentRho` for opposing players in the same
 * game, 0 otherwise. A transparent stand-in for an estimated correlation matrix
 * (clamped to [-0.99, 0.99] to stay a valid correlation).
 */
export function buildCorrelationMatrix(players: readonly PlayerMeta[], hint: CorrelationHint): number[][] {
  const n = players.length;
  const clampRho = (r: number): number => (r < -0.99 ? -0.99 : r > 0.99 ? 0.99 : r);
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) row.push(1);
      else {
        const a = players[i]!;
        const b = players[j]!;
        if (a.team === b.team) row.push(clampRho(hint.sameTeamRho));
        else if (a.gameId === b.gameId) row.push(clampRho(hint.opponentRho));
        else row.push(0);
      }
    }
    m.push(row);
  }
  return m;
}

/** Combine a correlation matrix with per-asset volatilities into a covariance matrix. */
export function covarianceFromCorrelation(corr: readonly (readonly number[])[], vols: readonly number[]): number[][] {
  const n = corr.length;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) row.push(corr[i]![j]! * (vols[i] ?? 0) * (vols[j] ?? 0));
    out.push(row);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk-parity exposure
// ─────────────────────────────────────────────────────────────────────────────

function matVec(m: readonly (readonly number[])[], v: readonly number[]): number[] {
  return m.map((row) => row.reduce((s, mij, j) => s + mij * (v[j] ?? 0), 0));
}

/**
 * Equal-risk-contribution ("risk parity") weights for a covariance matrix, via a
 * multiplicative fixed-point update. Each asset contributes the same share of
 * portfolio risk — so exposure reflects risk, not raw size. For a diagonal
 * (uncorrelated) covariance this reduces to inverse-volatility weighting.
 * Returns non-negative weights summing to 1.
 */
export function riskParityWeights(cov: readonly (readonly number[])[], iters = 300): number[] {
  const n = cov.length;
  if (n === 0) return [];
  // Seed with inverse-vol; fall back to equal if a variance is non-positive.
  let w = cov.map((row, i) => {
    const variance = row[i] ?? 0;
    return variance > 0 ? 1 / Math.sqrt(variance) : 1;
  });
  const norm = (x: number[]): number[] => {
    const s = x.reduce((a, b) => a + Math.max(0, b), 0);
    return s > 0 ? x.map((v) => Math.max(0, v) / s) : x.map(() => 1 / n);
  };
  w = norm(w);
  for (let it = 0; it < iters; it++) {
    const mw = matVec(cov, w);
    const rc = w.map((wi, i) => wi * Math.max(0, mw[i] ?? 0)); // risk contributions
    const totalRc = rc.reduce((a, b) => a + b, 0);
    if (totalRc <= 0) break;
    const target = totalRc / n;
    const next = w.map((wi, i) => {
      const rci = rc[i] ?? 0;
      return rci > 1e-12 ? wi * (target / rci) : wi;
    });
    w = norm(next);
  }
  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplication-aware leverage
// ─────────────────────────────────────────────────────────────────────────────

/** Jaccard overlap between two lineups (shared players / union). */
export function lineupOverlap(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  let shared = 0;
  for (const p of new Set(b)) if (setA.has(p)) shared += 1;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

/**
 * Portfolio uniqueness = 1 − mean pairwise overlap. Higher means lineups are more
 * differentiated (lower duplication risk in a large field) — a transparent
 * leverage signal in the spirit of SaberSim's "Dupes". Single lineup → 1.
 */
export function portfolioUniqueness(lineups: readonly (readonly string[])[]): number {
  const k = lineups.length;
  if (k <= 1) return 1;
  let acc = 0;
  let pairs = 0;
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      acc += lineupOverlap(lineups[i]!, lineups[j]!);
      pairs += 1;
    }
  }
  return pairs === 0 ? 1 : 1 - acc / pairs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exposure
// ─────────────────────────────────────────────────────────────────────────────

/** Per-player exposure: fraction of lineups containing each player (0..1). */
export function exposureCounts(lineups: readonly (readonly string[])[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const lineup of lineups) {
    for (const p of new Set(lineup)) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  const k = Math.max(1, lineups.length);
  for (const [p, c] of counts) out.set(p, c / k);
  return out;
}

export interface ExposureViolation {
  readonly player: string;
  readonly exposure: number;
  readonly cap: number;
}

/**
 * Check that no player exceeds its exposure cap. `caps` maps player id → max
 * exposure (0..1); a missing entry uses `defaultCap`. Returns every violation so
 * the builder can rebalance — exposure caps keep a "portfolio" from being one
 * concentrated bet wearing a diversification costume.
 */
export function withinExposureCaps(
  lineups: readonly (readonly string[])[],
  caps: Readonly<Record<string, number>>,
  defaultCap = 1,
): { ok: boolean; violations: ExposureViolation[] } {
  const exposure = exposureCounts(lineups);
  const violations: ExposureViolation[] = [];
  for (const [player, exp] of exposure) {
    const cap = caps[player] ?? defaultCap;
    if (exp > cap + 1e-9) violations.push({ player, exposure: exp, cap });
  }
  return { ok: violations.length === 0, violations };
}
