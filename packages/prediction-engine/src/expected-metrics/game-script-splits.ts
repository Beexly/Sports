import { buildDrives, type DrivePlay } from "./drives.js";

export interface GameScriptSplitPlay extends DrivePlay {
  readonly season: number;
  readonly week: number;
  readonly qtr: number;
}

export interface GameScriptSplitTeamResult {
  /** 1H EPA per play (null if < 60 plays). */
  readonly half1EpaPerPlay: number | null;
  /** 1H Points per drive (null if < 60 plays). */
  readonly half1PointsPerDrive: number | null;
  /** 2H EPA per play (null if < 60 plays). */
  readonly half2EpaPerPlay: number | null;
  /** 2H Points per drive (null if < 60 plays). */
  readonly half2PointsPerDrive: number | null;
  /** (2H EPA/play - 1H EPA/play) or null if either half is under the floor. */
  readonly epaPerPlayDifferential: number | null;
  /** (2H Points/drive - 1H Points/drive) or null if either half is under the floor. */
  readonly pointsPerDriveDifferential: number | null;
  /** Count of overtime drives excluded from the splits. */
  readonly otDrivesExcluded: number;
}

export interface GameScriptSplitsOptions {
  readonly targetGameKey: number;
}

export function gameScriptSplits(
  plays: readonly GameScriptSplitPlay[],
  options: GameScriptSplitsOptions
): Map<string, GameScriptSplitTeamResult> {
  const { targetGameKey } = options;

  // 1. Point-in-time filter
  const validPlays = plays.filter((p) => {
    const gameKey = p.season * 100 + p.week;
    return gameKey < targetGameKey;
  });

  const playMap = new Map<string, GameScriptSplitPlay>();
  for (const p of validPlays) {
    playMap.set(p.playId, p);
  }

  const validDrives = buildDrives(validPlays);

  interface TeamAgg {
    h1Plays: number;
    h1Epa: number;
    h1Drives: number;
    h1Points: number;

    h2Plays: number;
    h2Epa: number;
    h2Drives: number;
    h2Points: number;

    otDrivesExcluded: number;
  }

  const aggs = new Map<string, TeamAgg>();

  function getAgg(team: string): TeamAgg {
    let agg = aggs.get(team);
    if (!agg) {
      agg = {
        h1Plays: 0,
        h1Epa: 0,
        h1Drives: 0,
        h1Points: 0,
        h2Plays: 0,
        h2Epa: 0,
        h2Drives: 0,
        h2Points: 0,
        otDrivesExcluded: 0,
      };
      aggs.set(team, agg);
    }
    return agg;
  }

  // Aggregate plays
  for (const play of validPlays) {
    if (!play.posteam) continue;
    const agg = getAgg(play.posteam);
    if (play.qtr === 1 || play.qtr === 2) {
      agg.h1Plays += 1;
      agg.h1Epa += play.epa ?? 0;
    } else if (play.qtr === 3 || play.qtr === 4) {
      agg.h2Plays += 1;
      agg.h2Epa += play.epa ?? 0;
    }
  }

  // Aggregate drives
  for (const drive of validDrives) {
    if (!drive.posteam) continue;
    const firstPlayId = drive.playIds[0];
    if (!firstPlayId) continue;
    const firstPlay = playMap.get(firstPlayId);
    if (!firstPlay) continue;

    const qtr = firstPlay.qtr;
    const agg = getAgg(drive.posteam);

    if (qtr === 1 || qtr === 2) {
      agg.h1Drives += 1;
      agg.h1Points += drive.points;
    } else if (qtr === 3 || qtr === 4) {
      agg.h2Drives += 1;
      agg.h2Points += drive.points;
    } else {
      agg.otDrivesExcluded += 1;
    }
  }

  const results = new Map<string, GameScriptSplitTeamResult>();

  for (const [team, agg] of aggs.entries()) {
    const h1MeetsFloor = agg.h1Plays >= 60;
    const h2MeetsFloor = agg.h2Plays >= 60;

    const half1EpaPerPlay = h1MeetsFloor ? agg.h1Epa / agg.h1Plays : null;
    const half1PointsPerDrive = h1MeetsFloor ? (agg.h1Drives > 0 ? agg.h1Points / agg.h1Drives : 0) : null;

    const half2EpaPerPlay = h2MeetsFloor ? agg.h2Epa / agg.h2Plays : null;
    const half2PointsPerDrive = h2MeetsFloor ? (agg.h2Drives > 0 ? agg.h2Points / agg.h2Drives : 0) : null;

    const epaPerPlayDifferential =
      h1MeetsFloor && h2MeetsFloor ? half2EpaPerPlay! - half1EpaPerPlay! : null;

    const pointsPerDriveDifferential =
      h1MeetsFloor && h2MeetsFloor ? half2PointsPerDrive! - half1PointsPerDrive! : null;

    results.set(team, {
      half1EpaPerPlay,
      half1PointsPerDrive,
      half2EpaPerPlay,
      half2PointsPerDrive,
      epaPerPlayDifferential,
      pointsPerDriveDifferential,
      otDrivesExcluded: agg.otDrivesExcluded,
    });
  }

  return results;
}
