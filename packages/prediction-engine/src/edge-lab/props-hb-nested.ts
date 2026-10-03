/**
 * Nested empirical-Bayes props specialist — player → position → league,
 * with empirically calibrated 1/n observation noise.
 *
 * Extends {@link ./props-hb.ts} (one-level Gamma-Poisson MoM). That module
 * shrinks a player toward a SINGLE group prior and estimates between-player
 * variance by subtracting a Poisson plug-in `mean(rate_i / games_i)`. This
 * module adds the two lifts that were strictly better — and still closed-form
 * — in the Bayesian-methods corpus mined for the props frontier:
 *
 *  1. Empirical 1/n variance decomposition (jswienton/hitters_bayesian_shrinkage).
 *     Bin (or OLS-regress) Var(observed rate) against 1/games. Intercept =
 *     talent variance; slope = per-game observation variance. A naive Poisson
 *     plug-in (or the season-average spread treated as single-game noise)
 *     understates observation noise when games vary or the counts are
 *     extra-Poisson. bbsBayes's extra-Poisson / heavy-tailed counts show up
 *     here as slope / pooledMean > 1.
 *
 *  2. Nested pooling (Huffard pitch-velocity pitcher+pitch-type; housing
 *     city→state; Vistula station→river→global). Small position groups (TEs,
 *     specialists) borrow strength from the league; large groups (WRs) barely
 *     move. The Vistula paper's caution is encoded: nesting pays when groups
 *     are sparse (props: 5–30 games, 8 TEs), not when every unit is
 *     data-rich. Nested hierarchy is a location shrink of the group mean
 *     toward the league, keeping within-group talent variance if it is
 *     measurable and falling back to league variance if it is not.
 *
 * Quasi-likelihood extra-Poisson: if the empirical slope implies φ = slope / μ
 * ≠ 1, the conjugate update treats the observation as (total/φ, games/φ) so
 * the mean is preserved but the likelihood is weaker (φ>1) or stronger (φ<1).
 *
 * Component-then-recompose: {@link fitNestedByStat} fits each stat type
 * independently. Receptions, targets, and yards have different
 * signal-to-noise; shrinking a lumped "fantasy points" rate throws that away
 * (jswienton's unpublished next step, adopted here as the API grain).
 *
 * ── What this module does NOT do ──
 * No MCMC. No market/spread/odds fields on the likelihood (Olist DiD
 * sign-flip + Andotra NFL Gibbs: do not put the betting line into the
 * independent model). No prop-line pricing — that is the market half
 * (props-priced-edge), a separate question. No schema, no I/O.
 *
 * Pure, deterministic, glass-box.
 */

import {
  fitGroupPrior,
  posteriorRate,
  type GammaPosterior,
  type GammaPrior,
  type RateSample,
} from "./props-hb.js";

// ── types ────────────────────────────────────────────────────────────────

/** Player-level sufficient statistic plus the grouping key (position, role).
 * Deliberately has no spread / odds / line field — the independent model
 * must not ingest the market. */
export interface GroupedRateSample extends RateSample {
  readonly groupId: string;
  readonly id?: string;
}

export type VarianceMethod = "binned-1n" | "player-ols" | "poisson-plugin";

/**
 * Var(observed rate) = talentVar + obsVarPerGame / games.
 * extraPoissonFactor = obsVarPerGame / pooledMean (1 = Poisson).
 */
export interface VarianceDecomposition {
  readonly pooledMean: number;
  readonly talentVar: number;
  readonly obsVarPerGame: number;
  readonly extraPoissonFactor: number;
  readonly method: VarianceMethod;
  readonly binsUsed: number;
  readonly playerCount: number;
}

export interface NestedGroupPrior {
  readonly groupId: string;
  /** Gamma prior used to shrink players in this group. Null when even the
   * league fallback has no measurable dispersion. */
  readonly prior: GammaPrior | null;
  readonly playerCount: number;
  readonly games: number;
  readonly total: number;
  readonly rawMean: number;
  readonly shrunkMean: number;
  /** Weight on the LEAGUE mean: 1 = full league, 0 = raw group mean. */
  readonly shrinkWeightTowardLeague: number;
  readonly source: "group" | "league" | "shrunk";
}

export interface NestedFit {
  readonly league: GammaPrior | null;
  readonly groups: Readonly<Record<string, NestedGroupPrior>>;
  readonly decomposition: VarianceDecomposition | null;
}

export interface NestedShrinkageRow {
  readonly id?: string;
  readonly groupId: string;
  readonly games: number;
  readonly total: number;
  readonly rawRate: number;
  readonly posteriorMean: number;
  readonly shrinkWeight: number;
  readonly groupShrinkWeightTowardLeague: number;
  readonly extraPoissonFactor: number;
}

const DEGENERACY_FRACTION = 1e-6;
const MIN_BIN_PLAYERS = 4;
const MIN_GROUP_PLAYERS_FOR_OWN_VAR = 3;
const MIN_PHI = 0.25;
const MAX_PHI = 16;

// ── 0. moments helpers ────────────────────────────────────────────────────

function assertSample(p: RateSample, label: string): void {
  if (!Number.isFinite(p.games) || !Number.isFinite(p.total)) {
    throw new RangeError(`${label}: games and total must be finite (got games=${p.games}, total=${p.total})`);
  }
  if (p.games <= 0) {
    throw new RangeError(`${label}: games must be > 0 (got games=${p.games})`);
  }
  if (p.total < 0) {
    throw new RangeError(`${label}: total must be >= 0 (got total=${p.total})`);
  }
}

function pooledMean(samples: readonly RateSample[]): number {
  let g = 0;
  let t = 0;
  for (const p of samples) {
    g += p.games;
    t += p.total;
  }
  return t / g;
}

function clampPhi(phi: number): number {
  if (!Number.isFinite(phi) || phi <= 0) {
    throw new RangeError(`extra-Poisson φ must be finite and > 0 (got ${phi})`);
  }
  return Math.min(MAX_PHI, Math.max(MIN_PHI, phi));
}

/**
 * Gamma(alpha, beta) from mean and variance. Returns null when variance is
 * degenerately small relative to the mean (no measurable dispersion — same
 * honesty rule as {@link fitGroupPrior}).
 */
export function gammaFromMoments(mean: number, variance: number): GammaPrior | null {
  if (!Number.isFinite(mean) || !Number.isFinite(variance) || mean <= 0 || variance <= 0) {
    return null;
  }
  const scale = Math.max(mean, 1e-12);
  if (variance <= scale * DEGENERACY_FRACTION) return null;
  const alpha = (mean * mean) / variance;
  const beta = mean / variance;
  if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha <= 0 || beta <= 0) return null;
  return { alpha, beta };
}

function weightedOls(
  xs: readonly number[],
  ys: readonly number[],
  ws: readonly number[],
): { intercept: number; slope: number } | null {
  if (xs.length < 2 || xs.length !== ys.length || xs.length !== ws.length) return null;
  let sw = 0;
  let swx = 0;
  let swy = 0;
  let swxx = 0;
  let swxy = 0;
  for (let i = 0; i < xs.length; i++) {
    const w = ws[i] as number;
    const x = xs[i] as number;
    const y = ys[i] as number;
    if (!(w > 0) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    sw += w;
    swx += w * x;
    swy += w * y;
    swxx += w * x * x;
    swxy += w * x * y;
  }
  const denom = sw * swxx - swx * swx;
  if (!(Math.abs(denom) > 1e-18) || !(sw > 0)) return null;
  const slope = (sw * swxy - swx * swy) / denom;
  const intercept = (swy - slope * swx) / sw;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  return { intercept, slope };
}

function poissonPluginDecomposition(samples: readonly RateSample[]): VarianceDecomposition {
  const n = samples.length;
  const m = pooledMean(samples);
  const rates = samples.map((p) => p.total / p.games);
  const varRate = rates.reduce((s, r) => s + (r - m) * (r - m), 0) / n;
  const samplingVar = samples.reduce((s, p, i) => s + (rates[i] as number) / p.games, 0) / n;
  const talentVar = Math.max(0, varRate - samplingVar);
  return {
    pooledMean: m,
    talentVar,
    obsVarPerGame: m,
    extraPoissonFactor: 1,
    method: "poisson-plugin",
    binsUsed: 0,
    playerCount: n,
  };
}

function finalizeDecomposition(
  m: number,
  intercept: number,
  slope: number,
  method: VarianceMethod,
  binsUsed: number,
  playerCount: number,
): VarianceDecomposition | null {
  if (!(slope > 0) || !Number.isFinite(slope)) return null;
  const talentVar = Math.max(0, intercept);
  const extra = m > 0 ? clampPhi(slope / m) : 1;
  return {
    pooledMean: m,
    talentVar,
    obsVarPerGame: slope,
    extraPoissonFactor: extra,
    method,
    binsUsed,
    playerCount,
  };
}

// ── 1. empirical 1/n variance decomposition ───────────────────────────────

/**
 * Estimate talent variance (intercept) and per-game observation variance
 * (slope) by regressing observed-rate variance on 1/games.
 *
 * Preferred path: bin players by exact `games` (jswienton's PA-bin recipe).
 * Fallback: player-level weighted OLS of (rate − m)² on 1/games. Last
 * resort: the Poisson plug-in used by {@link fitGroupPrior}.
 *
 * Returns `null` for empty input. Throws RangeError on invalid samples.
 */
export function fitVarianceDecomposition(playerRates: readonly RateSample[]): VarianceDecomposition | null {
  if (playerRates.length === 0) return null;
  for (const p of playerRates) assertSample(p, "fitVarianceDecomposition");

  const n = playerRates.length;
  const m = pooledMean(playerRates);

  const byGames = new Map<number, RateSample[]>();
  for (const p of playerRates) {
    const bucket = byGames.get(p.games);
    if (bucket) bucket.push(p);
    else byGames.set(p.games, [p]);
  }

  const binX: number[] = [];
  const binY: number[] = [];
  const binW: number[] = [];
  for (const [games, members] of byGames) {
    if (members.length < MIN_BIN_PLAYERS) continue;
    const rates = members.map((p) => p.total / p.games);
    const meanBin = rates.reduce((s, r) => s + r, 0) / rates.length;
    let ss = 0;
    for (const r of rates) ss += (r - meanBin) * (r - meanBin);
    const varBin = ss / (rates.length - 1);
    binX.push(1 / games);
    binY.push(varBin);
    binW.push(rates.length);
  }

  if (binX.length >= 2) {
    const fit = weightedOls(binX, binY, binW);
    if (fit && fit.slope > 0) {
      const deco = finalizeDecomposition(m, fit.intercept, fit.slope, "binned-1n", binX.length, n);
      if (deco) return deco;
    }
  }

  const xs = playerRates.map((p) => 1 / p.games);
  const ys = playerRates.map((p) => {
    const r = p.total / p.games;
    return (r - m) * (r - m);
  });
  const ws = playerRates.map((p) => p.games);
  const ols = weightedOls(xs, ys, ws);
  if (ols && ols.slope > 0) {
    const deco = finalizeDecomposition(m, ols.intercept, ols.slope, "player-ols", 0, n);
    if (deco) return deco;
  }

  return poissonPluginDecomposition(playerRates);
}

/**
 * Gamma prior whose variance is the empirical 1/n talent intercept rather
 * than the Poisson-plug-in excess. Falls back to {@link fitGroupPrior} when
 * the decomposition cannot support a Gamma (homogeneous or degenerate).
 */
export function fitGroupPriorCalibrated(playerRates: readonly RateSample[]): GammaPrior | null {
  const deco = fitVarianceDecomposition(playerRates);
  if (!deco) return fitGroupPrior(playerRates);
  const fromDeco = gammaFromMoments(deco.pooledMean, deco.talentVar);
  if (fromDeco) return fromDeco;
  return fitGroupPrior(playerRates);
}

// ── 2. extra-Poisson conjugate update ─────────────────────────────────────

/**
 * Quasi-likelihood rescale: preserve the observed mean `total/games` but
 * treat the observation as if it had `games/φ` effective games. φ>1
 * (extra-Poisson) weakens the likelihood so the player shrinks more toward
 * the prior; φ<1 (underdispersed) does the opposite.
 */
export function scaleObservation(
  total: number,
  games: number,
  phi: number,
): { readonly total: number; readonly games: number } {
  const p = clampPhi(phi);
  if (!Number.isFinite(total) || !Number.isFinite(games) || total < 0 || games < 0) {
    throw new RangeError(
      `scaleObservation: total/games must be finite and >= 0 (got total=${total}, games=${games})`,
    );
  }
  return { total: total / p, games: games / p };
}

export function posteriorRateCalibrated(
  prior: GammaPrior,
  playerTotal: number,
  playerGames: number,
  phi: number = 1,
): GammaPosterior {
  const scaled = scaleObservation(playerTotal, playerGames, phi);
  return posteriorRate(prior, scaled.total, scaled.games);
}

// ── 3. nested player → position → league ─────────────────────────────────

function assertGroupId(groupId: string, label: string): void {
  if (typeof groupId !== "string" || groupId.length === 0) {
    throw new RangeError(`${label}: groupId must be a non-empty string`);
  }
}

function assertObservation(total: number, games: number, label: string): void {
  if (!Number.isFinite(total) || !Number.isFinite(games) || total < 0 || games < 0) {
    throw new RangeError(`${label}: total/games must be finite and >= 0 (got total=${total}, games=${games})`);
  }
}

function groupVariance(members: readonly RateSample[], leagueTalentVar: number): number {
  if (members.length < MIN_GROUP_PLAYERS_FOR_OWN_VAR) return leagueTalentVar;
  const deco = fitVarianceDecomposition(members);
  if (deco && deco.talentVar > 0) return deco.talentVar;
  const prior = fitGroupPrior(members);
  if (prior) return prior.alpha / (prior.beta * prior.beta);
  return leagueTalentVar;
}

/**
 * Fit a league hyperprior and, for each group, a position prior whose mean
 * is the group pooled rate shrunk toward the league (conjugate weight
 * β_L / (β_L + G_g/φ)) and whose variance is within-group talent variance
 * when measurable, else the league talent variance.
 *
 * Classic EB: the target player is included in the group/league fit (the
 * bias is O(1/n) and is the same convention as {@link fitGroupPrior}).
 * {@link fitNestedPriorsLeaveOneOut} is the small-group alternative.
 */
export function fitNestedPriors(players: readonly GroupedRateSample[]): NestedFit {
  if (players.length === 0) {
    return { league: null, groups: {}, decomposition: null };
  }
  for (const p of players) {
    assertSample(p, "fitNestedPriors");
    assertGroupId(p.groupId, "fitNestedPriors");
  }

  const decomposition = fitVarianceDecomposition(players);
  const league = fitGroupPriorCalibrated(players);
  const phi = decomposition?.extraPoissonFactor ?? 1;
  const leagueMean = league ? league.alpha / league.beta : pooledMean(players);
  const leagueTalentVar = decomposition?.talentVar ?? 0;
  const leagueBeta = league?.beta ?? 0;

  const byGroup = new Map<string, GroupedRateSample[]>();
  for (const p of players) {
    const bucket = byGroup.get(p.groupId);
    if (bucket) bucket.push(p);
    else byGroup.set(p.groupId, [p]);
  }

  const groups: Record<string, NestedGroupPrior> = {};
  for (const [groupId, members] of byGroup) {
    let games = 0;
    let total = 0;
    for (const p of members) {
      games += p.games;
      total += p.total;
    }
    const rawMean = total / games;
    const effectiveGames = games / phi;
    const B =
      league && leagueBeta > 0 ? leagueBeta / (leagueBeta + effectiveGames) : 0;
    const shrunkMean = B * leagueMean + (1 - B) * rawMean;
    const v = groupVariance(members, leagueTalentVar);
    const prior = gammaFromMoments(shrunkMean, v) ?? league;
    let source: NestedGroupPrior["source"];
    if (!league) source = "group";
    else if (B >= 1 - 1e-12) source = "league";
    else if (B <= 1e-12) source = "group";
    else source = "shrunk";

    groups[groupId] = {
      groupId,
      prior,
      playerCount: members.length,
      games,
      total,
      rawMean,
      shrunkMean,
      shrinkWeightTowardLeague: B,
      source,
    };
  }

  return { league, groups, decomposition };
}

/** League/group fit that excludes `holdOutIndex` — use for n_group ≲ 10. */
export function fitNestedPriorsLeaveOneOut(
  players: readonly GroupedRateSample[],
  holdOutIndex: number,
): NestedFit {
  if (!Number.isInteger(holdOutIndex) || holdOutIndex < 0 || holdOutIndex >= players.length) {
    throw new RangeError(
      `fitNestedPriorsLeaveOneOut: holdOutIndex must be an in-range integer (got ${holdOutIndex}, n=${players.length})`,
    );
  }
  return fitNestedPriors(players.filter((_, i) => i !== holdOutIndex));
}

export function priorForGroup(fit: NestedFit, groupId: string): GammaPrior | null {
  const g = fit.groups[groupId];
  return g?.prior ?? fit.league;
}

export function scoreNestedPlayer(fit: NestedFit, player: GroupedRateSample): GammaPosterior | null {
  assertObservation(player.total, player.games, "scoreNestedPlayer");
  assertGroupId(player.groupId, "scoreNestedPlayer");
  const prior = priorForGroup(fit, player.groupId);
  if (!prior) return null;
  const phi = fit.decomposition?.extraPoissonFactor ?? 1;
  return posteriorRateCalibrated(prior, player.total, player.games, phi);
}

export function shrinkageReportNested(
  fit: NestedFit,
  players: readonly GroupedRateSample[],
): NestedShrinkageRow[] {
  const phi = fit.decomposition?.extraPoissonFactor ?? 1;
  return players.map((p) => {
    const group = fit.groups[p.groupId];
    const prior = priorForGroup(fit, p.groupId);
    if (!prior) {
      return {
        id: p.id,
        groupId: p.groupId,
        games: p.games,
        total: p.total,
        rawRate: p.games > 0 ? p.total / p.games : 0,
        posteriorMean: p.games > 0 ? p.total / p.games : 0,
        shrinkWeight: 0,
        groupShrinkWeightTowardLeague: group?.shrinkWeightTowardLeague ?? 1,
        extraPoissonFactor: phi,
      };
    }
    const post = posteriorRateCalibrated(prior, p.total, p.games, phi);
    // shrinkWeight on the GROUP prior, after extra-Poisson rescale of games.
    const gamesEff = p.games > 0 ? scaleObservation(p.total, p.games, phi).games : 0;
    const shrinkWeight = prior.beta / (prior.beta + gamesEff);
    return {
      id: p.id,
      groupId: p.groupId,
      games: p.games,
      total: p.total,
      rawRate: p.games > 0 ? p.total / p.games : 0,
      posteriorMean: post.mean,
      shrinkWeight,
      groupShrinkWeightTowardLeague: group?.shrinkWeightTowardLeague ?? 1,
      extraPoissonFactor: phi,
    };
  });
}

/**
 * Fit one nested model per stat key. Callers recompose components themselves
 * (different stats, different SNR — do not shrink a lumped fantasy-point rate).
 */
export function fitNestedByStat(
  rows: readonly (GroupedRateSample & { readonly stat: string })[],
): Readonly<Record<string, NestedFit>> {
  const byStat = new Map<string, GroupedRateSample[]>();
  for (const row of rows) {
    if (typeof row.stat !== "string" || row.stat.length === 0) {
      throw new RangeError("fitNestedByStat: stat must be a non-empty string");
    }
    const sample: GroupedRateSample = {
      id: row.id,
      games: row.games,
      total: row.total,
      groupId: row.groupId,
    };
    const bucket = byStat.get(row.stat);
    if (bucket) bucket.push(sample);
    else byStat.set(row.stat, [sample]);
  }
  const out: Record<string, NestedFit> = {};
  for (const [stat, members] of byStat) {
    out[stat] = fitNestedPriors(members);
  }
  return out;
}
