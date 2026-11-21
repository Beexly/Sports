import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { compareSeasonWeek } from "./chronological-time.js";

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
  const byGame = new Map<string, { season: number; week: number; gameId: string }>();

  for (const p of plays) {
    if (p[teamField] !== teamId) continue;
    const playSeason = Number(p.gameId.split("_")[0]);
    if (!Number.isFinite(playSeason)) continue;
    if (compareSeasonWeek(playSeason, p.week, targetSeason, targetWeek) < 0) {
      if (!byGame.has(p.gameId)) {
        byGame.set(p.gameId, { season: playSeason, week: p.week, gameId: p.gameId });
      }
    }
  }

  const sortedGames = Array.from(byGame.values()).sort((a, b) => {
    const cmp = compareSeasonWeek(a.season, a.week, b.season, b.week);
    return cmp !== 0 ? cmp : a.gameId.localeCompare(b.gameId);
  });

  let included: typeof sortedGames = [];
  if (windowMode === "season-to-date") {
    included = sortedGames.filter(g => g.season === targetSeason);
  } else if (windowMode === "rolling-4") {
    included = sortedGames.slice(-4);
  } else if (windowMode === "rolling-8") {
    included = sortedGames.slice(-8);
  }

  return new Set(included.map(g => g.gameId));
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
