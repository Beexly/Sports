/**
 * Continuity Delta Computation
 *
 * Defines and computes the change in a unit's projected starter continuity
 * between the prior and current depth chart snapshots.
 *
 * Definition:
 * - Continuity Delta = (Current Starters Retained / Prior Starters) - 1
 * - Expressed as a signed number in range -1 to 1 (or extremes beyond ±1)
 * - -1 means zero starters retained (complete turnover)
 * - 0 means all starters retained (no change)
 * - +1 means 2x the prior starters (expansion/promotion)
 *
 * Data Source:
 * - depth_chart_entries (latest 2 snapshots per team/position group)
 * - Filters: depthRank = 1 (starters only)
 * - Week detection: uses max(week) for current, max(week) prior for prior
 *
 * Returns null when:
 * - No depth chart data exists for the team
 * - No prior snapshot exists to compute delta
 * - Insufficient player overlap to establish continuity
 */

import { db } from "@sports/db";

export interface ContinuityDeltasInput {
  /** Game's home team name (e.g., "KC" or "Kansas City Chiefs") */
  homeTeamName: string;
  /** Game's away team name */
  awayTeamName: string;
  /** Current season (e.g., 2026) */
  season: number;
  /** Current week (e.g., 1, 2, ..., 18 for NFL) */
  week: number;
}

export interface ContinuityDeltas {
  /** OL (Offensive Line) starter continuity delta, or null if no data */
  olContinuityDelta: number | null;
  /** DL (Defensive Line) starter continuity delta, or null if no data */
  dlContinuityDelta: number | null;
  /** DB (Secondary/Defensive Back) starter continuity delta, or null if no data */
  dbContinuityDelta: number | null;
}

/**
 * Position group classification: which positions belong to OL/DL/DB.
 * Based on standard NFL depth chart groupings.
 */
const POSITION_GROUPS = {
  OL: new Set(["LT", "LG", "C", "RG", "RT", "G", "T", "OL"]),
  DL: new Set(["LE", "RE", "DE", "DT", "NT", "T", "D"]),
  DB: new Set(["CB", "S", "SS", "FS", "DB", "SC"]),
};

/**
 * Normalize a team name to the format used in depth_chart_entries.
 * Depth charts use uppercase abbreviations (KC, LAR, NE, etc.)
 */
function normalizeTeamName(name: string): string {
  // Handle common formats
  if (!name) return "";
  const upper = name.toUpperCase().trim();
  // If it looks like a full name (>2 chars and has space), extract abbreviation
  // For now, assume the incoming name is already in the right format (homeTeamName from Game)
  return upper;
}

/**
 * Compute the continuity delta for a single position group.
 * Returns null if insufficient data.
 */
async function computePositionGroupDelta(
  teamName: string,
  positionGroup: Set<string>,
  season: number,
  week: number,
): Promise<number | null> {
  // Normalize team name
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return null;

  // Get the latest 2 snapshots (weeks) for this team/positions
  const snapshots = await db.depthChartEntry.findMany({
    where: {
      team: normalized,
      season,
      depthRank: 1, // starters only
      position: { in: Array.from(positionGroup) },
    },
    select: { week: true, playerName: true, position: true, playerId: true },
    distinct: ["week"],
    orderBy: { week: "desc" },
    take: 2,
  });

  if (snapshots.length < 2) {
    // Not enough snapshots to compute a delta
    return null;
  }

  // Separate current vs prior
  // Note: snapshots[0] is latest (DESC order), snapshots[1] is prior
  const currentSnapshot = snapshots.find((s) => s.week === week) || snapshots[0];
  const priorSnapshot = snapshots.find((s) => s.week !== week) || snapshots[1];

  if (!currentSnapshot || !priorSnapshot || currentSnapshot.week === priorSnapshot.week) {
    return null;
  }

  // Build player sets (using playerId if available, else playerName)
  const currentPlayers = new Set(
    currentSnapshot.map((s) => s.playerId || s.playerName).filter(Boolean),
  );
  const priorPlayers = new Set(
    priorSnapshot.map((s) => s.playerId || s.playerName).filter(Boolean),
  );

  // Count overlap
  const priorCount = priorPlayers.size;
  if (priorCount === 0) {
    // Can't compute a delta from zero
    return null;
  }

  const retained = Array.from(currentPlayers).filter((p) => priorPlayers.has(p)).length;

  // Continuity Delta = (retained / prior) - 1
  // Range: -1 (no one retained) to 0 (all retained) to +N (expansion)
  const delta = retained / priorCount - 1;

  return delta;
}

/**
 * Compute all continuity deltas for a game (home and away teams).
 * Averages the two teams' deltas per position group.
 */
export async function computeContinuityDeltas(
  input: ContinuityDeltasInput,
): Promise<ContinuityDeltas> {
  // Compute deltas for both teams, all position groups
  const [homeOL, homeOLAway] = await Promise.all([
    computePositionGroupDelta(input.homeTeamName, POSITION_GROUPS.OL, input.season, input.week),
    computePositionGroupDelta(input.awayTeamName, POSITION_GROUPS.OL, input.season, input.week),
  ]);

  const [homeDL, homeDLAway] = await Promise.all([
    computePositionGroupDelta(input.homeTeamName, POSITION_GROUPS.DL, input.season, input.week),
    computePositionGroupDelta(input.awayTeamName, POSITION_GROUPS.DL, input.season, input.week),
  ]);

  const [homeDB, homeDBaway] = await Promise.all([
    computePositionGroupDelta(input.homeTeamName, POSITION_GROUPS.DB, input.season, input.week),
    computePositionGroupDelta(input.awayTeamName, POSITION_GROUPS.DB, input.season, input.week),
  ]);

  // Average the two teams' deltas (or use null if both are null)
  const olDelta =
    homeOL != null && homeOLAway != null
      ? (homeOL + homeOLAway) / 2
      : homeOL ?? homeOLAway ?? null;

  const dlDelta =
    homeDL != null && homeDLAway != null
      ? (homeDL + homeDLAway) / 2
      : homeDL ?? homeDLAway ?? null;

  const dbDelta =
    homeDB != null && homeDBaway != null
      ? (homeDB + homeDBaway) / 2
      : homeDB ?? homeDBaway ?? null;

  return { olContinuityDelta: olDelta, dlContinuityDelta: dlDelta, dbContinuityDelta: dbDelta };
}
