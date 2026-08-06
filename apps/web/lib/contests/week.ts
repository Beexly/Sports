/**
 * Contest Bay — free paper skill slate.
 *
 * Legal: FREE skill only. No entry fee, no prize pool, no real money.
 * Slate is a methodology paper board (stable weekly IDs).
 * Settlements: file (local) and/or Postgres when durable mode is active.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ContestGame, ContestWeek } from "./types";

export type SettlementMap = Record<string, "home" | "away" | "push">;

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

function settlementFilePath(): string {
  return (
    process.env.GSE_CONTEST_SETTLEMENT_PATH ??
    path.join(process.cwd(), ".gse-local", "contest-settlement.json")
  );
}

/** Sync file settlements (local operator / tests). */
export function loadFileSettlements(weekId: string): SettlementMap {
  try {
    const file = settlementFilePath();
    if (!existsSync(file)) return {};
    const all = JSON.parse(readFileSync(file, "utf8")) as Record<string, SettlementMap>;
    return all[weekId] ?? {};
  } catch {
    return {};
  }
}

/** @deprecated use loadFileSettlements or async loader in store */
export function loadSettlements(weekId: string): SettlementMap {
  return loadFileSettlements(weekId);
}

export function buildContestWeek(
  now = new Date(),
  settlements: SettlementMap = {},
): ContestWeek {
  const weekId = isoWeekId(now);

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
    result: settlements[g.gameId] ?? null,
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
      "Pick home or away on every game (straight up, no spread).",
      "Score = correct picks among settled games. Ties → earliest valid entry.",
      "Entries lock at first listed kickoff. Late entries are rejected.",
      "GSE never pays, ranks for cash, or sells your entry as a bet.",
    ],
  };
}

/** Sync helper (file settlements only). Prefer loadCurrentContestWeek for prod. */
export function getCurrentContestWeek(now = new Date()): ContestWeek {
  const weekId = isoWeekId(now);
  return buildContestWeek(now, loadFileSettlements(weekId));
}
