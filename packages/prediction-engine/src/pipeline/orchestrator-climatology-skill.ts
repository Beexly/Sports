/**
 * Rung-2 measurement of the shadow LiveOrchestrator particle filter against
 * a NAMED climatology baseline. No market term anywhere.
 *
 * Named baseline: home-win indifference p = 0.5 (the fair-skill-brier
 * two-class dummy). Expanding-window home-win rate is reported as a
 * diagnostic but is NOT the kill line — a walk-forward empirical rate is
 * noisier than 0.5 on short prefixes and can lose to the dummy.
 *
 * Protocol: predictStates → predictHomeWinProbability → settleGame.
 * Outcome is applied AFTER the probability is recorded. evaluateGame is
 * not called, because it requires a marketHomeProb.
 *
 * Kill line (pre-registered): at n >= MIN_N, BSS vs 0.5 must be > 0.
 * At n < MIN_N the run is underpowered, not a pass. A model that IS 0.5
 * scores BSS = 0 and is killed.
 *
 * SHADOW: priced false. Does not publish, does not bump MODEL_VERSION.
 */

import { LiveOrchestrator } from "./live-orchestrator.js";
import {
  brierMean,
  brierSkillScore,
  type BinaryOutcome,
} from "../edge-lab/grouped-climatology.js";

export const ORCHESTRATOR_CLIMATOLOGY_METHOD_TAG = "orchestrator_climatology_v1" as const;

/** Named dumb baseline: P(home win) = 1/2. */
export const ORCHESTRATOR_CLIMATOLOGY_BASELINE_P = 0.5;

/** Minimum settled games before a kill/survive verdict is licensed. */
export const ORCHESTRATOR_CLIMATOLOGY_MIN_N = 100;

/** Kill when Brier skill vs 0.5 is at or below this. */
export const ORCHESTRATOR_CLIMATOLOGY_KILL_BSS = 0;

export type OrchestratorClimGame = {
  readonly gameId: string;
  readonly homeTeamIdx: number;
  readonly awayTeamIdx: number;
  readonly y: BinaryOutcome;
};

export type OrchestratorClimVerdict = "kill" | "survive" | "underpowered";

export type OrchestratorClimScorecard = {
  readonly methodTag: typeof ORCHESTRATOR_CLIMATOLOGY_METHOD_TAG;
  readonly n: number;
  readonly modelBrier: number;
  /** Brier of the named 0.5 dummy. Kill line is BSS against this. */
  readonly climBrier: number;
  /** Brier of expanding-window home-win rate (diagnostic, not the kill). */
  readonly expandingClimBrier: number;
  readonly bss: number | null;
  readonly bssExpanding: number | null;
  readonly verdict: OrchestratorClimVerdict;
  readonly priced: false;
  readonly status: "shadow";
};

export type OrchestratorClimOptions = {
  readonly nTeams: number;
  readonly seed: number;
  readonly nParticles?: number;
};

function expandingHomeClimatology(priorHits: number, priorN: number): number {
  return priorN === 0 ? ORCHESTRATOR_CLIMATOLOGY_BASELINE_P : priorHits / priorN;
}

function verdictFor(n: number, bss: number | null): OrchestratorClimVerdict {
  if (n < ORCHESTRATOR_CLIMATOLOGY_MIN_N || bss == null) return "underpowered";
  if (bss <= ORCHESTRATOR_CLIMATOLOGY_KILL_BSS) return "kill";
  return "survive";
}

/**
 * Score a walk-forward sequence of model probabilities against named
 * 0.5 climatology. `pModel[i]` must have been computed before `y[i]`
 * was revealed. Throws on empty input rather than invent a skill number.
 */
export function scoreVsExpandingHomeClimatology(
  pModel: readonly number[],
  y: readonly BinaryOutcome[],
): OrchestratorClimScorecard {
  if (pModel.length === 0 || pModel.length !== y.length) {
    throw new RangeError(
      `scoreVsExpandingHomeClimatology: pModel and y must be non-empty and aligned (got ${pModel.length}/${y.length})`,
    );
  }
  const expanding: number[] = [];
  let hits = 0;
  for (let i = 0; i < y.length; i++) {
    expanding.push(expandingHomeClimatology(hits, i));
    hits += y[i]!;
  }
  const modelPairs = pModel.map((p, i) => ({ p, y: y[i]! }));
  const dummyPairs = y.map((yi) => ({ p: ORCHESTRATOR_CLIMATOLOGY_BASELINE_P, y: yi }));
  const expandingPairs = expanding.map((p, i) => ({ p, y: y[i]! }));
  const modelBrier = brierMean(modelPairs);
  const climBrier = brierMean(dummyPairs);
  const expandingClimBrier = brierMean(expandingPairs);
  const bss = brierSkillScore(modelBrier, climBrier);
  const bssExpanding = brierSkillScore(modelBrier, expandingClimBrier);
  return {
    methodTag: ORCHESTRATOR_CLIMATOLOGY_METHOD_TAG,
    n: y.length,
    modelBrier,
    climBrier,
    expandingClimBrier,
    bss,
    bssExpanding,
    verdict: verdictFor(y.length, bss),
    priced: false,
    status: "shadow",
  };
}

/**
 * Walk-forward measure of LiveOrchestrator's particle filter vs named
 * home-win climatology (0.5). No market probability is accepted or scored.
 */
export function measureOrchestratorVsClimatology(
  games: readonly OrchestratorClimGame[],
  options: OrchestratorClimOptions,
): OrchestratorClimScorecard {
  if (games.length === 0) {
    throw new RangeError("measureOrchestratorVsClimatology: empty sample");
  }
  const orch = new LiveOrchestrator({
    filter: {
      nTeams: options.nTeams,
      seed: options.seed,
      nParticles: options.nParticles ?? 200,
    },
  });
  const filter = orch.exportFilter();
  const pModel: number[] = [];
  const y: BinaryOutcome[] = [];
  for (const game of games) {
    filter.predictStates();
    const p = filter.predictHomeWinProbability(game.homeTeamIdx, game.awayTeamIdx);
    pModel.push(p);
    y.push(game.y);
    orch.settleGame(game.gameId, game.homeTeamIdx, game.awayTeamIdx, game.y);
  }
  return scoreVsExpandingHomeClimatology(pModel, y);
}
