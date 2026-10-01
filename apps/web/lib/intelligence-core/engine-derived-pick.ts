/**
 * The engine's own pick, reasoned in the app layer where the spine lives.
 *
 * WHY THIS IS HERE AND NOT IN THE PIPELINE
 * The reasoning spine (`reason`) and the observation type (`SignalObservation`)
 * live in `apps/web/lib/intelligence-core`, and `apps/web` imports
 * `@sports/ingestion-pipeline` rather than the other way round. So the pipeline
 * physically cannot reason; it can only read, compose, and ask. This module is
 * the "ask": it runs the production spine over the composed ledger rows and
 * converts the result into a pick or an explicit refusal, using the production
 * recommender from `@sports/prediction-engine`.
 *
 * The dependency runs the right way: `process-sport.ts` reaches this through a
 * caller-supplied `reasoner`, so the pipeline stays free of an app-layer import
 * and the whole thing stays testable with the real spine rather than a double.
 *
 * THE THREE RULES, restated where they are enforced
 *  - NO BET IS AN OUTPUT. `EnginePickInput`'s recommender is the production
 *    one; it returns a literal NO_BET verdict rather than a weak pick.
 *  - THE MARKET IS COMPARISON ONLY. It is passed to the recommender as
 *    `marketHomeProb` and is never averaged into any probability here.
 *  - PUBLISH STATE IS BINDING. A WITHHOLD or SHADOW spine cannot produce a
 *    pick, and the emitted record carries the state so the arbiter can see why.
 */

import {
  recommend,
  type EngineRecommendation,
  type RecommendOptions,
  type RecommendationNoBetReason,
  type RecommendationVerdict,
} from "@sports/prediction-engine";
import {
  reason,
  type IntelligenceReasoning,
  type SignalObservation,
} from "@/lib/intelligence-core";
import type { EngineReasoner } from "@sports/ingestion-pipeline";

export type EnginePickSide = "SPREAD" | "TOTAL" | "MONEYLINE";

/** A side's composed ledger reading, as the pipeline hands it over. */
export interface ComposedSide {
  readonly score: number;
  readonly signalsUsed: number;
  readonly topKeys: readonly string[];
}

export interface ReasonedEnginePickInput {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly pickType: EnginePickSide;
  readonly line: number;
  /** De-vigged home probability. Comparison only. */
  readonly marketFairProb: number | null;
  /** Composed by the pipeline with the production composer, not re-blended. */
  readonly home: ComposedSide;
  readonly away: ComposedSide;
  /** ISO instant. REQUIRED: it makes the run replayable. */
  readonly now: string;
  readonly halfLifeDays?: number;
  readonly modelVersion: string;
  readonly sportKey?: string | null;
  readonly recommendOptions?: RecommendOptions;
}

export interface ReasonedEnginePick {
  readonly gameId: string;
  readonly pickType: EnginePickSide;
  /** The engine's verdict. PICK or NO_BET; never both. */
  readonly verdict: RecommendationVerdict;
  /** Present exactly on NO_BET. Names which gate closed. */
  readonly noBetReason: RecommendationNoBetReason | null;
  /** The engine's own verdict. Flattened, so it survives the package boundary. */
  readonly recommendation: EngineRecommendation;
  /** The engine's own probability for the side it took, or null on no bet. */
  readonly selection: string | null;
  readonly side: 1 | -1 | 0;
  /** The spine's calibrated home probability, whatever it decided. */
  readonly homeWinProb: number;
  readonly marketFairProb: number | null;
  /** Signed to the SIDE. Null when the market is unusable. */
  readonly edge: number | null;
  readonly publishState: IntelligenceReasoning["publishState"];
  readonly withholdReasons: readonly string[];
  readonly knowability: number;
  readonly evidenceHealth: number;
  /** Rights-cleared observations that actually fed the spine. */
  readonly observationCount: number;
  readonly homeSignalsUsed: number;
  readonly awaySignalsUsed: number;
  readonly basis: string;
}

/**
 * Reason over the sides the pipeline composed, and let the production
 * recommender turn that reasoning into a pick or an explicit refusal.
 *
 * `reason` and `recommend` are the engine's own modules, used as they are. The
 * composition happened upstream in the pipeline with `composeLedger`, also the
 * engine's own, so nothing on this path is a reimplementation: a hand-rolled
 * blend or a hand-rolled threshold would prove nothing about the engine.
 */
export function reasonEnginePick(input: ReasonedEnginePickInput): ReasonedEnginePick | null {
  if (!Number.isFinite(input.line)) return null;

  const home = input.home;
  const away = input.away;
  if (home.signalsUsed === 0 && away.signalsUsed === 0) return null;

  const observations = ledgerObservations(home, away, input.now);
  const reasoning = reason({
    gameId: input.gameId,
    sport: input.sportKey ?? "americanfootball_nfl",
    // The spine is TOLD what to evaluate, which is the structural gap this
    // closes: `SituationalContext.selection` is an INPUT, so the spine can
    // never name a side itself. The recommender below turns its probability
    // back into a call.
    selection: `${input.homeTeam} ${input.line}`,
    pickType: input.pickType,
    commenceTime: input.now,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    observations,
    market: {
      market: input.pickType,
      fairProb: input.marketFairProb,
      line: input.line,
      bookmakerCount: null,
      consensusPct: null,
    },
    situation: {},
    modelVersion: input.modelVersion,
    // Deliberately null. The legacy confidence is the other lane's opinion, and
    // seeding the engine's spine with it would let the legacy pick be the
    // reason the engine agrees with it. The engine earns its own base.
    statedConfidence: null,
    grade: undefined,
  });

  const recommendation = recommend({
    reasoning,
    marketHomeProb: input.marketFairProb,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    line: input.line,
    pickType: input.pickType,
    ...(input.recommendOptions != null ? { options: input.recommendOptions } : {}),
  });

  const basis =
    `engine spine composed ${home.signalsUsed} weighted home and ${away.signalsUsed} weighted away ` +
    `ledger rows, moved its own probability ${(reasoning.situationalShift * 100).toFixed(2)} pts, ` +
    `publishState ${reasoning.publishState}, recommendation ${recommendation.verdict}` +
    (recommendation.noBetReason != null ? ` (${recommendation.noBetReason})` : "");

  return {
    gameId: input.gameId,
    pickType: input.pickType,
    recommendation,
    verdict: recommendation.verdict,
    selection: recommendation.selection,
    side: recommendation.side,
    homeWinProb: Number(reasoning.calibratedProb.toFixed(6)),
    marketFairProb: input.marketFairProb,
    edge: recommendation.edge,
    publishState: reasoning.publishState,
    withholdReasons: reasoning.withholdReasons,
    noBetReason: recommendation.noBetReason,
    knowability: reasoning.knowability,
    evidenceHealth: reasoning.evidenceHealth,
    observationCount: reasoning.shadowReport.calibrationCount,
    homeSignalsUsed: home.signalsUsed,
    awaySignalsUsed: away.signalsUsed,
    basis,
  };
}

/**
 * The `EngineReasoner` the pick generator accepts.
 *
 * The pipeline composes the ledger with the production composer and calls this
 * with the composed sides; this runs the real spine and the real recommender
 * and returns what they decided. Handing it to `processSport` is what makes the
 * generator's engine opinion the engine's own rather than a local guess.
 */
export function makeEngineReasoner(): EngineReasoner {
  return (input) =>
    reasonEnginePick({
      gameId: input.gameId,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      pickType: input.pickType,
      line: input.line,
      marketFairProb: input.marketFairProb,
      now: input.now,
      modelVersion: input.modelVersion,
      sportKey: input.sportKey,
      home: input.home,
      away: input.away,
    });
}

interface SideComposed {
  readonly score: number;
  readonly signalsUsed: number;
  readonly topKeys: readonly string[];
}

/**
 * Express each composed side as ONE observation in the home frame.
 *
 * Two observations rather than one per ledger row: the composer already blended
 * the rows and reported which ones carried weight, so re-emitting each row would
 * apply that weight a second time inside the spine's lean loop, which is an
 * unweighted mean over observations. One per side is also the only shape in
 * which a home and an away reading actually cancel.
 */
function ledgerObservations(
  home: SideComposed,
  away: SideComposed,
  nowIso: string,
): SignalObservation[] {
  const side = (composed: SideComposed, label: string, sign: 1 | -1): SignalObservation => ({
    family: "PLAY_CHARTING",
    key: `signal_ledger:${label}`,
    fact:
      composed.signalsUsed === 0
        ? `${label} side carries no weighted ledger rows`
        : `${label} side ledger blend ${composed.score.toFixed(3)} from ${composed.signalsUsed} weighted rows, led by ${composed.topKeys.join(", ") || "no single key"}`,
    knownAt: nowIso,
    origin: "signals",
    // The honesty valve. The ledger is measured data so trust is decent, but a
    // blend of 0.0026-to-0.105 fitted weights is weak evidence, and it is
    // reported as such rather than as a settled fact.
    trust: 0.7,
    freshness: 1,
    lean: sign * composed.score,
    // Measured nflverse data: the same rights the player-stat surface it is
    // derived from already carries.
    rights: "cleared",
    tier: 2,
  });
  return [side(home, "home", 1), side(away, "away", -1)];
}
