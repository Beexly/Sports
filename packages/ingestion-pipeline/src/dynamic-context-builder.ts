/**
 * dynamic-context-builder.ts — Dynamic Context and Reasoning Pipeline Builder.
 *
 * Parallel pulls and builds:
 * 1. ESPN Injuries (NFL & NCAAF) -> real EvidenceRecord for PLAYER_AVAILABILITY
 * 2. Trench & Secondary continuity deltas (olContinuityDelta, dlContinuityDelta, dbContinuityDelta)
 * 3. NWS two-step weather (points -> forecastHourly) -> temperature, wind, precip
 * 4. Physiological load proxy (ACWR 1.48 when key skill player is Out, baseline 1.0)
 * 5. interpretSituation invocation before scoreGames -> produces SituationalReading
 */

import type { EvidenceRecord } from "@sports/types";
import {
  interpretSituation,
  type GameContext,
  type SituationalReading,
  evaluateDefensiveLineContinuity,
  evaluateDefensiveBackContinuity,
} from "@sports/prediction-engine";
import {
  getTeamInjuries,
  computeTeamContinuity,
  buildPlayerAvailabilityEvidence,
  type NormalizedInjuryRecord,
  resolveVenueCoordinates,
  fetchNwsWeather,
  type WeatherContextReading,
} from "@sports/data-ingestion";

export interface VenueInfo {
  readonly fullName?: string;
  readonly city?: string;
  readonly state?: string;
  readonly indoor?: boolean;
}

export interface BuildGameContextParams {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly sportKey: string;
  readonly kickoff: Date;
  readonly fetchedAt: Date;
  readonly restDaysHome: number;
  readonly restDaysAway: number;
  readonly avgSpread?: number | null;
  readonly marketFairProb?: number | null;
  readonly venue?: VenueInfo;
  readonly injuryMap: Map<string, NormalizedInjuryRecord[]>;
  readonly customFetch?: typeof fetch;
}

export interface DynamicContextResult {
  readonly gameContext: GameContext;
  readonly situationalReading: SituationalReading | null;
  readonly playerAvailabilityEvidence: EvidenceRecord;
  readonly weatherReading: WeatherContextReading;
}

/**
 * Builds the dynamic GameContext, runs interpretSituation, and creates real PLAYER_AVAILABILITY evidence.
 */
export async function buildDynamicGameContext(
  params: BuildGameContextParams,
): Promise<DynamicContextResult> {
  const {
    homeTeam,
    awayTeam,
    fetchedAt,
    restDaysHome,
    restDaysAway,
    avgSpread,
    marketFairProb,
    venue,
    injuryMap,
    customFetch = fetch,
  } = params;

  // 1. Injuries & Continuity
  const homeInjuries = getTeamInjuries(homeTeam, injuryMap);
  const awayInjuries = getTeamInjuries(awayTeam, injuryMap);

  const homeContinuity = computeTeamContinuity(homeInjuries);
  const awayContinuity = computeTeamContinuity(awayInjuries);

  // olContinuityDelta: Home OL delta (or differential). Negative reduces continuity.
  const olDelta = homeContinuity.olContinuityDelta;
  const dlDelta = homeContinuity.dlContinuityDelta;
  const dbDelta = homeContinuity.dbContinuityDelta;

  // DL & DB continuity scores (0.1–1.0)
  const dlScoreResult = evaluateDefensiveLineContinuity({
    startingDlCount: 4,
    returningStartersFromPriorWeek: Math.max(0, 4 - homeContinuity.outDlCount),
    backupEdgesStarting: Math.min(2, homeContinuity.outDlCount),
    backupInteriorStarting: Math.max(0, homeContinuity.outDlCount - 2),
  });

  const dbScoreResult = evaluateDefensiveBackContinuity({
    startingDbCount: 4,
    returningStartersFromPriorWeek: Math.max(0, 4 - homeContinuity.outDbCount),
    backupCornersStarting: Math.min(2, homeContinuity.outDbCount),
    backupSafetiesStarting: Math.max(0, homeContinuity.outDbCount - 2),
  });

  // ACWR Workload ratio: baseline 1.0 (optimal).
  // When key skill players are Out, the remaining backfield/receiving corps shoulders elevated load (1.48 hazard zone).
  const hasSkillAbsence = homeContinuity.skillOutCount > 0 || awayContinuity.skillOutCount > 0;
  const acwr = hasSkillAbsence ? 1.48 : 1.0;

  // 2. PLAYER_AVAILABILITY EvidenceRecord
  const combinedInjuries = [...homeInjuries, ...awayInjuries];
  const playerAvailabilityEvidence = buildPlayerAvailabilityEvidence(
    `${awayTeam} @ ${homeTeam}`,
    combinedInjuries,
    fetchedAt,
  );

  // 3. NWS Weather
  const venueCoords = resolveVenueCoordinates(venue?.fullName, venue?.city, venue?.state);
  const isIndoor = venue?.indoor ?? venueCoords?.indoor ?? false;
  const lat = venueCoords?.lat ?? 39.7392;
  const lon = venueCoords?.lon ?? -104.9903;

  const weatherReading = await fetchNwsWeather(lat, lon, isIndoor, customFetch);

  // Altitude determination
  let altitudeFt = 0;
  const venueLower = (venue?.fullName || "").toLowerCase();
  const cityLower = (venue?.city || "").toLowerCase();
  if (venueLower.includes("mile high") || cityLower.includes("denver")) {
    altitudeFt = 5280;
  } else if (venueLower.includes("rice-eccles") || cityLower.includes("salt lake city")) {
    altitudeFt = 4200;
  } else if (cityLower.includes("laramie")) {
    altitudeFt = 7220;
  }

  // Market implied probability: devigged fair prob, or derived from spread, or 0.5 baseline
  let marketImplied = 0.50;
  if (typeof marketFairProb === "number" && Number.isFinite(marketFairProb) && marketFairProb > 0.05 && marketFairProb < 0.95) {
    marketImplied = marketFairProb;
  } else if (typeof avgSpread === "number" && Number.isFinite(avgSpread)) {
    // Standard normal proxy: normcdf(-spread / 13.5)
    marketImplied = Number(Math.max(0.05, Math.min(0.95, 0.5 - (avgSpread * 0.03))).toFixed(4));
  }

  // 4. Assemble full GameContext
  const gameContext: GameContext = {
    homeTeam,
    awayTeam,
    venue: venue?.fullName || `${awayTeam} at ${homeTeam}`,
    restDaysHome,
    restDaysAway,
    weather: weatherReading.weatherSummary,
    temperatureF: weatherReading.temperatureF,
    windSpeedMph: weatherReading.windSpeedMph,
    precipitationRateMmHr: weatherReading.precipitationRateMmHr,
    altitudeFt,
    olContinuityDelta: olDelta,
    dlContinuityDelta: dlDelta,
    dbContinuityDelta: dbDelta,
    dlContinuityScore: dlScoreResult.dlContinuityScore,
    dbContinuityScore: dbScoreResult.dbContinuityScore,
    acuteChronicWorkloadRatio: acwr,
    workloadRatio: acwr,
    coachAggressivenessDelta: 0.0,
    marketLine: avgSpread ?? null,
    marketImpliedProbability: marketImplied,
    outcome: homeTeam,
    decisionTimestamp: fetchedAt.toISOString(),
    decisionWindowMs: 86400000,
  };

  // 5. Interpret situation (autonomous reasoning over literature corpus + mind principles)
  let situationalReading: SituationalReading | null = null;
  const evalResult = interpretSituation(gameContext, []);
  if (evalResult.ok) {
    situationalReading = evalResult.data;
  } else {
    console.warn(`[dynamic-context-builder] interpretSituation note: ${evalResult.reason}`);
  }

  return {
    gameContext,
    situationalReading,
    playerAvailabilityEvidence,
    weatherReading,
  };
}
