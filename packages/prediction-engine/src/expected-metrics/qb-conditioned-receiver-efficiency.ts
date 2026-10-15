/**
 * QB-conditioned receiver efficiency (Yards Per Target).
 *
 * This module measures a receiver's efficiency conditioned on the QB throwing to
 * him. It computes the receiver's yards per target (NOT yards per route run, as
 * routes are not present in public play-by-play) with a specific QB, and compares
 * it to his yards per target with all other QBs combined over the same window.
 *
 * NOTE ON YPRR: Routes run are NOT in nflverse play-by-play, so nothing in this
 * module computes, names, or documents yards per route run (YPRR). The faithfully
 * mapped metric from play-by-play is YARDS PER TARGET.
 *
 * Window options support season-to-date or a rolling 8-game window, strictly
 * adhering to point-in-time discipline. A play from the target week or later
 * never bleeds into the baseline. Shrinkage toward the league mean yards/target
 * is applied using targets/(targets + 20).
 *
 * This is a pure expected-metric derived directly from play-by-play. It does NOT
 * use EPA or NGS tracking data.
 */

import { type PbpRow } from "./nflverse-pbp-mapper.js";

/** Convert nflverse string to finite number; NaN on null, empty, or unparseable. */
function num(val: string | null | undefined): number {
  if (val == null || val === "") return NaN;
  return Number(val);
}

/** One targeted pass play, mapped from nflverse play-by-play. */
export interface TargetedPassPlay {
  /** Identifier for the game (e.g. 2025_03_AAA_BBB). */
  readonly gameId: string;
  /** Season year. */
  readonly season: number;
  /** Week number. */
  readonly week: number;
  /** Passer player id (`passer_player_id`). */
  readonly passerId: string;
  /** Receiver player id (`receiver_player_id`). */
  readonly receiverId: string;
  /** 1 if the pass was completed (`complete_pass`), else 0. */
  readonly complete: 0 | 1;
  /** Receiving yards (`receiving_yards`). */
  readonly receivingYards: number;
  /** Intended air yards (`air_yards`). */
  readonly airYards: number;
  /** Team possessing the ball. */
  readonly posteam: string;
  /** Defensive team. */
  readonly defteam: string;
}

export interface QbConditionedReceiverEfficiencyRow {
  readonly receiverId: string;
  readonly qbId: string;
  readonly window: "season" | "rolling-8";
  readonly targets: number;
  readonly completions: number;
  readonly completionRate: number;
  readonly receivingYards: number;
  readonly yardsPerTarget: number;
  readonly yardsPerCompletion: number;
  readonly shrunkYardsPerTarget: number;
  /** The receiver's yards/target with all other QBs combined. */
  readonly otherQbTargets: number;
  readonly otherQbYardsPerTarget: number | null;
  /** yardsPerTarget - otherQbYardsPerTarget. Null if other QBs < 10 targets. */
  readonly onOffDifferential: number | null;
}


/**
 * Map raw nflverse rows to targeted pass plays.
 * Only keeps rows where play_type === "pass" and both passer/receiver IDs exist.
 */
export function mapTargetedPassPlays(rows: readonly PbpRow[]): TargetedPassPlay[] {
  const plays: TargetedPassPlay[] = [];
  for (const row of rows) {
    if (row["play_type"] !== "pass") continue;

    const passerId = row["passer_player_id"] ?? "";
    const receiverId = row["receiver_player_id"] ?? "";
    if (passerId === "" || receiverId === "") continue;

    const gameId = row["game_id"] ?? "";
    const season = num(row["season"]);
    const week = num(row["week"]); // Note: mapper might not have week if not in array, but game_id has it.

    // Parse week from game_id if week is missing
    let parsedWeek = week;
    let parsedSeason = season;
    if (!Number.isFinite(week) || !Number.isFinite(season)) {
       const parts = gameId.split("_");
       if (parts.length >= 2) {
         parsedSeason = parseInt(parts[0]!, 10);
         parsedWeek = parseInt(parts[1]!, 10);
       }
    }

    if (!Number.isFinite(parsedSeason) || !Number.isFinite(parsedWeek)) continue;

    const cp = num(row["complete_pass"]);
    const complete = cp === 1 ? 1 : 0;
    const rawYards = num(row["receiving_yards"]);

    // Incomplete passes are targets with 0 yards.
    const receivingYards = complete === 1 && Number.isFinite(rawYards) ? rawYards : 0;
    const airYards = num(row["air_yards"]);

    plays.push({
      gameId,
      season: parsedSeason,
      week: parsedWeek,
      passerId,
      receiverId,
      complete,
      receivingYards,
      airYards: Number.isFinite(airYards) ? airYards : NaN,
      posteam: row["posteam"] ?? "",
      defteam: row["defteam"] ?? "",
    });
  }
  return plays;
}

/**
 * Computes receiver efficiency conditioned on QB over the given window.
 * Only targets strictly before `targetWeek` are included.
 */
export function computeQbConditionedReceiverEfficiency(
  plays: readonly TargetedPassPlay[],
  targetSeason: number,
  targetWeek: number,
  window: "season" | "rolling-8"
): { results: QbConditionedReceiverEfficiencyRow[], diagnostics: { droppedDueToTargetFloor: number } } {
  // First, filter by point-in-time
  const eligiblePlays: TargetedPassPlay[] = [];
  for (const play of plays) {
    // strictly before target week, handling season boundaries.
    if (play.season > targetSeason) continue;
    if (play.season === targetSeason && play.week >= targetWeek) continue;

    // for 'season' window, only keep the target season's plays
    if (window === "season" && play.season !== targetSeason) continue;

    eligiblePlays.push(play);
  }

  // To do a rolling-8 window, we need to know the games played by each receiver.
  // We'll compute the game list per receiver, sort them by week, and then filter
  // if window === "rolling-8".
  const playsByReceiver = new Map<string, TargetedPassPlay[]>();
  for (const play of eligiblePlays) {
    let arr = playsByReceiver.get(play.receiverId);
    if (!arr) {
      arr = [];
      playsByReceiver.set(play.receiverId, arr);
    }
    arr.push(play);
  }

  // Compute league mean for shrinkage.
  // We only use plays that actually pass the receiver's window logic,
  // but to keep it simple and faithful to a "league mean over the same window",
  // we'll compute one global league mean for all eligible plays. Wait, the requirement:
  // "shrunk toward the league-wide yards/target mean over the same window".
  // If window is rolling-8, "over the same window" is tricky for league-wide since
  // it's per-receiver. Let's compute a simple league mean over all eligiblePlays first.
  let leagueTargets = 0;
  let leagueYards = 0;

  // We will build receiver plays based on the window.
  const finalPlaysByReceiver = new Map<string, TargetedPassPlay[]>();

  for (const [receiverId, receiverPlays] of playsByReceiver.entries()) {
    let finalPlays = receiverPlays;
    if (window === "rolling-8") {
      // Find unique games for this receiver
      const gamesSet = new Set<string>();
      for (const p of receiverPlays) {
        gamesSet.add(p.gameId);
      }
      // Sort games chronologically (by season then week, parsing gameId)
      const sortedGames = Array.from(gamesSet).sort((a, b) => {
        const partsA = a.split("_");
        const partsB = b.split("_");
        const sA = parseInt(partsA[0]!, 10);
        const wA = parseInt(partsA[1]!, 10);
        const sB = parseInt(partsB[0]!, 10);
        const wB = parseInt(partsB[1]!, 10);
        if (sA !== sB) return sA - sB;
        return wA - wB;
      });
      const windowGames = new Set(sortedGames.slice(-8));
      finalPlays = receiverPlays.filter((p) => windowGames.has(p.gameId));
    }
    finalPlaysByReceiver.set(receiverId, finalPlays);

    for (const p of finalPlays) {
      leagueTargets++;
      leagueYards += p.receivingYards;
    }
  }

  const leagueYardsPerTarget = leagueTargets > 0 ? leagueYards / leagueTargets : 0;

  const results: QbConditionedReceiverEfficiencyRow[] = [];
  let droppedDueToTargetFloor = 0;

  for (const [receiverId, receiverPlays] of finalPlaysByReceiver.entries()) {
    // Group by QB
    const qbStats = new Map<string, { targets: number; completions: number; yards: number }>();

    for (const p of receiverPlays) {
      let stats = qbStats.get(p.passerId);
      if (!stats) {
        stats = { targets: 0, completions: 0, yards: 0 };
        qbStats.set(p.passerId, stats);
      }
      stats.targets++;
      stats.completions += p.complete;
      stats.yards += p.receivingYards;
    }

    // Now, for each QB, compute metrics and compare to other QBs
    for (const [qbId, stats] of qbStats.entries()) {
      if (stats.targets < 20) {
        droppedDueToTargetFloor++;
        continue; // Floor: pairing below 20 targets returns no row
      }

      let otherTargets = 0;
      let otherYards = 0;

      for (const [otherQb, otherStats] of qbStats.entries()) {
        if (otherQb === qbId) continue;
        otherTargets += otherStats.targets;
        otherYards += otherStats.yards;
      }

      const yardsPerTarget = stats.yards / stats.targets;
      const weight = stats.targets / (stats.targets + 20);
      const shrunkYardsPerTarget = (weight * yardsPerTarget) + ((1 - weight) * leagueYardsPerTarget);

      let otherQbYardsPerTarget: number | null = null;
      let onOffDifferential: number | null = null;

      if (otherTargets >= 10) {
        otherQbYardsPerTarget = otherYards / otherTargets;
        onOffDifferential = yardsPerTarget - otherQbYardsPerTarget;
      }

      results.push({
        receiverId,
        qbId,
        window,
        targets: stats.targets,
        completions: stats.completions,
        completionRate: stats.completions / stats.targets,
        receivingYards: stats.yards,
        yardsPerTarget,
        yardsPerCompletion: stats.completions > 0 ? stats.yards / stats.completions : 0,
        shrunkYardsPerTarget,
        otherQbTargets: otherTargets,
        otherQbYardsPerTarget,
        onOffDifferential,
      });
    }
  }

  // Deterministic order
  results.sort((a, b) => {
    if (a.receiverId !== b.receiverId) return a.receiverId.localeCompare(b.receiverId);
    return a.qbId.localeCompare(b.qbId);
  });

  return { results, diagnostics: { droppedDueToTargetFloor } };
}
