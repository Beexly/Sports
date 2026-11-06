/**
 * Red-zone carry share — a deterministic, SHADOW-only expected metric module.
 *
 * Computes per-player red-zone carry concentration over point-in-time disciplined
 * rolling windows. A red-zone rush attempt is a mapped play where `play_type == "run"`,
 * `yardline_100 <= 20`, and `qb_kneel != "1"`.
 *
 * Floors: Players are emitted for an as-of-week only if they have >= 8 RZ carries
 * in the window AND their team has >= 20 RZ carries in the window.
 *
 * This is a definitional metric: there is no modeling or shrinkage.
 */

import { round } from "./numeric.js";
import { type PbpRow } from "./nflverse-pbp-mapper.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** Minimal play grain needed for RZ carry share. */
export interface RzCarryPlay {
  readonly playId: string;
  readonly playType: string;
  readonly yardline100: number;
  readonly rusherPlayerId: string;
  readonly posteam: string;
  readonly qbKneel: string;
  readonly week: number;
}

export const RED_ZONE_CARRY_SHARE_VERSION = "gse-rz-carry-share-v1";

const FEATURE_KEYS = ["playType", "yardline100", "rusherPlayerId", "posteam", "qbKneel", "week"] as const;

export interface RzCarryShareWindowMetrics {
  readonly rzCarryShareSeasonToDate: number | null;
  readonly rzCarryShareLast4Games: number | null;
  readonly rzCarryShareLast8Games: number | null;
}

export interface PlayerRzCarryShare {
  readonly playerId: string;
  readonly posteam: string;
  readonly asOfWeek: number;
  readonly metrics: RzCarryShareWindowMetrics;
  readonly provenance: ExpectedMetricProvenance;
}

/** Determines if a play qualifies as a red-zone rush attempt. */
function isRedZoneCarry(play: RzCarryPlay): boolean {
  if (play.playType !== "run") return false;
  if (!Number.isFinite(play.yardline100) || play.yardline100 > 20) return false;
  if (play.qbKneel === "1") return false;
  return true;
}

/**
 * Builds the provenance record.
 */
function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: RED_ZONE_CARRY_SHARE_VERSION,
    method: "deterministic-rule",
    featureKeys: [...FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(FEATURE_KEYS),
    sampleSize,
  };
}

/** Extract plays from raw pbp. */
function extractPlays(records: readonly PbpRow[]): RzCarryPlay[] {
  const plays: RzCarryPlay[] = [];
  for (const r of records) {
    plays.push({
      playId: `${r["game_id"] ?? ""}-${r["play_id"] ?? ""}`,
      playType: r["play_type"] ?? "",
      yardline100: Number(r["yardline_100"] ?? NaN),
      rusherPlayerId: r["rusher_player_id"] ?? "",
      posteam: r["posteam"] ?? "",
      qbKneel: r["qb_kneel"] ?? "",
      week: Number(r["week"] ?? NaN),
    });
  }
  return plays;
}

interface WindowData {
  playerCarries: number;
  teamCarries: number;
}

/** Calculate share if floors are met. */
function calculateShare(playerCarries: number, teamCarries: number): number | null {
  if (playerCarries >= 8 && teamCarries >= 20) {
    return round(playerCarries / teamCarries, 4);
  }
  return null;
}

/** Compute metrics for a single player in a single week. */
export function computeRzCarryShare(
  records: readonly PbpRow[],
  targetWeek: number
): PlayerRzCarryShare[] {
  const allPlays = extractPlays(records);

  // Filter to plays strictly BEFORE targetWeek (point-in-time discipline)
  // and only keep actual RZ carries.
  const pastRzCarries = allPlays.filter(p => Number.isFinite(p.week) && p.week < targetWeek && isRedZoneCarry(p));

  // Determine distinct past weeks for each team
  const teamWeeks = new Map<string, number[]>();
  for (const p of pastRzCarries) {
    const w = p.week;
    let weeks = teamWeeks.get(p.posteam);
    if (!weeks) {
      weeks = [];
      teamWeeks.set(p.posteam, weeks);
    }
    if (!weeks.includes(w)) {
      weeks.push(w);
    }
  }

  // Sort weeks descending to easily get last N distinct games (approximated by weeks here, as nflverse
  // distinct games per team generally correspond to distinct weeks for the team)
  for (const [team, weeks] of teamWeeks.entries()) {
    weeks.sort((a, b) => b - a);
  }

  // Helper to get plays within the last N distinct weeks for a team
  const getPlaysInWindow = (posteam: string, numGames: number | null): RzCarryPlay[] => {
    const teamPlays = pastRzCarries.filter(p => p.posteam === posteam);
    if (numGames === null) return teamPlays; // season to date

    const weeks = teamWeeks.get(posteam) || [];
    const windowWeeks = new Set(weeks.slice(0, numGames));
    return teamPlays.filter(p => windowWeeks.has(p.week));
  };

  const results: PlayerRzCarryShare[] = [];
  const teams = Array.from(new Set(pastRzCarries.map(p => p.posteam))).filter(t => t !== "");

  for (const team of teams) {
    const stdPlays = getPlaysInWindow(team, null);
    const last4Plays = getPlaysInWindow(team, 4);
    const last8Plays = getPlaysInWindow(team, 8);

    const getStats = (plays: RzCarryPlay[]) => {
      const teamCarries = plays.length;
      const playerCounts = new Map<string, number>();
      for (const p of plays) {
        if (p.rusherPlayerId) {
          playerCounts.set(p.rusherPlayerId, (playerCounts.get(p.rusherPlayerId) || 0) + 1);
        }
      }
      return { teamCarries, playerCounts };
    };

    const stdStats = getStats(stdPlays);
    const l4Stats = getStats(last4Plays);
    const l8Stats = getStats(last8Plays);

    // Get all distinct rushers for the team
    const allRushers = new Set([
      ...stdStats.playerCounts.keys(),
      ...l4Stats.playerCounts.keys(),
      ...l8Stats.playerCounts.keys()
    ]);

    for (const rusher of allRushers) {
      const stdShare = calculateShare(stdStats.playerCounts.get(rusher) || 0, stdStats.teamCarries);
      const l4Share = calculateShare(l4Stats.playerCounts.get(rusher) || 0, l4Stats.teamCarries);
      const l8Share = calculateShare(l8Stats.playerCounts.get(rusher) || 0, l8Stats.teamCarries);

      // Only emit if at least one window meets the floors
      if (stdShare !== null || l4Share !== null || l8Share !== null) {
        results.push({
          playerId: rusher,
          posteam: team,
          asOfWeek: targetWeek,
          metrics: {
            rzCarryShareSeasonToDate: stdShare,
            rzCarryShareLast4Games: l4Share,
            rzCarryShareLast8Games: l8Share
          },
          provenance: buildProvenance(pastRzCarries.length)
        });
      }
    }
  }

  // Sort deterministic
  results.sort((a, b) => {
    if (a.posteam !== b.posteam) return a.posteam.localeCompare(b.posteam);
    return a.playerId.localeCompare(b.playerId);
  });

  return results;
}
