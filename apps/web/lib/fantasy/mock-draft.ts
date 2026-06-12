/**
 * Mock Draft Simulator — practice drafts against AI opponents.
 *
 * AI teams pick from the top available by VOR with a small randomisation window
 * so each practice draft plays out differently. Snake order only. User picks
 * whenever it's their slot's turn; AI advances instantly between turns. Pure;
 * pool-injectable (works with illustrative or live nflverse data).
 */

import { vor, overallBoard, type Player, type Pos } from "./players";

// ── Config ──────────────────────────────────────────────────────────────────

export type MockDraftConfig = {
  readonly teams: 8 | 10 | 12;
  readonly rounds: number;
  readonly userSlot: number; // 1-indexed, 1..teams
};

export const DEFAULT_CONFIG: MockDraftConfig = { teams: 12, rounds: 15, userSlot: 1 };

// ── State ────────────────────────────────────────────────────────────────────

export type DraftPickRecord = {
  readonly overall: number;
  readonly round: number;
  readonly pickInRound: number;
  readonly teamIndex: number; // 0-indexed
  readonly playerId: string;
};

export type MockDraftState = {
  readonly config: MockDraftConfig;
  /** Set of player IDs still on the board. */
  readonly available: ReadonlySet<string>;
  /** teamIndex (0-based) → ordered list of player IDs drafted. */
  readonly rosters: ReadonlyMap<number, readonly string[]>;
  readonly picks: readonly DraftPickRecord[];
  /** 1-indexed overall pick number for the NEXT pick. */
  readonly nextOverall: number;
  readonly finished: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const totalPicks = (cfg: MockDraftConfig) => cfg.teams * cfg.rounds;

/** 0-indexed team that picks at `overall` (1-indexed). Snake order. */
export function teamAtOverall(overall: number, teams: number): number {
  const round = Math.floor((overall - 1) / teams); // 0-indexed round
  const posInRound = (overall - 1) % teams;
  return round % 2 === 0 ? posInRound : teams - 1 - posInRound;
}

/** Whether it's the user's pick at this overall pick. */
export function isUserPick(overall: number, cfg: MockDraftConfig): boolean {
  return teamAtOverall(overall, cfg.teams) === cfg.userSlot - 1;
}

// ── AI pick ──────────────────────────────────────────────────────────────────

/**
 * AI picks from the top `window` available players by VOR with a weighted random.
 * Window of 3 means ~60/30/10% spread — realistic variance without chaos.
 */
function aiPickId(available: ReadonlySet<string>, pool: readonly Player[], seed: number, window = 3): string | null {
  const board = overallBoard(pool).filter((p) => available.has(p.id));
  if (board.length === 0) return null;
  const top = board.slice(0, Math.min(window, board.length));
  // deterministic-ish from pick number: LCG mod
  const weights = [0.6, 0.3, 0.1] as const;
  const rand = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  let cum = 0;
  for (let i = 0; i < top.length; i++) {
    cum += weights[i] ?? 0.05;
    if (rand < cum) return top[i]!.id;
  }
  return top[0]!.id;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initMockDraft(cfg: MockDraftConfig, pool: readonly Player[]): MockDraftState {
  const rosters = new Map<number, readonly string[]>();
  for (let i = 0; i < cfg.teams; i++) rosters.set(i, []);
  return {
    config: cfg,
    available: new Set(pool.map((p) => p.id)),
    rosters,
    picks: [],
    nextOverall: 1,
    finished: false,
  };
}

// ── Advance ──────────────────────────────────────────────────────────────────

/** Record one pick (AI or user) and return the new state. */
function recordPick(state: MockDraftState, playerId: string): MockDraftState {
  const { config, nextOverall } = state;
  const { teams } = config;
  const round = Math.ceil(nextOverall / teams);
  const pickInRound = ((nextOverall - 1) % teams) + 1;
  const teamIndex = teamAtOverall(nextOverall, teams);

  const newAvailable = new Set(state.available);
  newAvailable.delete(playerId);

  const newRosters = new Map(state.rosters);
  newRosters.set(teamIndex, [...(state.rosters.get(teamIndex) ?? []), playerId]);

  const pick: DraftPickRecord = { overall: nextOverall, round, pickInRound, teamIndex, playerId };

  const newNextOverall = nextOverall + 1;
  const finished = newNextOverall > totalPicks(config);

  return {
    config,
    available: newAvailable,
    rosters: newRosters,
    picks: [...state.picks, pick],
    nextOverall: newNextOverall,
    finished,
  };
}

/**
 * Advance all AI picks until it's the user's turn (or the draft ends).
 * Returns the new state. Safe to call even when it's already the user's turn.
 */
export function advanceAI(state: MockDraftState, pool: readonly Player[]): MockDraftState {
  let s = state;
  while (!s.finished && !isUserPick(s.nextOverall, s.config)) {
    const id = aiPickId(s.available, pool, s.nextOverall);
    if (!id) break;
    s = recordPick(s, id);
  }
  return s;
}

/**
 * Record the user's pick at the current overall and advance through subsequent
 * AI picks until the next user turn (or end of draft).
 */
export function userPick(state: MockDraftState, playerId: string, pool: readonly Player[]): MockDraftState {
  if (state.finished || !isUserPick(state.nextOverall, state.config)) return state;
  if (!state.available.has(playerId)) return state;
  const after = recordPick(state, playerId);
  return advanceAI(after, pool);
}

// ── Grade ─────────────────────────────────────────────────────────────────────

export type DraftGrade = {
  readonly letter: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "F";
  readonly vorTotal: number;
  readonly positionalBalance: string;
  readonly highlights: readonly string[];
};

export function gradeDraft(
  userRosterIds: readonly string[],
  pool: readonly Player[],
  cfg: MockDraftConfig,
): DraftGrade {
  const players = pool.filter((p) => userRosterIds.includes(p.id));
  const vorTotal = players.reduce((s, p) => s + Math.max(0, vor(p, pool)), 0);

  const byPos: Record<string, Player[]> = {};
  for (const p of players) {
    (byPos[p.pos] ??= []).push(p);
  }

  const positionalBalance = (["QB", "RB", "WR", "TE"] as Pos[])
    .map((pos) => `${pos}: ${byPos[pos]?.length ?? 0}`)
    .join(" · ");

  const highlights: string[] = [];
  const topPlayer = players.sort((a, b) => vor(b, pool) - vor(a, pool))[0];
  if (topPlayer) highlights.push(`Best pick: ${topPlayer.name} (VOR +${vor(topPlayer, pool)})`);

  const injuries = players.filter((p) => p.injury !== "healthy");
  if (injuries.length > 0) highlights.push(`Injury tags: ${injuries.map((p) => `${p.name} (${p.injury})`).join(", ")}`);

  const byeBuckets: Record<number, Player[]> = {};
  for (const p of players) (byeBuckets[p.bye] ??= []).push(p);
  const worstBye = Object.entries(byeBuckets).filter(([, ps]) => ps.length >= 3);
  if (worstBye.length > 0) highlights.push(`Bye stack risk: ${worstBye.map(([wk, ps]) => `Week ${wk} (${ps.length})`).join(", ")}`);

  const letter: DraftGrade["letter"] =
    vorTotal >= 260 ? "A+" :
    vorTotal >= 220 ? "A"  :
    vorTotal >= 180 ? "A-" :
    vorTotal >= 150 ? "B+" :
    vorTotal >= 120 ? "B"  :
    vorTotal >= 90  ? "B-" :
    vorTotal >= 60  ? "C+" :
    vorTotal >= 30  ? "C"  : "F";

  return { letter, vorTotal, positionalBalance, highlights };
}
