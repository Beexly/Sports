import { round } from "./numeric.js";
import type { PbpRow } from "./nflverse-pbp-mapper.js";

export const DOWN_CONVERSION_MODEL_VERSION = "gse-down-conversion-v1";
export const DOWN_CONVERSION_FEATURE_KEYS = ["down", "ydstogo", "yardsGained", "touchdown", "turnover"] as const;
export const MIN_SERIES_TO_REPORT = 20;

export interface DownConversionSeries {
  readonly gameId: string;
  readonly teamId: string;
  readonly season: number;
  readonly week: number;
  readonly conversionDown: 1 | 2 | 3 | 4 | null;
}

export interface DownConversionWindow {
  readonly series: number;
  readonly conversionsOn1st: number;
  readonly conversionsOn2nd: number;
  readonly conversionsOn3rd: number;
  readonly conversionsOn4th: number;
  readonly noConversion: number;
  readonly shareOn1st: number | null;
  readonly shareOn2nd: number | null;
  readonly shareOn3rd: number | null;
  readonly shareOn4th: number | null;
  readonly shareNoConversion: number | null;
  readonly earlyDownShare: number | null;
}

export interface DownConversionRecord {
  readonly teamId: string;
  readonly season: number;
  readonly week: number;
  readonly seasonWindow: DownConversionWindow;
  readonly roll4: DownConversionWindow;
  readonly roll8: DownConversionWindow;
}

function parseGameId(gameId: string): { season: number; week: number } {
  const parts = gameId.split("_");
  const season = parts.length > 0 ? Number(parts[0]) : NaN;
  const week = parts.length > 1 ? Number(parts[1]) : NaN;
  return { season, week };
}

function isRatable(row: PbpRow): boolean {
  const pt = row["play_type"];
  if (pt !== "run" && pt !== "pass") return false;

  const downStr = row["down"];
  if (!downStr) return false;
  const down = Number(downStr);
  if (!Number.isInteger(down) || down < 1 || down > 4) return false;

  const ygStr = row["yards_gained"];
  const ytgStr = row["ydstogo"];
  if (ygStr === undefined || ytgStr === undefined) return false;

  const yg = Number(ygStr);
  const ytg = Number(ytgStr);
  if (!Number.isFinite(yg) || !Number.isFinite(ytg)) return false;

  return true;
}

function converts(row: PbpRow): boolean {
  if (row["interception"] === "1" || row["fumble_lost"] === "1") return false;
  if (row["touchdown"] === "1") return true;
  const yg = Number(row["yards_gained"]);
  const ytg = Number(row["ydstogo"]);
  return yg >= ytg;
}

interface Group {
  gameId: string;
  season: number;
  week: number;
  posteam: string;
  plays: { down: 1 | 2 | 3 | 4; isConversion: boolean; playId: number }[];
}

export function extractDownConversionSeries(rows: readonly PbpRow[]): DownConversionSeries[] {
  const groups = new Map<string, Group>();

  for (const row of rows) {
    if (!isRatable(row)) continue;

    const gameId = row["game_id"] ?? "";
    const fixedDriveStr = row["fixed_drive"] ?? "";
    const posteam = row["posteam"] ?? "";

    if (!gameId || !fixedDriveStr || !posteam) continue;

    const fixedDrive = Number(fixedDriveStr);
    if (!Number.isFinite(fixedDrive)) continue;

    const key = `${gameId}|${fixedDrive}|${posteam}`;
    let group = groups.get(key);
    if (!group) {
      const { season, week } = parseGameId(gameId);
      group = { gameId, season, week, posteam, plays: [] };
      groups.set(key, group);
    }

    group.plays.push({
      down: Number(row["down"]) as 1 | 2 | 3 | 4,
      isConversion: converts(row),
      playId: Number(row["play_id"]),
    });
  }

  const series: DownConversionSeries[] = [];

  // Sort keys to guarantee deterministic order of groups
  const sortedKeys = [...groups.keys()].sort();

  // Edge rule: Since grouping is by drive, the last group in the data is treated as ended;
  // if it finishes without a conversion (mid-drive truncation or proper end), it correctly
  // yields a NO_CONVERSION series.
  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    group.plays.sort((a, b) => a.playId - b.playId);

    let hasOpen = false;
    for (const play of group.plays) {
      hasOpen = true;
      if (play.isConversion) {
        series.push({
          gameId: group.gameId,
          teamId: group.posteam,
          season: group.season,
          week: group.week,
          conversionDown: play.down,
        });
        hasOpen = false;
      }
    }

    if (hasOpen) {
      series.push({
        gameId: group.gameId,
        teamId: group.posteam,
        season: group.season,
        week: group.week,
        conversionDown: null,
      });
    }
  }

  return series;
}

function buildWindow(seriesList: readonly DownConversionSeries[]): DownConversionWindow {
  let conversionsOn1st = 0;
  let conversionsOn2nd = 0;
  let conversionsOn3rd = 0;
  let conversionsOn4th = 0;
  let noConversion = 0;

  for (const s of seriesList) {
    if (s.conversionDown === 1) conversionsOn1st++;
    else if (s.conversionDown === 2) conversionsOn2nd++;
    else if (s.conversionDown === 3) conversionsOn3rd++;
    else if (s.conversionDown === 4) conversionsOn4th++;
    else noConversion++;
  }

  const series = seriesList.length;

  if (series < MIN_SERIES_TO_REPORT) {
    return {
      series,
      conversionsOn1st,
      conversionsOn2nd,
      conversionsOn3rd,
      conversionsOn4th,
      noConversion,
      shareOn1st: null,
      shareOn2nd: null,
      shareOn3rd: null,
      shareOn4th: null,
      shareNoConversion: null,
      earlyDownShare: null,
    };
  }

  const shareOn1st = round(conversionsOn1st / series, 4);
  const shareOn2nd = round(conversionsOn2nd / series, 4);
  const shareOn3rd = round(conversionsOn3rd / series, 4);
  const shareOn4th = round(conversionsOn4th / series, 4);
  const shareNoConversion = round(noConversion / series, 4);
  const earlyDownShare = round(shareOn1st + shareOn2nd, 4);

  return {
    series,
    conversionsOn1st,
    conversionsOn2nd,
    conversionsOn3rd,
    conversionsOn4th,
    noConversion,
    shareOn1st,
    shareOn2nd,
    shareOn3rd,
    shareOn4th,
    shareNoConversion,
    earlyDownShare,
  };
}

export function computeDownConversionMetrics(
  rows: readonly PbpRow[],
  targetSeason: number,
  targetWeek: number,
): DownConversionRecord[] {
  const allSeries = extractDownConversionSeries(rows);

  const pitSeries = allSeries.filter((s) => s.season === targetSeason && s.week < targetWeek);

  const byTeam = new Map<string, DownConversionSeries[]>();
  for (const s of pitSeries) {
    let bucket = byTeam.get(s.teamId);
    if (!bucket) {
      bucket = [];
      byTeam.set(s.teamId, bucket);
    }
    bucket.push(s);
  }

  const results: DownConversionRecord[] = [];

  for (const [teamId, seriesList] of byTeam.entries()) {
    const gameIdSet = new Set<string>();
    for (const s of seriesList) gameIdSet.add(s.gameId);

    const sortedGames = [...gameIdSet].sort((a, b) => {
      const pA = parseGameId(a);
      const pB = parseGameId(b);
      return (pA.season - pB.season) || (pA.week - pB.week) || (a < b ? -1 : a > b ? 1 : 0);
    });

    const roll4Games = new Set(sortedGames.slice(-4));
    const roll8Games = new Set(sortedGames.slice(-8));

    const s4 = seriesList.filter(s => roll4Games.has(s.gameId));
    const s8 = seriesList.filter(s => roll8Games.has(s.gameId));

    results.push({
      teamId,
      season: targetSeason,
      week: targetWeek,
      seasonWindow: buildWindow(seriesList),
      roll4: buildWindow(s4),
      roll8: buildWindow(s8),
    });
  }

  results.sort((a, b) => a.teamId.localeCompare(b.teamId));

  return results;
}
