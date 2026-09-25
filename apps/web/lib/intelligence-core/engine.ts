/**
 * Master Engine — wires EVERY surface in the repository into the
 * all-knowing reasoning spine.
 *
 * Doctrine: the engine is not a metrics aggregator. It is a situational,
 * contextual, reasoning machine. Every module in the repo — injuries, NGS,
 * weather, player stats, ratings, snaps, schedule density, market, fantasy,
 * source trust, calibration history — plugs in here. Nothing is deferred.
 *
 * `wireEverything(bundle)` is the single entry point the website, picks,
 * props, fantasy, and cockpit all call. It returns the calibrated
 * probability, the six answers, the why/why-not spine, and the publish state.
 */

import {
  reason,
  explain,
  type SituationalContext,
  type IntelligenceReasoning,
  type SignalObservation,
  type MarketBelief,
} from "./reasoning";
import {
  allObservations,
  computeModelProb,
  signalPresence,
  type AllSignalInputs,
  type SignalPresence,
  type InjuryRow,
  type NgsRow,
  type PlayerGameStatRow,
  type TeamEfficiencyRow,
  type GameSignalRow,
  type SnapCountRow,
} from "./signal-adapters";

// ---------------------------------------------------------------------------
// GameBundle — every input the engine needs for one decision
// ---------------------------------------------------------------------------

export interface GameBundle {
  readonly gameId: string;
  readonly sport: string;
  readonly selection: string;
  readonly pickType: "SPREAD" | "TOTAL" | "MONEYLINE" | "PROP";
  readonly commenceTime: string;
  readonly homeTeam: string;
  readonly awayTeam: string;

  // --- market (always present) ---
  readonly market: MarketBelief;

  // --- situation (rest/travel/weather/injury/density) ---
  readonly situation?: {
    readonly restDaysHome?: number;
    readonly restDaysAway?: number;
    readonly travelTimezoneShift?: number;
    readonly weatherImpact?: number;
    readonly injuryImpact?: number;
    readonly scheduleDensity?: number;
  };

  // --- raw DB surfaces (the wiring) ---
  readonly homeInjuries?: readonly InjuryRow[];
  readonly awayInjuries?: readonly InjuryRow[];
  readonly homeNgs?: readonly NgsRow[];
  readonly awayNgs?: readonly NgsRow[];
  readonly homePlayerStats?: readonly PlayerGameStatRow[];
  readonly awayPlayerStats?: readonly PlayerGameStatRow[];
  readonly homeRatings?: readonly TeamEfficiencyRow[];
  readonly awayRatings?: readonly TeamEfficiencyRow[];
  readonly weather?: readonly GameSignalRow[];
  readonly gameSignals?: readonly GameSignalRow[];
  readonly homeSnaps?: readonly SnapCountRow[];
  readonly awaySnaps?: readonly SnapCountRow[];

  // --- caller-supplied extras (market moves, news, fantasy, …) ---
  readonly extraObservations?: readonly SignalObservation[];

  // --- model context ---
  readonly modelVersion: string;
  readonly statedConfidence: number | null;
  readonly grade?: "LEAN" | "SOLID_PLAY" | "STRONG_PLAY" | "ELITE_PLAY";

  readonly now?: Date;
}

// ---------------------------------------------------------------------------
// IntelligenceResult — everything the website needs
// ---------------------------------------------------------------------------

export interface IntelligenceResult {
  readonly reasoning: IntelligenceReasoning;
  /** Human-readable spine for the UI. */
  readonly summary: string;
  /** Calibrated P(WIN) — the only probability that may face a customer. */
  readonly calibratedProb: number;
  /** modelProb for pick_proof_receipts (true Brier vs market). */
  readonly modelProb: number;
  /** Signal-presence flags for pick_signal_snapshots. */
  readonly presence: SignalPresence;
  /** The six answers, ready to render. */
  readonly sixQuestions: IntelligenceReasoning["sixQuestions"];
  /** Publish state: SHADOW | WITHHOLD | CANDIDATE. */
  readonly publishState: IntelligenceReasoning["publishState"];
  readonly withholdReasons: readonly string[];
  /** How many observations were wired in. */
  readonly observationCount: number;
  readonly familyWeights: IntelligenceReasoning["familyWeights"];
  readonly why: readonly string[];
  readonly whyNot: readonly string[];
  readonly edgeVsMarket: number | null;
  readonly situationalShift: number;
  readonly knowability: number;
  readonly evidenceHealth: number;
}

// ---------------------------------------------------------------------------
// buildSituationalContext — raw bundle → reasoning input
// ---------------------------------------------------------------------------

export function buildSituationalContext(bundle: GameBundle): SituationalContext {
  const input: AllSignalInputs = {
    homeInjuries: bundle.homeInjuries,
    awayInjuries: bundle.awayInjuries,
    homeNgs: bundle.homeNgs,
    awayNgs: bundle.awayNgs,
    homePlayerStats: bundle.homePlayerStats,
    awayPlayerStats: bundle.awayPlayerStats,
    homeRatings: bundle.homeRatings,
    awayRatings: bundle.awayRatings,
    weather: bundle.weather,
    gameSignals: bundle.gameSignals,
    homeSnaps: bundle.homeSnaps,
    awaySnaps: bundle.awaySnaps,
    extra: bundle.extraObservations,
    now: bundle.now,
  };
  const observations = allObservations(input);

  return {
    gameId: bundle.gameId,
    sport: bundle.sport,
    selection: bundle.selection,
    pickType: bundle.pickType,
    commenceTime: bundle.commenceTime,
    observations,
    market: bundle.market,
    situation: bundle.situation ?? {},
    modelVersion: bundle.modelVersion,
    statedConfidence: bundle.statedConfidence,
    grade: bundle.grade,
  };
}

// ---------------------------------------------------------------------------
// runIntelligence / wireEverything — the single entry point
// ---------------------------------------------------------------------------

/**
 * Run the all-knowing engine on one game bundle.
 * This is THE call. Everything in the repository flows through here.
 */
export function runIntelligence(bundle: GameBundle): IntelligenceResult {
  const ctx = buildSituationalContext(bundle);
  const reasoning = reason(ctx);
  const summary = explain(ctx, reasoning);
  const presence = signalPresence(ctx.observations);
  // modelProb is calibratedProb (shift is already inside reason()); exposed
  // separately so proof receipts can store it and Brier can be computed.
  const modelProb = computeModelProb(reasoning.calibratedProb, 0);

  return {
    reasoning,
    summary,
    calibratedProb: reasoning.calibratedProb,
    modelProb,
    presence,
    sixQuestions: reasoning.sixQuestions,
    publishState: reasoning.publishState,
    withholdReasons: reasoning.withholdReasons,
    observationCount: ctx.observations.length,
    familyWeights: reasoning.familyWeights,
    why: reasoning.why,
    whyNot: reasoning.whyNot,
    edgeVsMarket: reasoning.edgeVsMarket,
    situationalShift: reasoning.situationalShift,
    knowability: reasoning.knowability,
    evidenceHealth: reasoning.evidenceHealth,
  };
}

/** Alias — the name that matches the doctrine. */
export const wireEverything = runIntelligence;

// ---------------------------------------------------------------------------
// Batch helper — run every game on a slate through the engine
// ---------------------------------------------------------------------------

export function runSlate(bundles: readonly GameBundle[]): IntelligenceResult[] {
  return bundles.map(runIntelligence);
}
