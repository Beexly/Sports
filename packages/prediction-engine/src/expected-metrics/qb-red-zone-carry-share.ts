/**
 * QB Red-Zone Carry Share (SHADOW)
 *
 * A designed tendency metric for QBs: what fraction of a team's red-zone carries
 * go to the quarterback? Drives goal-line play-calling analysis, QB rushing
 * props, and defensive game-planning.
 *
 * Quarterbacks are identified purely from play-by-play (any player who appears
 * as a passer_player_id for a given posteam).
 * CAVEAT: A wildcat direct-snap player with a single token pass attempt will
 * technically qualify as a QB under this heuristic, but volume floors mitigate this.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import type { PbpRow } from "./nflverse-pbp-mapper.js";

/** Emitted metric for a quarterback in a specific window. */
export interface QbRedZoneCarryShare {
  readonly playerId: string;
  readonly team: string;
  readonly window: "season-to-date" | "last-4" | "last-8";
  /** QB's qualifying red-zone carries in the window. */
  readonly qbCarries: number;
  /** Team's total qualifying red-zone carries in the window (all rushers). */
  readonly teamCarries: number;
  /** qbCarries / teamCarries. Null if QB has < 8 carries OR team has < 20. */
  readonly share: number | null;
}

export interface QbRedZoneCarryShareResult {
  readonly shares: readonly QbRedZoneCarryShare[];
  readonly provenance: ExpectedMetricProvenance;
}

/**
 * Computes QB red-zone carry share over point-in-time windows.
 *
 * Definition pins:
 * - Red-zone carry: play_type == "run", yardline_100 <= 20, qb_kneel != "1"
 * - QB identity: appears as passer_player_id for that posteam in the filtered rows.
 * - Point-in-time: strictly rows where week < targetWeek.
 */
export function computeQbRedZoneCarryShare(
  rows: readonly PbpRow[],
  targetWeek: number
): QbRedZoneCarryShareResult {
  // 1. Enforce strict point-in-time discipline.
  const eligibleRows = rows.filter((r) => {
    const w = parseInt(r["week"] ?? "0", 10);
    return Number.isFinite(w) && w < targetWeek;
  });

  // 2. Identify QBs per posteam.
  const qbSet = new Map<string, Set<string>>(); // posteam -> Set of player IDs
  for (const r of eligibleRows) {
    if (r["play_type"] === "pass") {
      const passerId = r["passer_player_id"];
      const team = r["posteam"];
      if (passerId && team) {
        let teamQbs = qbSet.get(team);
        if (!teamQbs) {
          teamQbs = new Set<string>();
          qbSet.set(team, teamQbs);
        }
        teamQbs.add(passerId);
      }
    }
  }

  // 3. Collect red-zone carry data per team/week.
  interface TeamCarryStats {
    carriesByWeek: Map<number, {
      total: number;
      byQb: Map<string, number>;
    }>;
  }
  const teamStats = new Map<string, TeamCarryStats>();

  for (const r of eligibleRows) {
    if (r["play_type"] !== "run") continue;
    if (r["qb_kneel"] === "1") continue;
    const yardline = parseInt(r["yardline_100"] ?? "100", 10);
    if (!Number.isFinite(yardline) || yardline > 20) continue;

    const team = r["posteam"];
    const rusherId = r["rusher_player_id"];
    const weekStr = r["week"];
    const week = weekStr ? parseInt(weekStr, 10) : NaN;
    if (!team || !rusherId || !Number.isFinite(week)) continue;

    let stats = teamStats.get(team);
    if (!stats) {
      stats = { carriesByWeek: new Map() };
      teamStats.set(team, stats);
    }

    let weekStats = stats.carriesByWeek.get(week);
    if (!weekStats) {
      weekStats = { total: 0, byQb: new Map() };
      stats.carriesByWeek.set(week, weekStats);
    }

    weekStats.total++;

    const teamQbs = qbSet.get(team);
    if (teamQbs && teamQbs.has(rusherId)) {
      const qbCount = weekStats.byQb.get(rusherId) || 0;
      weekStats.byQb.set(rusherId, qbCount + 1);
    }
  }

  // 4. Compute windows.
  const shares: QbRedZoneCarryShare[] = [];

  for (const [team, stats] of teamStats.entries()) {
    const sortedWeeks = Array.from(stats.carriesByWeek.keys()).sort((a, b) => b - a);
    const teamQbs = qbSet.get(team);
    if (!teamQbs) continue; // No QBs identified for team, technically impossible if they had carries but safe

    for (const qbId of teamQbs) {
      const computeForWindow = (
        windowName: "season-to-date" | "last-4" | "last-8",
        weeksToInclude: number
      ) => {
        const weeks = windowName === "season-to-date" ? sortedWeeks : sortedWeeks.slice(0, weeksToInclude);
        let qbCarries = 0;
        let teamCarries = 0;

        for (const w of weeks) {
          const wStats = stats.carriesByWeek.get(w)!;
          teamCarries += wStats.total;
          qbCarries += wStats.byQb.get(qbId) || 0;
        }

        // Floors: QB < 8 carries OR team < 20 carries -> share is null
        const share = (qbCarries < 8 || teamCarries < 20)
          ? null
          : round(qbCarries / teamCarries, 4);

        // Only emit if they actually played QB for this team?
        // Wait, what if they are a QB but had 0 red zone carries in this window?
        // The spec: "Emits raw counts unconditionally, but share is null if floor is missed."
        // A QB might have 0 carries. Should we emit for every QB in the set? Yes.

        shares.push({
          playerId: qbId,
          team,
          window: windowName,
          qbCarries,
          teamCarries,
          share
        });
      };

      computeForWindow("season-to-date", sortedWeeks.length);
      computeForWindow("last-4", 4);
      computeForWindow("last-8", 8);
    }
  }

  // Calculate total sample size of red zone carries across all teams to include in provenance
  let totalQualifyingCarries = 0;
  for (const stats of teamStats.values()) {
    for (const wStats of stats.carriesByWeek.values()) {
      totalQualifyingCarries += wStats.total;
    }
  }

  return {
    shares,
    provenance: {
      modelVersion: "1.0",
      method: "deterministic-rule",
      featureKeys: ["play_type", "yardline_100", "qb_kneel", "passer_player_id", "rusher_player_id"],
      featureSchemaHash: computeFeatureSchemaHash(["play_type", "yardline_100", "qb_kneel", "passer_player_id", "rusher_player_id"]),
      sampleSize: totalQualifyingCarries,
    },
  };
}
