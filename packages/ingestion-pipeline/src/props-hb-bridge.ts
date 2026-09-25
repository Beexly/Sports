/**
 * Props-HB bridge â€” wires the hierarchical Bayes prop models
 * (edge-lab/props-hb.ts + props-hb-*) into the live props slate.
 *
 * fitGroupPrior â†’ posteriorRate â†’ probOver is the real computation that
 * produces `modelProbOver` for gateProp. Fail-closed on missing samples.
 */

import {
  fitGroupPrior,
  posteriorRate,
  propsHbProbOver as probOver,
  probOverContinuous,
  shrinkageReport,
  type RateSample,
  type GammaPrior,
  type GammaPosterior,
} from "@sports/prediction-engine";

export interface PlayerRateHistory {
  readonly playerId: string;
  readonly propType: string;
  /** Per-game counting totals (e.g. receptions per game). */
  readonly samples: readonly RateSample[];
  /** The posted line (e.g. 5.5 receptions). */
  readonly line: number;
  /** How many games the upcoming contest represents (default 1). */
  readonly games?: number;
}

export interface PropHbEstimate {
  readonly playerId: string;
  readonly propType: string;
  readonly prior: GammaPrior;
  readonly posterior: GammaPosterior;
  readonly pOver: number;
  readonly pUnder: number;
  readonly line: number;
  readonly shrinkage: ReturnType<typeof shrinkageReport>;
}

export type PropHbResult =
  | { readonly ok: true; readonly data: PropHbEstimate }
  | { readonly ok: false; readonly reason: string };

/**
 * Fit a hierarchical Bayes P(over) for one player prop.
 * Null when the player has no samples or the prior cannot be fit â€”
 * never invents a probability.
 */
export function estimatePropOver(input: PlayerRateHistory): PropHbResult {
  if (!input || !Array.isArray(input.samples) || input.samples.length === 0) {
    return { ok: false, reason: "no rate samples â€” not imputed" };
  }
  if (!Number.isFinite(input.line)) {
    return { ok: false, reason: "line must be finite" };
  }
  const games = input.games ?? 1;
  if (!Number.isFinite(games) || games <= 0) {
    return { ok: false, reason: "games must be > 0" };
  }

  try {
    const prior = fitGroupPrior(input.samples);
    if (!prior) {
      return { ok: false, reason: "fitGroupPrior returned null (insufficient data)" };
    }

    const playerTotal = input.samples.reduce((s, x) => s + x.total, 0);
    const playerGames = input.samples.reduce((s, x) => s + x.games, 0);
    const posterior = posteriorRate(prior, playerTotal, playerGames);
    const pOver = probOver(posterior, input.line, games);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "probOver returned value outside [0,1]" };
    }

    return {
      ok: true,
      data: {
        playerId: input.playerId,
        propType: input.propType,
        prior,
        posterior,
        pOver: Number(pOver.toFixed(6)),
        pUnder: Number((1 - pOver).toFixed(6)),
        line: input.line,
        shrinkage: shrinkageReport(prior, input.samples),
      },
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Batch version â€” returns a modelProbOver map keyed by `${playerId}:${propType}`
 * ready for `runPropsSlate`. Players that fail are omitted (not imputed).
 */
export function buildModelProbOver(
  histories: readonly PlayerRateHistory[],
): {
  readonly modelProbOver: Record<string, number>;
  readonly failures: readonly { readonly key: string; readonly reason: string }[];
} {
  const modelProbOver: Record<string, number> = {};
  const failures: { key: string; reason: string }[] = [];

  for (const h of histories) {
    const key = `${h.playerId}:${h.propType}`;
    const r = estimatePropOver(h);
    if (r.ok) {
      modelProbOver[key] = r.data.pOver;
    } else {
      failures.push({ key, reason: r.reason });
    }
  }

  return { modelProbOver, failures };
}

export {
  fitGroupPrior,
  posteriorRate,
  propsHbProbOver as probOver,
  probOverContinuous,
  shrinkageReport,
};
export type { RateSample, GammaPrior, GammaPosterior };

// ── Per-stat hierarchical Bayes models (live call sites) ────────────────────

import {
  fitYardsPerAttemptPrior,
  posteriorYardsPerAttempt,
  probOverRushYardsGivenAttempts,
} from "@sports/prediction-engine";
import {
  fitPassYardsPerAttemptPrior,
  posteriorPassYardsPerAttempt,
  probOverPassYardsGivenAttempts,
} from "@sports/prediction-engine";
import {
  fitCatchPrior,
  posteriorCatch,
  betaBinomialProbOver,
} from "@sports/prediction-engine";
import {
  fitRecTdPerTargetPrior,
  posteriorRecTdPerTarget,
  probRecTdGivenTargets,
} from "@sports/prediction-engine";

export type PropStatEstimate =
  | { readonly ok: true; readonly pOver: number; readonly pUnder: number }
  | { readonly ok: false; readonly reason: string };

/**
 * P(rush yards over line) from yards-per-attempt prior + attempt exposure.
 */
export function estimateRushYardsOver(input: {
  readonly samples: readonly { readonly games: number; readonly attempts: number; readonly yards: number }[];
  readonly playerAttempts: number;
  readonly playerYards: number;
  readonly playerGames: number;
  readonly line: number;
  readonly attemptsNextGame: number;
}): PropStatEstimate {
  const { samples, playerAttempts, playerYards, playerGames, line, attemptsNextGame } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "rush samples empty" };
  }
  if (!Number.isFinite(line) || !Number.isFinite(attemptsNextGame) || attemptsNextGame <= 0) {
    return { ok: false, reason: "line and attemptsNextGame must be finite, attempts > 0" };
  }
  try {
    const prior = fitYardsPerAttemptPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitYardsPerAttemptPrior returned null" };
    const post = posteriorYardsPerAttempt(prior, {
      attempts: playerAttempts,
      yards: playerYards,
      games: playerGames,
    } as never);
    const pOver = probOverRushYardsGivenAttempts(post, attemptsNextGame, line);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "probOverRushYardsGivenAttempts out of [0,1]" };
    }
    return { ok: true, pOver: Number(pOver.toFixed(6)), pUnder: Number((1 - pOver).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(pass yards over line) from yards-per-attempt prior + attempt exposure.
 */
export function estimatePassYardsOver(input: {
  readonly samples: readonly { readonly games: number; readonly attempts: number; readonly yards: number }[];
  readonly playerAttempts: number;
  readonly playerYards: number;
  readonly playerGames: number;
  readonly line: number;
  readonly attemptsNextGame: number;
}): PropStatEstimate {
  const { samples, playerAttempts, playerYards, playerGames, line, attemptsNextGame } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "pass samples empty" };
  }
  if (!Number.isFinite(line) || !Number.isFinite(attemptsNextGame) || attemptsNextGame <= 0) {
    return { ok: false, reason: "line and attemptsNextGame must be finite, attempts > 0" };
  }
  try {
    const prior = fitPassYardsPerAttemptPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitPassYardsPerAttemptPrior returned null" };
    const post = posteriorPassYardsPerAttempt(prior, {
      attempts: playerAttempts,
      yards: playerYards,
      games: playerGames,
    } as never);
    const pOver = probOverPassYardsGivenAttempts(post, attemptsNextGame, line);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "probOverPassYardsGivenAttempts out of [0,1]" };
    }
    return { ok: true, pOver: Number(pOver.toFixed(6)), pUnder: Number((1 - pOver).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(receptions over line) from a Beta catch-rate prior + target exposure.
 */
export function estimateReceptionsOver(input: {
  readonly samples: readonly { readonly receptions: number; readonly targets: number }[];
  readonly playerReceptions: number;
  readonly playerTargets: number;
  readonly line: number;
  readonly targetsNextGame: number;
}): PropStatEstimate {
  const { samples, playerReceptions, playerTargets, line, targetsNextGame } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "catch samples empty" };
  }
  if (!Number.isFinite(line) || !Number.isFinite(targetsNextGame) || targetsNextGame <= 0) {
    return { ok: false, reason: "line and targetsNextGame must be finite, targets > 0" };
  }
  try {
    const prior = fitCatchPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitCatchPrior returned null" };
    const post = posteriorCatch(prior, playerReceptions, playerTargets);
    const pOver = betaBinomialProbOver(post, line, targetsNextGame);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "betaBinomialProbOver out of [0,1]" };
    }
    return { ok: true, pOver: Number(pOver.toFixed(6)), pUnder: Number((1 - pOver).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(receiving TD) from a Gamma per-target prior + target exposure.
 * Returns P(TD > 0) — the anytime-TD probability.
 */
export function estimateRecTdProb(input: {
  readonly samples: readonly { readonly recTds: number; readonly targets: number }[];
  readonly playerRecTds: number;
  readonly playerTargets: number;
  readonly targetsNextGame: number;
}): PropStatEstimate {
  const { samples, playerRecTds, playerTargets, targetsNextGame } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "rec-td samples empty" };
  }
  if (!Number.isFinite(targetsNextGame) || targetsNextGame <= 0) {
    return { ok: false, reason: "targetsNextGame must be > 0" };
  }
  try {
    const prior = fitRecTdPerTargetPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitRecTdPerTargetPrior returned null" };
    const post = posteriorRecTdPerTarget(prior, {
      recTds: playerRecTds,
      targets: playerTargets,
    } as never);
    const pTd = probRecTdGivenTargets(post, targetsNextGame);
    if (!Number.isFinite(pTd) || pTd < 0 || pTd > 1) {
      return { ok: false, reason: "probRecTdGivenTargets out of [0,1]" };
    }
    return { ok: true, pOver: Number(pTd.toFixed(6)), pUnder: Number((1 - pTd).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}


// ── Bind-layer wrappers (covariate bus -> per-stat models) ─────────────────
// Every bind fail-closes: missing prior row / non-finite covariate drops the
// sample. Nothing is imputed. Bridge callers see ok:false with a reason.

import {
  bindRushYardsSamples,
  bindSepSamples,
  bindYacSamples,
  bindCatchCushionSamples,
  bindCompAirYardsDiffSamples,
  bindCpoeCompSamples,
  bindIntSamples,
  bindRecTdCushionSamples,
  bindSackTttSamples,
  type RushYardsBindRequest,
  type SepBindRequest,
  type YacBindRequest,
  type CatchCushionBindRequest,
  type CompAirYardsDiffBindRequest,
  type CpoeCompBindRequest,
  type IntBindRequest,
  type RecTdCushionBindRequest,
  type SackTttBindRequest,
  type CovariateRow,
} from "@sports/prediction-engine";

export type BindBatchResult<T> =
  | {
      readonly ok: true;
      readonly bound: readonly T[];
      readonly dropped: readonly { readonly index: number; readonly refuse: string }[];
    }
  | { readonly ok: false; readonly reason: string };

function foldBindBatch<T>(
  results: readonly { readonly ok: boolean; readonly refuse?: string }[],
  bound: readonly T[],
): BindBatchResult<T> {
  const dropped: { index: number; refuse: string }[] = [];
  results.forEach((r, index) => {
    if (!r.ok) dropped.push({ index, refuse: r.refuse ?? "unknown" });
  });
  return { ok: true, bound, dropped };
}

/** Bind rush-yards samples via the covariate bus. Dropped rows are not imputed. */
export function evalBindRushYards(
  rows: readonly CovariateRow[],
  requests: readonly RushYardsBindRequest[],
): BindBatchResult<ReturnType<typeof bindRushYardsSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindRushYardsSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind aDOTxSEP catch samples via sepForKickoff. Fail-closed. */
export function evalBindSep(
  rows: readonly CovariateRow[],
  requests: readonly SepBindRequest[],
): BindBatchResult<ReturnType<typeof bindSepSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindSepSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind air+YAC samples via avgYac. Fail-closed. */
export function evalBindYac(
  rows: readonly CovariateRow[],
  requests: readonly YacBindRequest[],
): BindBatchResult<ReturnType<typeof bindYacSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindYacSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind catch samples via avgCushion. Fail-closed. */
export function evalBindCatchCushion(
  rows: readonly CovariateRow[],
  requests: readonly CatchCushionBindRequest[],
): BindBatchResult<ReturnType<typeof bindCatchCushionSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindCatchCushionSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind completion samples via avgAirYardsDifferential. Fail-closed. */
export function evalBindCompAirYardsDiff(
  rows: readonly CovariateRow[],
  requests: readonly CompAirYardsDiffBindRequest[],
): BindBatchResult<ReturnType<typeof bindCompAirYardsDiffSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindCompAirYardsDiffSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind completion samples via GSE-CPOE + TTT + intended air yards. Fail-closed. */
export function evalBindCpoeComp(
  rows: readonly CovariateRow[],
  requests: readonly CpoeCompBindRequest[],
): BindBatchResult<ReturnType<typeof bindCpoeCompSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindCpoeCompSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind INT samples via TTT + aggressiveness. Fail-closed. */
export function evalBindInt(
  rows: readonly CovariateRow[],
  requests: readonly IntBindRequest[],
): BindBatchResult<ReturnType<typeof bindIntSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindIntSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind rec-TD samples via avgCushion. Fail-closed. */
export function evalBindRecTdCushion(
  rows: readonly CovariateRow[],
  requests: readonly RecTdCushionBindRequest[],
): BindBatchResult<ReturnType<typeof bindRecTdCushionSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindRecTdCushionSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Bind sack samples via avgTimeToThrow. Fail-closed. */
export function evalBindSackTtt(
  rows: readonly CovariateRow[],
  requests: readonly SackTttBindRequest[],
): BindBatchResult<ReturnType<typeof bindSackTttSamples>[number]> {
  if (!Array.isArray(rows) || !Array.isArray(requests)) {
    return { ok: false, reason: "rows/requests must be arrays" };
  }
  try {
    const results = bindSackTttSamples(rows, requests);
    const bound = results.filter((r) => r.ok).map((r) => (r as { sample: unknown }).sample);
    return foldBindBatch(results, bound as never);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Per-stat estimators (live call sites for the remaining HB models) ──────

import {
  fitCompletionPrior,
  posteriorCompletion,
  betaBinomialProbOverCompletions,
  fitIntPerAttemptPrior,
  posteriorIntPerAttempt,
  probIntGivenAttempts,
  fitPassTdPerAttemptPrior,
  posteriorPassTdPerAttempt,
  probPassTdGivenAttempts,
  fitRushAttemptsPrior,
  posteriorRushAttempts,
  probOverRushAttempts,
  fitRushTdPerAttemptPrior,
  posteriorRushTdPerAttempt,
  probRushTdGivenAttempts,
  fitSackPrior,
  posteriorSack,
  betaBinomialProbOverSacks,
  fitTdPerTouchPrior,
  posteriorTdPerTouch,
  probAnytimeTdGivenTouches,
} from "@sports/prediction-engine";

/**
 * P(completions over line) from a Beta completion-rate prior + attempt exposure.
 */
export function estimateCompletionsOver(input: {
  readonly samples: readonly { readonly attempts: number; readonly completions: number }[];
  readonly playerAttempts: number;
  readonly playerCompletions: number;
  readonly line: number;
  readonly attemptsNextGame: number;
}): PropStatEstimate {
  const { samples, playerAttempts, playerCompletions, line, attemptsNextGame } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "comp samples empty" };
  }
  if (!Number.isFinite(line) || !Number.isFinite(attemptsNextGame) || attemptsNextGame <= 0) {
    return { ok: false, reason: "line and attemptsNextGame must be finite, attempts > 0" };
  }
  try {
    const prior = fitCompletionPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitCompletionPrior returned null" };
    const post = posteriorCompletion(prior, playerCompletions, playerAttempts);
    const pOver = betaBinomialProbOverCompletions(post, line, attemptsNextGame);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "probOverCompletions out of [0,1]" };
    }
    return { ok: true, pOver: Number(pOver.toFixed(6)), pUnder: Number((1 - pOver).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(over 0.5 INTs) from a Gamma per-attempt prior + attempt exposure.
 */
export function estimateIntOver(input: {
  readonly samples: readonly { readonly attempts: number; readonly ints: number }[];
  readonly playerAttempts: number;
  readonly playerInts: number;
  readonly attemptsNextGame: number;
  readonly line?: number;
}): PropStatEstimate {
  const { samples, playerAttempts, playerInts, attemptsNextGame, line = 0.5 } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "int samples empty" };
  }
  if (!Number.isFinite(attemptsNextGame) || attemptsNextGame <= 0) {
    return { ok: false, reason: "attemptsNextGame must be > 0" };
  }
  try {
    const prior = fitIntPerAttemptPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitIntPerAttemptPrior returned null" };
    const post = posteriorIntPerAttempt(prior, {
      attempts: playerAttempts,
      ints: playerInts,
    } as never);
    const pAtLeast = probIntGivenAttempts(post, attemptsNextGame);
    if (!Number.isFinite(pAtLeast) || pAtLeast < 0 || pAtLeast > 1) {
      return { ok: false, reason: "probIntGivenAttempts out of [0,1]" };
    }
    // line=0.5 is the anytime-INT (P(>=1)) market; higher lines stay fail-closed
    // until a dedicated NB CDF is wired.
    if (line !== 0.5) {
      return { ok: false, reason: "only line 0.5 INT markets supported — not imputed" };
    }
    return {
      ok: true,
      pOver: Number(pAtLeast.toFixed(6)),
      pUnder: Number((1 - pAtLeast).toFixed(6)),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(over 0.5 pass TDs) from a Gamma per-attempt prior + attempt exposure.
 */
export function estimatePassTdOver(input: {
  readonly samples: readonly { readonly attempts: number; readonly passTds: number }[];
  readonly playerAttempts: number;
  readonly playerPassTds: number;
  readonly attemptsNextGame: number;
  readonly line?: number;
}): PropStatEstimate {
  const { samples, playerAttempts, playerPassTds, attemptsNextGame, line = 0.5 } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "pass-td samples empty" };
  }
  if (!Number.isFinite(attemptsNextGame) || attemptsNextGame <= 0) {
    return { ok: false, reason: "attemptsNextGame must be > 0" };
  }
  try {
    const prior = fitPassTdPerAttemptPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitPassTdPerAttemptPrior returned null" };
    const post = posteriorPassTdPerAttempt(prior, {
      attempts: playerAttempts,
      passTds: playerPassTds,
    } as never);
    const pAtLeast = probPassTdGivenAttempts(post, attemptsNextGame);
    if (!Number.isFinite(pAtLeast) || pAtLeast < 0 || pAtLeast > 1) {
      return { ok: false, reason: "probPassTdGivenAttempts out of [0,1]" };
    }
    if (line !== 0.5) {
      return { ok: false, reason: "only line 0.5 pass-TD markets supported — not imputed" };
    }
    return {
      ok: true,
      pOver: Number(pAtLeast.toFixed(6)),
      pUnder: Number((1 - pAtLeast).toFixed(6)),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(rush attempts over line) from a Gamma attempts prior.
 */
export function estimateRushAttemptsOver(input: {
  readonly samples: readonly { readonly games: number; readonly attempts: number }[];
  readonly playerAttempts: number;
  readonly playerGames: number;
  readonly line: number;
  readonly gamesNext?: number;
}): PropStatEstimate {
  const { samples, playerAttempts, playerGames, line, gamesNext = 1 } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "rush-attempts samples empty" };
  }
  if (!Number.isFinite(line) || !Number.isFinite(gamesNext) || gamesNext <= 0) {
    return { ok: false, reason: "line and gamesNext must be finite, games > 0" };
  }
  try {
    const prior = fitRushAttemptsPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitRushAttemptsPrior returned null" };
    const post = posteriorRushAttempts(prior, {
      games: playerGames,
      attempts: playerAttempts,
    } as never);
    const pOver = probOverRushAttempts(post, line, gamesNext);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "probOverRushAttempts out of [0,1]" };
    }
    return { ok: true, pOver: Number(pOver.toFixed(6)), pUnder: Number((1 - pOver).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(over 0.5 rush TDs) from a Gamma per-attempt prior + attempt exposure.
 */
export function estimateRushTdOver(input: {
  readonly samples: readonly { readonly attempts: number; readonly rushTds: number }[];
  readonly playerAttempts: number;
  readonly playerRushTds: number;
  readonly attemptsNextGame: number;
  readonly line?: number;
}): PropStatEstimate {
  const { samples, playerAttempts, playerRushTds, attemptsNextGame, line = 0.5 } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "rush-td samples empty" };
  }
  if (!Number.isFinite(attemptsNextGame) || attemptsNextGame <= 0) {
    return { ok: false, reason: "attemptsNextGame must be > 0" };
  }
  try {
    const mapped = samples.map((s) => ({ rushAtt: s.attempts, rushTds: s.rushTds }));
    const prior = fitRushTdPerAttemptPrior(mapped);
    if (!prior) return { ok: false, reason: "fitRushTdPerAttemptPrior returned null" };
    const post = posteriorRushTdPerAttempt(prior, {
      rushAtt: playerAttempts,
      rushTds: playerRushTds,
    });
    const pAtLeast = probRushTdGivenAttempts(post, attemptsNextGame);
    if (!Number.isFinite(pAtLeast) || pAtLeast < 0 || pAtLeast > 1) {
      return { ok: false, reason: "probRushTdGivenAttempts out of [0,1]" };
    }
    if (line !== 0.5) {
      return { ok: false, reason: "only line 0.5 rush-TD markets supported — not imputed" };
    }
    return {
      ok: true,
      pOver: Number(pAtLeast.toFixed(6)),
      pUnder: Number((1 - pAtLeast).toFixed(6)),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(sacks over line) from a Beta sack-rate prior + dropback exposure.
 */
export function estimateSacksOver(input: {
  readonly samples: readonly { readonly dropbacks: number; readonly sacks: number }[];
  readonly playerDropbacks: number;
  readonly playerSacks: number;
  readonly line: number;
  readonly dropbacksNextGame: number;
}): PropStatEstimate {
  const { samples, playerDropbacks, playerSacks, line, dropbacksNextGame } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "sack samples empty" };
  }
  if (!Number.isFinite(line) || !Number.isFinite(dropbacksNextGame) || dropbacksNextGame <= 0) {
    return { ok: false, reason: "line and dropbacksNextGame must be finite, dropbacks > 0" };
  }
  try {
    const prior = fitSackPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitSackPrior returned null" };
    const post = posteriorSack(prior, playerSacks, playerDropbacks);
    const pOver = betaBinomialProbOverSacks(post, line, dropbacksNextGame);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "probOverSacks out of [0,1]" };
    }
    return { ok: true, pOver: Number(pOver.toFixed(6)), pUnder: Number((1 - pOver).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * P(anytime TD) from a Gamma TD-per-touch prior + touch exposure.
 */
export function estimateAnytimeTdProb(input: {
  readonly samples: readonly { readonly touches: number; readonly tds: number }[];
  readonly playerTouches: number;
  readonly playerTds: number;
  readonly touchesNextGame: number;
}): PropStatEstimate {
  const { samples, playerTouches, playerTds, touchesNextGame } = input;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, reason: "atd samples empty" };
  }
  if (!Number.isFinite(touchesNextGame) || touchesNextGame <= 0) {
    return { ok: false, reason: "touchesNextGame must be > 0" };
  }
  try {
    const prior = fitTdPerTouchPrior(samples as never);
    if (!prior) return { ok: false, reason: "fitTdPerTouchPrior returned null" };
    const post = posteriorTdPerTouch(prior, {
      touches: playerTouches,
      tds: playerTds,
    } as never);
    const pTd = probAnytimeTdGivenTouches(post, touchesNextGame);
    if (!Number.isFinite(pTd) || pTd < 0 || pTd > 1) {
      return { ok: false, reason: "probAnytimeTdGivenTouches out of [0,1]" };
    }
    return { ok: true, pOver: Number(pTd.toFixed(6)), pUnder: Number((1 - pTd).toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}