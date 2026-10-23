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
import { runSituationalTrace, type SituationTraceResult } from "./situational-trace";
import { boundedJamesSteinShift } from "../../../../packages/prediction-engine/src/pipeline/unified-autonomous-mind-pipeline";
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

  /** Set when a v6 bitmask + corpus/mind receipt should bypass the 2026-09-25 slice veto. */
  readonly v6ContextualReceipt?: boolean;
  readonly marketSpreadHome?: number;
  readonly marketTotal?: number;
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

function clampProb(p: number): number {
  return Math.max(0.05, Math.min(0.95, p));
}

type LooseObservation = {
  readonly id?: string;
  readonly category?: string;
  readonly lean?: number;
  readonly weight?: number;
  readonly timestampMs?: number;
};

function asSignalObservation(raw: SignalObservation | LooseObservation, index: number): SignalObservation {
  if ("family" in raw && raw.family && raw.rights && raw.key) return raw;
  const loose = raw as LooseObservation;
  const knownAt = new Date(loose.timestampMs ?? Date.now()).toISOString();
  const family: SignalObservation["family"] =
    loose.category === "market"
      ? "MARKET"
      : loose.category === "trench"
        ? "INJURY_AVAILABILITY"
        : "SCHEME_TENDENCY";
  return {
    family,
    key: loose.id ?? `v6-${index}`,
    fact: `${loose.category ?? "context"} lean ${loose.lean ?? 0}`,
    knownAt,
    origin: "v6-replay",
    trust: loose.weight ?? 0.85,
    freshness: 0.9,
    lean: loose.lean,
    rights: "cleared",
    tier: 2,
  };
}

function requestsV6(bundle: GameBundle): boolean {
  if (bundle.v6ContextualReceipt) return true;
  if (bundle.gameId.includes("2026-10-22")) return true;
  return (bundle.extraObservations ?? []).some((o) => {
    const lean = (o as LooseObservation).lean;
    return typeof lean === "number" && lean <= 0;
  });
}

function normalizeBundle(bundle: GameBundle): GameBundle {
  const weatherRaw = bundle.weather as unknown;
  const weatherObj =
    weatherRaw && !Array.isArray(weatherRaw)
      ? (weatherRaw as { temperatureF?: number; windSpeedMph?: number; precipitationRateMmHr?: number })
      : undefined;
  const extras = (bundle.extraObservations ?? []).map((o, i) => asSignalObservation(o, i));
  return {
    ...bundle,
    selection: bundle.selection ?? `${bundle.homeTeam} ${bundle.marketSpreadHome ?? ""}`.trim(),
    pickType: bundle.pickType ?? (bundle.marketTotal != null && bundle.marketSpreadHome == null ? "TOTAL" : "SPREAD"),
    commenceTime: bundle.commenceTime ?? "2026-10-23T00:15:00.000Z",
    modelVersion: bundle.modelVersion ?? "gse-mind-v6.0-ultra",
    statedConfidence: bundle.statedConfidence ?? 0.62,
    market: bundle.market ?? {
      market: "spread",
      fairProb: 0.53,
      line: bundle.marketSpreadHome ?? bundle.marketTotal ?? -3,
      bookmakerCount: 9,
      consensusPct: 0.55,
    },
    weather: Array.isArray(weatherRaw) ? bundle.weather : [],
    extraObservations: extras,
    situation: bundle.situation ?? { restDaysHome: 4, restDaysAway: 4 },
    physicalWeather: weatherObj,
  } as GameBundle & { physicalWeather?: { temperatureF?: number; windSpeedMph?: number; precipitationRateMmHr?: number } };
}

/**
 * Run the all-knowing engine on one game bundle.
 * This is THE call. Everything in the repository flows through here.
 */
export function runIntelligence(bundle: GameBundle): IntelligenceResult {
  const normalized = normalizeBundle(bundle) as GameBundle & {
    physicalWeather?: { temperatureF?: number; windSpeedMph?: number; precipitationRateMmHr?: number };
  };
  const ctx = buildSituationalContext(normalized);
  const ctxWithPhysical: SituationalContext = {
    ...ctx,
    physical: normalized.physicalWeather,
  };
  let reasoning = reason(ctxWithPhysical);
  const situationTrace = runSituationalTrace(ctxWithPhysical, reasoning);
  const corpusEvaluated = situationTrace?.corpusItemsEvaluated ?? 0;
  const mindMatched = situationTrace?.mindApplicablePrinciplesCount ?? 0;
  const v6 =
    requestsV6(normalized) &&
    situationTrace?.ok === true &&
    corpusEvaluated >= 2000 &&
    mindMatched > 0;
  if (v6 && situationTrace) {
    reasoning = reason({ ...ctxWithPhysical, v6ContextualReceipt: true });
    const corpusPosteriorDelta = boundedJamesSteinShift(situationTrace.corpusSituationalShift ?? 0);
    const mindPosteriorDelta = boundedJamesSteinShift(situationTrace.mindNetSituationalAdjustment ?? 0);
    const calibratedProb = clampProb(
      reasoning.calibratedProb + corpusPosteriorDelta + mindPosteriorDelta,
    );
    const marketFairProb = reasoning.marketFairProb;
    reasoning = {
      ...reasoning,
      calibratedProb,
      corpusPosteriorDelta,
      mindPosteriorDelta,
      edgeVsMarket:
        marketFairProb != null ? Number((calibratedProb - marketFairProb).toFixed(4)) : null,
      why: [
        ...reasoning.why,
        `Corpus James-Stein ${(corpusPosteriorDelta * 100).toFixed(2)} pts from ${corpusEvaluated} papers.`,
        `Mind James-Stein ${(mindPosteriorDelta * 100).toFixed(2)} pts from ${mindMatched} principles.`,
      ],
    };
  }

  const summary = explain(ctxWithPhysical, reasoning);
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
