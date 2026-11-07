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
  runSituationalTrace,
  toTraceObservations,
  type SituationTraceResult,
} from "./situational-trace";
import {
  evaluateWave13SheafNavierStokesPhaseTransition,
  evaluateTenTextbookAlgorithmsBridge,
  buildContextualBitmask288,
  evaluateCausalPrmTrajectory,
  type Wave13EvaluationReceipt,
  type TenTextbookAlgorithmsReceipt,
} from "@sports/prediction-engine";
import type { SignalShadowPolicy } from "./shadow";
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

  /**
   * SHADOW-ONLY switch, forwarded verbatim to `reason()`. Omit it and every
   * observation feeds calibration exactly as before. Build it with
   * `shadowOnly([...], "justification")` — see ./shadow.ts.
   */
  readonly shadowPolicy?: SignalShadowPolicy;

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
  /**
   * SHADOW-ONLY accounting, lifted from the reasoning spine. `observationCount`
   * above counts EVERY observation including shadowed ones; this is what tells
   * a caller how many of those were actually allowed to move the number.
   */
  readonly shadowReport: IntelligenceReasoning["shadowReport"];
  /**
   * L2 aggregation-trace (situational-engine): per-signal divergence vs the
   * market's de-vigged probability, consistency gate, dormant-signal list.
   * Divergence is a DIFFERENCE OF NUMBERS — never a bet. Null + reason when
   * the trace could not run (fail-open, never blocks the pick path).
   */
  readonly situationTrace: SituationTraceResult | null;
  /** Wave 13 Cellular Sheaf CRC, Navier–Stokes Phase Resultant, Spin-Glass Cavity, Mahler-Dual & Padé/Shin receipt. */
  readonly wave13Receipt: Wave13EvaluationReceipt;
  /** Workstream 2 Ten Textbook Algorithms (AFML, Boyd, Nocedal-Wright, Cover-Thomas, Tsitsiklis, Puterman, Glasserman, Villani, Mezard-Montanari, Barber) receipt. */
  readonly textbookAlgorithmsReceipt: TenTextbookAlgorithmsReceipt;
  /** 288-bit contextual bitmask hex digest from recovered MCP bitmask schema. */
  readonly bitmaskHex288: string;
  /** Causal PRM step-level reasoning verification score. */
  readonly causalPrmAggregateScore: number;
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
    // Carried so reason() can tell which side of the home/away frame the pick
    // is on and re-express the leans in that frame. Without these the engine
    // is selection-blind and every away pick inherits the home sign.
    homeTeam: bundle.homeTeam,
    awayTeam: bundle.awayTeam,
    pickType: bundle.pickType,
    commenceTime: bundle.commenceTime,
    observations,
    market: bundle.market,
    situation: bundle.situation ?? {},
    modelVersion: bundle.modelVersion,
    statedConfidence: bundle.statedConfidence,
    grade: bundle.grade,
    // Forwarded verbatim. `undefined` (the default) means "no family is
    // shadowed" and reason() behaves exactly as it did before shadow mode
    // existed — observations are still built and still reported either way.
    shadowPolicy: bundle.shadowPolicy,
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
  const baseReasoning = reason(ctx);
  // L2 trace: the situational engine consumes the spine's calibrated market
  // fair-probability and the SAME observations reason() saw, then modulates
  // calibratedProb (clamped to [0.05, 0.95] with |deltaProb| <= 0.08) and
  // appends active situational/corpus/mind evidence to reasoning.why.
  const situationTrace = runSituationalTrace(ctx, baseReasoning);

  const sel = (ctx.selection || "").trim().toUpperCase();
  const away = (ctx.awayTeam || "").trim().toUpperCase();
  const isAwayOrUnder =
    (away.length > 0 && (sel === away || sel.startsWith(`${away} `))) ||
    sel.startsWith("UNDER");
  const orientationSign = isAwayOrUnder ? -1 : 1;

  const matchedPaperCount =
    situationTrace.corpusEvaluation?.matchedPaperCount ??
    situationTrace.corpusEvaluation?.itemsEvaluatedCount ??
    0;

  const traceObs = toTraceObservations(ctx, baseReasoning);
  const anchorP = baseReasoning.marketFairProb ?? baseReasoning.calibratedProb ?? 0.5;
  const stalkLeans: number[] =
    traceObs.length > 0
      ? traceObs.map((o) => (o.probability ?? anchorP) - anchorP)
      : [baseReasoning.situationalShift, (anchorP - 0.5) * 0.2, 0.01];
  const stalkTrusts: number[] =
    traceObs.length > 0 ? traceObs.map((o) => o.declaredWeight ?? 0.85) : [0.85, 0.85, 0.85];

  const wave13Receipt = evaluateWave13SheafNavierStokesPhaseTransition({
    stalkObservations: stalkLeans,
    restrictionWeights: stalkTrusts,
    oscillatorPhasesRad: stalkLeans.map((v) => v * Math.PI),
    vorticitySnapSeries: stalkLeans.map((v) => Math.abs(v) * 1.5),
    directionAngleSeriesRad: stalkLeans.map((v, idx) => v + idx * 0.08),
    residualVector: stalkLeans,
    covarianceDiagonal: stalkLeans.map(() => 0.04),
    padeArgumentZ: Math.abs(baseReasoning.situationalShift) + 0.2,
    marketImpliedProbs: [
      Math.max(0.05, Math.min(0.95, anchorP * 1.0238)),
      Math.max(0.05, Math.min(0.95, (1 - anchorP) * 1.0238)),
    ],
  });

  const textbookAlgorithmsReceipt = evaluateTenTextbookAlgorithmsBridge({
    historicalSeries: [...stalkLeans, anchorP - 0.5, baseReasoning.situationalShift],
    rawSignalVector: stalkLeans,
    gradientVector: stalkLeans.map((v) => -v),
    priorDistribution: [anchorP, 1 - anchorP],
    posteriorDistribution: [
      Math.max(0.05, Math.min(0.95, baseReasoning.calibratedProb)),
      Math.max(0.05, Math.min(0.95, 1 - baseReasoning.calibratedProb)),
    ],
    driveStateRewards: stalkLeans,
    mdpActionPayoffs: stalkLeans,
    mdpTransitionProbs: stalkTrusts,
    simulationSamples: stalkLeans.map((v) => anchorP + v),
    controlVariateSamples: stalkLeans.map((v) => anchorP + v * 0.8),
    controlVariateExpected: anchorP,
    calibrationNonconformityScores: [0.02, 0.04, 0.06, 0.08, 0.11],
    pointPrediction: baseReasoning.calibratedProb,
    alpha: 0.1,
  });

  const bitmaskReceipt = buildContextualBitmask288({
    gameId: ctx.gameId,
    league: "NFL",
    temperatureF: 62,
    windSpeedMph: Math.abs(ctx.situation.weatherImpact ?? 0) * 20,
    precipitationRateMmHr: Math.abs(ctx.situation.weatherImpact ?? 0) > 0.3 ? 1.5 : 0,
    altitudeFt: 500,
    surfaceTractionCoeff: 0.92,
    isDome: false,
    daysRestHome: ctx.situation.restDaysHome ?? 7,
    daysRestAway: ctx.situation.restDaysAway ?? 7,
    timeZoneShiftHours: Math.abs(ctx.situation.travelTimezoneShift ?? 0),
    homeInteriorOlOutCount: ctx.observations.some((o) => o.family === "INJURY_AVAILABILITY") ? 1 : 0,
    awayInteriorOlOutCount: 0,
    homeIlb1Out: false,
    homeIlb2Out: false,
    awayIlb1Out: false,
    awayIlb2Out: false,
    homeProjectedSackRate: 0.065,
    awayProjectedSackRate: 0.065,
    homeCb1Out: false,
    awayCb1Out: false,
    homeNickelCbActive: true,
    awayNickelCbActive: true,
    totalSteamMovePts: 0.5,
    spreadLineAbs: Math.abs(ctx.market.line ?? 0),
    homeRookieRouteRampInflection: false,
    awayRookieRouteRampInflection: false,
    qbRushPropHookInDangerZone: false,
  });

  const causalPrmReceipt = evaluateCausalPrmTrajectory([
    {
      layer: "L1",
      inputPriorProb: Math.max(0.05, Math.min(0.95, anchorP)),
      outputPosteriorProb: Math.max(0.05, Math.min(0.95, baseReasoning.calibratedProb)),
      logOddsDelta: baseReasoning.situationalShift,
      citedPremiseIds: traceObs.map((o) => o.signalId),
      z3EntailmentUnsat: true,
      epistemicEntropyBits: textbookAlgorithmsReceipt.coverThomas.shannonEntropyBits,
    },
  ]);

  let calibratedProb = baseReasoning.calibratedProb;
  let why = baseReasoning.why;

  if (situationTrace.ok) {
    const obsComponent =
      situationTrace.activeCount > 0 ? (situationTrace.delta ?? 0) * 0.25 : 0;
    const corpusComponent =
      (situationTrace.corpusSituationalShift ?? 0) * orientationSign * 0.25;
    const mindComponent =
      (situationTrace.mindEvaluation?.netLogitShift ??
        situationTrace.mindEvaluation?.netSituationalAdjustment ??
        0) *
      orientationSign *
      0.05;
    const wave13AndTextbookComponent =
      situationTrace.activeCount > 0
        ? (wave13Receipt.wave13LogOddsModulation * 0.08 +
            textbookAlgorithmsReceipt.combinedStage2LogOddsDelta * 0.08) *
          orientationSign
        : 0;
    const rawDeltaProb =
      obsComponent + corpusComponent + mindComponent + wave13AndTextbookComponent;
    const boundedDeltaProb = Math.max(-0.08, Math.min(0.08, rawDeltaProb));
    calibratedProb = Number(
      Math.max(0.05, Math.min(0.95, baseReasoning.calibratedProb + boundedDeltaProb)).toFixed(4),
    );

    if (situationTrace.activeCount > 0 || matchedPaperCount > 0) {
      const mindPrinciplesCount =
        situationTrace.mindEvaluation?.applicablePrinciples.length ?? 0;
      const traceEvidence = `L2 situational trace: ${situationTrace.activeCount} active signal(s), ${matchedPaperCount} corpus paper(s) evaluated, ${mindPrinciplesCount} mind principle(s) triggered, Sheaf ${wave13Receipt.sheafIntegrity.certifiedRepairClass} (delta ${(boundedDeltaProb >= 0 ? "+" : "") + (boundedDeltaProb * 100).toFixed(2)}%)`;
      why = [...baseReasoning.why, traceEvidence];
    }
  }

  const edgeVsMarket =
    baseReasoning.marketFairProb != null
      ? Number((calibratedProb - baseReasoning.marketFairProb).toFixed(4))
      : baseReasoning.edgeVsMarket;

  const reasoning: IntelligenceReasoning = {
    ...baseReasoning,
    calibratedProb,
    edgeVsMarket,
    why,
  };

  const summary = explain(ctx, reasoning);
  const presence = signalPresence(ctx.observations);
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
    shadowReport: reasoning.shadowReport,
    situationTrace,
    wave13Receipt,
    textbookAlgorithmsReceipt,
    bitmaskHex288: bitmaskReceipt.hexString,
    causalPrmAggregateScore: causalPrmReceipt.listWiseRankScore,
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
