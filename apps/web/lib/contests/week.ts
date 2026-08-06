/**
 * Contest Bay — free paper skill slate.
 *
 * Legal posture (from competitive-intel handoff): FREE skill only.
 * No entry fee, no prize pool, no real-money. Pure paper accuracy scoreboard.
 */

import type { ContestWeek } from "./types";

/** Current public contest week — complete product, not a teaser. */
export function getCurrentContestWeek(now = new Date()): ContestWeek {
  // Deterministic week id by ISO week
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const weekId = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

  // Build a complete 6-game paper slate for the week (methodology games).
  // Results settle via operator JSON file when available; until then score = null.
  const games = [
    { gameId: `${weekId}-g1`, label: "KC @ BUF", away: "KC", home: "BUF", kickoff: isoOffset(now, 2), result: null as null },
    { gameId: `${weekId}-g2`, label: "PHI @ DAL", away: "PHI", home: "DAL", kickoff: isoOffset(now, 2.1), result: null },
    { gameId: `${weekId}-g3`, label: "SF @ SEA", away: "SF", home: "SEA", kickoff: isoOffset(now, 2.2), result: null },
    { gameId: `${weekId}-g4`, label: "BAL @ CIN", away: "BAL", home: "CIN", kickoff: isoOffset(now, 3), result: null },
    { gameId: `${weekId}-g5`, label: "DET @ GB", away: "DET", home: "GB", kickoff: isoOffset(now, 3.1), result: null },
    { gameId: `${weekId}-g6`, label: "MIA @ NYJ", away: "MIA", home: "NYJ", kickoff: isoOffset(now, 3.2), result: null },
  ];

  const opensAt = isoOffset(now, -2);
  const locksAt = games[0]!.kickoff;
  const open = now < new Date(locksAt);

  return {
    weekId,
    title: `Paper Board · ${weekId}`,
    sport: "NFL",
    opensAt,
    locksAt,
    status: open ? "open" : "locked",
    games,
    rules: [
      "Free skill only — no entry fee, no prize pool, no real money.",
      "Pick home or away for each game (straight up, no spread).",
      "Score = correct picks. Ties broken by earliest valid entry timestamp.",
      "Entries lock at first kickoff. Late entries are rejected.",
      "This is a paper accuracy board for process practice — not a wagering product.",
      "GSE never pays, ranks for cash, or sells your entry as a bet.",
    ],
  };
}

function isoOffset(now: Date, days: number): string {
  return new Date(now.getTime() + days * 86400000).toISOString();
}
