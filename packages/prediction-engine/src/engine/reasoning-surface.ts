/**
 * Reasoning surface â€” single engine-facing facade over every real
 * computation module built in waves 4â€“5.
 *
 * The engine calls THIS, not metadata. Every call is real math.
 * Fail-closed on missing inputs. No `any`. No imputation.
 *
 * COMPOSES WITH: V5â€“V8, W3â€“W6, D1â€“D4, NGS-11/12, strategic adapters.
 */

import {
  validateSubmission,
  writeSubmissionCsv,
  type SubmissionPackage,
  type SubmissionValidationResult,
} from "../eval/model-submission-schema.js";
import {
  chronologicalSplit,
  defineFeatureSpace,
  fitAndReport,
  type FeatureSpec,
  type FitReport,
  type Sample,
} from "../eval/feature-construction-recipe.js";
import {
  fitHomeFieldMultiplier,
  simulateMatchup,
  trailingRatings,
  type SimulateResult,
  type TeamGame,
  type TeamRating,
} from "../nfl/generalized-poisson.js";
import {
  ablate,
  tierKill,
  type AblationResult,
  type TierKillResult,
} from "../nfl/ats-ablation-harness.js";
import {
  anytimeTdProbability,
  integrateEv,
  type AnytimeTdResult,
  type MarketPrice,
  type PlayerRoleContext,
} from "../props/anytime-td-mit.js";
import {
  deserveToWin,
  neutralize,
  type DeserveToWinResult,
  type GameInput,
  type NeutralizedPlay,
  type PlayInput,
} from "../nfl/luck-neutralized-epa.js";
import {
  replayGame,
  stressTest,
  type ReplayGameResult,
  type StressTestResult,
  type WpEvent,
  type WpModelFn,
  type WpReferencePoint,
} from "../backtest/wp-event-replay.js";
import {
  computeDbCoverageMetrics,
  type DbMetricsResult,
  type TargetPlay,
} from "../nfl/coverage-db-metrics.js";
import {
  computeKickerMoE,
  computeScrambleEpa,
  type FieldGoalAttempt,
  type KickerMoEResult,
  type ScrambleEpaResult,
  type ScramblePlay,
} from "../nfl/ngs-adjacent-metrics.js";
import {
  coverProbabilityAdapter,
  fgMakeProbabilityAdapter,
  generalizedPoissonAdapter,
  passerRatingAllowedAdapter,
} from "../engine/strategic-signal-adapters.js";
import type { AdapterResult } from "../engine/universal-adapter.js";
import {
  cadenceAdapter,
  drawdownRiskAdapter,
  kellyLogGrowthAdapter,
  robustKellyAdapter,
  type ReturnAtom,
} from "../engine/decision-adapters.js";
// Local type guard — inlined so this module never value-imports
// universal-adapter.js (which pulls node:crypto into client bundles).
function isObservation(r: AdapterResult): r is Extract<AdapterResult, { source: string }> {
  return !("failClosed" in r);
}

// â”€â”€ Shared types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ReasoningResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

// â”€â”€ Model submission (V5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonSubmission(
  pkg: SubmissionPackage,
): SubmissionValidationResult {
  return validateSubmission(pkg);
}

export function reasonSubmissionCsv(pkg: SubmissionPackage): ReasoningResult<string> {
  try {
    return ok(writeSubmissionCsv(pkg));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Feature construction (V7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonFeatureSpace(
  specs: readonly FeatureSpec[],
  version: string,
): ReasoningResult<{ readonly featureCount: number; readonly version: string }> {
  const r = defineFeatureSpace(specs, version);
  if (!r.ok) return fail(r.errors.map((e) => e.message).join("; "));
  return ok({ featureCount: r.space.features.length, version: r.space.version });
}

export function reasonFitReport(
  specs: readonly FeatureSpec[],
  samples: readonly Sample[],
  predict: (features: Record<string, number | null>, train: readonly Sample[]) => number,
): ReasoningResult<FitReport> {
  const space = defineFeatureSpace(specs, "reasoning-v1");
  if (!space.ok) return fail("invalid feature space");
  try {
    return ok(fitAndReport(space.space, samples, predict));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export function reasonChronologicalSplit(
  samples: readonly Sample[],
  trainRatio = 0.7,
): ReasoningResult<{ readonly nTrain: number; readonly nTest: number; readonly trainEnd: string; readonly testStart: string }> {
  try {
    const s = chronologicalSplit(samples, trainRatio);
    return ok({
      nTrain: s.train.length,
      nTest: s.test.length,
      trainEnd: s.trainEnd,
      testStart: s.testStart,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ NFL matchup simulation (V6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonTrailingRating(
  teamId: string,
  games: readonly TeamGame[],
  window = 12,
): ReasoningResult<TeamRating> {
  try {
    return ok(trailingRatings(teamId, games, window));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export function reasonSimulateMatchup(
  home: TeamRating,
  away: TeamRating,
  opts: {
    readonly spread: number;
    readonly totalLine: number | null;
    readonly homeFieldMultiplier?: number | null;
  },
  n = 2000,
  seed?: number,
): ReasoningResult<SimulateResult> {
  const hfa =
    opts.homeFieldMultiplier !== undefined
      ? opts.homeFieldMultiplier
      : fitHomeFieldMultiplier([]);
  if (hfa === null) {
    return fail("home-field multiplier unavailable â€” not hardcoded, not imputed");
  }
  try {
    return ok(simulateMatchup(
      {
        home,
        away,
        homeFieldMultiplier: hfa,
        spread: opts.spread,
        totalLine: opts.totalLine,
        homeFgRate: 1.8,
        awayFgRate: 1.8,
        homeSafetyRate: 0.08,
        awaySafetyRate: 0.08,
        xpSuccessRate: 0.94,
        homeOtWinProb: 0.5,
      },
      n,
      seed,
    ));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ ATS ablation (W3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonAblation(
  features: readonly { readonly name: string; readonly tier?: string }[],
  target: readonly Sample[],
  train: readonly Sample[],
  predict: (features: Record<string, number | null>, train: readonly Sample[]) => number,
): ReasoningResult<AblationResult> {
  try {
    return ok(ablate(features, target, train, predict));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export function reasonTierKill(
  tiers: readonly { readonly tier: string; readonly features: readonly string[] }[],
  ablation: AblationResult,
  threshold: number,
): ReasoningResult<readonly TierKillResult[]> {
  try {
    return ok(tierKill(tiers, ablation, threshold));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Anytime TD + EV (W4) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonAnytimeTd(
  ctx: PlayerRoleContext,
  price?: MarketPrice,
): ReasoningResult<AnytimeTdResult> {
  const r = anytimeTdProbability(ctx);
  if (r.failClosed) return fail(r.reason ?? "anytime TD fail-closed");
  return ok(price ? integrateEv(r, price) : r);
}

// â”€â”€ Luck-neutralized EPA (W5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonNeutralizePlay(
  play: PlayInput | null,
): ReasoningResult<NeutralizedPlay> {
  return ok(neutralize(play));
}

export function reasonDeserveToWin(
  game: GameInput,
): ReasoningResult<DeserveToWinResult> {
  try {
    return ok(deserveToWin(game));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ WP event replay (W6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonReplayGame(
  gameId: string,
  events: readonly WpEvent[],
  wpModel: WpModelFn,
): ReasoningResult<ReplayGameResult> {
  try {
    return ok(replayGame(gameId, events, wpModel));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export function reasonWpStressTest(
  wpModel: WpModelFn,
  gameSet: readonly {
    readonly gameId: string;
    readonly events: readonly WpEvent[];
    readonly reference: readonly WpReferencePoint[];
  }[],
  threshold = 0.08,
): ReasoningResult<StressTestResult> {
  try {
    return ok(stressTest(wpModel, gameSet, threshold));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Coverage/DB metrics (NGS-11) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonDbCoverage(
  plays: readonly TargetPlay[],
): ReasoningResult<DbMetricsResult> {
  try {
    return ok(computeDbCoverageMetrics(plays));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Kicker / scramble (NGS-12) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonKickerMoE(
  attempts: readonly FieldGoalAttempt[],
): ReasoningResult<readonly KickerMoEResult[]> {
  return ok(computeKickerMoE(attempts));
}

export function reasonScrambleEpa(
  plays: readonly ScramblePlay[],
): ReasoningResult<readonly ScrambleEpaResult[]> {
  return ok(computeScrambleEpa(plays));
}

// â”€â”€ Strategic adapters (engine contract) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonCoverProbability(
  spread: number,
  projectedMargin: number,
  marginSd?: number,
): ReasoningResult<number> {
  const r = coverProbabilityAdapter({ spread, projectedMargin, marginSd });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number);
}

export function reasonFgMake(
  distance: number | null,
  windMph?: number | null,
  isOutdoor?: boolean | null,
): ReasoningResult<number> {
  const r = fgMakeProbabilityAdapter({ distance, windMph, isOutdoor });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number);
}

export function reasonPasserRating(
  attempts: number,
  completions: number,
  yards: number,
  touchdowns: number,
  interceptions: number,
): ReasoningResult<number> {
  const r = passerRatingAllowedAdapter({
    attempts,
    completions,
    yards,
    touchdowns,
    interceptions,
  });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number);
}

export function reasonGeneralizedPoisson(
  k: number,
  theta: number,
  lambda: number,
): ReasoningResult<number> {
  const r = generalizedPoissonAdapter({ k, theta, lambda });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number);
}

// â”€â”€ Decision / sizing (wave 5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function reasonKellyLogGrowth(
  f: number,
  dist: readonly ReturnAtom[],
): ReasoningResult<number | "RUIN"> {
  const r = kellyLogGrowthAdapter({ f, dist });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number | "RUIN");
}

export function reasonRobustKelly(
  pHat: number,
  odds: number,
): ReasoningResult<number> {
  const r = robustKellyAdapter({ pHat, odds });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number);
}

export function reasonCadence(
  edgeMean: number,
  edgeVar: number,
  costPerRestake: number,
  maxCadence: number,
): ReasoningResult<number> {
  const r = cadenceAdapter({ edgeMean, edgeVar, costPerRestake, maxCadence });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number);
}

export function reasonDrawdownRisk(
  phi: readonly number[],
  tradeReturns: readonly (readonly number[])[],
  nPaths: number,
  seed?: number,
): ReasoningResult<number> {
  const r = drawdownRiskAdapter({ phi, tradeReturns, nPaths, seed });
  if (!isObservation(r)) return fail(r.reason);
  return ok(r.value as number);
}

// â”€â”€ Surface registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const REASONING_SURFACE = {
  submission: reasonSubmission,
  submissionCsv: reasonSubmissionCsv,
  featureSpace: reasonFeatureSpace,
  fitReport: reasonFitReport,
  chronologicalSplit: reasonChronologicalSplit,
  trailingRating: reasonTrailingRating,
  simulateMatchup: reasonSimulateMatchup,
  ablation: reasonAblation,
  tierKill: reasonTierKill,
  anytimeTd: reasonAnytimeTd,
  neutralizePlay: reasonNeutralizePlay,
  deserveToWin: reasonDeserveToWin,
  replayGame: reasonReplayGame,
  wpStressTest: reasonWpStressTest,
  dbCoverage: reasonDbCoverage,
  kickerMoE: reasonKickerMoE,
  scrambleEpa: reasonScrambleEpa,
  coverProbability: reasonCoverProbability,
  fgMake: reasonFgMake,
  passerRating: reasonPasserRating,
  generalizedPoisson: reasonGeneralizedPoisson,
  kellyLogGrowth: reasonKellyLogGrowth,
  robustKelly: reasonRobustKelly,
  cadence: reasonCadence,
  drawdownRisk: reasonDrawdownRisk,
} as const;

export type ReasoningSurfaceName = keyof typeof REASONING_SURFACE;

export type { AdapterResult };
