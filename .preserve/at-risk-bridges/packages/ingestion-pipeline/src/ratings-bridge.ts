/**
 * Ratings bridge — wires the `ratings/` and `team-ratings/` research families
 * into a live, fail-closed evaluation surface.
 *
 * These are research kernels (several carry `export const ENABLED = false`
 * behind an unevaluated acceptance gate). This bridge changes no prediction.
 * It validates inputs, calls the REAL kernel in a try/catch, and then
 * RE-VALIDATES the output for finiteness and legal range before publishing.
 *
 * Ratings-domain rules this file enforces, because they are the point:
 *
 *  1. FINITENESS. A rating must be finite and must not be NaN/Inf. MLE and
 *     iterative solvers diverge on a disconnected or one-sided schedule graph,
 *     so connectivity is checked BEFORE the solver runs and every output
 *     number is re-checked after it returns. The last iterate is never
 *     returned on failure.
 *  2. MINIMUM SAMPLE. A rating fitted on 1 game is not a rating. Every fit eval
 *     requires an explicit `minGames` and fails closed below it, naming the
 *     count it saw.
 *  3. SYMMETRY. For a zero-sum rating update home and away must be treated
 *     symmetrically. Zero-sum fits (Bradley-Terry, paired-comparison LS) are
 *     gated on a computed mirror residual. The prestige-flow network update is
 *     NOT a zero-sum operator, so its residual is REPORTED, never assumed.
 *  4. CONVERGENCE IS VISIBLE. A null fit, an existence-condition violation, a
 *     bandwidth LOOCV table or a credible interval is surfaced. A caller can
 *     see that a fit did not converge.
 *  5. NO SILENT CLAMPING. Where a kernel clamps an out-of-range value to a
 *     valid-looking number, the bridge detects the clamp and fails closed
 *     rather than publishing the clamp.
 *  6. NO IMPUTATION. Nothing is invented, filled, defaulted into range, or
 *     replaced by a plausible-looking rating. A failure is a failure, with a
 *     specific reason.
 *
 * Deep imports only (`.../src/ratings/<file>.js`), so this file does not depend
 * on the engine barrel, which is owned by another agent and is currently RED.
 */

import {
  fitBradleyTerry,
  btWinProb,
  mad,
  strengthCovariate,
  type BtGame,
  type BtFit,
} from "@sports/prediction-engine/src/ratings/bradley-terry.js";
import {
  csf,
  compareCsf,
  type CsfForm,
  type TeamSeason,
} from "@sports/prediction-engine/src/ratings/csf-triple-compare.js";
import {
  dominanceGraph,
  countThreeCycles,
  cycleRate,
  longCycles,
  type HeadToHead,
} from "@sports/prediction-engine/src/ratings/cycle-diagnostics.js";
import {
  tieNu,
  davidsonProbsStrengthDep,
  davidsonLogLoss,
  type DavidsonProbs,
} from "@sports/prediction-engine/src/ratings/davidson-ties.js";
import {
  existenceViolations,
  kernelWeights,
  fitDynamicBT,
  tuneBandwidthLOOCV,
  type BTGame,
} from "@sports/prediction-engine/src/ratings/dynamic-bradley-terry.js";
import {
  marginWeight,
  updateDynamicRating,
  dynamicPageRank,
  ratingToWinProb,
  type GameResult as NetworkGameResult,
} from "@sports/prediction-engine/src/ratings/dynamic-network-rating.js";
import {
  shrinkRatings,
  shrinkRatingsMatrix,
  shrinkageUncertainty,
  type ShrinkageResult,
} from "@sports/prediction-engine/src/ratings/eb-shrinkage.js";
import {
  hfaBiasAudit,
  simulateNonrandomSchedule,
  type HFAGame,
} from "@sports/prediction-engine/src/ratings/hfa-bias-audit.js";
import {
  gameVariance,
  fitLeastSquares,
  fitWeightedLeastSquares,
  fitL1Ratings,
  predictSpread,
  spreadMae,
  rankingViolationRate,
  type GameResult as LsGameResult,
  type LsFit,
} from "@sports/prediction-engine/src/ratings/least-squares-ratings.js";
import {
  fitMatchupRatings,
  predictMatchup,
  timeOrderedMae,
  type MatchupObs,
  type SgdOptions,
} from "@sports/prediction-engine/src/ratings/matchup-ratings.js";
import {
  edgeWeight,
  parametricPagerank,
  winProbFromRatings,
  clvEdge,
  type RatedGame,
  type EdgeWeights,
} from "@sports/prediction-engine/src/ratings/parametric-pagerank.js";
import {
  aggregateTeamVector,
  trainTeamModel,
  playerGameRating,
  formRating,
  detectRoles,
  auc,
  type PlayerGame,
  type TeamGame,
} from "@sports/prediction-engine/src/ratings/playerank.js";
import {
  tullock,
  differenceForm,
  fitAlpha,
  winRmse,
  fitGameEwp,
  gameEwp,
  type TeamSeason as PythagTeamSeason,
  type GameRow,
} from "@sports/prediction-engine/src/ratings/pythagorean-duel.js";
import {
  asOfDate,
  estimateStrengths,
  selFeatures,
  auditProvenance,
  brierScore as selBrierScore,
  type GameResult as SelGameResult,
  type FeatureProvenance,
  type TeamStrengths,
} from "@sports/prediction-engine/src/ratings/sel-strengths.js";
import {
  buildTransition,
  pagerankCentrality,
  centralityResiduals,
  teamCentralityDifferential,
  type PlayArc,
} from "@sports/prediction-engine/src/ratings/target-pagerank.js";
import {
  fitTVC,
  predictTVC,
  effectiveWeight,
  meanLogLoss,
  fitStatic,
  type TVCGame,
  type TVCModel,
} from "@sports/prediction-engine/src/ratings/time-varying-weights.js";
import {
  fitImpactScores,
  predictWpDelta,
  impactScoreIntervals,
  mahalanobisSimilarity,
  yearToYearCorrelation,
  type DriveObs,
} from "@sports/prediction-engine/src/ratings/unit-impact.js";

import {
  ENABLED as SCORING_RW_ENABLED,
  estimateAntipersistence,
  fitRestoringForce,
  nextScoreProbA,
  simulateRestOfGame,
  type Scorer,
  type LiveParams,
} from "@sports/prediction-engine/src/team-ratings/1109-2825v2-scoring-random-walk.js";
import {
  ENABLED as COLLEGE_SENS_ENABLED,
  predictionInterval,
  intervalOverlap,
  flagTies,
  sosDial,
  rankRanges,
  flagNonRobust,
  type TeamRating as CollegeTeamRating,
} from "@sports/prediction-engine/src/team-ratings/1403-7642-college-ranking-sensitivity.js";
import {
  ENABLED as PLAYER_KERNEL_ENABLED,
  playerKernel,
  gpPredict,
  type PersonnelGame,
} from "@sports/prediction-engine/src/team-ratings/1609-01176v1-player-kernel-gp.js";
import {
  ENABLED as G_ELO_ENABLED,
  brierScore as gEloBrierScore,
  logLoss as gEloLogLoss,
  rankedProbScore,
  eceProbs,
  pairedT,
  normalCdfLocal,
  spearman as gEloSpearman,
  fbeta,
  classWeightedBCE,
} from "@sports/prediction-engine/src/team-ratings/2010-11187-g-elo-margin-model.js";
import {
  ENABLED as SPARSE_TVP_ENABLED,
  istaLasso,
  tvDenoise1d,
  ar1Update,
  ar1Forecast,
  ouForecast,
  ouWinProb,
  brownianWinProb,
  type AR1State,
} from "@sports/prediction-engine/src/team-ratings/2207-12147v1-sparse-tvp-team-ratings.js";
import {
  pairedComparisonLS,
  pairwiseZTest,
  type GameScore,
} from "@sports/prediction-engine/src/team-ratings/ls-ratings.js";
import {
  qIndex,
  parityRegime,
  rollingQIndex,
  type ParityRegime,
} from "@sports/prediction-engine/src/team-ratings/q-index-parity.js";
import {
  upsetParityPrior,
  shrinkToParity,
  expectedUpsets,
} from "@sports/prediction-engine/src/team-ratings/upset-parity-prior.js";
import {
  strengthAdjustedWins,
  rawWinPct,
  winStrengthGap,
  type GameForStrength,
} from "@sports/prediction-engine/src/team-ratings/win-strength-diagnostic.js";

export type RatingsEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): RatingsEval<never> {
  return { ok: false, reason };
}

// ── shared validators ───────────────────────────────────────────────────────

function allFinite(xs: readonly number[]): boolean {
  return xs.every((v) => Number.isFinite(v));
}

function allFiniteMap(m: Readonly<Record<string, number>>): boolean {
  return Object.values(m).every((v) => Number.isFinite(v));
}

/**
 * The minimum-sample gate. A rating fitted on 1 game is not a rating, so every
 * fit eval states its floor and fails closed below it, naming the count.
 */
function belowMin(observed: number, minGames: number, label: string): string | null {
  if (!Number.isFinite(minGames) || minGames < 1) {
    return `minGames must be a finite number >= 1 (got ${minGames})`;
  }
  return observed < minGames
    ? `${label}: need >= ${minGames} observations, got ${observed} — not fitted on a sample this small`
    : null;
}

/**
 * Schedule-graph connectivity. MLE/iterative rating solvers have no finite
 * solution on a disconnected comparison graph: each component is identified
 * only up to its own additive constant, so a mean-normalization pins an
 * arbitrary offset between components. This is the most common cause of
 * divergence, so it is checked BEFORE the solver runs.
 */
function connectivityReason(
  games: readonly { readonly home: string; readonly away: string }[],
): string | null {
  const nodes = new Set<string>();
  for (const g of games) {
    if (!g.home || !g.away) return "every game needs non-empty home and away team ids";
    nodes.add(g.home);
    nodes.add(g.away);
  }
  if (nodes.size < 2) {
    return `schedule graph needs >= 2 teams, got ${nodes.size} — a self-play slate carries no comparison information`;
  }
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) as string;
    let c = x;
    while (parent.get(c) !== c) {
      const n = parent.get(c) as string;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  for (const n of nodes) parent.set(n, n);
  for (const g of games) {
    const ra = find(g.home);
    const rb = find(g.away);
    if (ra !== rb) parent.set(ra, rb);
  }
  const roots = new Set([...nodes].map(find));
  if (roots.size > 1) {
    return `schedule graph is disconnected into ${roots.size} components — a rating is only identified within a component, so one slate fit is not a rating`;
  }
  return null;
}

/** Reject a rating map whose values are not all finite. */
function ratingMapReason(
  m: Readonly<Record<string, number>>,
  what: string,
): string | null {
  const keys = Object.keys(m);
  if (keys.length === 0) return `${what}: solver returned no ratings`;
  for (const k of keys) {
    const v = m[k];
    if (v === undefined || !Number.isFinite(v)) {
      return `${what}: rating for "${k}" is ${String(v)} — a non-finite rating is not a rating, and the last iterate is not returned`;
    }
  }
  return null;
}

function probReason(p: number, what: string): string | null {
  if (!Number.isFinite(p)) return `${what} is ${String(p)} — not finite`;
  if (p < 0 || p > 1) return `${what} = ${p} is outside [0,1]`;
  return null;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ── gate status (unevaluated acceptance gates are visible, never hidden) ───

export interface RatingsGateStatus {
  readonly module: string;
  /** The module's own `ENABLED` constant, read through the deep path. */
  readonly enabled: boolean;
  readonly note: string;
}

/**
 * Five team-ratings modules ship `export const ENABLED = false` behind an
 * acceptance gate that has never been evaluated (each needs historical
 * walk-forward data this repo does not carry). A barrel can bind only one
 * `ENABLED`, so the bridge publishes gate status per module instead of
 * re-exporting the constant. Nothing here is wired into a prediction.
 */
export const RATINGS_GATE_STATUS: readonly RatingsGateStatus[] = [
  {
    module: "team-ratings/1109-2825v2-scoring-random-walk",
    enabled: SCORING_RW_ENABLED,
    note: "Gate NOT EVALUATED: needs nflverse play-by-play (restoring coefficient b != 0 at p < 0.01).",
  },
  {
    module: "team-ratings/1403-7642-college-ranking-sensitivity",
    enabled: COLLEGE_SENS_ENABLED,
    note: "Gate NOT EVALUATED: needs the 2011 ranking replication (Tests A/B/C).",
  },
  {
    module: "team-ratings/1609-01176v1-player-kernel-gp",
    enabled: PLAYER_KERNEL_ENABLED,
    note: "Gate NOT EVALUATED: needs 2023/2024 cold-start + backup-QB log-loss tests.",
  },
  {
    module: "team-ratings/2010-11187-g-elo-margin-model",
    enabled: G_ELO_ENABLED,
    note: "Gate NOT EVALUATED: needs the NFL 2019-2023 walk-forward G-Elo backtest.",
  },
  {
    module: "team-ratings/2207-12147v1-sparse-tvp-team-ratings",
    enabled: SPARSE_TVP_ENABLED,
    note: "Gate NOT EVALUATED: needs 2022-2024 rolling RMSE vs Elo plus the dynamic-coefficient share.",
  },
];

// ── 1. Bradley-Terry (Hunter MM) with home multiplier ──────────────────────

export interface BradleyTerryResult {
  readonly teams: readonly string[];
  readonly strengths: Readonly<Record<string, number>>;
  readonly homeEdge: number;
  /** Strongest / weakest fitted strength ratio. */
  readonly spread: number;
  /** max |log psi(t) - log psi_mirror(t)| with the home multiplier removed. */
  readonly mirrorResidual: number;
  /** Win probability of the strongest team over the weakest, as fitted. */
  readonly topVsBottomWinProb: number;
}

/**
 * Fit Bradley-Terry strengths by monotone MM iteration on a CONNECTED schedule
 * graph, then mirror the slate (swap home/away, flip the outcome) and refit with
 * the home multiplier removed. A zero-sum rating update must be symmetric under
 * that mirror; the residual is computed and gated, not assumed.
 */
export function evalBradleyTerry(input: {
  readonly games: readonly BtGame[];
  readonly homeEdge?: number;
  readonly iters?: number;
  readonly minGames: number;
  readonly mirrorTolerance?: number;
}): RatingsEval<BradleyTerryResult> {
  const { games, homeEdge, iters, minGames, mirrorTolerance } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "bradley-terry fit");
  if (floor) return fail(floor);
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || (g.homeWin !== 0 && g.homeWin !== 1)) {
      return fail(`games[${i}].homeWin must be 0 or 1 — not imputed`);
    }
  }
  const conn = connectivityReason(games);
  if (conn) return fail(`bradley-terry fit: ${conn}`);
  if (homeEdge !== undefined && (!Number.isFinite(homeEdge) || homeEdge <= 0)) {
    return fail("homeEdge must be finite and > 0 when supplied");
  }
  try {
    const fit: BtFit = fitBradleyTerry(
      games.map((g) => ({ home: g.home, away: g.away, homeWin: g.homeWin })),
      homeEdge ?? 1.15,
      iters ?? 500,
    );
    const bad = ratingMapReason(fit.strengths, "bradley-terry strengths");
    if (bad) return fail(bad);
    const values = Object.values(fit.strengths);
    if (values.some((v) => v <= 0)) {
      return fail(
        "bradley-terry strengths must be strictly positive; a non-positive strength has no finite win probability",
      );
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (Math.abs(mean - 1) > 1e-6) {
      return fail(`bradley-terry strengths are not mean-normalized to 1 (mean ${mean})`);
    }
    if (!Number.isFinite(fit.homeEdge) || fit.homeEdge <= 0) {
      return fail("bradley-terry homeEdge came back non-finite or non-positive");
    }

    // Symmetry residual: mirror the slate and refit with no home multiplier.
    const mirrored: BtGame[] = games.map((g) => ({
      home: g.away,
      away: g.home,
      homeWin: g.homeWin === 1 ? 0 : 1,
    }));
    const mirrorFit = fitBradleyTerry(mirrored, 1, iters ?? 500);
    let mirrorResidual = 0;
    for (const t of Object.keys(fit.strengths)) {
      const a = fit.strengths[t] as number;
      const b = mirrorFit.strengths[t] as number;
      if (!(a > 0) || !(b > 0)) {
        return fail("bradley-terry mirror refit produced a non-positive strength");
      }
      mirrorResidual = Math.max(mirrorResidual, Math.abs(Math.log(a) - Math.log(b)));
    }
    const tol = mirrorTolerance ?? 1e-6;
    if (mirrorResidual > tol) {
      return fail(
        `bradley-terry zero-sum update is not home/away symmetric: mirror residual ${mirrorResidual} exceeds ${tol}`,
      );
    }

    const ranked = [...Object.keys(fit.strengths)].sort(
      (x, y) => (fit.strengths[y] as number) - (fit.strengths[x] as number),
    );
    const best = ranked[0] as string;
    const worst = ranked[ranked.length - 1] as string;
    const wp = btWinProb(fit, best, worst);
    const wpBad = probReason(wp, "bradley-terry topVsBottom win probability");
    if (wpBad) return fail(wpBad);
    if (best !== worst && !(wp > 0.5 && wp < 1)) {
      return fail(
        `bradley-terry ranks "${best}" above "${worst}" but gives only ${wp} — the ranking and the win probability disagree`,
      );
    }

    return {
      ok: true,
      data: {
        teams: ranked,
        strengths: fit.strengths,
        homeEdge: fit.homeEdge,
        spread: (fit.strengths[best] as number) / (fit.strengths[worst] as number),
        mirrorResidual,
        topVsBottomWinProb: wp,
      },
    };
  } catch (e) {
    return fail(`bradley-terry fit threw: ${errText(e)}`);
  }
}

/** MAD-normalized strength covariate (omega) for a slate of matchups. */
export function evalStrengthCovariate(input: {
  readonly fit: BtFit;
  readonly matchups: ReadonlyArray<readonly [string, string]>;
  readonly minMatchups: number;
}): RatingsEval<{ readonly omega: readonly number[]; readonly maxAbs: number }> {
  const { fit, matchups, minMatchups } = input;
  if (!fit || typeof fit !== "object") return fail("fit must be a Bradley-Terry fit object");
  const bad = ratingMapReason(fit.strengths, "strength-covariate fit.strengths");
  if (bad) return fail(bad);
  if (!Array.isArray(matchups)) return fail("matchups must be an array of [home, away] pairs");
  const floor = belowMin(matchups.length, minMatchups, "strength covariate");
  if (floor) return fail(floor);
  for (let i = 0; i < matchups.length; i++) {
    const m = matchups[i];
    if (!m || m.length !== 2 || !m[0] || !m[1]) {
      return fail(`matchups[${i}] must be a [home, away] pair of non-empty team ids`);
    }
    if (!(fit.strengths[m[0]] !== undefined) || !(fit.strengths[m[1]] !== undefined)) {
      return fail(`matchups[${i}] names a team the fit never saw — no strength is imputed for it`);
    }
  }
  try {
    const omega = strengthCovariate(
      fit,
      matchups.map((m) => [m[0] as string, m[1] as string] as readonly [string, string]),
    );
    if (!allFinite(omega)) {
      return fail("strength covariate produced a non-finite omega — no normalization is invented for it");
    }
    return { ok: true, data: { omega, maxAbs: Math.max(...omega.map(Math.abs)) } };
  } catch (e) {
    return fail(`strength covariate threw: ${errText(e)}`);
  }
}

/** Raw MAD of a sample (the omega normalizer), with an explicit floor. */
export function evalMad(input: {
  readonly xs: readonly number[];
  readonly minValues: number;
}): RatingsEval<{ readonly mad: number }> {
  const { xs, minValues } = input;
  if (!Array.isArray(xs)) return fail("xs must be an array");
  const floor = belowMin(xs.length, minValues, "MAD");
  if (floor) return fail(floor);
  if (!allFinite(xs)) return fail("xs must be finite");
  try {
    const m = mad([...xs]);
    if (!Number.isFinite(m) || m < 0) {
      return fail(`MAD returned ${String(m)} — a non-finite or negative dispersion is not a normalizer`);
    }
    return { ok: true, data: { mad: m } };
  } catch (e) {
    return fail(`mad threw: ${errText(e)}`);
  }
}

// ── 2. CSF triple compare (Tullock vs difference vs serial) ─────────────────

export interface CsfCompareResult {
  readonly rmse: Readonly<Record<CsfForm, number>>;
  readonly alpha: Readonly<Record<CsfForm, number>>;
  readonly winner: CsfForm;
  readonly serialVsTullock: { readonly diffWins: number; readonly pValue: number };
  /** The module's stated gate: serial beats Tullock by >= 0.2 wins at p<0.05. */
  readonly passesGate: boolean;
  readonly seasons: number;
}

/**
 * Fit all three contest-success forms by golden-section OLS on alpha and
 * compare LOOCV win-RMSE. LOOCV needs >= 3 seasons; the bridge also enforces a
 * caller-declared minimum so a 2-row fit is never reported as a comparison.
 */
export function evalCsfCompare(input: {
  readonly seasons: readonly TeamSeason[];
  readonly minSeasons: number;
}): RatingsEval<CsfCompareResult> {
  const { seasons, minSeasons } = input;
  if (!Array.isArray(seasons)) return fail("seasons must be an array");
  const floor = belowMin(seasons.length, minSeasons, "CSF comparison");
  if (floor) return fail(floor);
  if (seasons.length < 3) {
    return fail(`CSF LOOCV needs >= 3 seasons, got ${seasons.length} — each held-out fold re-fits alpha`);
  }
  for (let i = 0; i < seasons.length; i++) {
    const s = seasons[i];
    if (!s || !Number.isFinite(s.pf) || !Number.isFinite(s.pa) || s.pf <= 0 || s.pa <= 0) {
      return fail(`seasons[${i}] needs finite pf/pa > 0 — a zero or negative point total has no CSF value and is not imputed`);
    }
    if (!Number.isInteger(s.games) || s.games < 1) {
      return fail(`seasons[${i}].games must be a positive integer`);
    }
    if (!Number.isFinite(s.wins) || s.wins < 0 || s.wins > s.games) {
      return fail(`seasons[${i}].wins must be finite in [0, games] — a win share outside [0,1] is not a season`);
    }
  }
  try {
    const cmp = compareCsf(
      seasons.map((s) => ({ pf: s.pf, pa: s.pa, wins: s.wins, games: s.games })),
    );
    const forms: CsfForm[] = ["tullock", "difference", "serial"];
    for (const f of forms) {
      const r = cmp.rmse[f];
      if (r === undefined || !Number.isFinite(r) || r < 0) {
        return fail(`CSF form "${f}" returned a non-finite or negative LOOCV RMSE`);
      }
      const a = cmp.alpha[f];
      if (a === undefined || !Number.isFinite(a) || a <= 0) {
        return fail(`CSF form "${f}" returned a non-finite or non-positive alpha`);
      }
    }
    if (!allFinite([cmp.serialVsTullock.diffWins, cmp.serialVsTullock.pValue])) {
      return fail("CSF serial-vs-tullock comparison returned a non-finite statistic");
    }
    const pBad = probReason(cmp.serialVsTullock.pValue, "CSF serial-vs-tullock p-value");
    if (pBad) return fail(pBad);
    const passesGate = cmp.serialVsTullock.diffWins >= 0.2 && cmp.serialVsTullock.pValue < 0.05;
    return {
      ok: true,
      data: {
        rmse: cmp.rmse,
        alpha: cmp.alpha,
        winner: cmp.winner,
        serialVsTullock: {
          diffWins: cmp.serialVsTullock.diffWins,
          pValue: cmp.serialVsTullock.pValue,
        },
        passesGate,
        seasons: seasons.length,
      },
    };
  } catch (e) {
    return fail(`CSF compare threw: ${errText(e)}`);
  }
}

/** Expected win share under one CSF form, re-validated against [0,1]. */
export function evalCsf(input: {
  readonly pf: number;
  readonly pa: number;
  readonly alpha: number;
  readonly form: CsfForm;
}): RatingsEval<{ readonly winShare: number }> {
  const { pf, pa, alpha, form } = input;
  if (form !== "tullock" && form !== "difference" && form !== "serial") {
    return fail(`unknown CSF form "${String(form)}" — not defaulted to one of the three`);
  }
  if (!Number.isFinite(pf) || !Number.isFinite(pa) || pf <= 0 || pa <= 0) {
    return fail("pf and pa must be finite and > 0");
  }
  if (!Number.isFinite(alpha) || alpha <= 0) return fail("alpha must be finite and > 0");
  try {
    const p = csf(pf, pa, alpha, form);
    const bad = probReason(p, `csf(${form}) win share`);
    if (bad) return fail(bad);
    return { ok: true, data: { winShare: p } };
  } catch (e) {
    return fail(`csf threw: ${errText(e)}`);
  }
}

// ── 3. Intransitivity (cycle) diagnostics ───────────────────────────────────

export interface CycleDiagnostics {
  readonly teams: number;
  readonly threeCycles: number;
  readonly cycleRate: number;
  readonly longCycles: readonly (readonly string[])[];
  /** minGames floor actually applied to the dominance edges. */
  readonly minGames: number;
  readonly edges: number;
}

/**
 * Build the head-to-head dominance graph and count directed 3-cycles. A high
 * cycle rate is the lack-of-fit flag for every transitive rating model
 * (Bradley-Terry, Elo), so it is published rather than smoothed away.
 */
export function evalCycleDiagnostics(input: {
  readonly records: readonly HeadToHead[];
  readonly minGames?: number;
  readonly maxLongCycleLen?: number;
  readonly minRecords: number;
}): RatingsEval<CycleDiagnostics> {
  const { records, minGames, maxLongCycleLen, minRecords } = input;
  if (!Array.isArray(records)) return fail("records must be an array");
  const floor = belowMin(records.length, minRecords, "cycle diagnostics");
  if (floor) return fail(floor);
  const mg = minGames ?? 1;
  if (!Number.isInteger(mg) || mg < 1) return fail("minGames must be an integer >= 1");
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r || !r.a || !r.b || r.a === r.b) {
      return fail(`records[${i}] needs distinct non-empty team ids a and b`);
    }
    if (!Number.isInteger(r.winsA) || !Number.isInteger(r.winsB) || r.winsA < 0 || r.winsB < 0) {
      return fail(`records[${i}] winsA/winsB must be non-negative integers — a fractional head-to-head win count is not imputed`);
    }
  }
  try {
    const adj = dominanceGraph(
      records.map((r) => ({ a: r.a, b: r.b, winsA: r.winsA, winsB: r.winsB })),
      mg,
    );
    const teams = adj.size;
    if (teams < 3) {
      return fail(
        `cycle rate needs >= 3 teams, got ${teams} — a two-team graph cannot be intransitive, so a 0 rate would be vacuous`,
      );
    }
    const threeCycles = countThreeCycles(adj);
    const rate = cycleRate(adj);
    const triples = (teams * (teams - 1) * (teams - 2)) / 6;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      return fail(`cycle rate ${String(rate)} is outside [0,1] and cannot be published as intransitivity`);
    }
    if (triples > 0 && threeCycles > triples) {
      return fail(
        `counted ${threeCycles} directed 3-cycles among ${triples} team triples — more cycles than triples is a combinatorics bug, not a finding`,
      );
    }
    const maxLen = maxLongCycleLen ?? 5;
    if (!Number.isInteger(maxLen) || maxLen < 4) {
      return fail("maxLongCycleLen must be an integer >= 4");
    }
    const longs = longCycles(adj, maxLen);
    let edges = 0;
    for (const set of adj.values()) edges += set.size;
    return {
      ok: true,
      data: {
        teams,
        threeCycles,
        cycleRate: rate,
        longCycles: longs.map((c) => [...c]),
        minGames: mg,
        edges,
      },
    };
  } catch (e) {
    return fail(`cycle diagnostics threw: ${errText(e)}`);
  }
}

// ── 4. Davidson ties (3-way) ───────────────────────────────────────────────

export interface DavidsonResult {
  readonly probs: DavidsonProbs;
  /** homeWin + tie + awayWin - 1. A 3-way model must close to 1. */
  readonly sumResidual: number;
  readonly nu: number;
  readonly sBar: number;
  readonly logLoss: number;
}

/**
 * Davidson 3-way probabilities with a strength-dependent tie parameter. The
 * three probabilities must sum to 1; the residual is computed and gated, and
 * nothing is renormalized to hide a failure.
 */
export function evalDavidson(input: {
  readonly logPiHome: number;
  readonly logPiAway: number;
  readonly beta0: number;
  readonly beta1: number;
  readonly homeEdge?: number;
  readonly sumTolerance?: number;
  readonly outOf: "H" | "T" | "A";
}): RatingsEval<DavidsonResult> {
  const { logPiHome, logPiAway, beta0, beta1, homeEdge, sumTolerance, outOf } = input;
  const nums: ReadonlyArray<readonly [string, number]> = [
    ["logPiHome", logPiHome],
    ["logPiAway", logPiAway],
    ["beta0", beta0],
    ["beta1", beta1],
  ];
  for (const [k, v] of nums) {
    if (!Number.isFinite(v)) return fail(`${k} must be finite — an infinite log-strength has no probability`);
  }
  if (homeEdge !== undefined && (!Number.isFinite(homeEdge) || homeEdge <= 0)) {
    return fail("homeEdge must be finite and > 0 when supplied");
  }
  if (outOf !== "H" && outOf !== "T" && outOf !== "A") {
    return fail(`outOf must be "H", "T" or "A" — not defaulted`);
  }
  try {
    const sBar = (logPiHome + logPiAway) / 2;
    const nu = tieNu(sBar, beta0, beta1);
    if (!Number.isFinite(nu) || nu < 0) {
      return fail(`tieNu returned ${String(nu)} — a non-finite or negative tie parameter is not a tie parameter`);
    }
    const probs = davidsonProbsStrengthDep(logPiHome, logPiAway, beta0, beta1, homeEdge ?? 1);
    const triple: ReadonlyArray<readonly [string, number]> = [
      ["homeWin", probs.homeWin],
      ["tie", probs.tie],
      ["awayWin", probs.awayWin],
    ];
    for (const [k, v] of triple) {
      const bad = probReason(v, `davidson ${k}`);
      if (bad) return fail(bad);
    }
    const sumResidual = probs.homeWin + probs.tie + probs.awayWin - 1;
    const tol = sumTolerance ?? 1e-9;
    if (Math.abs(sumResidual) > tol) {
      return fail(
        `davidson 3-way probabilities do not close to 1 (residual ${sumResidual} exceeds ${tol}) — they are not renormalized into a valid-looking split`,
      );
    }
    const ll = davidsonLogLoss(probs, outOf);
    if (!Number.isFinite(ll) || ll < 0) return fail(`davidson log-loss is ${String(ll)}`);
    return { ok: true, data: { probs, sumResidual, nu, sBar, logLoss: ll } };
  } catch (e) {
    return fail(`davidson threw: ${errText(e)}`);
  }
}

// ── 5. Dynamic (kernel-smoothed) Bradley-Terry ──────────────────────────────

export interface DynamicBtResult {
  readonly week: number;
  readonly bandwidth: number;
  readonly ratings: Readonly<Record<string, number>>;
  /** Sum of kernel weights — the effective sample behind this week's fit. */
  readonly effN: number;
  /** Teams the existence condition rejected at this bandwidth, [] when none. */
  readonly existenceViolations: readonly string[];
  /** Per-bandwidth LOOCV log-likelihood; failures appear as absences. */
  readonly bandwidthScores: ReadonlyArray<{ readonly h: number; readonly loo: number }>;
  readonly tunedBandwidth: number;
  readonly tunedLoo: number;
}

/**
 * Fit kernel-smoothed dynamic Bradley-Terry at one week, then tune the
 * bandwidth by LOOCV. The module's existence condition (every team needs one
 * weighted win AND one weighted loss) is surfaced as a list, not swallowed: a
 * null fit is a convergence failure and the caller can see exactly why.
 */
export function evalDynamicBradleyTerry(input: {
  readonly games: readonly BTGame[];
  readonly week: number;
  readonly bandwidth: number;
  readonly candidates?: readonly number[];
  readonly minGames: number;
  readonly minEffN?: number;
}): RatingsEval<DynamicBtResult> {
  const { games, week, bandwidth, candidates, minGames, minEffN } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "dynamic BT fit");
  if (floor) return fail(floor);
  if (!Number.isFinite(week)) return fail("week must be finite");
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) {
    return fail("bandwidth must be finite and > 0 — a zero bandwidth collapses the kernel to a point mass");
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || typeof g.homeWin !== "boolean" || !Number.isFinite(g.week)) {
      return fail(`games[${i}] needs a boolean homeWin and a finite week — not imputed`);
    }
  }
  const conn = connectivityReason(games);
  if (conn) return fail(`dynamic BT fit: ${conn}`);
  try {
    const payload = games.map((g) => ({ week: g.week, home: g.home, away: g.away, homeWin: g.homeWin }));
    const weights = kernelWeights(payload, week, bandwidth);
    if (!allFinite(weights) || weights.some((w) => w < 0)) {
      return fail("kernel weights came back non-finite or negative");
    }
    const violations = existenceViolations(payload, weights);
    const fit = fitDynamicBT(payload, week, bandwidth);
    if (!fit) {
      return fail(
        `dynamic BT did not converge at week ${week}, bandwidth ${bandwidth}: existence condition violated by [${violations.join(", ")}] — a team with only wins or only losses has no finite MLE, and the last iterate is not returned`,
      );
    }
    const bad = ratingMapReason(fit.ratings, "dynamic BT ratings");
    if (bad) return fail(bad);
    const sum = Object.values(fit.ratings).reduce((a, b) => a + b, 0);
    if (Math.abs(sum) > 1e-6) {
      return fail(
        `dynamic BT ratings are not sum-to-zero identified (sum ${sum}); the level is unidentified and is not pinned by the bridge`,
      );
    }
    if (!Number.isFinite(fit.effN)) return fail("dynamic BT effective sample size is non-finite");
    const needEffN = minEffN ?? 0;
    if (fit.effN < needEffN) {
      return fail(
        `dynamic BT effective sample size ${fit.effN} is below the required ${needEffN} at week ${week}, bandwidth ${bandwidth}`,
      );
    }

    const cand = candidates ?? [0.5, 1, 2, 4];
    if (cand.length === 0) return fail("bandwidth candidates must be non-empty");
    for (const c of cand) {
      if (!Number.isFinite(c) || c <= 0) return fail("every bandwidth candidate must be finite and > 0");
    }
    const tuned = tuneBandwidthLOOCV(payload, cand);
    if (!allFinite(tuned.scores.map((s) => s.loo)) || !Number.isFinite(tuned.h)) {
      return fail("bandwidth LOOCV produced a non-finite score");
    }
    let tunedLoo = Number.NEGATIVE_INFINITY;
    for (const s of tuned.scores) if (s.loo > tunedLoo) tunedLoo = s.loo;
    return {
      ok: true,
      data: {
        week: fit.week,
        bandwidth: fit.bandwidth,
        ratings: fit.ratings,
        effN: fit.effN,
        existenceViolations: violations,
        bandwidthScores: tuned.scores.map((s) => ({ h: s.h, loo: s.loo })),
        tunedBandwidth: tuned.h,
        tunedLoo,
      },
    };
  } catch (e) {
    return fail(`dynamic BT threw: ${errText(e)}`);
  }
}

// ── 6. Dynamic network win-lose + prestige PageRank ────────────────────────

export interface NetworkRatingResult {
  readonly ratings: readonly number[];
  readonly marginWeight: number;
  /** Reported, never asserted: this kernel is prestige flow, not zero-sum. */
  readonly mirrorResidual: number;
  readonly prestige: readonly number[];
  readonly winProbAtDiff: number;
}

/**
 * One week of margin-weighted online prestige updates, then the time-weighted
 * dynamic PageRank variant. The win-lose update is a prestige flow (the loser
 * is only debited when it loses to someone rated), NOT a zero-sum operator, so
 * the mirror residual is REPORTED for the caller rather than gated — the
 * difference between the two is the whole reason not to assume symmetry here.
 */
export function evalNetworkRating(input: {
  readonly ratings: readonly number[];
  readonly weekGames: readonly NetworkGameResult[];
  readonly weeklyAdjacency: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
  readonly recencyHalflifeWeeks?: number;
  readonly damping?: number;
  readonly minGames: number;
  readonly probeDiff?: number;
}): RatingsEval<NetworkRatingResult> {
  const { ratings, weekGames, weeklyAdjacency, recencyHalflifeWeeks, damping, minGames, probeDiff } = input;
  if (!Array.isArray(ratings) || ratings.length === 0) {
    return fail("ratings must be a non-empty array — an empty network has no prestige to flow");
  }
  if (!allFinite(ratings)) return fail("ratings must be finite");
  if (!Array.isArray(weekGames)) return fail("weekGames must be an array");
  const floor = belowMin(weekGames.length, minGames, "network rating update");
  if (floor) return fail(floor);
  for (let i = 0; i < weekGames.length; i++) {
    const g = weekGames[i];
    if (!g || !Number.isFinite(g.margin) || g.margin <= 0) {
      return fail(
        `weekGames[${i}].margin must be finite and > 0 — a tied or negative margin has no log(1+m) edge weight and is not treated as a small positive number`,
      );
    }
    if (!Number.isInteger(g.winner) || !Number.isInteger(g.loser)) {
      return fail(`weekGames[${i}] winner/loser must be integer team indices`);
    }
  }
  const n = ratings.length;
  for (let i = 0; i < weekGames.length; i++) {
    const g = weekGames[i] as NetworkGameResult;
    if (g.winner < 0 || g.winner >= n || g.loser < 0 || g.loser >= n) {
      return fail(`weekGames[${i}] indices are outside the ${n}-node network`);
    }
  }
  if (!Array.isArray(weeklyAdjacency) || weeklyAdjacency.length === 0) {
    return fail("weeklyAdjacency must contain at least one week");
  }
  for (let w = 0; w < weeklyAdjacency.length; w++) {
    const week = weeklyAdjacency[w];
    if (!Array.isArray(week) || week.length !== n) {
      return fail(`weeklyAdjacency[${w}] must be a ${n}x${n} matrix — rows of differing size are not padded`);
    }
    for (let r = 0; r < week.length; r++) {
      const row = week[r];
      if (!Array.isArray(row) || row.length !== n) {
        return fail(`weeklyAdjacency[${w}][${r}] must have ${n} columns`);
      }
      if (!allFinite(row)) {
        return fail(`weeklyAdjacency[${w}][${r}] contains a non-finite edge weight`);
      }
    }
  }
  try {
    const probe = weekGames[0] as NetworkGameResult;
    const mw = marginWeight(probe.margin);
    if (!Number.isFinite(mw) || mw <= 0) {
      return fail(`marginWeight returned ${String(mw)} for margin ${probe.margin}`);
    }
    const next = updateDynamicRating([...ratings], weekGames.map((g) => ({ ...g })));
    if (!allFinite(next)) {
      return fail(
        "network update diverged to a non-finite rating — the last iterate is not returned; check the schedule graph for a one-sided component",
      );
    }
    if (next.length !== n) return fail("network update changed the node count");

    // Mirror residual, reported not gated (see the doc comment).
    const mirrored = weekGames.map((g) => ({ winner: g.loser, loser: g.winner, margin: g.margin }));
    const mirrorNext = updateDynamicRating(
      ratings.map((r) => -r),
      mirrored,
    );
    let mirrorResidual = 0;
    for (let i = 0; i < n; i++) {
      mirrorResidual = Math.max(
        mirrorResidual,
        Math.abs((next[i] as number) - -(mirrorNext[i] as number)),
      );
    }

    const prestige = dynamicPageRank(weeklyAdjacency, recencyHalflifeWeeks ?? 8, damping ?? 0.85);
    if (!allFinite(prestige) || prestige.some((p) => p < 0)) {
      return fail("dynamic PageRank returned a negative or non-finite prestige");
    }
    const psum = prestige.reduce((a, b) => a + b, 0);
    if (Math.abs(psum - 1) > 1e-6) {
      return fail(`dynamic PageRank prestige sums to ${psum}, not 1 — not renormalized by hand`);
    }
    const wp = ratingToWinProb(probeDiff ?? 0, 400);
    const wpBad = probReason(wp, "ratingToWinProb");
    if (wpBad) return fail(wpBad);
    return {
      ok: true,
      data: {
        ratings: next,
        marginWeight: mw,
        mirrorResidual,
        prestige,
        winProbAtDiff: wp,
      },
    };
  } catch (e) {
    return fail(`network rating threw: ${errText(e)}`);
  }
}

// ── 7. Empirical-Bayes shrinkage of a rating vector ────────────────────────

export interface EbShrinkResult {
  readonly diagonal: ShrinkageResult;
  readonly uncertainty: Readonly<Record<string, number>>;
  /** Per-team |shrunk - mle|, so the size of the correction is visible. */
  readonly maxShift: number;
}

/**
 * Post-process an existing MLE rating vector with the paper's diagonal-Fisher
 * shrinkage, then publish the uncertainty diagnostic (high variance = shrink
 * hard). The size of the correction is measured so a team that sits entirely
 * on the prior is visible rather than hidden behind a plausible number.
 */
export function evalEbShrink(input: {
  readonly mle: Readonly<Record<string, number>>;
  readonly information: Readonly<Record<string, number>>;
  readonly totalGames: number;
  readonly strength?: number;
  readonly target?: number;
  readonly minTeams: number;
}): RatingsEval<EbShrinkResult> {
  const { mle, information, totalGames, strength, target, minTeams } = input;
  if (!mle || typeof mle !== "object") return fail("mle must be a rating record");
  const teams = Object.keys(mle);
  const floor = belowMin(teams.length, minTeams, "EB shrinkage");
  if (floor) return fail(floor);
  if (!allFiniteMap(mle)) {
    return fail("every MLE rating must be finite — a NaN input rating is not shrunk toward the mean, it is refused");
  }
  if (!information || typeof information !== "object") return fail("information must be a record");
  for (const t of teams) {
    const v = information[t];
    if (v === undefined || !Number.isFinite(v) || v < 0) {
      return fail(`information["${t}"] must be finite and >= 0 — missing information is not treated as zero information`);
    }
  }
  if (!Number.isInteger(totalGames) || totalGames < 1) {
    return fail("totalGames must be a positive integer — the paper's N, the number of games informing the ratings");
  }
  if (strength !== undefined && (!Number.isFinite(strength) || strength < 0)) {
    return fail("strength must be finite and >= 0 when supplied");
  }
  if (target !== undefined && !Number.isFinite(target)) return fail("target must be finite when supplied");
  try {
    const out = shrinkRatings({
      mle: { ...mle },
      information: Object.fromEntries(teams.map((t) => [t, information[t] as number])),
      totalGames,
      ...(strength !== undefined ? { strength } : {}),
      ...(target !== undefined ? { target } : {}),
    });
    const bad = ratingMapReason(out.shrunk, "EB shrunk ratings");
    if (bad) return fail(bad);
    if (!allFiniteMap(out.factors)) return fail("EB shrinkage factors are non-finite");
    for (const t of teams) {
      const f = out.factors[t] as number;
      if (f < 0 || f > 1) {
        return fail(`EB shrinkage factor for "${t}" is ${f}, outside [0,1] — a rating cannot be shrunk by more than 100%`);
      }
    }
    let maxShift = 0;
    for (const t of teams) {
      maxShift = Math.max(maxShift, Math.abs((out.shrunk[t] as number) - (mle[t] as number)));
    }
    const uncertainty = shrinkageUncertainty(out);
    if (!allFiniteMap(uncertainty)) return fail("EB uncertainty diagnostic is non-finite");
    return { ok: true, data: { diagonal: out, uncertainty, maxShift } };
  } catch (e) {
    return fail(`EB shrinkage threw: ${errText(e)}`);
  }
}

/** Full-matrix Fisher shrinkage. A singular Fisher block fails closed. */
export function evalEbShrinkMatrix(input: {
  readonly mle: Readonly<Record<string, number>>;
  readonly fisher: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly totalGames: number;
  readonly strength?: number;
  readonly target?: number;
  readonly minTeams: number;
}): RatingsEval<ShrinkageResult> {
  const { mle, fisher, totalGames, strength, target, minTeams } = input;
  if (!mle || typeof mle !== "object") return fail("mle must be a rating record");
  const teams = Object.keys(mle);
  const floor = belowMin(teams.length, minTeams, "EB matrix shrinkage");
  if (floor) return fail(floor);
  if (!allFiniteMap(mle)) return fail("every MLE rating must be finite");
  if (!fisher || typeof fisher !== "object") return fail("fisher must be a nested record");
  for (const t of teams) {
    const row = fisher[t];
    if (!row) return fail(`fisher["${t}"] is missing — a missing block is not a zero block`);
    for (const s of teams) {
      const v = row[s];
      if (v === undefined || !Number.isFinite(v)) {
        return fail(`fisher["${t}"]["${s}"] must be finite`);
      }
    }
  }
  if (!Number.isInteger(totalGames) || totalGames < 1) {
    return fail("totalGames must be a positive integer");
  }
  try {
    const out = shrinkRatingsMatrix(
      { ...mle },
      Object.fromEntries(
        teams.map((t) => [
          t,
          Object.fromEntries(
            teams.map((s) => [s, (fisher[t] as Readonly<Record<string, number>>)[s] as number]),
          ),
        ]),
      ),
      totalGames,
      strength ?? 1,
      target,
    );
    const bad = ratingMapReason(out.shrunk, "EB matrix shrunk ratings");
    if (bad) return fail(bad);
    if (!allFiniteMap(out.factors)) return fail("EB matrix shrinkage factors are non-finite");
    return { ok: true, data: out };
  } catch (e) {
    return fail(
      `EB matrix shrinkage threw: ${errText(e)} — a singular Fisher block means the ratings are not identified, and a pinv is not substituted`,
    );
  }
}

// ── 8. HFA bias audit (unadjusted vs team-FE vs mixed effects) ─────────────

export interface HfaAuditResult {
  readonly unadjusted: number;
  readonly teamFixedEffectsGamma: number;
  readonly mixedGamma: number;
  readonly sigmaT: number;
  readonly sigmaE: number;
  /** mixed - unadjusted: the paper's scheduling-bias gap. */
  readonly gap: number;
  readonly material: boolean;
  readonly games: number;
  /** Present only when the caller also asked for the seeded simulation. */
  readonly simulatedTrueGamma?: number;
  readonly simulatedUnadjusted?: number;
  readonly simulatedMixedGamma?: number;
  readonly simulatedGap?: number;
}

/**
 * Run the paper's fixed-HFA specification against the bias-robust mixed-effects
 * estimator on a CONNECTED slate. When `simulate` is supplied the same three
 * estimators run on the seeded nonrandom-schedule simulation, so the bias
 * direction is observed rather than assumed. The gap is recomputed rather than
 * trusted, so a silent sign flip is caught.
 */
export function evalHfaBiasAudit(input: {
  readonly games: readonly HFAGame[];
  readonly minGames: number;
  readonly materiality?: number;
  readonly simulate?: {
    readonly teams?: number;
    readonly games?: number;
    readonly trueGamma?: number;
    readonly teamSd?: number;
    readonly noiseSd?: number;
    readonly hostBias?: number;
    readonly seed: number;
  };
}): RatingsEval<HfaAuditResult> {
  const { games, minGames, materiality, simulate } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "HFA audit");
  if (floor) return fail(floor);
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || !g.homeTeam || !g.awayTeam || g.homeTeam === g.awayTeam) {
      return fail(`games[${i}] needs distinct non-empty homeTeam/awayTeam`);
    }
    if (!Number.isFinite(g.homeMargin)) {
      return fail(`games[${i}].homeMargin must be finite — a missing margin is not a 0-margin game`);
    }
  }
  if (materiality !== undefined && (!Number.isFinite(materiality) || materiality < 0)) {
    return fail("materiality must be finite and >= 0 when supplied");
  }
  const conn = connectivityReason(games.map((g) => ({ home: g.homeTeam, away: g.awayTeam })));
  if (conn) return fail(`HFA audit: ${conn}`);
  try {
    const payload = games.map((g) => ({
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeMargin: g.homeMargin,
    }));
    const audit = hfaBiasAudit(payload, materiality ?? 0.5);
    const checks: ReadonlyArray<readonly [string, number]> = [
      ["unadjusted", audit.unadjusted],
      ["teamFE.gamma", audit.teamFE.gamma],
      ["mixed.gamma", audit.mixed.gamma],
      ["mixed.sigmaE", audit.mixed.sigmaE],
      ["mixed.sigmaT", audit.mixed.sigmaT],
      ["gap", audit.gap],
    ];
    for (const [k, v] of checks) {
      if (!Number.isFinite(v)) {
        return fail(`HFA audit ${k} is ${String(v)} — a non-finite HFA estimate is not published`);
      }
    }
    if (audit.mixed.sigmaT < 0 || audit.teamFE.sigmaE < 0) {
      return fail("HFA audit produced a negative standard deviation");
    }
    // gap is defined as mixed - unadjusted; recompute so a silent sign flip is caught.
    const recomputed = audit.mixed.gamma - audit.unadjusted;
    if (Math.abs(recomputed - audit.gap) > 1e-9) {
      return fail(
        `HFA audit gap ${audit.gap} does not equal mixed - unadjusted (${recomputed}) — the bias direction is not assumed, it is recomputed`,
      );
    }
    const base: HfaAuditResult = {
      unadjusted: audit.unadjusted,
      teamFixedEffectsGamma: audit.teamFE.gamma,
      mixedGamma: audit.mixed.gamma,
      sigmaT: audit.mixed.sigmaT,
      sigmaE: audit.mixed.sigmaE,
      gap: audit.gap,
      material: audit.material,
      games: games.length,
    };
    if (!simulate) return { ok: true, data: base };
    const sim = simulateNonrandomSchedule({
      ...(simulate.teams !== undefined ? { teams: simulate.teams } : {}),
      ...(simulate.games !== undefined ? { games: simulate.games } : {}),
      ...(simulate.trueGamma !== undefined ? { trueGamma: simulate.trueGamma } : {}),
      ...(simulate.teamSd !== undefined ? { teamSd: simulate.teamSd } : {}),
      ...(simulate.noiseSd !== undefined ? { noiseSd: simulate.noiseSd } : {}),
      ...(simulate.hostBias !== undefined ? { hostBias: simulate.hostBias } : {}),
      seed: simulate.seed,
    });
    if (!Number.isFinite(sim.trueGamma) || sim.games.length === 0) {
      return fail("schedule simulator returned no games or a non-finite true HFA");
    }
    const simAudit = hfaBiasAudit(sim.games, materiality ?? 0.5);
    if (!allFinite([simAudit.unadjusted, simAudit.mixed.gamma, simAudit.gap])) {
      return fail("simulated HFA audit returned a non-finite estimate");
    }
    return {
      ok: true,
      data: {
        ...base,
        simulatedTrueGamma: sim.trueGamma,
        simulatedUnadjusted: simAudit.unadjusted,
        simulatedMixedGamma: simAudit.mixed.gamma,
        simulatedGap: simAudit.gap,
      },
    };
  } catch (e) {
    return fail(`HFA audit threw: ${errText(e)}`);
  }
}

// ── 9. Least-squares ratings on point differentials ────────────────────────

export interface LsRatingsResult {
  readonly ols: LsFit;
  readonly wls: LsFit;
  readonly l1: LsFit;
  readonly sumRatings: number;
  readonly probeSpread: number;
  readonly olsMae: number;
  readonly l1Mae: number;
  readonly olsViolationRate: number;
}

/**
 * OLS / WLS / L1 ratings on point differentials. The rating vector is pinned to
 * sum to zero, and that is VERIFIED from the returned values rather than
 * assumed. A singular system — the usual sign of a disconnected schedule — is
 * reported as such, with no ridge substituted.
 */
export function evalLsRatings(input: {
  readonly games: readonly LsGameResult[];
  readonly minGames: number;
  readonly probe: readonly [string, string];
  readonly hfaBound?: number;
}): RatingsEval<LsRatingsResult> {
  const { games, minGames, probe, hfaBound } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "least-squares ratings");
  if (floor) return fail(floor);
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || !g.home || !g.away || g.home === g.away) {
      return fail(`games[${i}] needs distinct non-empty home/away team ids`);
    }
    if (!Number.isFinite(g.homePoints) || !Number.isFinite(g.awayPoints)) {
      return fail(`games[${i}] points must be finite — an unplayed game is not a 0-0 game`);
    }
  }
  const conn = connectivityReason(games);
  if (conn) return fail(`least-squares ratings: ${conn}`);
  if (!Array.isArray(probe) || probe.length !== 2 || !probe[0] || !probe[1]) {
    return fail("probe must be a [home, away] pair of teams the fit actually knows");
  }
  if (hfaBound !== undefined && (!Number.isFinite(hfaBound) || hfaBound <= 0)) {
    return fail("hfaBound must be finite and > 0 when supplied");
  }
  try {
    const payload = games.map((g) => ({
      home: g.home,
      away: g.away,
      homePoints: g.homePoints,
      awayPoints: g.awayPoints,
      ...(g.restEdge !== undefined ? { restEdge: g.restEdge } : {}),
      ...(g.travelMiles !== undefined ? { travelMiles: g.travelMiles } : {}),
      ...(g.week !== undefined ? { week: g.week } : {}),
    }));
    const ols = fitLeastSquares(payload);
    const wls = fitWeightedLeastSquares(payload);
    const l1 = fitL1Ratings(payload);
    const fits: ReadonlyArray<readonly [string, LsFit]> = [
      ["OLS", ols],
      ["WLS", wls],
      ["L1", l1],
    ];
    for (const [name, fit] of fits) {
      const asMap = Object.fromEntries(fit.teams.map((t, i) => [t, fit.ratings[i] as number]));
      const bad = ratingMapReason(asMap, `${name} least-squares ratings`);
      if (bad) return fail(bad);
      if (fit.teams.length < 2) return fail(`${name} fit resolved fewer than 2 teams`);
      if (!Number.isFinite(fit.hfa)) return fail(`${name} home-field coefficient is non-finite`);
      if (fit.ratings.length !== fit.teams.length) {
        return fail(`${name} rating vector length ${fit.ratings.length} does not match its ${fit.teams.length} teams`);
      }
    }
    if (ols.teams.length !== wls.teams.length || ols.teams.length !== l1.teams.length) {
      return fail("OLS/WLS/L1 disagree on the team count — a fit that is not comparable is not published as a comparison");
    }
    const sumRatings = ols.ratings.reduce((a, b) => a + b, 0);
    if (Math.abs(sumRatings) > 1e-6) {
      return fail(
        `least-squares ratings are not zero-sum identified (sum ${sumRatings}) — the level is unidentified and is not pinned by the bridge`,
      );
    }
    if (hfaBound !== undefined && Math.abs(ols.hfa) > hfaBound) {
      return fail(
        `fitted home-field coefficient ${ols.hfa} exceeds the caller bound ${hfaBound} — an implausible HFA is not clamped back into range`,
      );
    }
    if (!ols.teams.includes(probe[0]) || !ols.teams.includes(probe[1])) {
      return fail(`probe pair [${probe[0]}, ${probe[1]}] is not in the fitted team set — no spread is predicted for an unknown team`);
    }
    const spread = predictSpread(ols, probe[0], probe[1]);
    if (!Number.isFinite(spread)) return fail("predictSpread returned a non-finite spread");
    const olsMae = spreadMae(ols, payload);
    const l1Mae = spreadMae(l1, payload);
    const viol = rankingViolationRate(ols, payload);
    if (!allFinite([olsMae, l1Mae, viol])) return fail("least-squares diagnostics are non-finite");
    if (olsMae < 0 || l1Mae < 0) return fail("spread MAE cannot be negative");
    if (viol < 0 || viol > 1) return fail(`ranking-violation rate ${viol} is outside [0,1]`);
    // WLS variance model must stay positive; it is a weight, not a constant.
    const variances = payload.map((g) => gameVariance(g));
    if (!allFinite(variances) || variances.some((v) => v <= 0)) {
      return fail("game variance model produced a non-positive weight — a zero weight would silently drop the game");
    }
    return {
      ok: true,
      data: {
        ols,
        wls,
        l1,
        sumRatings,
        probeSpread: spread,
        olsMae,
        l1Mae,
        olsViolationRate: viol,
      },
    };
  } catch (e) {
    return fail(
      `least-squares ratings threw: ${errText(e)} — a singular normal-equations system means the ratings are not identified (check schedule connectivity); no ridge is substituted`,
    );
  }
}

// ── 10. Pairwise matchup ratings (attacker/defender SGD) ────────────────────

export interface MatchupResult {
  readonly intercept: number;
  readonly priorMean: number;
  readonly attack: Readonly<Record<string, number>>;
  readonly defense: Readonly<Record<string, number>>;
  readonly probe: number;
  readonly inSampleMae: number;
  readonly attackCount: number;
  readonly defenseCount: number;
  readonly timeOrdered?: { readonly model: number; readonly baseline: number };
}

/**
 * Fit s_ij = A + a_i - b_j by seeded SGD with recency weights and neighborhood
 * regularization. The seed is caller-supplied (never Math.random) so a fit is
 * reproducible. The convergence signal published here is the in-sample MAE,
 * optionally gated by `maxMae`, and the strictly time-ordered model-vs-baseline
 * MAE when splits are supplied.
 */
export function evalMatchupRatings(input: {
  readonly obs: readonly MatchupObs[];
  readonly opts?: SgdOptions;
  readonly minObs: number;
  readonly probe: readonly [string, string];
  readonly splitWeeks?: readonly number[];
  readonly maxMae?: number;
}): RatingsEval<MatchupResult> {
  const { obs, opts, minObs, probe, splitWeeks, maxMae } = input;
  if (!Array.isArray(obs)) return fail("obs must be an array");
  const floor = belowMin(obs.length, minObs, "matchup ratings");
  if (floor) return fail(floor);
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (!o || !o.i || !o.j) return fail(`obs[${i}] needs non-empty attacker i and defender j`);
    if (!Number.isFinite(o.s)) return fail(`obs[${i}].s must be finite — a missing outcome is not a 0 outcome`);
    if (!Number.isFinite(o.t)) return fail(`obs[${i}].t must be finite`);
  }
  if (!Array.isArray(probe) || probe.length !== 2 || !probe[0] || !probe[1]) {
    return fail("probe must be a [attacker, defender] pair");
  }
  const options: SgdOptions = opts ?? {};
  if (options.lr !== undefined && (!Number.isFinite(options.lr) || options.lr <= 0)) {
    return fail("opts.lr must be finite and > 0");
  }
  if (options.epochs !== undefined && (!Number.isInteger(options.epochs) || options.epochs < 1)) {
    return fail("opts.epochs must be a positive integer");
  }
  if (options.lambda !== undefined && (!Number.isFinite(options.lambda) || options.lambda < 0)) {
    return fail("opts.lambda must be finite and >= 0");
  }
  if (options.seed !== undefined && (!Number.isInteger(options.seed) || options.seed < 0)) {
    return fail("opts.seed must be a non-negative integer — a fit must be reproducible, not Math.random");
  }
  if (maxMae !== undefined && (!Number.isFinite(maxMae) || maxMae <= 0)) {
    return fail("maxMae must be finite and > 0 when supplied");
  }
  if (splitWeeks) {
    if (splitWeeks.length === 0) return fail("splitWeeks must be non-empty when supplied");
    for (const s of splitWeeks) {
      if (!Number.isFinite(s)) return fail("every split week must be finite");
    }
  }
  try {
    const payload = obs.map((o) => ({ i: o.i, j: o.j, s: o.s, t: o.t }));
    const fit = fitMatchupRatings(payload, options);
    if (!Number.isFinite(fit.intercept) || !Number.isFinite(fit.priorMean)) {
      return fail("matchup fit returned a non-finite intercept or prior mean");
    }
    const attack: Record<string, number> = {};
    const defense: Record<string, number> = {};
    for (const [k, v] of fit.attack) attack[k] = v;
    for (const [k, v] of fit.defense) defense[k] = v;
    if (Object.keys(attack).length === 0 || Object.keys(defense).length === 0) {
      return fail("matchup fit produced no attack or no defense ratings");
    }
    if (!allFiniteMap(attack) || !allFiniteMap(defense)) {
      return fail("matchup ratings diverged to a non-finite value — the last SGD iterate is not returned");
    }
    let inSampleMae = 0;
    for (const o of payload) {
      inSampleMae += Math.abs(o.s - predictMatchup(fit, o.i, o.j));
    }
    inSampleMae /= payload.length;
    if (!Number.isFinite(inSampleMae)) return fail("in-sample matchup MAE is non-finite");
    if (maxMae !== undefined && inSampleMae > maxMae) {
      return fail(
        `matchup in-sample MAE ${inSampleMae} exceeds the caller bound ${maxMae} — an unconverged or diverged fit is not reported as a rating`,
      );
    }
    // An unseen pair must fall back to the neighborhood prior, not to 0.
    const probeValue = predictMatchup(fit, probe[0], probe[1]);
    const expectedPrior = predictMatchup(
      { intercept: fit.intercept, attack: new Map(), defense: new Map(), priorMean: fit.priorMean },
      probe[0],
      probe[1],
    );
    if (!Number.isFinite(probeValue)) return fail("matchup probe returned a non-finite value");
    if (!Number.isFinite(expectedPrior)) return fail("matchup prior probe returned a non-finite value");
    const base: MatchupResult = {
      intercept: fit.intercept,
      priorMean: fit.priorMean,
      attack,
      defense,
      probe: probeValue,
      inSampleMae,
      attackCount: Object.keys(attack).length,
      defenseCount: Object.keys(defense).length,
    };
    if (!splitWeeks) return { ok: true, data: base };
    const to = timeOrderedMae(payload, splitWeeks, options);
    if (!allFinite([to.model, to.baseline]) || to.model < 0 || to.baseline < 0) {
      return fail("time-ordered matchup MAE is negative or non-finite");
    }
    return { ok: true, data: { ...base, timeOrdered: { model: to.model, baseline: to.baseline } } };
  } catch (e) {
    return fail(`matchup ratings threw: ${errText(e)}`);
  }
}

// ── 11. Parametric PageRank (recency x situation x importance) ─────────────

export interface ParametricPagerankResult {
  readonly ratings: Readonly<Record<string, number>>;
  readonly sum: number;
  readonly teams: number;
  readonly topTeam: string;
  readonly topRating: number;
  readonly edgeWeight: number;
  readonly probeWinProb?: number;
  readonly clvEdge?: number;
}

/**
 * Weighted PageRank over team nodes (edges loser -> winner) with the win-prob
 * converter and the CLV-style market test. Ratings must be non-negative and
 * sum to 1; they are not renormalized by the bridge to make that true.
 */
export function evalParametricPagerank(input: {
  readonly games: readonly RatedGame[];
  readonly recencyDecay: number;
  readonly minGames: number;
  readonly probe?: readonly [string, string];
  readonly probeScale?: number;
  readonly clv?: {
    readonly ratingProb: readonly number[];
    readonly closingProb: readonly number[];
    readonly pickedHome: readonly boolean[];
  };
}): RatingsEval<ParametricPagerankResult> {
  const { games, recencyDecay, minGames, probe, probeScale, clv } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "parametric PageRank");
  if (floor) return fail(floor);
  if (!Number.isFinite(recencyDecay) || recencyDecay < 0) {
    return fail("recencyDecay must be finite and >= 0");
  }
  if (probeScale !== undefined && (!Number.isFinite(probeScale) || probeScale <= 0)) {
    return fail("probeScale must be finite and > 0 when supplied");
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || !g.winner || !g.loser || g.winner === g.loser) {
      return fail(`games[${i}] needs distinct non-empty winner/loser team ids`);
    }
    if (!Number.isFinite(g.weeksAgo) || g.weeksAgo < 0) {
      return fail(`games[${i}].weeksAgo must be finite and >= 0`);
    }
    if (!Number.isFinite(g.situation) || !Number.isFinite(g.importance)) {
      return fail(`games[${i}] situation/importance multipliers must be finite`);
    }
  }
  const w: EdgeWeights = { recencyDecay };
  const probeGame = games[0] as RatedGame;
  try {
    const ew = edgeWeight(probeGame, w);
    if (!Number.isFinite(ew) || ew < 0) {
      return fail(`edgeWeight returned ${String(ew)} — a negative edge weight would flow prestige backwards`);
    }
    const ratings = parametricPagerank(
      games.map((g) => ({
        winner: g.winner,
        loser: g.loser,
        weeksAgo: g.weeksAgo,
        situation: g.situation,
        importance: g.importance,
      })),
      w,
    );
    const bad = ratingMapReason(ratings, "parametric PageRank ratings");
    if (bad) return fail(bad);
    const values = Object.values(ratings);
    if (values.some((v) => v < 0)) return fail("parametric PageRank produced a negative rating");
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      return fail(`parametric PageRank ratings sum to ${sum}, not 1 — not renormalized by hand`);
    }
    const ranked = [...Object.keys(ratings)].sort(
      (x, y) => (ratings[y] as number) - (ratings[x] as number),
    );
    const topTeam = ranked[0] as string;
    const base: ParametricPagerankResult = {
      ratings,
      sum,
      teams: ranked.length,
      topTeam,
      topRating: ratings[topTeam] as number,
      edgeWeight: ew,
    };
    let out: ParametricPagerankResult = base;
    if (probe) {
      if (probe.length !== 2 || !probe[0] || !probe[1]) return fail("probe must be a [home, away] pair");
      if (!(probe[0] in ratings) || !(probe[1] in ratings)) {
        return fail(`probe pair [${probe[0]}, ${probe[1]}] is not in the rated team set — no probability is converted for an unrated team`);
      }
      const wp = winProbFromRatings(
        ratings[probe[0]] as number,
        ratings[probe[1]] as number,
        probeScale ?? 200,
      );
      const wpBad = probReason(wp, "parametric PageRank probe win probability");
      if (wpBad) return fail(wpBad);
      out = { ...out, probeWinProb: wp };
    }
    if (clv) {
      const { ratingProb, closingProb, pickedHome } = clv;
      if (!Array.isArray(ratingProb) || !Array.isArray(closingProb) || !Array.isArray(pickedHome)) {
        return fail("clv inputs must all be arrays");
      }
      const clvFloor = belowMin(ratingProb.length, 2, "CLV edge");
      if (clvFloor) return fail(clvFloor);
      if (ratingProb.length !== closingProb.length || ratingProb.length !== pickedHome.length) {
        return fail("clv arrays must be the same length — an unpaired CLV comparison is not computed");
      }
      for (let i = 0; i < ratingProb.length; i++) {
        const a = probReason(ratingProb[i] as number, `clv ratingProb[${i}]`);
        if (a) return fail(a);
        const b = probReason(closingProb[i] as number, `clv closingProb[${i}]`);
        if (b) return fail(b);
      }
      const edge = clvEdge([...ratingProb], [...closingProb], [...pickedHome]);
      if (!Number.isFinite(edge)) return fail("clvEdge returned a non-finite edge");
      out = { ...out, clvEdge: edge };
    }
    return { ok: true, data: out };
  } catch (e) {
    return fail(`parametric PageRank threw: ${errText(e)}`);
  }
}

// ── 12. PlayeRank (player-game -> team -> form rating) ──────────────────────

export interface PlayeRankResult {
  readonly teamVector: readonly number[];
  readonly weights: readonly number[];
  readonly playerRating: number;
  readonly form: readonly number[];
  readonly auc: number;
  readonly roles: Readonly<Record<string, number>>;
  readonly roleCount: number;
  /** The module's stated gate metric (AUC >= 0.80), published not asserted. */
  readonly passesAucGate: boolean;
}

/**
 * Aggregate player-game vectors to a team vector, train the logistic
 * team-outcome model, rate one player-game, EWMA the season, detect snap roles
 * and score AUC. A non-finite weight fails closed: gradient descent that
 * diverges does not get to return its last iterate.
 */
export function evalPlayeRank(input: {
  readonly playerGames: readonly PlayerGame[];
  readonly featureNames: readonly string[];
  readonly teamGames: readonly TeamGame[];
  readonly probePlayerGame: PlayerGame;
  readonly seasonRatings: readonly number[];
  readonly alpha?: number;
  readonly snapPositions?: ReadonlyArray<{ readonly id: string; readonly x: number; readonly y: number }>;
  readonly roles?: number;
  readonly minTeamGames: number;
  readonly lr?: number;
  readonly iters?: number;
  readonly l2?: number;
}): RatingsEval<PlayeRankResult> {
  const {
    playerGames,
    featureNames,
    teamGames,
    probePlayerGame,
    seasonRatings,
    alpha,
    snapPositions,
    roles,
    minTeamGames,
    lr,
    iters,
    l2,
  } = input;
  if (!Array.isArray(featureNames) || featureNames.length === 0) {
    return fail("featureNames must be non-empty — a model with no features is an intercept, not a rating");
  }
  if (!Array.isArray(playerGames)) return fail("playerGames must be an array");
  if (!Array.isArray(teamGames)) return fail("teamGames must be an array");
  const floor = belowMin(teamGames.length, minTeamGames, "PlayeRank team-outcome model");
  if (floor) return fail(floor);
  for (let i = 0; i < teamGames.length; i++) {
    const g = teamGames[i];
    if (!g || !Array.isArray(g.teamVector)) {
      return fail(`teamGames[${i}] needs a teamVector array`);
    }
    if (g.teamVector.length !== featureNames.length) {
      return fail(
        `teamGames[${i}].teamVector has ${g.teamVector.length} features, expected ${featureNames.length} — a shorter vector is not zero-padded`,
      );
    }
    if (!allFinite(g.teamVector)) return fail(`teamGames[${i}].teamVector must be finite`);
    if (g.won !== 0 && g.won !== 1) return fail(`teamGames[${i}].won must be 0 or 1`);
  }
  if (!probePlayerGame || typeof probePlayerGame !== "object") {
    return fail("probePlayerGame must be a feature record");
  }
  for (const f of featureNames) {
    const v = probePlayerGame[f];
    if (v !== undefined && !Number.isFinite(v)) return fail(`probePlayerGame["${f}"] must be finite`);
  }
  const posCount = teamGames.filter((g) => g.won === 1).length;
  const negCount = teamGames.length - posCount;
  if (posCount === 0 || negCount === 0) {
    return fail(
      `PlayeRank AUC needs both classes, got ${posCount} wins and ${negCount} losses — a single-class slate has no discriminative signal and is not scored`,
    );
  }
  if (!Array.isArray(seasonRatings) || seasonRatings.length === 0) {
    return fail("seasonRatings must be non-empty — the form rating has no series to smooth");
  }
  if (!allFinite(seasonRatings)) return fail("seasonRatings must be finite");
  if (alpha !== undefined && (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1)) {
    return fail("alpha must be in (0,1] when supplied");
  }
  if (lr !== undefined && (!Number.isFinite(lr) || lr <= 0)) return fail("lr must be finite and > 0 when supplied");
  if (iters !== undefined && (!Number.isInteger(iters) || iters < 1)) {
    return fail("iters must be a positive integer when supplied");
  }
  if (l2 !== undefined && (!Number.isFinite(l2) || l2 < 0)) return fail("l2 must be finite and >= 0 when supplied");
  if (roles !== undefined && (!Number.isInteger(roles) || roles < 1)) {
    return fail("roles must be an integer >= 1 when supplied");
  }
  if (snapPositions && roles === undefined) {
    return fail("roles must be supplied alongside snapPositions — a role count is not defaulted");
  }
  if (snapPositions) {
    if (snapPositions.length === 0) return fail("snapPositions must be non-empty when supplied");
    for (let i = 0; i < snapPositions.length; i++) {
      const p = snapPositions[i];
      if (!p || !p.id || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        return fail(`snapPositions[${i}] needs a non-empty id and finite x/y`);
      }
    }
  }
  try {
    const tv = aggregateTeamVector(
      playerGames.map((g) => ({ ...g })),
      featureNames,
    );
    if (!allFinite(tv) || tv.length !== featureNames.length) {
      return fail("team vector aggregation returned a non-finite or wrong-length vector");
    }
    const weights = trainTeamModel(
      teamGames.map((g) => ({ teamVector: [...g.teamVector], won: g.won })),
      lr ?? 0.5,
      iters ?? 2000,
      l2 ?? 0.01,
    );
    if (!allFinite(weights) || weights.length !== featureNames.length + 1) {
      return fail(
        "logistic team-outcome weights are non-finite or wrong length — gradient descent diverged and the last iterate is not returned",
      );
    }
    if (weights.every((w) => w === 0)) {
      return fail("logistic team-outcome weights are all zero after training — that is a non-fit, not a rating");
    }
    const playerRating = playerGameRating(weights, probePlayerGame, featureNames);
    if (!Number.isFinite(playerRating)) return fail("player-game rating is non-finite");
    const form = formRating([...seasonRatings], alpha ?? 0.3);
    if (!allFinite(form) || form.length !== seasonRatings.length) {
      return fail("EWMA form rating returned a non-finite or wrong-length series");
    }
    const scores = teamGames.map((g) => {
      const x = [...g.teamVector, 1];
      return x.reduce((s, v, j) => s + v * (weights[j] as number), 0);
    });
    const a = auc(scores, teamGames.map((g) => g.won));
    if (!Number.isFinite(a) || a < 0 || a > 1) {
      return fail(`PlayeRank AUC ${String(a)} is outside [0,1] — a non-discriminative model is not scored`);
    }
    let roleMap: Record<string, number> = {};
    if (snapPositions && roles !== undefined) {
      const assigned = detectRoles(
        snapPositions.map((p) => ({ id: p.id, x: p.x, y: p.y })),
        roles,
      );
      for (const [k, v] of Object.entries(assigned)) {
        if (!Number.isInteger(v) || v < 0) return fail(`role index for "${k}" is not a valid role`);
        roleMap[k] = v;
      }
    }
    return {
      ok: true,
      data: {
        teamVector: tv,
        weights,
        playerRating,
        form,
        auc: a,
        roles: roleMap,
        roleCount: Object.keys(roleMap).length,
        passesAucGate: a >= 0.8,
      },
    };
  } catch (e) {
    return fail(`PlayeRank threw: ${errText(e)}`);
  }
}

// ── 13. Pythagorean duel (fractional-logit alpha, game-level EWP) ───────────

export interface PythagoreanResult {
  readonly tullockAlpha: number;
  readonly differenceAlpha: number;
  readonly tullockRmse: number;
  readonly differenceRmse: number;
  readonly rmseGain: number;
  readonly differenceWins: boolean;
  readonly gameEwp: { readonly alpha: number; readonly beta: number; readonly gamma: number };
  readonly probeEwp: number;
  readonly seasons: number;
  readonly games: number;
}

/**
 * Fractional-logit alpha for the Tullock and difference CSF forms, plus the
 * game-level expected-win-probability logistic fit. Two invariants are checked
 * rather than assumed: each CSF form must return exactly 0.5 at equal points,
 * and the game EWP must be centered on a coin flip at pick'em.
 */
export function evalPythagoreanDuel(input: {
  readonly seasons: readonly PythagTeamSeason[];
  readonly games: readonly GameRow[];
  readonly minSeasons: number;
  readonly minGames: number;
  readonly probe: { readonly pd: number; readonly hfa: number; readonly restEdge: number };
}): RatingsEval<PythagoreanResult> {
  const { seasons, games, minSeasons, minGames, probe } = input;
  if (!Array.isArray(seasons)) return fail("seasons must be an array");
  if (!Array.isArray(games)) return fail("games must be an array");
  const sf = belowMin(seasons.length, minSeasons, "pythagorean season fit");
  if (sf) return fail(sf);
  const gf = belowMin(games.length, minGames, "pythagorean game fit");
  if (gf) return fail(gf);
  for (let i = 0; i < seasons.length; i++) {
    const s = seasons[i];
    if (!s || !Number.isFinite(s.pf) || !Number.isFinite(s.pa) || s.pf <= 0 || s.pa <= 0) {
      return fail(`seasons[${i}] needs finite pf/pa > 0 — a shutout or a zero season has no ratio-form CSF and is not dropped silently`);
    }
    if (!Number.isInteger(s.games) || s.games < 1) return fail(`seasons[${i}].games must be a positive integer`);
    if (!Number.isFinite(s.wins) || s.wins < 0 || s.wins > s.games) {
      return fail(`seasons[${i}].wins must be finite in [0, games]`);
    }
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || !Number.isFinite(g.pd) || !Number.isFinite(g.hfa) || !Number.isFinite(g.restEdge)) {
      return fail(`games[${i}] needs finite pd/hfa/restEdge — a missing rest edge is not a 0 rest edge`);
    }
    if (g.won !== 0 && g.won !== 1) return fail(`games[${i}].won must be 0 or 1`);
  }
  if (!probe || !Number.isFinite(probe.pd) || !Number.isFinite(probe.hfa) || !Number.isFinite(probe.restEdge)) {
    return fail("probe needs finite pd/hfa/restEdge");
  }
  try {
    const payload = seasons.map((s) => ({ pf: s.pf, pa: s.pa, wins: s.wins, games: s.games }));
    const aT = fitAlpha(payload, "tullock");
    const aD = fitAlpha(payload, "difference");
    const alphas: ReadonlyArray<readonly [string, number]> = [
      ["tullock", aT],
      ["difference", aD],
    ];
    for (const [k, v] of alphas) {
      if (!Number.isFinite(v) || v <= 0) {
        return fail(`fractional-logit ${k} alpha is ${String(v)} — a non-positive alpha is not pinned to the default and returned as a fit`);
      }
    }
    const rmseT = winRmse(payload, "tullock", aT);
    const rmseD = winRmse(payload, "difference", aD);
    if (!allFinite([rmseT, rmseD]) || rmseT < 0 || rmseD < 0) {
      return fail("pythagorean win-RMSE is negative or non-finite");
    }
    // Both forms must be exactly 0.5 at equal points.
    const selfT = tullock(100, 100, aT);
    const selfD = differenceForm(100, 100, aD);
    if (Math.abs(selfT - 0.5) > 1e-9 || Math.abs(selfD - 0.5) > 1e-9) {
      return fail(
        `a CSF form does not return 0.5 at equal points (tullock ${selfT}, difference ${selfD}) — the kernel is not behaving as specified and the fit is not published`,
      );
    }
    const coef = fitGameEwp(games.map((g) => ({ ...g })));
    const coefs: ReadonlyArray<readonly [string, number]> = [
      ["alpha", coef.alpha],
      ["beta", coef.beta],
      ["gamma", coef.gamma],
    ];
    for (const [k, v] of coefs) {
      if (!Number.isFinite(v)) return fail(`game EWP coefficient ${k} is non-finite — the Newton solve did not converge`);
    }
    const atPickEm = gameEwp(0, 0, 0, coef);
    if (Math.abs(atPickEm - 0.5) > 1e-9) {
      return fail(`game EWP at pick'em is ${atPickEm}, not 0.5 — the logistic is not centered on a coin flip`);
    }
    const p = gameEwp(probe.pd, probe.hfa, probe.restEdge, coef);
    const pBad = probReason(p, "pythagorean game EWP probe");
    if (pBad) return fail(pBad);
    return {
      ok: true,
      data: {
        tullockAlpha: aT,
        differenceAlpha: aD,
        tullockRmse: rmseT,
        differenceRmse: rmseD,
        rmseGain: rmseT - rmseD,
        differenceWins: rmseD < rmseT,
        gameEwp: coef,
        probeEwp: p,
        seasons: seasons.length,
        games: games.length,
      },
    };
  } catch (e) {
    return fail(`pythagorean duel threw: ${errText(e)}`);
  }
}

// ── 14. SEL latent strengths + leakage provenance audit ────────────────────

export interface SelStrengthsResult {
  readonly strengths: readonly TeamStrengths[];
  readonly offenseSum: number;
  readonly defenseMean: number;
  readonly baseProb: number;
  readonly strengthDiff: number;
  readonly homeOffense: number;
  readonly awayDefense: number;
  readonly asOfCount: number;
  /** Features whose data window touches or postdates their target. */
  readonly leaking: readonly FeatureProvenance[];
  readonly brier: number;
}

/**
 * As-of-date least-squares latent offense/defense strengths, the SEL feature
 * vector for one matchup, the leakage provenance audit, and the Brier score.
 * The sum-to-zero identification on offense is VERIFIED, and a feature whose
 * data window touches its target date is reported as leaking, never used.
 */
export function evalSelStrengths(input: {
  readonly games: readonly SelGameResult[];
  readonly targetDate: string;
  readonly hfa?: number;
  readonly minAsOfGames: number;
  readonly probe: { readonly baseProb: number; readonly home: string; readonly away: string };
  readonly provenance?: readonly FeatureProvenance[];
  readonly brier?: { readonly probs: readonly number[]; readonly outcomes: readonly number[] };
}): RatingsEval<SelStrengthsResult> {
  const { games, targetDate, hfa, minAsOfGames, probe, provenance, brier } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  if (typeof targetDate !== "string" || !targetDate) {
    return fail("targetDate must be a non-empty ISO date — an undated as-of cut would leak the whole future");
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || !g.date || !g.home || !g.away || g.home === g.away) {
      return fail(`games[${i}] needs a date and distinct non-empty home/away team ids`);
    }
    if (!Number.isFinite(g.homePoints) || !Number.isFinite(g.awayPoints)) {
      return fail(`games[${i}] points must be finite — an unplayed game is not a 0-0 game`);
    }
  }
  if (hfa !== undefined && !Number.isFinite(hfa)) return fail("hfa must be finite when supplied");
  if (!probe || !probe.home || !probe.away) return fail("probe needs non-empty home and away team ids");
  const pBad = probReason(probe.baseProb, "probe.baseProb");
  if (pBad) return fail(pBad);
  const payload = games.map((g) => ({
    date: g.date,
    home: g.home,
    away: g.away,
    homePoints: g.homePoints,
    awayPoints: g.awayPoints,
  }));
  const past = asOfDate(payload, targetDate);
  const floor = belowMin(past.length, minAsOfGames, "SEL as-of-date strength estimate");
  if (floor) {
    return fail(
      `${floor}; ${games.length} games supplied but only ${past.length} fall strictly before ${targetDate}`,
    );
  }
  try {
    const strengths = estimateStrengths(payload, targetDate, hfa ?? 2.5);
    if (strengths.length === 0) return fail("SEL estimate returned no teams");
    for (const s of strengths) {
      if (!Number.isFinite(s.offense) || !Number.isFinite(s.defense)) {
        return fail(`SEL strength for "${s.team}" is non-finite — a divergent normal-equation solve is not returned`);
      }
    }
    const offenseSum = strengths.reduce((a, s) => a + s.offense, 0);
    if (Math.abs(offenseSum) > 1e-6) {
      return fail(
        `SEL offense strengths are not sum-to-zero identified (sum ${offenseSum}) — the level is unidentified and is not pinned here`,
      );
    }
    const byTeam = new Map(strengths.map((s) => [s.team, s]));
    const home = byTeam.get(probe.home);
    const away = byTeam.get(probe.away);
    if (!home || !away) {
      return fail(
        `probe pair [${probe.home}, ${probe.away}] is not fully covered by the as-of-date estimate — no strength is imputed for an unseen team`,
      );
    }
    const f = selFeatures(probe.baseProb, home, away);
    const featVals = [f.strengthDiff, f.homeOffense, f.awayOffense, f.homeDefense, f.awayDefense];
    if (!allFinite(featVals)) return fail("SEL feature vector contains a non-finite component");
    let leaking: readonly FeatureProvenance[] = [];
    if (provenance) {
      for (let i = 0; i < provenance.length; i++) {
        const pr = provenance[i];
        if (!pr || !pr.feature || !pr.maxDataDate || !pr.targetDate) {
          return fail(`provenance[${i}] needs feature, maxDataDate and targetDate`);
        }
      }
      leaking = auditProvenance([...provenance]);
    }
    let b = 0;
    if (brier) {
      const { probs, outcomes } = brier;
      if (!Array.isArray(probs) || !Array.isArray(outcomes)) return fail("brier inputs must be arrays");
      if (probs.length === 0) return fail("brier needs >= 1 observation");
      if (probs.length !== outcomes.length) return fail("brier probs/outcomes must be the same length");
      for (let i = 0; i < probs.length; i++) {
        const r = probReason(probs[i] as number, `brier probs[${i}]`);
        if (r) return fail(r);
        const y = outcomes[i];
        if (y !== 0 && y !== 1) return fail(`brier outcomes[${i}] must be 0 or 1`);
      }
      b = selBrierScore([...probs], [...outcomes]);
      if (!Number.isFinite(b) || b < 0) return fail(`Brier score is ${String(b)}`);
      if (b > 1) return fail(`Brier score ${b} exceeds 1 — probabilities outside [0,1] were scored`);
    }
    const defenseMean = strengths.reduce((a, s) => a + s.defense, 0) / strengths.length;
    return {
      ok: true,
      data: {
        strengths,
        offenseSum,
        defenseMean,
        baseProb: f.baseProb,
        strengthDiff: f.strengthDiff,
        homeOffense: f.homeOffense,
        awayDefense: f.awayDefense,
        asOfCount: past.length,
        leaking,
        brier: b,
      },
    };
  } catch (e) {
    return fail(
      `SEL strengths threw: ${errText(e)} — a singular normal-equation system means the latent strengths are not identified; no ridge is substituted`,
    );
  }
}

// ── 15. Target-network PageRank (player centrality) ────────────────────────

export interface TargetPagerankResult {
  readonly nodes: number;
  readonly arcs: number;
  readonly centrality: Readonly<Record<string, number>>;
  readonly sum: number;
  readonly residuals: Readonly<Record<string, number>>;
  readonly residualCount: number;
  readonly teamDifferential: number;
  readonly teamA: string;
  readonly teamB: string;
}

/**
 * Build the weighted arc transition matrix, compute IPM-style centrality, the
 * centrality-vs-production residual, and a team centrality differential. Every
 * node's transition row must sum to 1 (dangling nodes teleport, they are not
 * dropped), and centrality must be non-negative and sum to 1.
 */
export function evalTargetPagerank(input: {
  readonly arcs: readonly PlayArc[];
  readonly teamOf: (id: string) => string;
  readonly teamA: string;
  readonly teamB: string;
  readonly production?: Readonly<Record<string, number>>;
  readonly k?: number;
  readonly damping?: number;
  readonly minArcs: number;
}): RatingsEval<TargetPagerankResult> {
  const { arcs, teamOf, teamA, teamB, production, k, damping, minArcs } = input;
  if (!Array.isArray(arcs)) return fail("arcs must be an array");
  const floor = belowMin(arcs.length, minArcs, "target-network PageRank");
  if (floor) return fail(floor);
  if (typeof teamOf !== "function") return fail("teamOf must be a function id -> team id");
  if (!teamA || !teamB || teamA === teamB) return fail("teamA and teamB must be distinct non-empty team ids");
  if (k !== undefined && (!Number.isInteger(k) || k < 1)) return fail("k must be an integer >= 1");
  if (damping !== undefined && (!Number.isFinite(damping) || damping <= 0 || damping >= 1)) {
    return fail("damping must be finite in (0,1)");
  }
  const kinds: ReadonlyArray<string> = ["target", "td", "int"];
  for (let i = 0; i < arcs.length; i++) {
    const a = arcs[i];
    if (!a || !a.from || !a.to) return fail(`arcs[${i}] needs non-empty from/to node ids`);
    if (!kinds.includes(a.kind)) {
      return fail(`arcs[${i}].kind "${String(a.kind)}" is not one of target/td/int — an unknown arc weight is not defaulted`);
    }
  }
  try {
    const { nodes, trans } = buildTransition(
      arcs.map((a) => ({ from: a.from, to: a.to, kind: a.kind })),
    );
    if (nodes.length === 0) return fail("target-network PageRank resolved zero nodes");
    for (const n of nodes) {
      const outs = trans.get(n);
      if (!outs) return fail(`node "${n}" has no transition row — a node with no out-arc must teleport, not be dropped`);
      const psum = outs.reduce((a, e) => a + e.p, 0);
      if (Math.abs(psum - 1) > 1e-9) {
        return fail(`node "${n}" transition row sums to ${psum}, not 1 — the arc normalization is not assumed correct`);
      }
    }
    const centrality = pagerankCentrality(nodes, trans, damping ?? 0.85);
    const bad = ratingMapReason(centrality, "target-network centrality");
    if (bad) return fail(bad);
    const values = Object.values(centrality);
    if (values.some((v) => v < 0)) return fail("target-network centrality produced a negative value");
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      return fail(`target-network centrality sums to ${sum}, not 1 — not renormalized by hand`);
    }
    let residuals: Record<string, number> = {};
    if (production) {
      for (const [k2, v] of Object.entries(production)) {
        if (!Number.isFinite(v)) return fail(`production["${k2}"] must be finite`);
      }
      residuals = centralityResiduals(centrality, production);
      if (Object.keys(residuals).length > 0 && !allFiniteMap(residuals)) {
        return fail("centrality residuals are non-finite");
      }
      if (Object.keys(residuals).length === 0) {
        return fail(
          "centrality residuals are empty: fewer than 3 players appear in both the centrality and the production record — no residual is invented for them",
        );
      }
    }
    const diff = teamCentralityDifferential(centrality, teamOf, teamA, teamB, k ?? 11);
    if (!Number.isFinite(diff)) return fail("team centrality differential is non-finite");
    return {
      ok: true,
      data: {
        nodes: nodes.length,
        arcs: arcs.length,
        centrality,
        sum,
        residuals,
        residualCount: Object.keys(residuals).length,
        teamDifferential: diff,
        teamA,
        teamB,
      },
    };
  } catch (e) {
    return fail(`target-network PageRank threw: ${errText(e)}`);
  }
}

// ── 16. Time-varying-coefficient logistic regression ────────────────────────

export interface TvcResult {
  readonly model: TVCModel;
  readonly staticModel: TVCModel;
  readonly probeProb: number;
  readonly probeProbStatic: number;
  readonly meanLogLoss: number;
  readonly staticMeanLogLoss: number;
  readonly llGain: number;
  /** Largest |beta_k| — the drift term the gate is about. */
  readonly maxDrift: number;
  readonly driftIsZero: boolean;
}

/**
 * Fit the time-varying-coefficient logistic model and its static (week pinned
 * to zero) ablation. `fitTVC` returns null on an empty slate; that is surfaced
 * as a failure, not a zero model. The drift magnitudes are published so a
 * caller can see that the TVC slot is either earning its place or is not.
 */
export function evalTimeVaryingWeights(input: {
  readonly games: readonly TVCGame[];
  readonly probe: { readonly features: readonly number[]; readonly week: number };
  readonly minGames: number;
  readonly l2?: number;
  readonly iters?: number;
}): RatingsEval<TvcResult> {
  const { games, probe, minGames, l2, iters } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "TVC logistic fit");
  if (floor) return fail(floor);
  if (!probe || !Array.isArray(probe.features) || probe.features.length === 0) {
    return fail("probe.features must be a non-empty array");
  }
  if (!Number.isFinite(probe.week)) return fail("probe.week must be finite");
  if (!allFinite(probe.features)) return fail("probe.features must be finite");
  if (l2 !== undefined && (!Number.isFinite(l2) || l2 < 0)) return fail("l2 must be finite and >= 0 when supplied");
  if (iters !== undefined && (!Number.isInteger(iters) || iters < 1)) {
    return fail("iters must be a positive integer when supplied");
  }
  let width: number | null = null;
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || !Array.isArray(g.features) || g.features.length === 0) {
      return fail(`games[${i}] needs a non-empty features array`);
    }
    if (!allFinite(g.features)) return fail(`games[${i}].features must be finite`);
    if (!Number.isFinite(g.week)) return fail(`games[${i}].week must be finite`);
    if (typeof g.homeWin !== "boolean") return fail(`games[${i}].homeWin must be a boolean`);
    if (width === null) width = g.features.length;
    if (g.features.length !== width) {
      return fail(`games[${i}] has ${g.features.length} features, expected ${width} — a shorter vector is not zero-padded`);
    }
  }
  if (probe.features.length !== width) {
    return fail(`probe has ${probe.features.length} features, expected ${width} — predictTVC would throw on a length mismatch`);
  }
  try {
    const payload = games.map((g) => ({
      features: [...g.features],
      week: g.week,
      homeWin: g.homeWin,
      ...(g.regimes ? { regimes: { ...g.regimes } } : {}),
    }));
    const opts = {
      ...(l2 !== undefined ? { l2 } : {}),
      ...(iters !== undefined ? { iters } : {}),
    };
    const model = fitTVC(payload, opts);
    if (!model) {
      return fail("fitTVC returned null — the IRLS fit produced no model, and a null model is not reported as a zero-weight fit");
    }
    const staticModel = fitStatic(payload, opts);
    if (!staticModel) return fail("fitStatic returned null — the ablation fit produced no model to compare against");
    if (!allFinite([...model.alpha, ...model.beta])) {
      return fail("TVC coefficients are non-finite — the IRLS solve diverged and the last iterate is not returned");
    }
    if (!allFinite(staticModel.alpha)) return fail("static ablation coefficients are non-finite");
    const p = predictTVC(model, [...probe.features], probe.week);
    const pBad = probReason(p, "TVC probe probability");
    if (pBad) return fail(pBad);
    const pStatic = predictTVC(staticModel, [...probe.features], probe.week);
    const pStaticBad = probReason(pStatic, "static ablation probe probability");
    if (pStaticBad) return fail(pStaticBad);
    const ll = meanLogLoss(model, payload);
    const llStatic = meanLogLoss(staticModel, payload);
    if (!allFinite([ll, llStatic]) || ll < 0 || llStatic < 0) {
      return fail("TVC log-loss is negative or non-finite");
    }
    let maxDrift = 0;
    for (const b of model.beta) maxDrift = Math.max(maxDrift, Math.abs(b));
    // effectiveWeight must reproduce alpha + beta*week at the probe week.
    const w0 = effectiveWeight(model, 0, probe.week);
    if (!Number.isFinite(w0)) return fail("effectiveWeight is non-finite");
    const expectedW0 = (model.alpha[0] as number) + (model.beta[0] as number) * probe.week;
    if (Math.abs(w0 - expectedW0) > 1e-12) {
      return fail(
        `effectiveWeight disagrees with alpha + beta*week (${w0} vs ${expectedW0}) — the drift readout is recomputed, not trusted`,
      );
    }
    return {
      ok: true,
      data: {
        model,
        staticModel,
        probeProb: p,
        probeProbStatic: pStatic,
        meanLogLoss: ll,
        staticMeanLogLoss: llStatic,
        llGain: llStatic - ll,
        maxDrift,
        driftIsZero: maxDrift < 1e-8,
      },
    };
  } catch (e) {
    return fail(`TVC fit threw: ${errText(e)}`);
  }
}

// ── 17. Unit-level impact scores (L1 / proximal gradient) ──────────────────

export interface UnitImpactResult {
  readonly scores: Readonly<Record<string, number>>;
  readonly units: readonly string[];
  /** Bootstrap 95% credible intervals; fraction excluding zero. */
  readonly intervals: Readonly<Record<string, { readonly score: number; readonly lo: number; readonly hi: number }>>;
  readonly intervalCoverage: number;
  readonly probe: number;
  readonly yearToYear: number;
  readonly mahalanobis: number;
}

/**
 * Fit unit impact scores by proximal gradient on a Laplace penalty, then
 * bootstrap credible intervals with the module's own deterministic LCG seed
 * (never Math.random). The stated gate is that >= 20% of intervals exclude
 * zero; the measured fraction is published rather than assumed.
 */
export function evalUnitImpact(input: {
  readonly drives: readonly DriveObs[];
  readonly minDrives: number;
  readonly lambda?: number;
  readonly nBoot?: number;
  readonly probeUnits: Readonly<Record<string, -1 | 0 | 1>>;
  readonly currentYear?: Readonly<Record<string, number>>;
  readonly priorYear?: Readonly<Record<string, number>>;
  readonly mahalanobisPair?: readonly [readonly number[], readonly number[]];
}): RatingsEval<UnitImpactResult> {
  const { drives, minDrives, lambda, nBoot, probeUnits, currentYear, priorYear, mahalanobisPair } = input;
  if (!Array.isArray(drives)) return fail("drives must be an array");
  const floor = belowMin(drives.length, minDrives, "unit impact fit");
  if (floor) return fail(floor);
  if (lambda !== undefined && (!Number.isFinite(lambda) || lambda < 0)) {
    return fail("lambda must be finite and >= 0 when supplied");
  }
  if (nBoot !== undefined && (!Number.isInteger(nBoot) || nBoot < 2)) {
    return fail("nBoot must be an integer >= 2 when supplied (a 1-draw bootstrap is not an interval)");
  }
  for (let i = 0; i < drives.length; i++) {
    const d = drives[i];
    if (!d || !Number.isFinite(d.wpDelta)) {
      return fail(`drives[${i}].wpDelta must be finite — a missing win-probability change is not a 0 change`);
    }
    if (!d.units || typeof d.units !== "object") return fail(`drives[${i}].units must be a record`);
    for (const [u, sgn] of Object.entries(d.units)) {
      if (sgn !== -1 && sgn !== 0 && sgn !== 1) {
        return fail(`drives[${i}].units["${u}"] must be -1, 0 or 1 — a fractional sign is not imputed`);
      }
    }
  }
  if (!probeUnits || typeof probeUnits !== "object") return fail("probeUnits must be a record");
  for (const [u, sgn] of Object.entries(probeUnits)) {
    if (sgn !== -1 && sgn !== 0 && sgn !== 1) return fail(`probeUnits["${u}"] must be -1, 0 or 1`);
  }
  try {
    const payload = drives.map((d) => ({ wpDelta: d.wpDelta, units: { ...d.units } }));
    const scores = fitImpactScores(payload, lambda ?? 0.01);
    const bad = ratingMapReason(scores, "unit impact scores");
    if (bad) return fail(bad);
    if (Object.values(scores).every((v) => v === 0)) {
      return fail("every unit impact score is exactly 0 — the penalty zeroed the whole fit, which is not a rating");
    }
    const units = Object.keys(scores).sort();
    const intervals = impactScoreIntervals(payload, lambda ?? 0.01, nBoot ?? 200);
    if (Object.keys(intervals).length !== units.length) {
      return fail("bootstrap interval coverage does not match the fitted unit set — intervals are not fabricated for missing units");
    }
    for (const [u, iv] of Object.entries(intervals)) {
      if (!allFinite([iv.score, iv.lo, iv.hi])) {
        return fail(`impact interval for "${u}" is non-finite`);
      }
      if (iv.lo > iv.hi) {
        return fail(`impact interval for "${u}" is inverted (lo ${iv.lo} > hi ${iv.hi})`);
      }
      if (Math.abs(iv.score - (scores[u] as number)) > 1e-9) {
        return fail(`impact interval centre for "${u}" does not match the point score — they are not two views of the same fit`);
      }
    }
    let excluding = 0;
    for (const u of units) {
      const iv = intervals[u];
      if (iv && (iv.lo > 0 || iv.hi < 0)) excluding++;
    }
    const probe = predictWpDelta(scores, { ...probeUnits });
    if (!Number.isFinite(probe)) return fail("unit impact probe produced a non-finite WP delta");
    const yoy =
      currentYear && priorYear ? yearToYearCorrelation(currentYear, priorYear) : Number.NaN;
    if (currentYear && priorYear && !Number.isFinite(yoy)) {
      return fail("year-to-year correlation is non-finite — the stability check is published, not skipped silently");
    }
    let maha = 0;
    if (mahalanobisPair) {
      const [a, b] = mahalanobisPair;
      if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
        return fail("mahalanobisPair must be two non-empty equal-length numeric arrays");
      }
      if (!allFinite(a) || !allFinite(b)) return fail("mahalanobisPair entries must be finite");
      maha = mahalanobisSimilarity(a, b);
      if (!Number.isFinite(maha) || maha < 0) return fail(`mahalanobisSimilarity is ${String(maha)}`);
    }
    return {
      ok: true,
      data: {
        scores,
        units,
        intervals,
        intervalCoverage: excluding / units.length,
        probe,
        yearToYear: yoy,
        mahalanobis: maha,
      },
    };
  } catch (e) {
    return fail(`unit impact threw: ${errText(e)}`);
  }
}

// ── 18. Scoring random walk: antipersistence + restoring force ─────────────

export interface ScoringRandomWalkResult {
  readonly q: number;
  readonly transitions: number;
  readonly restoring: { readonly a: number; readonly b: number; readonly bT: number; readonly bP: number; readonly n: number };
  /** The module's gate: b significantly != 0 at p < 0.01 with the expected sign. */
  readonly gatePasses: boolean;
  readonly probeProbA: number;
  /** True when the kernel's [0.02, 0.98] clamp actually bound. */
  readonly probeWasClamped: boolean;
  readonly unclampedProbe: number;
  readonly sim?: {
    readonly winProbA: number;
    readonly spreadMean: number;
    readonly spreadSd: number;
    readonly totalMean: number;
    readonly totalSd: number;
    readonly sims: number;
  };
}

/**
 * Estimate scoring-event antipersistence and the lead-dependent restoring force,
 * then convert the pregame per-event probability into a next-score probability
 * and (optionally) a seeded rest-of-game simulation.
 *
 * NO SILENT CLAMPING: `nextScoreProbA` clamps to [0.02, 0.98]. The bridge
 * recomputes the raw value and, when the clamp bound, fails closed instead of
 * publishing a valid-looking number the model did not produce.
 */
export function evalScoringRandomWalk(input: {
  readonly events: readonly Scorer[];
  readonly restoring?: {
    readonly leadAtEvent: readonly number[];
    readonly leaderScoredNext: readonly boolean[];
  };
  readonly probe?: {
    readonly leadA: number;
    readonly aJustScored: boolean;
    readonly params: LiveParams;
  };
  readonly sim?: {
    readonly leadA: number;
    readonly aJustScored: boolean;
    readonly params: LiveParams;
    readonly sims: number;
    readonly seed: number;
  };
  readonly minTransitions: number;
  readonly minRestoringObs?: number;
}): RatingsEval<ScoringRandomWalkResult> {
  const { events, restoring, probe, sim, minTransitions, minRestoringObs } = input;
  if (!Array.isArray(events)) return fail("events must be an array of \"A\" | \"B\"");
  for (let i = 0; i < events.length; i++) {
    if (events[i] !== "A" && events[i] !== "B") {
      return fail(`events[${i}] must be "A" or "B" — an unknown scorer is not defaulted`);
    }
  }
  const floor = belowMin(events.length, minTransitions, "antipersistence estimate");
  if (floor) return fail(floor);
  let restoringFit: ScoringRandomWalkResult["restoring"] | null = null;
  let gatePasses = false;
  if (restoring) {
    const { leadAtEvent, leaderScoredNext } = restoring;
    if (!Array.isArray(leadAtEvent) || !Array.isArray(leaderScoredNext)) {
      return fail("restoring inputs must both be arrays");
    }
    if (leadAtEvent.length !== leaderScoredNext.length) {
      return fail("leadAtEvent and leaderScoredNext must be the same length — a misaligned pair is not zipped");
    }
    const rf = belowMin(leadAtEvent.length, minRestoringObs ?? 3, "restoring-force OLS");
    if (rf) return fail(rf);
    for (let i = 0; i < leadAtEvent.length; i++) {
      if (!Number.isFinite(leadAtEvent[i] as number)) {
        return fail(`leadAtEvent[${i}] must be finite — a missing lead is not a 0-point lead`);
      }
      const y = leaderScoredNext[i];
      if (typeof y !== "boolean") return fail(`leaderScoredNext[${i}] must be a boolean`);
    }
  }
  try {
    const anti = estimateAntipersistence([...events]);
    if (!Number.isFinite(anti.q) || anti.q < 0 || anti.q > 1) {
      return fail(`antipersistence q ${String(anti.q)} is outside [0,1] — it is a probability, not a score`);
    }
    if (anti.transitions < minTransitions) {
      return fail(`antipersistence needs >= ${minTransitions} transitions, got ${anti.transitions}`);
    }
    if (restoring) {
      const f = fitRestoringForce(
        [...restoring.leadAtEvent],
        [...restoring.leaderScoredNext],
      );
      if (!allFinite([f.a, f.b, f.bT, f.bP])) {
        return fail(
          "restoring-force OLS returned a non-finite coefficient or t-stat — the design matrix is singular (all leads identical) and no pinv is substituted",
        );
      }
      const pBad = probReason(f.bP, "restoring-force p-value");
      if (pBad) return fail(pBad);
      restoringFit = { a: f.a, b: f.b, bT: f.bT, bP: f.bP, n: f.n };
      gatePasses = f.b !== 0 && f.bP < 0.01;
    }
    const out: ScoringRandomWalkResult = {
      q: anti.q,
      transitions: anti.transitions,
      restoring: restoringFit ?? { a: Number.NaN, b: Number.NaN, bT: Number.NaN, bP: Number.NaN, n: 0 },
      gatePasses,
      probeProbA: Number.NaN,
      probeWasClamped: false,
      unclampedProbe: Number.NaN,
    };
    if (!probe && !sim) {
      return {
        ok: true,
        data: restoringFit
          ? out
          : { ...out, restoring: { a: 0, b: 0, bT: 0, bP: 0, n: 0 } },
      };
    }
    const p = probe ?? sim;
    if (!p) return fail("probe or sim is required once one of them is named");
    const params = p.params;
    if (!params || !allFinite([
      params.perEventProbA,
      params.antipersistShift,
      params.restoringCoef,
      params.pointsPerEvent,
      params.expectedEvents,
    ])) {
      return fail("params (perEventProbA/antipersistShift/restoringCoef/pointsPerEvent/expectedEvents) must be finite");
    }
    if (params.pointsPerEvent <= 0) return fail("pointsPerEvent must be > 0");
    if (params.expectedEvents <= 0) return fail("expectedEvents must be > 0");
    if (!Number.isFinite(p.leadA)) return fail("leadA must be finite");
    if (typeof p.aJustScored !== "boolean") return fail("aJustScored must be a boolean");
    const r = p.aJustScored ? 1 : -1;
    const raw = params.perEventProbA - params.antipersistShift * r - params.restoringCoef * p.leadA;
    if (!Number.isFinite(raw)) return fail("the unclamped next-score probability is non-finite");
    const got = nextScoreProbA(p.leadA, p.aJustScored, params);
    const pGot = probReason(got, "nextScoreProbA");
    if (pGot) return fail(pGot);
    const wasClamped = Math.abs(got - raw) > 1e-12;
    if (wasClamped) {
      return fail(
        `nextScoreProbA clamped the model output: raw ${raw} was published as ${got} — a clamped value is not the model's answer, so it is refused`,
      );
    }
    if (raw <= 0 || raw >= 1) {
      return fail(
        `raw next-score probability ${raw} is outside (0,1) — the kernel's clamp would be hiding an out-of-range model output`,
      );
    }
    const base: ScoringRandomWalkResult = {
      ...out,
      probeProbA: got,
      probeWasClamped: false,
      unclampedProbe: raw,
    };
    if (!sim) return { ok: true, data: base };
    if (!Number.isInteger(sim.sims) || sim.sims < 1) return fail("sims must be a positive integer");
    if (!Number.isInteger(sim.seed) || sim.seed < 0) return fail("seed must be a non-negative integer — a simulation must be reproducible, not Math.random");
    const r2 = simulateRestOfGame(sim.leadA, sim.aJustScored, sim.params, sim.sims, sim.seed);
    if (!allFinite([r2.winProbA, r2.spreadMean, r2.spreadSd, r2.totalMean, r2.totalSd])) {
      return fail("rest-of-game simulation returned a non-finite summary — the sim is not published as a live read");
    }
    const wBad = probReason(r2.winProbA, "rest-of-game win probability");
    if (wBad) return fail(wBad);
    if (r2.spreadSd < 0 || r2.totalSd < 0) return fail("rest-of-game simulation returned a negative standard deviation");
    if (r2.sims !== sim.sims) return fail("rest-of-game simulation did not run the requested number of sims");
    // totalMean is fully determined by the event count: verify, do not assume.
    const expectedTotal = Math.max(1, Math.round(sim.params.expectedEvents)) * sim.params.pointsPerEvent;
    if (Math.abs(r2.totalMean - expectedTotal) > 1e-9) {
      return fail(
        `rest-of-game totalMean ${r2.totalMean} does not match events x points (${expectedTotal}) — the simulation is not behaving as specified`,
      );
    }
    return {
      ok: true,
      data: {
        ...base,
        sim: {
          winProbA: r2.winProbA,
          spreadMean: r2.spreadMean,
          spreadSd: r2.spreadSd,
          totalMean: r2.totalMean,
          totalSd: r2.totalSd,
          sims: r2.sims,
        },
      },
    };
  } catch (e) {
    return fail(`scoring random walk threw: ${errText(e)}`);
  }
}

// ── 19. College ranking sensitivity (EBLUP intervals + rank ranges) ─────────

export interface CollegeSensitivityResult {
  readonly interval: readonly [number, number];
  readonly probe: { readonly lo: number; readonly hi: number; readonly overlapWithAway: number };
  readonly ties: readonly (readonly [string, string])[];
  readonly sosDial: number;
  readonly rankRanges: ReadonlyArray<{ readonly team: string; readonly lo: number; readonly hi: number; readonly specs: number }>;
  readonly nonRobust: readonly string[];
  readonly tiedFraction: number;
}

/**
 * Publish team strengths as EBLUPs with 95% prediction intervals, flag pair
 * overlap above the tie threshold, and run the specification-sensitivity rank
 * range. An inverted or non-finite interval is refused; overlapping pairs are
 * reported as statistically tied rather than resolved by picking one.
 */
export function evalCollegeSensitivity(input: {
  readonly ratings: readonly CollegeTeamRating[];
  readonly probeTeam: string;
  readonly awayTeam: string;
  readonly z?: number;
  readonly tieThreshold?: number;
  readonly nonRobustThreshold?: number;
  readonly teamNames?: readonly string[];
  readonly specRanks?: readonly (readonly number[])[];
  readonly dial?: { readonly winPct: number; readonly sos: number; readonly sigmaT2: number };
  readonly minRatings: number;
}): RatingsEval<CollegeSensitivityResult> {
  const { ratings, probeTeam, awayTeam, z, tieThreshold, nonRobustThreshold, teamNames, specRanks, dial, minRatings } = input;
  if (!Array.isArray(ratings)) return fail("ratings must be an array");
  const floor = belowMin(ratings.length, minRatings, "college EBLUP set");
  if (floor) return fail(floor);
  if (z !== undefined && (!Number.isFinite(z) || z <= 0)) return fail("z must be finite and > 0 when supplied");
  if (tieThreshold !== undefined && (!Number.isFinite(tieThreshold) || tieThreshold < 0 || tieThreshold > 1)) {
    return fail("tieThreshold must be finite in [0,1]");
  }
  if (nonRobustThreshold !== undefined && (!Number.isInteger(nonRobustThreshold) || nonRobustThreshold < 1)) {
    return fail("nonRobustThreshold must be an integer >= 1 when supplied");
  }
  if (!probeTeam || !awayTeam || probeTeam === awayTeam) {
    return fail("probeTeam and awayTeam must be distinct non-empty team ids");
  }
  for (let i = 0; i < ratings.length; i++) {
    const r = ratings[i];
    if (!r || !r.team) return fail(`ratings[${i}].team must be a non-empty id`);
    if (!Number.isFinite(r.eblup)) return fail(`ratings[${i}].eblup must be finite`);
    if (!Number.isFinite(r.se) || r.se < 0) {
      return fail(`ratings[${i}].se must be finite and >= 0 — a negative standard error is not a confidence interval`);
    }
  }
  const seen = new Set<string>();
  for (const r of ratings) {
    if (seen.has(r.team)) return fail(`duplicate team "${r.team}" in the EBLUP set — a duplicate would double-count a prediction interval`);
    seen.add(r.team);
  }
  if (!seen.has(probeTeam) || !seen.has(awayTeam)) {
    return fail("probeTeam and awayTeam must both appear in the EBLUP set — no interval is imputed for an unrated team");
  }
  try {
    const byName = new Map(ratings.map((r) => [r.team, r]));
    const probe = byName.get(probeTeam) as CollegeTeamRating;
    const away = byName.get(awayTeam) as CollegeTeamRating;
    const iv = predictionInterval(probe, z ?? 1.96);
    if (!allFinite([iv[0], iv[1]])) return fail("prediction interval is non-finite");
    if (iv[0] > iv[1]) {
      return fail(`prediction interval for "${probeTeam}" is inverted (${iv[0]} > ${iv[1]})`);
    }
    const overlap = intervalOverlap(probe, away);
    if (!Number.isFinite(overlap) || overlap < 0) {
      return fail(`intervalOverlap is ${String(overlap)} — an overlap fraction cannot be negative`);
    }
    const ties = flagTies(ratings.map((r) => ({ team: r.team, eblup: r.eblup, se: r.se })), tieThreshold ?? 0.5);
    const thr = tieThreshold ?? 0.5;
    for (const [a, b] of ties) {
      const ra = byName.get(a);
      const rb = byName.get(b);
      if (!ra || !rb) return fail(`flagTies returned an unknown team pair (${a}, ${b})`);
      if (intervalOverlap(ra, rb) <= thr) {
        return fail(`flagTies reported (${a}, ${b}) as tied but their overlap is below the threshold — the tie list is recomputed, not trusted`);
      }
    }
    let d = 0;
    if (dial) {
      if (!allFinite([dial.winPct, dial.sos, dial.sigmaT2])) return fail("dial inputs must be finite");
      if (dial.winPct < 0 || dial.winPct > 1) return fail("dial.winPct must be in [0,1]");
      if (dial.sigmaT2 < 0) return fail("dial.sigmaT2 must be >= 0");
      d = sosDial(dial.winPct, dial.sos, dial.sigmaT2);
      const pBad = probReason(d, "sosDial output");
      if (pBad) return fail(pBad);
    }
    let ranges: Array<{ team: string; lo: number; hi: number; specs: number }> = [];
    let nonRobust: readonly string[] = [];
    if (teamNames || specRanks) {
      if (!Array.isArray(teamNames) || !Array.isArray(specRanks)) {
        return fail("teamNames and specRanks must both be arrays when either is supplied");
      }
      if (teamNames.length === 0) return fail("teamNames must be non-empty when supplied");
      if (specRanks.length === 0) return fail("specRanks must be non-empty when supplied");
      for (let s = 0; s < specRanks.length; s++) {
        const row = specRanks[s];
        if (!Array.isArray(row) || row.length !== teamNames.length) {
          return fail(`specRanks[${s}] must have one rank per team (${teamNames.length}) — a short rank row is not padded`);
        }
        for (let t = 0; t < row.length; t++) {
          const v = row[t];
          if (!Number.isFinite(v) || v < 1) {
            return fail(`specRanks[${s}][${t}] must be a finite rank >= 1 — a team missing from a specification is not assigned a rank`);
          }
        }
      }
      ranges = rankRanges([...teamNames], specRanks.map((r) => [...r])).map((r) => ({
        team: r.team,
        lo: r.lo,
        hi: r.hi,
        specs: r.specs,
      }));
      for (const r of ranges) {
        if (r.lo < 1 || r.hi < r.lo) return fail(`rank range for "${r.team}" is invalid (${r.lo}..${r.hi})`);
      }
      nonRobust = flagNonRobust([...teamNames], specRanks.map((r) => [...r]), nonRobustThreshold ?? 3);
      for (const t of nonRobust) {
        const found = ranges.find((r) => r.team === t);
        if (!found) return fail(`flagNonRobust returned an unknown team "${t}"`);
        if (found.hi - found.lo < (nonRobustThreshold ?? 3)) {
          return fail(`flagNonRobust returned "${t}" whose rank range is narrower than the threshold — the flag list is recomputed, not trusted`);
        }
      }
    }
    const maxPairs = (ratings.length * (ratings.length - 1)) / 2;
    return {
      ok: true,
      data: {
        interval: iv,
        probe: { lo: iv[0], hi: iv[1], overlapWithAway: overlap },
        ties: ties.map((t) => [t[0], t[1]] as [string, string]),
        sosDial: d,
        rankRanges: ranges,
        nonRobust,
        tiedFraction: maxPairs > 0 ? ties.length / maxPairs : 0,
      },
    };
  } catch (e) {
    return fail(`college sensitivity threw: ${errText(e)}`);
  }
}

// ── 20. Player-kernel GP team strengths ────────────────────────────────────

export interface PlayerKernelResult {
  readonly kernelAtZero: number;
  readonly trainKernelDiagonal: number;
  readonly posterior: { readonly mean: number; readonly variance: number };
  readonly meanFinite: boolean;
  readonly variancePositive: boolean;
  readonly trainSize: number;
  readonly zDim: number;
}

/**
 * Player-kernel GP overlay: k(z, z') = sigma^2 z'z * exp(-|d - d'|/tau) on the
 * signed snap-share vector, then the GP posterior predictive for a new game's
 * personnel. A singular kernel block (duplicate personnel vectors with no
 * noise) fails closed — a pinv is not substituted.
 */
export function evalPlayerKernelGp(input: {
  readonly train: readonly PersonnelGame[];
  readonly zNew: readonly number[];
  readonly daysAgoNew: number;
  readonly sigma2: number;
  readonly tau: number;
  readonly noise2: number;
  readonly minTrain: number;
}): RatingsEval<PlayerKernelResult> {
  const { train, zNew, daysAgoNew, sigma2, tau, noise2, minTrain } = input;
  if (!Array.isArray(train)) return fail("train must be an array of PersonnelGame");
  const floor = belowMin(train.length, minTrain, "player-kernel GP");
  if (floor) return fail(floor);
  if (!Array.isArray(zNew) || zNew.length === 0) return fail("zNew must be a non-empty signed snap-share vector");
  if (!Number.isFinite(sigma2) || sigma2 <= 0) return fail("sigma2 must be finite and > 0");
  if (!Number.isFinite(tau) || tau <= 0) return fail("tau must be finite and > 0 — a zero time decay relates every game to every other");
  if (!Number.isFinite(noise2) || noise2 < 0) return fail("noise2 must be finite and >= 0");
  if (!Number.isFinite(daysAgoNew)) return fail("daysAgoNew must be finite");
  if (!allFinite(zNew)) return fail("zNew must be finite");
  for (let i = 0; i < train.length; i++) {
    const g = train[i];
    if (!g || !Array.isArray(g.z) || g.z.length === 0) {
      return fail(`train[${i}].z must be a non-empty vector`);
    }
    if (g.z.length !== zNew.length) {
      return fail(
        `train[${i}].z has ${g.z.length} entries, expected ${zNew.length} — a shorter personnel vector is not zero-padded, because a padded player is a fictitious player`,
      );
    }
    if (!allFinite(g.z)) return fail(`train[${i}].z must be finite`);
    if (!Number.isFinite(g.daysAgo)) return fail(`train[${i}].daysAgo must be finite`);
    if (!Number.isFinite(g.margin)) return fail(`train[${i}].margin must be finite — a missing margin is not a 0-margin game`);
  }
  try {
    const kSelf = playerKernel(
      { z: [...zNew], daysAgo: daysAgoNew },
      { z: [...zNew], daysAgo: daysAgoNew },
      sigma2,
      tau,
    );
    if (!Number.isFinite(kSelf) || kSelf <= 0) {
      return fail(`self-kernel k(z,z) is ${String(kSelf)} — a non-positive self-similarity is not a kernel value`);
    }
    const first = train[0] as PersonnelGame;
    const kDiag = playerKernel(first, first, sigma2, tau);
    if (!Number.isFinite(kDiag) || kDiag <= 0) {
      return fail(`train[0] self-kernel is ${String(kDiag)} — a training point with zero self-similarity makes the kernel matrix singular`);
    }
    const pred = gpPredict(
      train.map((g) => ({ z: [...g.z], daysAgo: g.daysAgo, margin: g.margin })),
      [...zNew],
      daysAgoNew,
      sigma2,
      tau,
      noise2,
    );
    if (!Number.isFinite(pred.mean)) {
      return fail("GP posterior mean is non-finite — the linear solve diverged and the last iterate is not returned");
    }
    if (!Number.isFinite(pred.variance) || pred.variance <= 0) {
      return fail(
        `GP posterior variance is ${String(pred.variance)} — a non-positive predictive variance is not published; it is not clamped to a small positive number`,
      );
    }
    return {
      ok: true,
      data: {
        kernelAtZero: kSelf,
        trainKernelDiagonal: kDiag,
        posterior: { mean: pred.mean, variance: pred.variance },
        meanFinite: true,
        variancePositive: true,
        trainSize: train.length,
        zDim: zNew.length,
      },
    };
  } catch (e) {
    return fail(
      `player-kernel GP threw: ${errText(e)} — a singular kernel matrix means the personnel vectors are collinear and the strengths are not identified`,
    );
  }
}

// ── 21. G-Elo diagnostics: log-loss, RPS, ECE, paired tests ────────────────

export interface GEloDiagnostics {
  readonly brier: number;
  readonly logLoss: number;
  readonly rps: number;
  readonly ece: number;
  readonly paired: { readonly t: number; readonly p: number } | null;
  readonly spearman: number;
  readonly normalCdfAtZero: number;
  readonly perfectLogLoss: number;
}

/**
 * The G-Elo diagnostic suite on probabilistic forecasts. Every metric is
 * range-checked against its mathematical bound, and the near-perfect-forecast
 * limit is measured (log-loss of a clipped 1/0 forecast) so a caller can see
 * what "perfect" costs rather than assuming 0.
 */
export function evalGEloDiagnostics(input: {
  readonly probs: readonly number[];
  readonly outcomes: readonly number[];
  readonly categories?: { readonly probs: readonly number[]; readonly outcomeIdx: number };
  readonly pairedDiffs?: readonly number[];
  readonly ranks?: { readonly xs: readonly number[]; readonly ys: readonly number[] };
  readonly bins?: number;
  readonly minObs: number;
}): RatingsEval<GEloDiagnostics> {
  const { probs, outcomes, categories, pairedDiffs, ranks, bins, minObs } = input;
  if (!Array.isArray(probs) || !Array.isArray(outcomes)) return fail("probs and outcomes must be arrays");
  if (probs.length === 0) return fail("probs must be non-empty");
  if (probs.length !== outcomes.length) return fail("probs and outcomes must be the same length");
  const floor = belowMin(probs.length, minObs, "G-Elo diagnostic suite");
  if (floor) return fail(floor);
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (p === undefined || !Number.isFinite(p) || p < 0 || p > 1) {
      return fail(`probs[${i}] = ${String(p)} must be finite in [0,1]`);
    }
    const y = outcomes[i];
    if (y !== 0 && y !== 1) return fail(`outcomes[${i}] must be 0 or 1`);
  }
  if (bins !== undefined && (!Number.isInteger(bins) || bins < 1)) return fail("bins must be an integer >= 1");
  if (pairedDiffs) {
    if (pairedDiffs.length < 2) return fail("pairedDiffs needs >= 2 entries for a paired t-statistic");
    if (!allFinite(pairedDiffs)) return fail("pairedDiffs must be finite");
  }
  if (ranks) {
    if (!Array.isArray(ranks.xs) || !Array.isArray(ranks.ys)) return fail("ranks.xs and ranks.ys must be arrays");
    if (ranks.xs.length !== ranks.ys.length) return fail("ranks.xs and ranks.ys must be the same length");
    if (ranks.xs.length < 2) return fail("Spearman needs >= 2 paired observations");
    if (!allFinite(ranks.xs) || !allFinite(ranks.ys)) return fail("rank inputs must be finite");
  }
  if (categories) {
    const { probs: cps, outcomeIdx } = categories;
    if (!Array.isArray(cps) || cps.length < 2) return fail("category probs must be an array of >= 2 categories");
    for (let i = 0; i < cps.length; i++) {
      const p = cps[i];
      if (p === undefined || !Number.isFinite(p) || p < 0 || p > 1) {
        return fail(`category probs[${i}] must be finite in [0,1]`);
      }
    }
    if (!Number.isInteger(outcomeIdx) || outcomeIdx < 0 || outcomeIdx >= cps.length) {
      return fail(`outcomeIdx must be an integer in [0, ${cps.length - 1}] — an unlisted outcome is not scored`);
    }
  }
  try {
    const b = gEloBrierScore([...probs], [...outcomes]);
    if (!Number.isFinite(b) || b < 0 || b > 1) {
      return fail(`Brier ${String(b)} is outside [0,1] — a squared-error forecast score cannot exceed 1 on [0,1] probabilities`);
    }
    const ll = gEloLogLoss([...probs], [...outcomes]);
    if (!Number.isFinite(ll) || ll < 0) return fail(`log-loss is ${String(ll)}`);
    const rps = rankedProbScore(
      categories ? [...categories.probs] : [probs[0] as number, 1 - (probs[0] as number)],
      categories ? categories.outcomeIdx : (outcomes[0] === 1 ? 0 : 1),
    );
    if (!Number.isFinite(rps) || rps < 0) return fail(`ranked probability score is ${String(rps)}`);
    const ece = eceProbs([...probs], [...outcomes], bins ?? 10);
    if (!Number.isFinite(ece) || ece < 0 || ece > 1) {
      return fail(`ECE ${String(ece)} is outside [0,1] — a calibration gap between probabilities and frequencies cannot exceed 1`);
    }
    // A clipped 0/1 forecast is the practical "perfect" limit; measure it
    // rather than asserting that a perfect forecast scores 0.
    const clippedPerfect = gEloLogLoss(
      probs.map((p) => (p > 0.5 ? 1 : 0)),
      [...outcomes],
    );
    if (!Number.isFinite(clippedPerfect) || clippedPerfect < 0) {
      return fail("clipped perfect-forecast log-loss is non-finite");
    }
    let paired: { t: number; p: number } | null = null;
    if (pairedDiffs) {
      const r = pairedT([...pairedDiffs]);
      if (!Number.isFinite(r.t) || !Number.isFinite(r.p)) return fail("paired t-statistic is non-finite");
      const pBad = probReason(r.p, "paired t p-value");
      if (pBad) return fail(pBad);
      paired = { t: r.t, p: r.p };
    }
    let sp = 0;
    if (ranks) {
      sp = gEloSpearman([...ranks.xs], [...ranks.ys]);
      if (!Number.isFinite(sp) || sp < -1 || sp > 1) {
        return fail(`Spearman ${String(sp)} is outside [-1,1] — a rank correlation cannot exceed that range`);
      }
    }
    const cdf0 = normalCdfLocal(0);
    if (Math.abs(cdf0 - 0.5) > 1e-6) {
      return fail(`normalCdfLocal(0) is ${cdf0}, not 0.5 — the normal CDF is not behaving as specified and no p-value is derived from it`);
    }
    return {
      ok: true,
      data: {
        brier: b,
        logLoss: ll,
        rps,
        ece,
        paired,
        spearman: sp,
        normalCdfAtZero: cdf0,
        perfectLogLoss: clippedPerfect,
      },
    };
  } catch (e) {
    return fail(`G-Elo diagnostics threw: ${errText(e)}`);
  }
}

/** F-beta and class-weighted BCE for the imbalanced rare-event lane. */
export function evalRareEventMetrics(input: {
  readonly precision: number;
  readonly recall: number;
  readonly beta: number;
  readonly p: number;
  readonly y: 0 | 1;
  readonly posWeight: number;
}): RatingsEval<{ readonly fbeta: number; readonly bce: number }> {
  const { precision, recall, beta, p, y, posWeight } = input;
  const nums: ReadonlyArray<readonly [string, number]> = [
    ["precision", precision],
    ["recall", recall],
    ["beta", beta],
    ["p", p],
  ];
  for (const [k, v] of nums) {
    if (!Number.isFinite(v)) return fail(`${k} must be finite`);
  }
  if (precision < 0 || precision > 1) return fail("precision must be in [0,1]");
  if (recall < 0 || recall > 1) return fail("recall must be in [0,1]");
  if (beta <= 0) return fail("beta must be > 0 — a non-positive beta would silently drop recall from the score");
  const pBad = probReason(p, "p");
  if (pBad) return fail(pBad);
  if (y !== 0 && y !== 1) return fail("y must be 0 or 1");
  if (!Number.isFinite(posWeight) || posWeight < 0) return fail("posWeight must be finite and >= 0");
  try {
    const fb = fbeta(precision, recall, beta);
    if (!Number.isFinite(fb) || fb < 0 || fb > 1) {
      return fail(`fbeta is ${String(fb)} — an F-beta score over [0,1] inputs must lie in [0,1]; a 0 denominator would silently report 0`);
    }
    const bce = classWeightedBCE(p, y, posWeight);
    if (!Number.isFinite(bce) || bce < 0) return fail(`class-weighted BCE is ${String(bce)}`);
    return { ok: true, data: { fbeta: fb, bce } };
  } catch (e) {
    return fail(`rare-event metrics threw: ${errText(e)}`);
  }
}

// ── 22. Sparse TVP: ISTA lasso, TV denoise, AR(1)/OU state space ──────────

export interface SparseTvpResult {
  readonly lasso: readonly number[];
  readonly activeLasso: number;
  readonly denoised: readonly number[];
  readonly state: AR1State;
  readonly forecast: { readonly mean: number; readonly variance: number };
  readonly ouForecast: { readonly mean: number; readonly variance: number };
  readonly ouWinProb: number;
  readonly brownianWinProb: number;
  readonly zeroLeadOuWinProb: number;
  readonly zeroLeadBrownianWinProb: number;
}

/**
 * Sparse time-varying-parameter primitives: ISTA lasso, 1-D TV denoise, a
 * scalar AR(1) Kalman update/forecast, and the OU / Brownian in-play win
 * probabilities. Every in-play probability is checked at the zero-lead limit:
 * a fair process must give 0.5 at a tie, and a violation means the process is
 * misparameterised rather than lucky.
 */
export function evalSparseTvp(input: {
  readonly X: readonly (readonly number[])[];
  readonly y: readonly number[];
  readonly signal: readonly number[];
  readonly state: { readonly level: number; readonly variance: number };
  readonly ar: { readonly phi: number; readonly stateVar: number; readonly obsVar: number };
  readonly observation: number;
  readonly ou: { readonly theta: number; readonly sigma: number; readonly tRemain: number };
  readonly lead: number;
  readonly drift: number;
  readonly minRows: number;
  readonly lambda?: number;
  readonly iters?: number;
  readonly denoiseLambda?: number;
}): RatingsEval<SparseTvpResult> {
  const {
    X,
    y,
    signal,
    state,
    ar,
    observation,
    ou,
    lead,
    drift,
    minRows,
    lambda,
    iters,
    denoiseLambda,
  } = input;
  if (!Array.isArray(X) || X.length === 0) return fail("X must be a non-empty design matrix");
  const floor = belowMin(X.length, minRows, "sparse TVP lasso");
  if (floor) return fail(floor);
  if (!Array.isArray(y) || y.length !== X.length) return fail("y must have one entry per design row");
  if (!allFinite(y)) return fail("y must be finite");
  const p = X[0]?.length ?? 0;
  if (p === 0) return fail("design rows must be non-empty");
  for (let i = 0; i < X.length; i++) {
    const row = X[i];
    if (!Array.isArray(row) || row.length !== p) {
      return fail(`X[${i}] must have ${p} columns — a short row is not zero-padded`);
    }
    if (!allFinite(row)) return fail(`X[${i}] must be finite`);
  }
  if (!Array.isArray(signal) || signal.length === 0) return fail("signal must be a non-empty series");
  if (signal.length < 2) return fail("TV denoise needs >= 2 points — a single point has no trend to fuse");
  if (!allFinite(signal)) return fail("signal must be finite");
  if (lambda !== undefined && (!Number.isFinite(lambda) || lambda < 0)) return fail("lambda must be finite and >= 0");
  if (iters !== undefined && (!Number.isInteger(iters) || iters < 1)) return fail("iters must be a positive integer");
  if (denoiseLambda !== undefined && (!Number.isFinite(denoiseLambda) || denoiseLambda < 0)) {
    return fail("denoiseLambda must be finite and >= 0");
  }
  if (!state || !Number.isFinite(state.level) || !Number.isFinite(state.variance) || state.variance < 0) {
    return fail("state needs a finite level and a finite non-negative variance");
  }
  if (!ar || !allFinite([ar.phi, ar.stateVar, ar.obsVar])) {
    return fail("ar needs finite phi/stateVar/obsVar");
  }
  if (ar.stateVar < 0) return fail("ar.stateVar must be >= 0");
  if (ar.obsVar <= 0) return fail("ar.obsVar must be > 0 — a zero observation variance makes the Kalman gain undefined");
  if (!Number.isFinite(observation)) return fail("observation must be finite");
  if (!ou || !allFinite([ou.theta, ou.sigma, ou.tRemain])) return fail("ou needs finite theta/sigma/tRemain");
  if (ou.theta <= 0) return fail("ou.theta must be > 0 — a non-positive mean-reversion speed is not an OU process");
  if (ou.sigma <= 0) return fail("ou.sigma must be > 0");
  if (ou.tRemain < 0) return fail("ou.tRemain must be >= 0");
  if (!Number.isFinite(lead) || !Number.isFinite(drift)) return fail("lead and drift must be finite");
  try {
    const lasso = istaLasso(
      X.map((r) => [...r]),
      [...y],
      lambda ?? 0.01,
      iters ?? 100,
    );
    if (!allFinite(lasso) || lasso.length !== p) {
      return fail(
        "ISTA lasso returned a non-finite or wrong-length coefficient vector — the power-iteration Lipschitz estimate diverged and the last iterate is not returned",
      );
    }
    let active = 0;
    for (const v of lasso) if (v !== 0) active++;
    const denoised = tvDenoise1d([...signal], denoiseLambda ?? 0.5);
    if (!allFinite(denoised) || denoised.length !== signal.length) {
      return fail("TV denoise returned a non-finite or wrong-length series");
    }
    const st = ar1Update(
      { level: state.level, variance: state.variance },
      observation,
      ar.phi,
      ar.stateVar,
      ar.obsVar,
    );
    if (!Number.isFinite(st.level) || !Number.isFinite(st.variance) || st.variance < 0) {
      return fail(`AR(1) update produced an invalid state (level ${st.level}, variance ${st.variance})`);
    }
    const fc = ar1Forecast(st, ar.phi, ar.stateVar);
    if (!allFinite([fc.mean, fc.variance]) || fc.variance < 0) return fail("AR(1) forecast is non-finite");
    const ouf = ouForecast(lead, ou.theta, 0, ou.sigma, ou.tRemain);
    if (!allFinite([ouf.mean, ouf.variance]) || ouf.variance < 0) return fail("OU forecast is non-finite");
    const ouWin = ouWinProb(lead, ou.theta, ou.sigma, ou.tRemain);
    const ouBad = probReason(ouWin, "ouWinProb");
    if (ouBad) return fail(ouBad);
    const brown = brownianWinProb(lead, drift, ou.sigma, ou.tRemain);
    const brownBad = probReason(brown, "brownianWinProb");
    if (brownBad) return fail(brownBad);
    const zeroOu = ouWinProb(0, ou.theta, ou.sigma, ou.tRemain);
    const zeroBrown = brownianWinProb(0, 0, ou.sigma, ou.tRemain);
    if (Math.abs(zeroOu - 0.5) > 1e-6) {
      return fail(`OU win probability at a 0-point tie is ${zeroOu}, not 0.5 — the process is not mean-reverting about zero`);
    }
    if (Math.abs(zeroBrown - 0.5) > 1e-6) {
      return fail(`Brownian win probability at a 0-point tie is ${zeroBrown}, not 0.5 — the process is not centered`);
    }
    return {
      ok: true,
      data: {
        lasso,
        activeLasso: active,
        denoised,
        state: st,
        forecast: fc,
        ouForecast: ouf,
        ouWinProb: ouWin,
        brownianWinProb: brown,
        zeroLeadOuWinProb: zeroOu,
        zeroLeadBrownianWinProb: zeroBrown,
      },
    };
  } catch (e) {
    return fail(`sparse TVP threw: ${errText(e)}`);
  }
}

// ── 23. Paired-comparison least squares with standard errors ───────────────

export interface PairedLsResult {
  readonly teams: readonly string[];
  readonly ratings: readonly number[];
  readonly ses: readonly number[];
  readonly sigma2hat: number;
  readonly ratingSum: number;
  /** max |mu(t) + mu_mirror(t)| under a home/away + sign mirror. */
  readonly mirrorResidual: number;
  readonly probe: { readonly team: string; readonly mu: number; readonly se: number };
  readonly zTest: { readonly z: number; readonly pTwoSided: number; readonly significant95: boolean };
}

/**
 * Least-squares paired-comparison ratings with standard errors, plus the
 * pairwise z-test. The rating vector is pseudo-inverted, so the bridge VERIFIES
 * the zero-sum identification rather than assuming it, and computes a mirror
 * residual (mirror = swap home/away and negate the score) which must be 0 for
 * a zero-sum operator with no home effect.
 */
export function evalPairedLs(input: {
  readonly games: readonly GameScore[];
  readonly minGames: number;
  readonly probeTeam: string;
  readonly vsTeam: string;
  readonly mirrorTolerance?: number;
}): RatingsEval<PairedLsResult> {
  const { games, minGames, probeTeam, vsTeam, mirrorTolerance } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "paired-comparison LS");
  if (floor) return fail(floor);
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || !g.home || !g.away || g.home === g.away) {
      return fail(`games[${i}] needs distinct non-empty home/away team ids`);
    }
    if (!Number.isFinite(g.homeScore) || !Number.isFinite(g.awayScore)) {
      return fail(`games[${i}] scores must be finite — an unplayed game is not a 0-0 game`);
    }
  }
  if (!probeTeam || !vsTeam || probeTeam === vsTeam) {
    return fail("probeTeam and vsTeam must be distinct non-empty team ids");
  }
  const conn = connectivityReason(games);
  if (conn) return fail(`paired-comparison LS: ${conn}`);
  try {
    const payload = games.map((g) => ({
      home: g.home,
      away: g.away,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    }));
    const fit = pairedComparisonLS(payload);
    if (fit.teams.length < 2) return fail("paired-comparison LS resolved fewer than 2 teams");
    if (fit.rating.length !== fit.teams.length || fit.se.length !== fit.teams.length) {
      return fail("paired-comparison LS returned mismatched teams/rating/se lengths");
    }
    const asMap = Object.fromEntries(fit.teams.map((t, i) => [t, fit.rating[i] as number]));
    const bad = ratingMapReason(asMap, "paired-comparison LS ratings");
    if (bad) return fail(bad);
    if (!allFinite(fit.se) || fit.se.some((s) => s < 0)) {
      return fail("paired-comparison LS standard errors are negative or non-finite — a squared variance is never negative");
    }
    if (!Number.isFinite(fit.sigma2hat) || fit.sigma2hat < 0) {
      return fail(`residual variance sigma2hat is ${String(fit.sigma2hat)} — it must be finite and >= 0`);
    }
    const sum = fit.rating.reduce((a, b) => a + b, 0);
    if (Math.abs(sum) > 1e-6) {
      return fail(
        `paired-comparison ratings are not zero-sum identified (sum ${sum}) — the level is unidentified and is not pinned by the bridge`,
      );
    }
    // Mirror: swap home/away and negate the score differential. A zero-sum
    // operator with no home effect must return the negated rating vector.
    const mirrored = payload.map((g) => ({
      home: g.away,
      away: g.home,
      homeScore: -g.homeScore,
      awayScore: -g.awayScore,
    }));
    const mFit = pairedComparisonLS(mirrored);
    let mirrorResidual = 0;
    for (let t = 0; t < fit.teams.length; t++) {
      const team = fit.teams[t] as string;
      const mi = mFit.teams.indexOf(team);
      if (mi < 0) return fail(`mirror refit lost team "${team}" — the residual cannot be compared across team sets`);
      mirrorResidual = Math.max(
        mirrorResidual,
        Math.abs((fit.rating[t] as number) + (mFit.rating[mi] as number)),
      );
    }
    const tol = mirrorTolerance ?? 1e-6;
    if (mirrorResidual > tol) {
      return fail(
        `paired-comparison zero-sum update is not home/away symmetric: mirror residual ${mirrorResidual} exceeds ${tol}`,
      );
    }
    const pi = fit.teams.indexOf(probeTeam);
    const vi = fit.teams.indexOf(vsTeam);
    if (pi < 0 || vi < 0) {
      return fail(`probe pair [${probeTeam}, ${vsTeam}] is not in the fitted team set — no comparison is made for an unknown team`);
    }
    const z = pairwiseZTest(
      fit.rating[pi] as number,
      fit.rating[vi] as number,
      (fit.se[pi] as number) ** 2,
      (fit.se[vi] as number) ** 2,
    );
    if (!Number.isFinite(z.z)) return fail("pairwise z-test returned a non-finite z");
    const pBad = probReason(z.pTwoSided, "pairwise z p-value");
    if (pBad) return fail(pBad);
    if (z.significant95 !== (z.pTwoSided < 0.05)) {
      return fail("the significance flag disagrees with the p-value it is derived from");
    }
    return {
      ok: true,
      data: {
        teams: fit.teams,
        ratings: fit.rating,
        ses: fit.se,
        sigma2hat: fit.sigma2hat,
        ratingSum: sum,
        mirrorResidual,
        probe: { team: probeTeam, mu: fit.rating[pi] as number, se: fit.se[pi] as number },
        zTest: { z: z.z, pTwoSided: z.pTwoSided, significant95: z.significant95 },
      },
    };
  } catch (e) {
    return fail(
      `paired-comparison LS threw: ${errText(e)} — a singular information matrix means the ratings are not identified; no pinv is substituted`,
    );
  }
}

// ── 24. Q-index and parity regime ──────────────────────────────────────────

export interface QIndexResult {
  readonly q: number;
  readonly regime: ParityRegime;
  readonly expected: number;
  readonly actual: number;
  readonly deviation: number;
  readonly rolling: readonly number[];
  readonly windows: number;
}

/**
 * Q-index (actual upsets / expected upsets) with its parity regime, plus the
 * rolling q-index over weekly pairs. The rolling series is recomputed from the
 * weekly inputs so a window bug cannot hide behind the module's own output.
 */
export function evalQIndex(input: {
  readonly actualUpsets: number;
  readonly expectedUpsets: number;
  readonly band?: number;
  readonly weekly?: ReadonlyArray<readonly [number, number]>;
  readonly window?: number;
  readonly minWeeks?: number;
}): RatingsEval<QIndexResult> {
  const { actualUpsets, expectedUpsets, band, weekly, window, minWeeks } = input;
  if (!Number.isFinite(actualUpsets) || actualUpsets < 0) {
    return fail("actualUpsets must be finite and >= 0");
  }
  if (!Number.isFinite(expectedUpsets) || expectedUpsets <= 0) {
    return fail("expectedUpsets must be finite and > 0 — a q-index against zero expected upsets is infinite, and is refused rather than reported as a number");
  }
  if (band !== undefined && (!Number.isFinite(band) || band < 0 || band > 1)) {
    return fail("band must be finite in [0,1]");
  }
  if (weekly) {
    if (!Array.isArray(weekly)) return fail("weekly must be an array of [actual, expected] pairs");
    if (window !== undefined && (!Number.isInteger(window) || window < 1)) {
      return fail("window must be an integer >= 1 when supplied");
    }
    const wf = belowMin(weekly.length, minWeeks ?? 2, "rolling q-index");
    if (wf) return fail(wf);
    for (let i = 0; i < weekly.length; i++) {
      const w = weekly[i];
      if (!Array.isArray(w) || w.length !== 2) return fail(`weekly[${i}] must be an [actual, expected] pair`);
      const a = w[0];
      const e = w[1];
      if (a === undefined || !Number.isFinite(a) || a < 0) return fail(`weekly[${i}] actual must be finite and >= 0`);
      if (e === undefined || !Number.isFinite(e) || e <= 0) {
        return fail(`weekly[${i}] expected must be finite and > 0 — a window with zero expected upsets has no q-index`);
      }
    }
  }
  try {
    const q = qIndex(actualUpsets, expectedUpsets);
    if (!Number.isFinite(q) || q < 0) {
      return fail(`q-index is ${String(q)} — it is actual/expected and must be finite and >= 0`);
    }
    const b = band ?? 0.3;
    const regime = parityRegime(q, b);
    const rolling: number[] = [];
    if (weekly) {
      const w = window ?? 4;
      const got = rollingQIndex(weekly, w);
      if (!allFinite(got) || got.length !== weekly.length) {
        return fail("rolling q-index returned a non-finite or wrong-length series");
      }
      for (let i = 0; i < weekly.length; i++) {
        const slice = weekly.slice(Math.max(0, i - w + 1), i + 1);
        const a = slice.reduce((s, pair) => s + (pair[0] as number), 0);
        const e = slice.reduce((s, pair) => s + (pair[1] as number), 0);
        const expect = e > 0 ? a / e : 1;
        if (Math.abs((got[i] as number) - expect) > 1e-12) {
          return fail(
            `rollingQIndex[${i}] is ${got[i]} but the window sum gives ${expect} — the rolling window is recomputed, not trusted`,
          );
        }
        rolling.push(got[i] as number);
      }
    }
    return {
      ok: true,
      data: {
        q,
        regime,
        expected: expectedUpsets,
        actual: actualUpsets,
        deviation: actualUpsets - expectedUpsets,
        rolling,
        windows: rolling.length,
      },
    };
  } catch (e) {
    return fail(`q-index threw: ${errText(e)}`);
  }
}

// ── 25. Upset parity prior + shrink-to-parity ──────────────────────────────

export interface UpsetParityResult {
  readonly priorAtPickEm: number;
  readonly priorOnFav: number;
  readonly priorOnDog: number;
  readonly shrunk: number;
  readonly weight: number;
  readonly expectedUpsets: number;
  readonly eloDiffs: number;
}

/**
 * Logistic upset prior (0.5 at pick'em, decaying in the rating differential),
 * the shrink-to-parity blend, and the expected-upset count for a slate. The
 * 0.5-at-pick'em limit is verified, and the prior must decay with the
 * differential: a prior that rises for a bigger favourite would be a sign error
 * dressed as a model.
 */
export function evalUpsetParity(input: {
  readonly eloDiff: number;
  readonly scale?: number;
  readonly weight?: number;
  readonly modelUpsetProb?: number;
  readonly slate?: readonly number[];
  readonly minSlate?: number;
}): RatingsEval<UpsetParityResult> {
  const { eloDiff, scale, weight, modelUpsetProb, slate, minSlate } = input;
  if (!Number.isFinite(eloDiff)) return fail("eloDiff must be finite — a missing rating differential has no prior");
  if (scale !== undefined && (!Number.isFinite(scale) || scale <= 0)) {
    return fail("scale must be finite and > 0 when supplied");
  }
  if (weight !== undefined && (!Number.isFinite(weight) || weight < 0 || weight > 1)) {
    return fail("weight must be finite in [0,1] when supplied");
  }
  if (modelUpsetProb !== undefined) {
    const bad = probReason(modelUpsetProb, "modelUpsetProb");
    if (bad) return fail(bad);
  }
  if (slate) {
    if (!Array.isArray(slate)) return fail("slate must be an array of rating differentials");
    const f = belowMin(slate.length, minSlate ?? 1, "expected-upsets slate");
    if (f) return fail(f);
    for (let i = 0; i < slate.length; i++) {
      if (!Number.isFinite(slate[i] as number)) return fail(`slate[${i}] must be finite`);
    }
  }
  try {
    const s = scale ?? 120;
    const atPickEm = upsetParityPrior(0, s);
    if (Math.abs(atPickEm - 0.5) > 1e-12) {
      return fail(`upsetParityPrior at pick'em is ${atPickEm}, not 0.5 — the prior is not centered on a coin flip`);
    }
    const onFav = upsetParityPrior(200, s);
    const onDog = upsetParityPrior(-200, s);
    if (!(onFav < 0.5 && onDog >= 0.5)) {
      return fail(
        `the upset prior does not decay in the favourite's favour (fav ${onFav}, dog ${onDog}) — a prior that rises with a bigger edge is a sign error, not a model`,
      );
    }
    if (modelUpsetProb === undefined) {
      return fail("modelUpsetProb is required — the prior alone is not a shrunk model probability");
    }
    const w = weight ?? 0.25;
    const shrunk = shrinkToParity(modelUpsetProb, eloDiff, w, s);
    const sBad = probReason(shrunk, "shrinkToParity output");
    if (sBad) return fail(sBad);
    // The blend is a convex combination: recompute, do not assume.
    const priorHere = upsetParityPrior(eloDiff, s);
    const expect = (1 - w) * Math.min(Math.max(modelUpsetProb, 0), 1) + w * priorHere;
    if (Math.abs(shrunk - expect) > 1e-12) {
      return fail(`shrinkToParity returned ${shrunk} but the convex blend gives ${expect}`);
    }
    if (weight === 0 && Math.abs(shrunk - modelUpsetProb) > 1e-12) {
      return fail("shrinkToParity with weight 0 changed the model probability — a no-op shrink is not a no-op");
    }
    const diffs = slate ?? [eloDiff];
    const expUpsets = expectedUpsets([...diffs], s);
    if (!Number.isFinite(expUpsets) || expUpsets < 0) {
      return fail(`expectedUpsets is ${String(expUpsets)} — an expected upset count cannot be negative`);
    }
    if (expUpsets > diffs.length + 1e-9) {
      return fail(
        `expectedUpsets ${expUpsets} exceeds the ${diffs.length} games on the slate — the prior cannot exceed 1 per game`,
      );
    }
    return {
      ok: true,
      data: {
        priorAtPickEm: atPickEm,
        priorOnFav: onFav,
        priorOnDog: onDog,
        shrunk,
        weight: w,
        expectedUpsets: expUpsets,
        eloDiffs: diffs.length,
      },
    };
  } catch (e) {
    return fail(`upset parity threw: ${errText(e)}`);
  }
}

// ── 26. Win-strength diagnostic (schedule-strength adjusted record) ───────

export interface WinStrengthResult {
  readonly rawWinPct: number;
  readonly adjustedWinPct: number;
  readonly gap: number;
  readonly strengthAdjustedWins: number;
  readonly games: number;
  readonly wins: number;
  readonly weakSchedule: boolean;
}

/**
 * Compare a team's raw win rate against its opponent-strength-adjusted win rate.
 * The two are computed independently and the gap recomputed, so a sign flip in
 * the diagnostic cannot be published as "the record overstates strength".
 */
export function evalWinStrength(input: {
  readonly games: readonly GameForStrength[];
  readonly minGames: number;
  readonly materialGap?: number;
}): RatingsEval<WinStrengthResult> {
  const { games, minGames, materialGap } = input;
  if (!Array.isArray(games)) return fail("games must be an array");
  const floor = belowMin(games.length, minGames, "win-strength diagnostic");
  if (floor) return fail(floor);
  if (materialGap !== undefined && (!Number.isFinite(materialGap) || materialGap < 0)) {
    return fail("materialGap must be finite and >= 0 when supplied");
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!g || typeof g.won !== "boolean") return fail(`games[${i}].won must be a boolean — a non-decided game is not a loss`);
    if (!Number.isFinite(g.oppWinPct)) {
      return fail(`games[${i}].oppWinPct must be finite — a missing opponent win rate is not a 0.500 opponent`);
    }
    if (g.oppWinPct < 0 || g.oppWinPct > 1) {
      return fail(`games[${i}].oppWinPct = ${g.oppWinPct} is outside [0,1] — a win rate outside that range is not imputed`);
    }
  }
  try {
    const payload = games.map((g) => ({ won: g.won, oppWinPct: g.oppWinPct }));
    const saw = strengthAdjustedWins(payload);
    if (!Number.isFinite(saw) || saw < 0) {
      return fail(`strengthAdjustedWins is ${String(saw)} — it is a sum of opponent win rates over wins and cannot be negative`);
    }
    if (saw > games.length + 1e-9) {
      return fail(
        `strengthAdjustedWins ${saw} exceeds the ${games.length} games played — the adjustment is bounded by the game count`,
      );
    }
    const raw = rawWinPct(payload);
    const rBad = probReason(raw, "rawWinPct");
    if (rBad) return fail(rBad);
    const ws = winStrengthGap(payload);
    if (!allFinite([ws.rawWinPct, ws.adjustedWinPct, ws.gap])) {
      return fail("win-strength gap returned a non-finite component");
    }
    if (ws.rawWinPct < 0 || ws.rawWinPct > 1) return fail("win-strength raw win pct is outside [0,1]");
    if (ws.adjustedWinPct < 0 || ws.adjustedWinPct > 1) {
      return fail("win-strength adjusted win pct is outside [0,1]");
    }
    if (Math.abs(ws.gap - (ws.rawWinPct - ws.adjustedWinPct)) > 1e-12) {
      return fail(
        `win-strength gap ${ws.gap} is not raw - adjusted (${ws.rawWinPct - ws.adjustedWinPct}) — the diagnostic sign is recomputed, not trusted`,
      );
    }
    const adjusted = games.length === 0 ? 0 : saw / games.length;
    if (Math.abs(ws.adjustedWinPct - adjusted) > 1e-12) {
      return fail(`adjustedWinPct ${ws.adjustedWinPct} does not equal strengthAdjustedWins / games (${adjusted})`);
    }
    const mg = materialGap ?? 0.05;
    return {
      ok: true,
      data: {
        rawWinPct: ws.rawWinPct,
        adjustedWinPct: ws.adjustedWinPct,
        gap: ws.gap,
        strengthAdjustedWins: saw,
        games: games.length,
        wins: payload.filter((g) => g.won).length,
        weakSchedule: ws.gap >= mg,
      },
    };
  } catch (e) {
    return fail(`win-strength diagnostic threw: ${errText(e)}`);
  }
}
