import * as fs from 'fs';
import * as path from 'path';
import { type PbpRow } from "./nflverse-pbp-mapper.js";

/**
 * Defensive Target Share By Position (WR/TE/RB)
 *
 * Computes season-to-date rolling target shares allowed by each defense.
 * Weekly snapshots are point-in-time disciplined (season*100+week strictly before the projected game).
 * Week floor of 4 games -> null otherwise.
 */
export interface DefensiveTargetShare {
  readonly defteam: string;
  readonly season: number;
  readonly week: number;
  readonly wrShareAllowed: number | null;
  readonly teShareAllowed: number | null;
  readonly rbShareAllowed: number | null;
}

export function loadRosterPositions(season: number, maxWeek: number): Map<string, string> {
  const filePath = path.join(process.cwd(), `packages/data-ingestion/data/rosters-${season}.jsonl`);
  const result = new Map<string, string>();
  if (!fs.existsSync(filePath)) return result;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      // Ensure we only use rosters from before maxWeek
      if (row.week && parseInt(row.week, 10) >= maxWeek) continue;

      const gsis = row.gsis_id;
      let pos = row.position;
      if (pos === 'Offense' || pos === 'Defense' || !pos) {
        pos = row.depth_chart_position || pos;
      }
      if (gsis && pos) {
        result.set(gsis, pos);
      }
    } catch (e) {
      // Ignore parse errors on individual lines
    }
  }
  return result;
}

export function computeDefensiveTargetShares(
  rows: readonly PbpRow[],
): DefensiveTargetShare[] {
  // 1. Group rows by season and defteam and find all weeks.

  interface TeamSeasonData {
    playedWeeks: Set<number>;
    targetsByWeek: Map<number, { wr: number; te: number; rb: number }>;
  }

  const dataByTeamSeason = new Map<string, TeamSeasonData>();

  const getTeamData = (team: string, season: number) => {
    const key = `${season}-${team}`;
    let data = dataByTeamSeason.get(key);
    if (!data) {
      data = {
        playedWeeks: new Set(),
        targetsByWeek: new Map(),
      };
      dataByTeamSeason.set(key, data);
    }
    return data;
  };

  const allWeeksBySeason = new Map<number, Set<number>>();
  const rowsBySeason = new Map<number, PbpRow[]>();

  for (const row of rows) {
    const gameId = row["game_id"] ?? "";
    const parts = gameId.split("_");
    if (parts.length < 4) continue;

    const season = parseInt(parts[0]!, 10);
    const week = parseInt(parts[1]!, 10);

    if (!Number.isFinite(season) || !Number.isFinite(week)) continue;

    let seasonWeeks = allWeeksBySeason.get(season);
    if (!seasonWeeks) {
      seasonWeeks = new Set();
      allWeeksBySeason.set(season, seasonWeeks);
    }
    seasonWeeks.add(week);

    let sRows = rowsBySeason.get(season);
    if (!sRows) {
      sRows = [];
      rowsBySeason.set(season, sRows);
    }
    sRows.push(row);
  }

  const results: DefensiveTargetShare[] = [];

  for (const [season, seasonRows] of rowsBySeason.entries()) {
    // Process season
    const weeks = allWeeksBySeason.get(season)!;
    const sortedWeeks = Array.from(weeks).sort((a, b) => a - b);
    if (sortedWeeks.length === 0) continue;

    const maxWeek = sortedWeeks[sortedWeeks.length - 1]!;

    // For each target week we calculate the shares
    for (let snapshotWeek = 1; snapshotWeek <= maxWeek + 1; snapshotWeek++) {
       // We can only use roster data up to snapshotWeek - 1
       const rosterPositions = loadRosterPositions(season, snapshotWeek);

       // Calculate everything for this snapshot week
       const tempTeamData = new Map<string, { gamesPlayed: number, wr: number, te: number, rb: number }>();

       // Better: compute targets properly for this snapshot
       const gamesPlayedByTeam = new Map<string, Set<string>>(); // team -> set of game_ids
       const targetsByTeam = new Map<string, { wr: number, te: number, rb: number }>();

       for (const row of seasonRows) {
          const gameId = row["game_id"] ?? "";
          const parts = gameId.split("_");
          const week = parseInt(parts[1]!, 10);
          if (week >= snapshotWeek) continue;

          const awayTeam = parts[2]!;
          const homeTeam = parts[3]!;
          const defteam = row["defteam"];

          if (awayTeam) {
             let g = gamesPlayedByTeam.get(awayTeam);
             if (!g) { g = new Set(); gamesPlayedByTeam.set(awayTeam, g); }
             g.add(gameId);
          }
          if (homeTeam) {
             let g = gamesPlayedByTeam.get(homeTeam);
             if (!g) { g = new Set(); gamesPlayedByTeam.set(homeTeam, g); }
             g.add(gameId);
          }

          if (defteam && row["play_type"] === "pass") {
            const receiverId = row["receiver_player_id"];
            if (receiverId) {
               const position = rosterPositions.get(receiverId);
               if (position === "WR" || position === "TE" || position === "RB") {
                 let t = targetsByTeam.get(defteam);
                 if (!t) { t = { wr: 0, te: 0, rb: 0 }; targetsByTeam.set(defteam, t); }
                 if (position === "WR") t.wr++;
                 if (position === "TE") t.te++;
                 if (position === "RB") t.rb++;
               }
            }
          }
       }

       // Generate results for this snapshotWeek for ALL teams that appear in this season
       for (const defteam of gamesPlayedByTeam.keys()) {
          const gamesPlayed = gamesPlayedByTeam.get(defteam)?.size ?? 0;
          const t = targetsByTeam.get(defteam) ?? { wr: 0, te: 0, rb: 0 };

          if (gamesPlayed < 4) {
            results.push({
              defteam,
              season,
              week: snapshotWeek,
              wrShareAllowed: null,
              teShareAllowed: null,
              rbShareAllowed: null,
            });
          } else {
            const total = t.wr + t.te + t.rb;
            if (total === 0) {
              results.push({
                defteam,
                season,
                week: snapshotWeek,
                wrShareAllowed: null,
                teShareAllowed: null,
                rbShareAllowed: null,
              });
            } else {
              results.push({
                defteam,
                season,
                week: snapshotWeek,
                wrShareAllowed: t.wr / total,
                teShareAllowed: t.te / total,
                rbShareAllowed: t.rb / total,
              });
            }
          }
       }
    }
  }

  return results;
}
