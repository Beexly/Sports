import { isTargetInRedZone } from "../signals/efficiency/redzone-te-leverage.js";
import { type PbpRow } from "./nflverse-pbp-mapper.js";

export interface ReceiverTarget {
  readonly receiverPlayerName: string;
  readonly passAirYards: number;
  readonly yardline100: number;
  readonly down: number;
  readonly playType: string;
  readonly season: number;
  readonly week: number;
  readonly teamId?: string;
}

export interface ReceiverUsageMetrics {
  readonly targetShare: number | null;
  readonly deepTargetShare: number | null;
  readonly redZoneTargetShare: number | null;
  readonly targetDominance: number | null;
}

export interface ReceiverUsageRecord {
  readonly playerName: string;
  readonly season: number;
  readonly week: number;
  readonly teamId: string;
  readonly window4: ReceiverUsageMetrics;
  readonly window8: ReceiverUsageMetrics;
  readonly windowSeason: ReceiverUsageMetrics;
}

export const TARGET_SHARE_WEIGHT = 0.50;
export const DEEP_TARGET_SHARE_WEIGHT = 0.25;
export const RZ_TARGET_SHARE_WEIGHT = 0.25;

export const MIN_TARGETS_FLOOR = 15;
export const POSITION_MEAN_TARGET_SHARE = 0.15;
export const POSITION_MEAN_DEEP_SHARE = 0.15;
export const POSITION_MEAN_RZ_SHARE = 0.15;

export function applyShrinkage(
  metric: number,
  teamTargets: number,
  positionMean: number
): number {
  if (teamTargets >= 30) return metric;
  const metricWeight = (teamTargets - 15) / 15.0;
  const meanWeight = 1.0 - metricWeight;
  return (metric * metricWeight) + (positionMean * meanWeight);
}

export function computeMetricsForWindow(
  playerTargets: ReadonlyArray<ReceiverTarget>,
  teamTargetsTotal: number,
  teamDeepTargets: number,
  teamRzTargets: number
): ReceiverUsageMetrics {
  if (teamTargetsTotal < MIN_TARGETS_FLOOR) {
    return { targetShare: null, deepTargetShare: null, redZoneTargetShare: null, targetDominance: null };
  }

  let playerTargetCount = 0;
  let playerDeepCount = 0;
  let playerRzCount = 0;

  for (const t of playerTargets) {
    playerTargetCount++;
    if (t.passAirYards >= 15) playerDeepCount++;
    if (isTargetInRedZone(t.yardline100)) playerRzCount++;
  }

  const rawTargetShare = playerTargetCount / teamTargetsTotal;
  const rawDeepShare = teamDeepTargets > 0 ? playerDeepCount / teamDeepTargets : 0;
  const rawRzShare = teamRzTargets > 0 ? playerRzCount / teamRzTargets : 0;

  const targetShare = applyShrinkage(rawTargetShare, teamTargetsTotal, POSITION_MEAN_TARGET_SHARE);
  const deepTargetShare = applyShrinkage(rawDeepShare, teamTargetsTotal, POSITION_MEAN_DEEP_SHARE);
  const redZoneTargetShare = applyShrinkage(rawRzShare, teamTargetsTotal, POSITION_MEAN_RZ_SHARE);

  const targetDominance = (targetShare * TARGET_SHARE_WEIGHT) +
                          (deepTargetShare * DEEP_TARGET_SHARE_WEIGHT) +
                          (redZoneTargetShare * RZ_TARGET_SHARE_WEIGHT);

  return { targetShare, deepTargetShare, redZoneTargetShare, targetDominance };
}

export function filterPointInTime(
  targets: ReadonlyArray<ReceiverTarget>,
  gameSeason: number,
  gameWeek: number
): ReceiverTarget[] {
  const boundary = gameSeason * 100 + gameWeek;
  const minSeason = gameSeason - 2;

  return targets.filter(t => {
    if (t.season < minSeason) return false;
    return t.season * 100 + t.week < boundary;
  });
}

export function computeReceiverUsage(plays: readonly PbpRow[]): ReceiverUsageRecord[] {
  const allTargets: (ReceiverTarget & { teamId: string })[] = [];

  for (const row of plays) {
    const playType = row["play_type"] ?? "";
    if (playType !== "pass") continue;

    const receiverPlayerName = row["receiver_player_name"] ?? "";
    if (!receiverPlayerName) continue;

    const teamId = row["posteam"] ?? "";
    if (!teamId) continue;

    const airYardsRaw = row["air_yards"];
    const airYards = airYardsRaw !== undefined && airYardsRaw !== null && airYardsRaw !== "" ? Number(airYardsRaw) : NaN;
    if (!Number.isFinite(airYards)) continue;

    const yardline100 = Number(row["yardline_100"]);
    if (!Number.isFinite(yardline100)) continue;

    const down = Number(row["down"]);
    if (!Number.isFinite(down)) continue;

    const season = Number(row["season"]);
    if (!Number.isFinite(season)) continue;

    const gameId = row["game_id"] ?? "";
    const parts = gameId.split("_");
    if (parts.length < 2) continue;

    const week = Number(parts[1]);
    if (!Number.isFinite(week)) continue;

    allTargets.push({
      receiverPlayerName,
      passAirYards: airYards,
      yardline100,
      down,
      playType,
      season,
      week,
      teamId
    });
  }

  const contextsByPlayer = new Map<string, Set<string>>();
  for (const t of allTargets) {
    let set = contextsByPlayer.get(t.receiverPlayerName);
    if (!set) {
      set = new Set();
      contextsByPlayer.set(t.receiverPlayerName, set);
    }
    set.add(t.season + "|" + t.week + "|" + t.teamId);
  }

  const records: ReceiverUsageRecord[] = [];

  for (const [playerName, contexts] of contextsByPlayer.entries()) {
    for (const ctxStr of contexts) {
      const parts = ctxStr.split("|");
      const season = Number(parts[0]);
      const week = Number(parts[1]);
      const teamId = parts[2];

      const teamTargetsBefore = allTargets.filter(t => t.teamId === teamId);
      const validHistory = filterPointInTime(teamTargetsBefore, season, week);

      const distinctWeeks = Array.from(new Set(validHistory.map(t => t.season * 100 + t.week))).sort((a, b) => b - a);

      const targetsSeason = validHistory.filter(t => t.season === season);
      const last4Weeks = distinctWeeks.slice(0, 4);
      const last8Weeks = distinctWeeks.slice(0, 8);

      const targets4 = validHistory.filter(t => last4Weeks.includes(t.season * 100 + t.week));
      const targets8 = validHistory.filter(t => last8Weeks.includes(t.season * 100 + t.week));

      const extractTeamTotals = (windowTargets) => {
        const teamTotal = windowTargets.length;
        let deepCount = 0;
        let rzCount = 0;
        for (const t of windowTargets) {
          if (t.passAirYards >= 15) deepCount++;
          if (isTargetInRedZone(t.yardline100)) rzCount++;
        }
        return { teamTotal, deepCount, rzCount };
      };

      const playerHistory = validHistory.filter(t => t.receiverPlayerName === playerName);
      const playerTargets4 = playerHistory.filter(t => last4Weeks.includes(t.season * 100 + t.week));
      const playerTargets8 = playerHistory.filter(t => last8Weeks.includes(t.season * 100 + t.week));
      const playerTargetsSeason = playerHistory.filter(t => t.season === season);

      const t4 = extractTeamTotals(targets4);
      const w4 = computeMetricsForWindow(playerTargets4, t4.teamTotal, t4.deepCount, t4.rzCount);

      const t8 = extractTeamTotals(targets8);
      const w8 = computeMetricsForWindow(playerTargets8, t8.teamTotal, t8.deepCount, t8.rzCount);

      const ts = extractTeamTotals(targetsSeason);
      const wSeason = computeMetricsForWindow(playerTargetsSeason, ts.teamTotal, ts.deepCount, ts.rzCount);

      records.push({
        playerName,
        season,
        week,
        teamId: teamId || "",
        window4: w4,
        window8: w8,
        windowSeason: wSeason
      });
    }
  }

  return records;
}
