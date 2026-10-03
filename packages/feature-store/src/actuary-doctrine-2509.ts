/**
 * Actuary-grade engine-honesty doctrine: Brier/log-loss primacy, override audit, staleness check
 *
 * Research port: arXiv:2509.04546
 * Normalized lane: calibration | Doctrine: SITUATIONAL
 *
 * Pure evaluation utilities implementing the paper's engine-honesty doctrine:
 * Brier score and log-loss as the primary metric on every evaluation slice,
 * a logged override audit that scores human overrides against the engine on
 * Brier over the overridden games, and a staleness check that flags models
 * whose second-half Brier degrades by >= 0.005. No live data — the operator
 * supplies scored slices; this module computes the doctrine's three verdicts.
 *
 * ACCEPTANCE GATE: Adopt the doctrine if either: (a) the override audit shows
 * human overrides do not beat the engine on Brier over >=100 overridden games
 * (if they do, adopt the override features into the model instead), or (b)
 * the staleness check shows >=0.005 Brier degradation second-half.
 */

export interface ScoredGame {
  /** engine's predicted P(home win) */
  engineP: number;
  /** human-overridden P(home win), if an override was logged */
  overrideP?: number;
  /** did the home team win */
  homeWon: boolean;
}

function clampP(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(0.999, Math.max(0.001, p));
}

/** Brier score of probability forecasts against binary outcomes. */
export function brierScore(ps: number[], outcomes: number[]): number {
  if (ps.length === 0 || ps.length !== outcomes.length) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < ps.length; i++) {
    // Brier is bounded on [0,1]: only non-finite inputs are repaired (to 0.5),
    // so a perfect forecast scores exactly 0
    const raw = ps[i] ?? 0.5;
    const p = Number.isFinite(raw) ? raw : 0.5;
    const y = outcomes[i] ?? 0;
    sum += (p - y) * (p - y);
  }
  return sum / ps.length;
}

/** Log-loss of probability forecasts against binary outcomes. */
export function logLoss(ps: number[], outcomes: number[]): number {
  if (ps.length === 0 || ps.length !== outcomes.length) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = clampP(ps[i] ?? 0.5);
    const y = outcomes[i] ?? 0;
    sum += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  return sum / ps.length;
}

export interface OverrideAudit {
  overriddenGames: number;
  engineBrier: number;
  overrideBrier: number;
  /** do human overrides beat the engine on Brier (lower is better) */
  overridesBeatEngine: boolean;
  /** if true, the doctrine says adopt the override features into the model */
  adoptOverrideFeatures: boolean;
  conclusive: boolean;
}

/**
 * Override audit: score logged human overrides against the engine on the
 * overridden games. Needs >=100 overridden games to be conclusive.
 */
export function overrideAudit(games: ScoredGame[]): OverrideAudit {
  const overridden = games.filter((g) => g.overrideP !== undefined);
  const n = overridden.length;
  const engineBrier = brierScore(
    overridden.map((g) => g.engineP),
    overridden.map((g) => (g.homeWon ? 1 : 0)),
  );
  const overrideBrier = brierScore(
    overridden.map((g) => g.overrideP ?? 0.5),
    overridden.map((g) => (g.homeWon ? 1 : 0)),
  );
  const beats = Number.isFinite(overrideBrier) && Number.isFinite(engineBrier) && overrideBrier < engineBrier;
  return {
    overriddenGames: n,
    engineBrier,
    overrideBrier,
    overridesBeatEngine: beats,
    adoptOverrideFeatures: n >= 100 && beats,
    conclusive: n >= 100,
  };
}

export interface StalenessCheck {
  firstHalfBrier: number;
  secondHalfBrier: number;
  degradation: number;
  /** retire the model: second-half Brier degraded by >= 0.005 */
  retire: boolean;
}

/**
 * Staleness check: split the scored slice into halves (chronological order
 * assumed) and flag >= 0.005 Brier degradation in the second half.
 */
export function stalenessCheck(games: ScoredGame[]): StalenessCheck {
  const half = Math.floor(games.length / 2);
  const first = games.slice(0, half);
  const second = games.slice(half);
  const b1 = brierScore(
    first.map((g) => g.engineP),
    first.map((g) => (g.homeWon ? 1 : 0)),
  );
  const b2 = brierScore(
    second.map((g) => g.engineP),
    second.map((g) => (g.homeWon ? 1 : 0)),
  );
  const degradation = Number.isFinite(b1) && Number.isFinite(b2) ? b2 - b1 : Number.NaN;
  return {
    firstHalfBrier: b1,
    secondHalfBrier: b2,
    degradation,
    retire: Number.isFinite(degradation) && degradation >= 0.005,
  };
}

export const GSE_ACTUARY_DOCTRINE_ENABLED = false;
