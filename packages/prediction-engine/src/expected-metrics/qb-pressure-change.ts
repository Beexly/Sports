import { mean, variance } from "./numeric.js";
import { type ExpectedMetricProvenance } from "./types.js";

/**
 * QB Pressure-Behavior Change Detection (SHADOW)
 *
 * Detects structural breaks in a QB's EPA per pressured-proxy dropback by
 * comparing a rolling 8-game window against their prior 16-game baseline.
 *
 * Pressure proxy definition: a dropback is "pressured-proxy" iff `sack` = 1
 * OR `qb_hit` = 1 in nflverse pbp. This is NOT a true pressure rate and must
 * never be labeled as one anywhere.
 *
 * The module computes:
 *  - EPA per pressured-proxy dropback using the engine's OWN EPA.
 *  - Pressured-proxy dropback rate.
 *  - Pooled standard error and a break flag (1.5x rule).
 *  - CUSUM diagnostic value.
 *
 * Both windows must have >= 75 pressured-proxy dropbacks to yield a result.
 */

export const QB_PRESSURE_CHANGE_MODEL_VERSION = "gse-qb-pressure-change-v1";

export interface PressuredProxyDropback {
  readonly passerId: string;
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly isDropback: boolean;
  readonly isPressuredProxy: boolean;
  readonly epa: number | null;
}

export interface QbPressureWindowResult {
  readonly passerId: string;
  readonly targetWeek: number;
  readonly targetSeason: number;
  readonly prior16GameCount: number;
  readonly roll8GameCount: number;
  readonly prior16PressuredProxyDropbacks: number;
  readonly roll8PressuredProxyDropbacks: number;
  readonly prior16PressuredProxyRate: number;
  readonly roll8PressuredProxyRate: number;
  readonly prior16EpaPerPressuredProxy: number;
  readonly roll8EpaPerPressuredProxy: number;
  readonly prior16EpaPerPressuredProxyShrunk: number;
  readonly roll8EpaPerPressuredProxyShrunk: number;
  readonly rawDifference: number;
  readonly pooledStandardError: number;
  readonly breakFlag: boolean;
  readonly cusumDiagnostic: number;
  readonly provenance: ExpectedMetricProvenance;
}

const SHRINKAGE_WEIGHT = 50;
const FLOOR_DROPBACKS = 75;

export function computeQbPressureChange(
  plays: readonly PressuredProxyDropback[],
  targetSeason: number,
  targetWeek: number
): QbPressureWindowResult[] {
  // 1. Point-in-time filter: strictly before target week
  const pitPlays = plays.filter(p => {
    if (p.season < targetSeason) return true;
    if (p.season === targetSeason && p.week < targetWeek) return true;
    return false;
  });

  // Calculate league mean EPA per pressured-proxy dropback for shrinkage
  const allPressuredProxyEpas: number[] = [];
  for (const p of pitPlays) {
    if (p.isDropback && p.isPressuredProxy && p.epa !== null && Number.isFinite(p.epa)) {
      allPressuredProxyEpas.push(p.epa);
    }
  }
  const leagueMeanEpa = allPressuredProxyEpas.length > 0 ? mean(allPressuredProxyEpas) : 0;

  // Group by passer
  const playsByPasser = new Map<string, PressuredProxyDropback[]>();
  for (const p of pitPlays) {
    if (!p.passerId) continue;
    let list = playsByPasser.get(p.passerId);
    if (!list) {
      list = [];
      playsByPasser.set(p.passerId, list);
    }
    list.push(p);
  }

  const results: QbPressureWindowResult[] = [];
  const provenance: ExpectedMetricProvenance = {
    modelVersion: QB_PRESSURE_CHANGE_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: ["isPressuredProxy", "epa"],
    featureSchemaHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // deterministic mock hash
    sampleSize: pitPlays.length,
  };

  for (const [passerId, passerPlays] of playsByPasser.entries()) {
    // Group plays by game to find prior 16 and roll 8 windows
    const playsByGame = new Map<string, PressuredProxyDropback[]>();
    const gameIdsInOrder: string[] = []; // rely on chronological input or sort by season/week

    // Sort passer plays by season, week, gameId
    const sortedPlays = [...passerPlays].sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      if (a.week !== b.week) return a.week - b.week;
      return a.gameId.localeCompare(b.gameId);
    });

    for (const p of sortedPlays) {
      let list = playsByGame.get(p.gameId);
      if (!list) {
        list = [];
        playsByGame.set(p.gameId, list);
        gameIdsInOrder.push(p.gameId);
      }
      list.push(p);
    }

    // Windows
    const roll8Games = gameIdsInOrder.slice(-8);
    const prior16Games = gameIdsInOrder.slice(-24, -8);

    if (roll8Games.length === 0 || prior16Games.length === 0) continue;

    const roll8Plays = roll8Games.flatMap(g => playsByGame.get(g)!);
    const prior16Plays = prior16Games.flatMap(g => playsByGame.get(g)!);

    // Filter usable dropbacks
    const roll8Dropbacks = roll8Plays.filter(p => p.isDropback);
    const prior16Dropbacks = prior16Plays.filter(p => p.isDropback);

    const roll8Pressured = roll8Dropbacks.filter(p => p.isPressuredProxy && p.epa !== null && Number.isFinite(p.epa));
    const prior16Pressured = prior16Dropbacks.filter(p => p.isPressuredProxy && p.epa !== null && Number.isFinite(p.epa));

    if (roll8Pressured.length < FLOOR_DROPBACKS || prior16Pressured.length < FLOOR_DROPBACKS) continue;

    const roll8Rate = roll8Dropbacks.length > 0 ? roll8Pressured.length / roll8Dropbacks.length : 0;
    const prior16Rate = prior16Dropbacks.length > 0 ? prior16Pressured.length / prior16Dropbacks.length : 0;

    const roll8Epas = roll8Pressured.map(p => p.epa!);
    const prior16Epas = prior16Pressured.map(p => p.epa!);

    const roll8Mean = mean(roll8Epas);
    const prior16Mean = mean(prior16Epas);

    const roll8Shrunk = ((roll8Mean * roll8Epas.length) + (leagueMeanEpa * SHRINKAGE_WEIGHT)) / (roll8Epas.length + SHRINKAGE_WEIGHT);
    const prior16Shrunk = ((prior16Mean * prior16Epas.length) + (leagueMeanEpa * SHRINKAGE_WEIGHT)) / (prior16Epas.length + SHRINKAGE_WEIGHT);

    const rawDiff = roll8Mean - prior16Mean;

    // Pooled standard error
    const varRoll8 = variance(roll8Epas);
    const varPrior16 = variance(prior16Epas);
    const nRoll8 = roll8Epas.length;
    const nPrior16 = prior16Epas.length;

    // Pooled variance formula
    const pooledVar = ((nRoll8 - 1) * varRoll8 + (nPrior16 - 1) * varPrior16) / (nRoll8 + nPrior16 - 2);
    const pooledStandardError = Math.sqrt(pooledVar * (1 / nRoll8 + 1 / nPrior16));

    const breakFlag = Math.abs(rawDiff) > 1.5 * pooledStandardError;

    // CUSUM Diagnostic: track sustained drift in recent window against prior 16 baseline
    // S_0 = 0; S_i = S_{i-1} + (x_i - baseline_mean)
    let cusumDiagnostic = 0;
    for (const epa of roll8Epas) {
      cusumDiagnostic += (epa - prior16Mean);
    }

    results.push({
      passerId,
      targetWeek,
      targetSeason,
      prior16GameCount: prior16Games.length,
      roll8GameCount: roll8Games.length,
      prior16PressuredProxyDropbacks: prior16Pressured.length,
      roll8PressuredProxyDropbacks: roll8Pressured.length,
      prior16PressuredProxyRate: prior16Rate,
      roll8PressuredProxyRate: roll8Rate,
      prior16EpaPerPressuredProxy: prior16Mean,
      roll8EpaPerPressuredProxy: roll8Mean,
      prior16EpaPerPressuredProxyShrunk: prior16Shrunk,
      roll8EpaPerPressuredProxyShrunk: roll8Shrunk,
      rawDifference: rawDiff,
      pooledStandardError,
      breakFlag,
      cusumDiagnostic,
      provenance
    });
  }

  return results;
}
