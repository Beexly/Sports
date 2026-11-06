import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/**
 * Pressure-vs-Elusiveness Collision (SHADOW).
 *
 * This module computes the expected sack rate per dropback from the collision
 * of a per-QB elusiveness rate (sack conversion on pressured-proxy dropbacks)
 * and a per-defense pressure generation rate (pressured-proxy dropbacks per
 * dropback faced).
 *
 * It uses the pbp `sack` and `qb_hit` proxy to define "pressure" because Next
 * Gen Stats tracking is not an engine input here. This is an outcome-side proxy
 * and must not be called a true "pressure rate" in code, docs, or UI.
 *
 * - Dropback: a pass play (\`play_type == "pass"\`). Runs (including QB runs/kneels)
 *   are strictly excluded. Spikes are pass plays with \`sack == 0\` and \`qb_hit == 0\`;
 *   they stay in the denominator in v1.
 * - Pressured-proxy dropback: a dropback with \`sack == "1"\` OR \`qb_hit == "1"\`.
 *   A row with both counts ONCE (sack dominates).
 */

export const PRESSURE_ELUSIVENESS_MODEL_VERSION = "gse-pressure-elusiveness-collision-v1";

export interface PressureProxyDropbackPlay {
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly passerPlayerId: string;
  readonly sack: 0 | 1;
  readonly qbHit: 0 | 1;
}

export type PressureWindowMode = "season-to-date" | "rolling-4" | "rolling-8";

export interface QbElusivenessProxyRow {
  readonly pressuredProxyDropbacks: number;
  readonly sacks: number;
  readonly sackConversionOnProxy: number;
  readonly avoidanceOnProxy: number;
}

export interface DefensePressureProxyRow {
  readonly dropbacksFaced: number;
  readonly pressuredProxyDropbacksFaced: number;
  readonly pressureProxyRate: number;
}

export interface PressureCollisionResult {
  readonly pressureProxyRate: number;
  readonly sackConversionOnProxy: number;
  readonly avoidanceOnProxy: number;
  readonly expectedSackRatePerDropback: number;
  readonly provenance: ExpectedMetricProvenance;
}

const COLLISION_FEATURE_KEYS = ["pressureProxyRate", "sackConversionOnProxy"] as const;

export function buildPressureCollisionProvenance(
  qbSampleSize: number,
  defenseSampleSize: number
): ExpectedMetricProvenance {
  return {
    modelVersion: PRESSURE_ELUSIVENESS_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...COLLISION_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(COLLISION_FEATURE_KEYS),
    sampleSize: Math.min(qbSampleSize, defenseSampleSize),
  };
}

function getWindowGames(
  plays: readonly PressureProxyDropbackPlay[],
  targetSeason: number,
  targetWeek: number,
  windowMode: PressureWindowMode,
  teamId: string,
  teamField: "posteam" | "defteam"
): Set<string> {
  const targetWindowKey = targetSeason * 100 + targetWeek;
  const gameKeys = new Set<number>();
  const gameIdToKey = new Map<number, string>();

  for (const p of plays) {
    const playWindowKey = Number(p.gameId.split("_")[0]) * 100 + p.week;
    if (playWindowKey < targetWindowKey && p[teamField] === teamId) {
      gameKeys.add(playWindowKey);
      gameIdToKey.set(playWindowKey, p.gameId);
    }
  }

  const sortedKeys = Array.from(gameKeys).sort((a, b) => a - b);
  let includedKeys: number[] = [];

  if (windowMode === "season-to-date") {
    // Only include games from the target season
    includedKeys = sortedKeys.filter(k => Math.floor(k / 100) === targetSeason);
  } else if (windowMode === "rolling-4") {
    includedKeys = sortedKeys.slice(-4);
  } else if (windowMode === "rolling-8") {
    includedKeys = sortedKeys.slice(-8);
  }

  const includedGameIds = new Set<string>();
  for (const k of includedKeys) {
    includedGameIds.add(gameIdToKey.get(k)!);
  }
  return includedGameIds;
}

export function buildQbElusivenessProxyRow(
  qbPlays: readonly PressureProxyDropbackPlay[],
  targetSeason: number,
  targetWeek: number,
  windowMode: PressureWindowMode,
  qbTeamId: string,
  passerPlayerId: string
): QbElusivenessProxyRow | null {
  const includedGames = getWindowGames(qbPlays, targetSeason, targetWeek, windowMode, qbTeamId, "posteam");

  let pressuredProxyDropbacks = 0;
  let sacks = 0;

  for (const play of qbPlays) {
    if (play.passerPlayerId === passerPlayerId && includedGames.has(play.gameId)) {
      const isSack = play.sack === 1;
      const isPressuredProxy = isSack || play.qbHit === 1;
      if (isPressuredProxy) {
        pressuredProxyDropbacks++;
        if (isSack) {
          sacks++;
        }
      }
    }
  }

  if (pressuredProxyDropbacks < 75) return null;

  const sackConversionOnProxy = sacks / pressuredProxyDropbacks;
  return {
    pressuredProxyDropbacks,
    sacks,
    sackConversionOnProxy: round(sackConversionOnProxy, 4),
    avoidanceOnProxy: round(1 - sackConversionOnProxy, 4),
  };
}

export function buildDefensePressureProxyRow(
  defensePlays: readonly PressureProxyDropbackPlay[],
  targetSeason: number,
  targetWeek: number,
  windowMode: PressureWindowMode,
  defteam: string
): DefensePressureProxyRow | null {
  const includedGames = getWindowGames(defensePlays, targetSeason, targetWeek, windowMode, defteam, "defteam");

  let dropbacksFaced = 0;
  let pressuredProxyDropbacksFaced = 0;

  for (const play of defensePlays) {
    if (play.defteam === defteam && includedGames.has(play.gameId)) {
      dropbacksFaced++;
      const isPressuredProxy = play.sack === 1 || play.qbHit === 1;
      if (isPressuredProxy) {
        pressuredProxyDropbacksFaced++;
      }
    }
  }

  if (dropbacksFaced < 150) return null;

  const pressureProxyRate = pressuredProxyDropbacksFaced / dropbacksFaced;
  return {
    dropbacksFaced,
    pressuredProxyDropbacksFaced,
    pressureProxyRate: round(pressureProxyRate, 4),
  };
}

export function buildPressureElusivenessCollision(
  qbRow: QbElusivenessProxyRow | null,
  defenseRow: DefensePressureProxyRow | null
): PressureCollisionResult | null {
  if (qbRow === null || defenseRow === null) return null;

  const expectedSackRatePerDropback = defenseRow.pressureProxyRate * qbRow.sackConversionOnProxy;

  return {
    pressureProxyRate: defenseRow.pressureProxyRate,
    sackConversionOnProxy: qbRow.sackConversionOnProxy,
    avoidanceOnProxy: qbRow.avoidanceOnProxy,
    expectedSackRatePerDropback: round(expectedSackRatePerDropback, 4),
    provenance: buildPressureCollisionProvenance(qbRow.pressuredProxyDropbacks, defenseRow.dropbacksFaced),
  };
}
