/**
 * Tiered-margin Bradley-Terry: weight fits by game informativeness
 *
 * Research port: arXiv:2606.04387
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's tiered-margin BT: P(i beats j | m) =
 * sigma(theta_i - theta_j - m) with tier margins m = 1.0 (playoff), 0.5
 * (late-season contender), 0.1 (early-season). Subtracting the tier margin
 * handicaps the favorite, so high-information games produce larger rating
 * updates — ratings separate more where the games mean more. Tier margins
 * are then learned end-to-end, parametrized as cumulative softplus sums so
 * the non-increasing constraint (playoff >= late >= early >= 0) holds by
 * construction.
 *
 * ACCEPTANCE GATE: Adopt if the tiered-margin BT beats static BT on
 * next-season SU log-loss by >= 0.005 per game (averaged over the 2022-2024
 * rolling test seasons) AND the margin ablation shows tiered > uniform > none.
 */

export type GameTier = "playoff" | "late" | "early";

export interface TieredGame {
  home: string;
  away: string;
  homeWon: boolean;
  tier: GameTier;
}

/** Paper's default tier margins. */
export const DEFAULT_TIER_MARGINS: Record<GameTier, number> = {
  playoff: 1.0,
  late: 0.5,
  early: 0.1,
};

function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function softplus(x: number): number {
  return Math.log1p(Math.exp(-Math.abs(x))) + Math.max(x, 0);
}

/** Tier margins from unconstrained params, non-increasing by construction. */
export function tierMarginsFromParams(u: [number, number, number]): Record<GameTier, number> {
  const early = softplus(u[0]);
  const late = early + softplus(u[1]);
  const playoff = late + softplus(u[2]);
  return { early, late, playoff };
}

export interface TieredFit {
  theta: Map<string, number>;
  margins: Record<GameTier, number>;
  logLikelihood: number;
}

function logLik(
  games: TieredGame[],
  teams: string[],
  theta: Map<string, number>,
  margins: Record<GameTier, number>,
): number {
  let ll = 0;
  for (const g of games) {
    const d = (theta.get(g.home) ?? 0) - (theta.get(g.away) ?? 0) - (margins[g.tier] ?? 0);
    const p = sigma(d);
    ll += g.homeWon ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12));
  }
  return ll;
}

export interface TieredFitOptions {
  learnMargins?: boolean;
  /** override margins entirely (e.g. all-zero for the no-margin ablation) */
  fixedMargins?: Record<GameTier, number>;
  iters?: number;
}

/**
 * Fit tiered-margin BT. When learnMargins is true, tier margins are learned
 * end-to-end (non-increasing by construction); otherwise the paper's default
 * margins (or fixedMargins) are used.
 */
export function fitTieredBT(
  games: TieredGame[],
  teams: string[],
  opts: TieredFitOptions = {},
): TieredFit {
  const { learnMargins = false, fixedMargins, iters = 400 } = opts;
  const theta = new Map<string, number>(teams.map((t) => [t, 0]));
  let u: [number, number, number] = [0, 0, 0];
  const marginsOf = (): Record<GameTier, number> =>
    fixedMargins ?? (learnMargins ? tierMarginsFromParams(u) : { ...DEFAULT_TIER_MARGINS });
  let prev = logLik(games, teams, theta, marginsOf());
  for (let it = 0; it < iters; it++) {
    const margins = marginsOf();
    const gTheta = new Map<string, number>(teams.map((t) => [t, 0]));
    let gu: [number, number, number] = [0, 0, 0];
    for (const g of games) {
      const d = (theta.get(g.home) ?? 0) - (theta.get(g.away) ?? 0) - (margins[g.tier] ?? 0);
      const p = sigma(d);
      const r = (g.homeWon ? 1 : 0) - p;
      gTheta.set(g.home, (gTheta.get(g.home) ?? 0) + r);
      gTheta.set(g.away, (gTheta.get(g.away) ?? 0) - r);
      if (learnMargins && !fixedMargins) {
        // d(margin)/d(u): chain through cumulative softplus
        const dm: Record<GameTier, [number, number, number]> = {
          early: [sigma(u[0]), 0, 0],
          late: [sigma(u[0]), sigma(u[1]), 0],
          playoff: [sigma(u[0]), sigma(u[1]), sigma(u[2])],
        };
        const dmd = dm[g.tier] ?? [0, 0, 0];
        // d ll / d margin = -r; chain: d ll/du_k = -r * dmargin/du_k
        gu = [gu[0] - r * (dmd[0] ?? 0), gu[1] - r * (dmd[1] ?? 0), gu[2] - r * (dmd[2] ?? 0)];
      }
    }
    let step = 1;
    let improved = false;
    for (let ls = 0; ls < 15; ls++) {
      const trial = new Map<string, number>();
      for (const t of teams) trial.set(t, (theta.get(t) ?? 0) + step * (gTheta.get(t) ?? 0));
      const m = teams.reduce((s, t) => s + (trial.get(t) ?? 0), 0) / Math.max(teams.length, 1);
      for (const t of teams) trial.set(t, (trial.get(t) ?? 0) - m);
      const trialU: [number, number, number] =
        learnMargins && !fixedMargins
          ? [u[0] + step * gu[0], u[1] + step * gu[1], u[2] + step * gu[2]]
          : u;
      const ll = logLik(
        games,
        teams,
        trial,
        fixedMargins ?? (learnMargins ? tierMarginsFromParams(trialU) : margins),
      );
      if (ll > prev) {
        for (const t of teams) theta.set(t, trial.get(t) ?? 0);
        u = trialU;
        prev = ll;
        improved = true;
        break;
      }
      step *= 0.5;
    }
    if (!improved) break;
  }
  return { theta, margins: marginsOf(), logLikelihood: prev };
}

/** SU log-loss of a tiered fit on games (uses fitted margins). */
export function tieredLogLoss(fit: TieredFit, games: TieredGame[]): number {
  if (games.length === 0) return Number.NaN;
  let s = 0;
  for (const g of games) {
    const d =
      (fit.theta.get(g.home) ?? 0) - (fit.theta.get(g.away) ?? 0) - (fit.margins[g.tier] ?? 0);
    const p = sigma(d);
    const y = g.homeWon ? 1 : 0;
    s += -(y * Math.log(Math.max(p, 1e-12)) + (1 - y) * Math.log(Math.max(1 - p, 1e-12)));
  }
  return s / games.length;
}

export interface AblationResult {
  tiered: number;
  uniform: number;
  none: number;
  orderingHolds: boolean;
}

/** Margin ablation: tiered vs uniform-margin vs no-margin log-loss. */
export function marginAblation(train: TieredGame[], test: TieredGame[], teams: string[]): AblationResult {
  const tiered = fitTieredBT(train, teams);
  const uniform = fitTieredBT(train, teams, { fixedMargins: { early: 0.5, late: 0.5, playoff: 0.5 } });
  const none = fitTieredBT(train, teams, { fixedMargins: { early: 0, late: 0, playoff: 0 } });
  const t = tieredLogLoss(tiered, test);
  const u = tieredLogLoss(uniform, test);
  const n = tieredLogLoss(none, test);
  return { tiered: t, uniform: u, none: n, orderingHolds: t < u && u < n };
}

export const GSE_TIERED_MARGIN_BT_ENABLED = false;
