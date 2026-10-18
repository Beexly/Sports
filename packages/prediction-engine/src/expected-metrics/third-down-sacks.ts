import { round } from "./numeric.js";

export const THIRD_DOWN_SACKS_MODEL_VERSION = "1.0.0";
export const MIN_THIRD_DOWN_DROPBACKS_TO_FIT = 30;

export interface ThirdDownSackPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly passerId: string;
  readonly down: number;
  readonly passAttempt: number;
  readonly sack: number;
}

export interface ThirdDownSackRollup {
  readonly entityId: string;
  readonly type: "team" | "qb";
  readonly windowType: "ytd" | "rolling-4" | "rolling-8";
  readonly asOfTargetWeek: number;
  readonly dropbacks: number;
  readonly sacksTaken: number;
  readonly sackRate: number | null;
}

export function computeThirdDownSacks(
  plays: readonly ThirdDownSackPlay[],
  targetWeek: number,
  windowType: "ytd" | "rolling-4" | "rolling-8",
  type: "team" | "qb"
): ThirdDownSackRollup[] {
  // Defensive filter: only third downs, strictly before the target week
  const validPlays = plays.filter((p) => p.down === 3 && p.week < targetWeek);

  const playsByEntity = new Map<string, ThirdDownSackPlay[]>();
  for (const p of validPlays) {
    const entityId = type === "team" ? p.posteam : p.passerId;
    if (!entityId) continue;
    let arr = playsByEntity.get(entityId);
    if (!arr) {
      arr = [];
      playsByEntity.set(entityId, arr);
    }
    arr.push(p);
  }

  const results: ThirdDownSackRollup[] = [];

  for (const [entityId, entityPlays] of playsByEntity.entries()) {
    // Sort plays by week to extract unique games properly
    const sortedPlays = [...entityPlays].sort((a, b) => a.week - b.week);

    // Group plays by game
    const games = new Map<string, ThirdDownSackPlay[]>();
    for (const p of sortedPlays) {
      let gPlays = games.get(p.gameId);
      if (!gPlays) {
        gPlays = [];
        games.set(p.gameId, gPlays);
      }
      gPlays.push(p);
    }

    // Sort unique games by the week of their first play (assuming one game per week)
    const sortedGames = Array.from(games.values()).sort((a, b) => a[0]!.week - b[0]!.week);

    let windowGames = sortedGames;
    if (windowType === "rolling-4") {
      windowGames = sortedGames.slice(-4);
    } else if (windowType === "rolling-8") {
      windowGames = sortedGames.slice(-8);
    }

    let dropbacks = 0;
    let sacksTaken = 0;

    for (const gamePlays of windowGames) {
      for (const p of gamePlays) {
        // Denominator: dropback (pass attempt or sack). Scrambles excluded from both
        if (p.passAttempt === 1 || p.sack === 1) {
          dropbacks++;
          if (p.sack === 1) sacksTaken++;
        }
      }
    }

    const sackRate = dropbacks >= MIN_THIRD_DOWN_DROPBACKS_TO_FIT ? sacksTaken / dropbacks : null;

    results.push({
      entityId,
      type,
      windowType,
      asOfTargetWeek: targetWeek,
      dropbacks,
      sacksTaken,
      sackRate,
    });
  }

  return results;
}
