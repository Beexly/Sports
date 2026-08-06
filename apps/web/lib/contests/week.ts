/**
 * Contest Bay — free paper skill slate.
 *
 * Legal: FREE skill only. No entry fee, no prize pool, no real money.
 * Slate is a methodology paper board (stable weekly IDs) so the product is
 * always enterable without depending on live odds rights. Operator can
 * settle results via GSE_CONTEST_SETTLEMENT_PATH JSON.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ContestGame, ContestWeek } from "./types";

export function isoWeekId(now = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function isoOffset(now: Date, days: number): string {
  return new Date(now.getTime() + days * 86400000).toISOString();
}

function settlementPath(): string {
  return (
    process.env.GSE_CONTEST_SETTLEMENT_PATH ??
    path.join(process.cwd(), ".gse-local", "contest-settlement.json")
  );
}

/** Optional operator file: { [weekId]: { [gameId]: "home"|"away"|"push" } } */
export function loadSettlements(weekId: string): Record<string, "home" | "away" | "push"> {
  try {
    const file = settlementPath();
    if (!existsSync(file)) return {};
    const all = JSON.parse(readFileSync(file, "utf8")) as Record<
      string,
      Record<string, "home" | "away" | "push">
    >;
    return all[weekId] ?? {};
  } catch {
    return {};
  }
}

export function getCurrentContestWeek(now = new Date()): ContestWeek {
  const weekId = isoWeekId(now);
  const settled = loadSettlements(weekId);

  const baseGames: Array<Omit<ContestGame, "result">> = [
    { gameId: `${weekId}-g1`, label: "KC @ BUF", away: "KC", home: "BUF", kickoff: isoOffset(now, 2) },
    { gameId: `${weekId}-g2`, label: "PHI @ DAL", away: "PHI", home: "DAL", kickoff: isoOffset(now, 2.1) },
    { gameId: `${weekId}-g3`, label: "SF @ SEA", away: "SF", home: "SEA", kickoff: isoOffset(now, 2.2) },
    { gameId: `${weekId}-g4`, label: "BAL @ CIN", away: "BAL", home: "CIN", kickoff: isoOffset(now, 3) },
    { gameId: `${weekId}-g5`, label: "DET @ GB", away: "DET", home: "GB", kickoff: isoOffset(now, 3.1) },
    { gameId: `${weekId}-g6`, label: "MIA @ NYJ", away: "MIA", home: "NYJ", kickoff: isoOffset(now, 3.2) },
  ];

  const games: ContestGame[] = baseGames.map((g) => ({
    ...g,
    result: settled[g.gameId] ?? null,
  }));

  const opensAt = isoOffset(now, -2);
  const locksAt = games[0]!.kickoff;
  const anySettled = games.some((g) => g.result !== null);
  const open = now < new Date(locksAt);

  let status: ContestWeek["status"] = "open";
  if (!open) status = anySettled ? "settled" : "locked";

  return {
    weekId,
    title: `Paper Board · ${weekId}`,
    sport: "NFL",
    opensAt,
    locksAt,
    status,
    games,
    slateKind: "methodology_paper",
    rules: [
      "Free skill only — no entry fee, no prize pool, no real money.",
      "This is a methodology paper slate for process practice — not live market odds.",
      "Pick home or away for each game (straight up, no spread).",
      "Score = correct picks among settled games. Ties → earliest valid entry.",
      "Entries lock at first listed kickoff. Late entries are rejected.",
      "GSE never pays, ranks for cash, or sells your entry as a bet.",
    ],
  };
}
