/**
 * Zero-sit settlement lane (WP-29, ledger C-106).
 *
 * Founder policy 2026-09-05: no pick ever sits. Every PENDING pick is graded,
 * or VOIDED with a root-cause code through the settlement outbox lane, or
 * unpublished. "Left PENDING for human review" forever is a policy violation.
 *
 * This lane runs at the end of every settle-picks cycle, after the free pass,
 * the paid supplement and the stale backfill have each had their turn at
 * grading, and clears what they left behind:
 *
 *   STALE half (unpublishStalePendingPicks): published PENDING picks on games
 *   that have not started and that the pipeline stopped refreshing
 *   STALE_PENDING_PICK_MAX_AGE_DAYS ago (apps/web/lib/board/stale-pick-policy.ts,
 *   the same selection the truth surface counts) are set isPublished=false in
 *   one PENDING-scoped updateMany. Each action is recorded as an append-only
 *   JarvisMemoryEvent (the durable pattern free-spine-durable.ts uses), in the
 *   same transaction. Nothing is deleted; the result stays PENDING.
 *
 *   VOID half (voidSittingPicks): a PENDING pick whose game commenced more
 *   than ZERO_SIT_VOID_MIN_AGE_HOURS ago is VOIDED (result VOID, settledAt
 *   now) through the same transactional outbox the graders use (pick
 *   updateMany scoped to PENDING, one PickSettlementEvent carrying the RCA
 *   code in its payload, post-settlement work rows) when one of these holds:
 *
 *     OVERDUE_NO_SCORE           the free scoreboard for the sport and date
 *                                lists the fixture (one event pairing the two
 *                                teams, any state) but no final, and that event
 *                                is itself past the minimum age; or the game
 *                                row already carries a FINAL the free matcher
 *                                cannot tie to the stored names. The free pass
 *                                and the backfill ran on the same board.
 *     FIXTURE_NOT_FOUND          the free scoreboard for that date lists no
 *                                event pairing the two teams. The game row is
 *                                also marked CANCELED (the GameStatus spelling)
 *                                only when NEITHER team appears on that date's
 *                                board; a one-sided name mismatch on a real
 *                                fixture never cancels a row.
 *     AMBIGUOUS_TEAM_NAME        the free matcher held the pick AMBIGUOUS_MATCH:
 *                                a city-only side ("New York") that names two
 *                                or more teams on the fetched boards (evidence
 *                                cause CITY_ONLY_NAME), or more than one
 *                                nearest final with disagreeing scores (cause
 *                                MULTIPLE_FINALS). The lane never guesses from
 *                                token counts on its own; the matcher's hold
 *                                is the only evidence it acts on.
 *     SCORE_MISMATCH_CROSS_PATH  the game row already carries a FINAL score
 *                                that disagrees with the free final, so every
 *                                grader refuses to write (see the
 *                                SCORE_MISMATCH_CROSS_PATH guards in
 *                                free-settlement-runner.ts and settle-sport.ts).
 *                                Aged from KICKOFF like every other code: no
 *                                lane stamps a first-seen time, and
 *                                game.updatedAt is a Prisma @updatedAt column
 *                                that enrichGameContext bumps every cycle
 *                                (FINAL rows included), so a window anchored on
 *                                it would reset forever. Voided when kickoff is
 *                                more than 24h past and the conflict is still
 *                                on the board this cycle; under the floor it
 *                                skips as MISMATCH_UNDER_24H.
 *
 * Conservative by construction: the ESPN fetch is strict (`strictEspn`: a
 * date whose board lost any division group, e.g. FBS with FCS healthy, is an
 * error, never a partial board), and a scoreboard fetch failure (any ESPN
 * error) skips the whole sport for the cycle, nothing is voided on missing
 * evidence; a pick whose date was outside the fetched window is skipped; a
 * listed fixture that ESPN moved to a start time still inside the minimum age
 * is skipped (RESCHEDULED_PENDING) so the graders get its final; a pick with a
 * usable, consistent final is never voided (the graders own it and run first
 * every cycle); DISPUTED holds and orientation failures are reported, not
 * voided; every write is PENDING-scoped so a race loser writes nothing and a
 * non-PENDING pick is never touched again; a write failure on one pick is
 * isolated (WRITE_FAILED) and the loop continues. Scoreboard dates are
 * budgeted published rows first. Per-run caps bound the work.
 */

import { selectGradingLine } from "@sports/prediction-engine";
import {
  enqueuePostSettlementWork,
  type PostSettlementWorkDelegate,
} from "@sports/ingestion-pipeline";
import { fetchScoresMultiSource } from "@/lib/data-sources/multi-source-scores";
import { toEspnDateKey, uniqueScoreboardDates } from "@/lib/data-sources/settlement-score-dates";
import {
  buildTrustedFinals,
  expandTeamMatchTokens,
  settlePendingPicks,
  teamTokensMatch,
  type PendingPick,
  type SettlementOutcome,
} from "@/lib/data-sources/free-settlement";
import { ODDS_KEY_TO_FREE } from "@/lib/data-sources/free-settlement-runner";
import { daysApart } from "@/lib/data-sources/ncaa-consensus";
import { normalizeTeamToken } from "@/lib/data-sources/score-verification";
import type { NormalizedGame } from "@/lib/data-sources/free-adapters/espn-scores";
import type { Sport } from "@/lib/data-sources/source-router";
import {
  STALE_PENDING_PICK_MAX_AGE_DAYS,
  staleUnstartedPublishedPendingWhere,
} from "@/lib/board/stale-pick-policy";
import type { SettlementRootCauseCode } from "./root-cause-analysis";

/** Hours after kickoff before a still-PENDING pick may be voided. */
export const ZERO_SIT_VOID_MIN_AGE_HOURS = 24;
/**
 * Oldest-first cap on void candidates inspected per cycle (published rows
 * lead). Sized from the scoreboard fetch budget, not from row counts: the
 * candidates are grouped per sport and their kickoff days compacted into
 * serial ESPN date-range requests (multi-source-scores.ts fetchEspnForDates),
 * each bounded by the 12s abort per division group (espn-scores.ts
 * fetchEspnScoreboard). A candidate adds at most one day, so at most one
 * range: 20 candidates x 12s = 240s, the route's 300s maxDuration less the
 * 60s tail reserve below, even when ESPN times out on every request. What the
 * cap leaves is next cycle's (five cycles an hour; the lane is idempotent).
 * The deadline covers what the cap cannot: the graders' share of the budget
 * and NCAAF's second division group (2 x 12s per range).
 */
export const ZERO_SIT_VOID_CAP = 20;
/**
 * Wall-clock the lane leaves the settle-picks route after it stops: the slate
 * freeze, the outbox drain and the health read still run after it. Sized above
 * the longest single step the lane can have just started when it last read
 * the clock: one NCAAF date range = 2 division groups x 12s abort = 24s, plus
 * one candidate transaction.
 */
export const ZERO_SIT_ROUTE_TAIL_RESERVE_MS = 60_000;

/**
 * Epoch ms after which the void lane stops before its next scoreboard fetch or
 * candidate write, derived from the route's own start and `maxDuration`.
 */
export function zeroSitDeadline(routeStartedAtMs: number, routeMaxDurationSeconds: number): number {
  return routeStartedAtMs + routeMaxDurationSeconds * 1000 - ZERO_SIT_ROUTE_TAIL_RESERVE_MS;
}
/** Cap on stale rows unpublished per cycle. */
export const ZERO_SIT_STALE_CAP = 500;
/** Scoreboard days fetched per sport per cycle (same budget as the backfill lane). */
export const ZERO_SIT_SCOREBOARD_MAX_DAYS = 21;
export const ZERO_SIT_EVENT_SCHEMA_VERSION = 1;
export const ZERO_SIT_ACTOR = "system:settle-picks:zero-sit";
export const ZERO_SIT_MEMORY_SCOPE = "settlement.zero-sit";
export const ZERO_SIT_POLICY_REF =
  "founder policy 2026-09-05: no pick ever sits (ledger C-106 / WP-29, F-16)";
/** Response samples are capped so a large first run cannot bloat the cron JSON. */
const SAMPLE_CAP = 50;

export type ZeroSitVoidRcaCode = Extract<
  SettlementRootCauseCode,
  "OVERDUE_NO_SCORE" | "SCORE_MISMATCH_CROSS_PATH" | "AMBIGUOUS_TEAM_NAME" | "FIXTURE_NOT_FOUND"
>;

export const ZERO_SIT_VOID_RCA_CODES: readonly ZeroSitVoidRcaCode[] = [
  "OVERDUE_NO_SCORE",
  "SCORE_MISMATCH_CROSS_PATH",
  "AMBIGUOUS_TEAM_NAME",
  "FIXTURE_NOT_FOUND",
];

export type ZeroSitSkipReason =
  | "NO_FREE_SPORT"
  | "SCOREBOARD_FETCH_FAILED"
  | "DATE_NOT_FETCHED"
  | "UNDER_MIN_AGE"
  | "GRADABLE"
  | "DISPUTED_HOLD"
  | "ORIENT_FAIL"
  | "MISMATCH_UNDER_24H"
  | "RESCHEDULED_PENDING"
  | "WRITE_RACE_LOST"
  | "WRITE_FAILED";

export const ZERO_SIT_SKIP_REASONS: readonly ZeroSitSkipReason[] = [
  "NO_FREE_SPORT",
  "SCOREBOARD_FETCH_FAILED",
  "DATE_NOT_FETCHED",
  "UNDER_MIN_AGE",
  "GRADABLE",
  "DISPUTED_HOLD",
  "ORIENT_FAIL",
  "MISMATCH_UNDER_24H",
  "RESCHEDULED_PENDING",
  "WRITE_RACE_LOST",
  "WRITE_FAILED",
];

export type ZeroSitAmbiguityCause = "CITY_ONLY_NAME" | "NO_OWN_FIXTURE" | "MULTIPLE_FINALS";

/** One select shape for both halves so one row type serves the whole lane. */
export const ZERO_SIT_PICK_SELECT = {
  id: true,
  pickType: true,
  selection: true,
  line: true,
  clvLockLine: true,
  isPublished: true,
  modelVersion: true,
  generatedAt: true,
  dataFreshnessAt: true,
  gameId: true,
  game: {
    select: {
      id: true,
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      status: true,
      homeScore: true,
      awayScore: true,
      updatedAt: true,
      sport: { select: { key: true } },
    },
  },
} as const;

export type ZeroSitPickRow = {
  id: string;
  pickType: string;
  selection: string;
  line: number;
  clvLockLine: number | null;
  isPublished: boolean;
  modelVersion: string;
  generatedAt: Date;
  dataFreshnessAt: Date | null;
  gameId: string;
  game: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    updatedAt: Date;
    sport: { key: string } | null;
  };
};

/** Structural transaction surface (mirrors settle-backfill.ts's doctrine). */
export type ZeroSitTx = {
  pick: {
    findMany(args: Record<string, unknown>): Promise<Array<{ id: string }>>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  pickSettlementEvent: { create(args: Record<string, unknown>): Promise<unknown> };
  postSettlementWork: unknown;
  game: { updateMany(args: Record<string, unknown>): Promise<{ count: number }> };
  jarvisMemoryEvent: { create(args: Record<string, unknown>): Promise<unknown> };
};

export type ZeroSitDb = {
  pick: { findMany(args: Record<string, unknown>): Promise<ZeroSitPickRow[]> };
  $transaction(fn: (tx: ZeroSitTx) => Promise<{ count: number }>): Promise<{ count: number }>;
};

export type ZeroSitStaleResult = {
  maxAgeDays: number;
  selected: number;
  unpublished: number;
  recorded: number;
  capReached: boolean;
  /** Sample of unpublished pick ids (capped). */
  pickIds: string[];
};

export type ZeroSitVoidRecord = {
  pickId: string;
  gameId: string;
  sportKey: string;
  rcaCode: ZeroSitVoidRcaCode;
  ageHours: number;
  gameCanceled: boolean;
};

export type ZeroSitSkip = { pickId: string; sportKey: string; reason: ZeroSitSkipReason };

export type ZeroSitVoidResult = {
  minAgeHours: number;
  inspected: number;
  capReached: boolean;
  /** The route deadline stopped the lane before every candidate was inspected. */
  deadlineHit: boolean;
  /** Candidates selected this cycle and not inspected (deadline); next cycle's. */
  remaining: number;
  voided: number;
  gamesCanceled: number;
  byCode: Record<ZeroSitVoidRcaCode, number>;
  skippedByReason: Record<ZeroSitSkipReason, number>;
  /** Samples (capped). */
  voids: ZeroSitVoidRecord[];
  skipped: ZeroSitSkip[];
  scoreboardFailures: Array<{ sportKey: string; errors: string[] }>;
};

export type ZeroSitLaneResult = {
  lane: "zero-sit";
  stale: ZeroSitStaleResult;
  voids: ZeroSitVoidResult;
};

export type ZeroSitVoidEventPayload = {
  schemaVersion: number;
  kind: "ZERO_SIT_VOID";
  lane: "zero-sit";
  actor: string;
  policy: string;
  pickId: string;
  gameId: string;
  sportKey: string;
  result: "VOID";
  rcaCode: ZeroSitVoidRcaCode;
  reason: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  ageHours: number;
  settledAt: string;
  evidence: Record<string, unknown>;
};

// ── Pure decision (exported for tests) ──────────────────────────────────────

export type ZeroSitDecision =
  | {
      kind: "void";
      rcaCode: ZeroSitVoidRcaCode;
      reason: string;
      evidence: Record<string, unknown>;
      cancelGame: boolean;
    }
  | { kind: "skip"; reason: ZeroSitSkipReason };

function hoursBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (60 * 60 * 1000);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type BoardListing = {
  /** An event pairs the pick's two teams, one on each side (any state). */
  fixtureListed: boolean;
  /** The pick's home team appears on some event within a day (any opponent). */
  homeListed: boolean;
  /** The pick's away team appears on some event within a day (any opponent). */
  awayListed: boolean;
  /** The events that pair the two teams (empty when fixtureListed is false). */
  fixtureEvents: NormalizedGame[];
};

function boardSideTokens(side: NormalizedGame["home"]): string[] {
  if (!side?.team) return [];
  return [...expandTeamMatchTokens(side.team), normalizeTeamToken(side.abbreviation ?? "")].filter(Boolean);
}

function sideMatches(pickTokens: readonly string[], sideTokens: readonly string[]): boolean {
  return pickTokens.some((pt) => sideTokens.some((st) => teamTokensMatch(pt, st)));
}

/**
 * What the fetched board says about the pick's fixture, over events within
 * one calendar day of the pick's kickoff (any state: pre, live, final,
 * postponed). "Listed" is bipartite, the same shape as finalMatchesPick: the
 * pick's home team matches one side and its away team the other. The per-team
 * flags say whether each team appears at all (against any opponent), which is
 * what separates a phantom fixture from a one-sided name mismatch. Uses the
 * free matcher's own token expansion so "listed" means what "gradable" means
 * elsewhere. Rows without a start time are counted (fail closed: a fixture we
 * cannot date is a fixture).
 */
export function boardListing(
  pick: { homeTeam: string; awayTeam: string; gameDateIso: string },
  board: readonly NormalizedGame[],
): BoardListing {
  const pickHome = expandTeamMatchTokens(pick.homeTeam);
  const pickAway = expandTeamMatchTokens(pick.awayTeam);
  const out: BoardListing = { fixtureListed: false, homeListed: false, awayListed: false, fixtureEvents: [] };
  if (pickHome.length === 0 && pickAway.length === 0) return out;
  const pickDate = pick.gameDateIso.slice(0, 10);
  for (const g of board) {
    const gDate = (g.startTime ?? "").slice(0, 10);
    if (gDate && daysApart(gDate, pickDate) > 1) continue;
    const h = boardSideTokens(g.home);
    const a = boardSideTokens(g.away);
    const homeOnH = sideMatches(pickHome, h);
    const homeOnA = sideMatches(pickHome, a);
    const awayOnH = sideMatches(pickAway, h);
    const awayOnA = sideMatches(pickAway, a);
    if (homeOnH || homeOnA) out.homeListed = true;
    if (awayOnH || awayOnA) out.awayListed = true;
    if ((homeOnH && awayOnA) || (homeOnA && awayOnH)) {
      out.fixtureListed = true;
      out.fixtureEvents.push(g);
    }
  }
  return out;
}

/** True when the board lists an event pairing the pick's two teams (see boardListing). */
export function fixtureListedOnBoard(
  pick: { homeTeam: string; awayTeam: string; gameDateIso: string },
  board: readonly NormalizedGame[],
): boolean {
  return boardListing(pick, board).fixtureListed;
}

/**
 * A cross-path score conflict: the game row carries a FINAL (written by
 * another path, keyed by externalId) whose score differs from the free
 * board's final for the same fixture, so every grader refuses to write.
 */
function isCrossPathScoreMismatch(game: ZeroSitPickRow["game"], outcome: SettlementOutcome): boolean {
  if (outcome.status !== "SETTLED" || outcome.homeScore == null || outcome.awayScore == null) return false;
  const recordedFinal = game.status === "FINAL" && game.homeScore != null && game.awayScore != null;
  return recordedFinal && (game.homeScore !== outcome.homeScore || game.awayScore !== outcome.awayScore);
}

/**
 * Decide what the lane does with one overdue PENDING pick given the free
 * matcher's outcome for it this cycle and the board it was matched against.
 * Pure: no clock reads, no writes.
 */
export function decideZeroSitVoid(args: {
  readonly row: Pick<ZeroSitPickRow, "id"> & { readonly game: ZeroSitPickRow["game"] };
  readonly outcome: SettlementOutcome;
  readonly board: readonly NormalizedGame[];
  readonly now: Date;
  readonly minAgeHours?: number;
}): ZeroSitDecision {
  const minAgeHours = args.minAgeHours ?? ZERO_SIT_VOID_MIN_AGE_HOURS;
  const { row, outcome } = args;
  const ageHours = hoursBetween(args.now, row.game.commenceTime);
  const crossPathMismatch = isCrossPathScoreMismatch(row.game, outcome);
  if (ageHours < minAgeHours) {
    // Under the floor nothing is voided. A conflicting recorded final keeps
    // its own reason so the surface separates a young mismatch from a young
    // game; both are aged from kickoff (see the SETTLED branch).
    return { kind: "skip", reason: crossPathMismatch ? "MISMATCH_UNDER_24H" : "UNDER_MIN_AGE" };
  }

  if (outcome.status === "SETTLED") {
    if (outcome.homeScore == null || outcome.awayScore == null) {
      // Postponed/cancelled VOID from the matcher: the free pass voids it.
      return { kind: "skip", reason: "GRADABLE" };
    }
    if (!crossPathMismatch) return { kind: "skip", reason: "GRADABLE" };
    // Mismatch age is measured from KICKOFF, never from game.updatedAt.
    // Game.updatedAt is a Prisma @updatedAt column that every game writer
    // bumps (enrichGameContext refreshes context on FINAL rows too), so a
    // window anchored on it can reset each cycle and the pick would sit
    // forever as MISMATCH_UNDER_24H. This lane reads no settlement
    // observation or event table, so the stable anchor is the kickoff: the
    // conflict cannot predate the game, the board still shows it this cycle,
    // and ageHours >= minAgeHours holds here (floor above).
    return {
      kind: "void",
      rcaCode: "SCORE_MISMATCH_CROSS_PATH",
      reason:
        `Game row carries FINAL ${row.game.homeScore}-${row.game.awayScore} (row last written ` +
        `${row.game.updatedAt.toISOString()}); the free final reads ` +
        `${outcome.homeScore}-${outcome.awayScore}; every grader refused to write, ` +
        `${round1(ageHours)}h after kickoff (floor ${minAgeHours}h).`,
      evidence: {
        recorded: {
          homeScore: row.game.homeScore,
          awayScore: row.game.awayScore,
          rowUpdatedAt: row.game.updatedAt.toISOString(),
        },
        incoming: {
          homeScore: outcome.homeScore,
          awayScore: outcome.awayScore,
          confirmation: outcome.confirmation,
          sources: [...outcome.sources],
        },
        agedFrom: "commenceTime",
        ageHours: round1(ageHours),
      },
      cancelGame: false,
    };
  }

  if (outcome.status === "HELD") {
    if (outcome.reason === "DISPUTED") return { kind: "skip", reason: "DISPUTED_HOLD" };
    // The grader STATES its cause; this lane no longer infers it. Inferring it
    // from an empty sources array was right for the city-only hold and wrong
    // for the own-fixture hold, which also carries no sources: an operator was
    // told the pick was voided for a city-only name when a final existed and
    // none of them could be placed on this pick's own fixture. The old
    // inference stays as the fallback for an outcome that predates the field.
    const cause: ZeroSitAmbiguityCause =
      outcome.ambiguity ?? (outcome.sources.length === 0 ? "CITY_ONLY_NAME" : "MULTIPLE_FINALS");
    const detail =
      cause === "CITY_ONLY_NAME"
        ? "a stored side names two or more teams on the fetched boards (city-only name)."
        : cause === "NO_OWN_FIXTURE"
          ? "a final for these teams was in hand but none of them could be placed on this pick's own fixture."
          : "more than one final for these teams inside the date window disagrees on the score.";
    return {
      kind: "void",
      rcaCode: "AMBIGUOUS_TEAM_NAME",
      reason:
        `The free matcher held "${row.game.awayTeamName}" @ "${row.game.homeTeamName}" as ` +
        `AMBIGUOUS_MATCH on every cycle: ${detail}`,
      evidence: {
        homeTeamName: row.game.homeTeamName,
        awayTeamName: row.game.awayTeamName,
        matcherHold: outcome.reason,
        cause,
        sources: [...outcome.sources],
      },
      cancelGame: false,
    };
  }

  // outcome.status === "PENDING"
  if (outcome.reason === "ORIENT_FAIL") return { kind: "skip", reason: "ORIENT_FAIL" };
  const pickShape = {
    homeTeam: row.game.homeTeamName,
    awayTeam: row.game.awayTeamName,
    gameDateIso: row.game.commenceTime.toISOString(),
  };
  const boardEvents = args.board.length;
  const listing = boardListing(pickShape, args.board);
  const listed = {
    fixtureListed: listing.fixtureListed,
    homeListed: listing.homeListed,
    awayListed: listing.awayListed,
  };
  if (listing.fixtureListed) {
    // ESPN moved the fixture (rain-out, suspension) to a start still inside
    // the minimum age: its final is on its way, the graders get it.
    const rescheduled = listing.fixtureEvents.some((e) => {
      if (e.completed || !e.startTime) return false;
      const start = new Date(e.startTime);
      return !Number.isNaN(start.getTime()) && hoursBetween(args.now, start) < minAgeHours;
    });
    if (rescheduled) return { kind: "skip", reason: "RESCHEDULED_PENDING" };
    return {
      kind: "void",
      rcaCode: "OVERDUE_NO_SCORE",
      reason:
        `No final for "${row.game.awayTeamName}" @ "${row.game.homeTeamName}" on the free ` +
        `scoreboard ${round1(ageHours)}h after kickoff; the free pass and the backfill lane ` +
        `both ran on this board.`,
      evidence: {
        boardEvents,
        ...listed,
        listedEvents: listing.fixtureEvents.map((e) => ({
          gameId: e.gameId,
          startTime: e.startTime,
          state: e.state,
          statusDetail: e.statusDetail,
        })),
        matcherReason: outcome.reason,
      },
      cancelGame: false,
    };
  }
  const recordedFinal =
    row.game.status === "FINAL" && row.game.homeScore != null && row.game.awayScore != null;
  if (recordedFinal) {
    // The game row proves the contest was played (another path wrote the
    // final by externalId); the stored names are what the free board cannot
    // tie back. Not a phantom, never cancel it.
    return {
      kind: "void",
      rcaCode: "OVERDUE_NO_SCORE",
      reason:
        `Game row recorded FINAL ${row.game.homeScore}-${row.game.awayScore} at ` +
        `${row.game.updatedAt.toISOString()} but the free scoreboard for ` +
        `${pickShape.gameDateIso.slice(0, 10)} lists no event pairing "${row.game.awayTeamName}" ` +
        `with "${row.game.homeTeamName}", so no grader could orient the stored names to a final.`,
      evidence: {
        boardEvents,
        ...listed,
        recorded: {
          homeScore: row.game.homeScore,
          awayScore: row.game.awayScore,
          recordedAt: row.game.updatedAt.toISOString(),
        },
        matcherReason: outcome.reason,
      },
      cancelGame: false,
    };
  }
  const neitherListed = !listing.homeListed && !listing.awayListed;
  return {
    kind: "void",
    rcaCode: "FIXTURE_NOT_FOUND",
    reason:
      `The free ESPN scoreboard for ${pickShape.gameDateIso.slice(0, 10)} (${boardEvents} ` +
      `event(s)) lists no event pairing "${row.game.awayTeamName}" with "${row.game.homeTeamName}"` +
      (neitherListed
        ? "; neither team appears on that board."
        : `; ${listing.homeListed ? `"${row.game.homeTeamName}"` : `"${row.game.awayTeamName}"`} appears ` +
          `against another opponent, so the game row is left as is.`),
    evidence: { boardEvents, ...listed, matcherReason: outcome.reason },
    cancelGame: neitherListed,
  };
}

export function buildZeroSitVoidPayload(args: {
  readonly row: ZeroSitPickRow;
  readonly decision: Extract<ZeroSitDecision, { kind: "void" }>;
  readonly now: Date;
}): ZeroSitVoidEventPayload {
  const { row, decision, now } = args;
  return {
    schemaVersion: ZERO_SIT_EVENT_SCHEMA_VERSION,
    kind: "ZERO_SIT_VOID",
    lane: "zero-sit",
    actor: ZERO_SIT_ACTOR,
    policy: ZERO_SIT_POLICY_REF,
    pickId: row.id,
    gameId: row.game.id,
    sportKey: row.game.sport?.key ?? "",
    result: "VOID",
    rcaCode: decision.rcaCode,
    reason: decision.reason,
    homeTeam: row.game.homeTeamName,
    awayTeam: row.game.awayTeamName,
    commenceTime: row.game.commenceTime.toISOString(),
    ageHours: round1(hoursBetween(now, row.game.commenceTime)),
    settledAt: now.toISOString(),
    evidence: decision.evidence,
  };
}

// ── STALE half ──────────────────────────────────────────────────────────────

function staleUnpublishMemoryEvent(row: ZeroSitPickRow, now: Date): Record<string, unknown> {
  const sportKey = row.game.sport?.key ?? "";
  const refreshedAt = row.dataFreshnessAt ?? row.generatedAt;
  const staleDays = Math.floor(hoursBetween(now, refreshedAt) / 24);
  const metadata = {
    action: "UNPUBLISH",
    rcaCode: "STALE_UNSTARTED_PICK",
    lane: "zero-sit",
    actor: ZERO_SIT_ACTOR,
    policy: ZERO_SIT_POLICY_REF,
    pickId: row.id,
    gameId: row.game.id,
    sportKey,
    modelVersion: row.modelVersion,
    kickoff: row.game.commenceTime.toISOString(),
    lastRefreshedAt: refreshedAt.toISOString(),
    staleDays,
    maxAgeDays: STALE_PENDING_PICK_MAX_AGE_DAYS,
    unpublishedAt: now.toISOString(),
  };
  return {
    memory_type: "decision",
    memory_state: "confirmed",
    scope: ZERO_SIT_MEMORY_SCOPE,
    title: `Zero-sit: unpublished stale PENDING pick ${row.id}`,
    summary:
      `${sportKey} ${row.game.awayTeamName} @ ${row.game.homeTeamName}, kickoff ` +
      `${metadata.kickoff}, last refreshed ${metadata.lastRefreshedAt} (${staleDays}d, ` +
      `limit ${STALE_PENDING_PICK_MAX_AGE_DAYS}d). isPublished set false by the settle-picks ` +
      `cron under ${ZERO_SIT_POLICY_REF}. Row kept, result untouched.`,
    full_text: JSON.stringify(metadata),
    source_type: "cron.settle-picks.zero-sit",
    source_ref: row.id,
    source_timestamp: now,
    actor: ZERO_SIT_ACTOR,
    owner: "system",
    confidence: 100,
    tags: ["settlement", "zero-sit", "STALE_UNPUBLISHED", sportKey].filter(Boolean),
    metadata,
    owner_approval: true,
  };
}

/**
 * STALE half. Selects with the exact where the truth surface counts, then in
 * one transaction re-reads the ids that still satisfy the COMPLETE stale
 * predicate (published, PENDING, not refreshed within the window, kickoff
 * still in the future, sport scope), unpublishes exactly those under the same
 * predicate, and appends one memory event per row actually updated.
 * Idempotent: a row unpublished, graded, refreshed (dataFreshnessAt moved
 * inside the window) or rescheduled (kickoff now past) between the read and
 * the write is neither touched nor recorded. Should the bulk update touch
 * fewer rows than the re-select returned, the rows still published are the
 * ones it skipped; events and the returned ids cover only the rest.
 */
export async function unpublishStalePendingPicks(input: {
  readonly db: ZeroSitDb;
  readonly now?: Date;
  readonly sportKey?: string | null;
  readonly cap?: number;
}): Promise<ZeroSitStaleResult> {
  const now = input.now ?? new Date();
  const cap = input.cap ?? ZERO_SIT_STALE_CAP;
  const stalePredicate = staleUnstartedPublishedPendingWhere(now, input.sportKey ?? null);
  const rows = await input.db.pick.findMany({
    where: stalePredicate,
    orderBy: [{ game: { commenceTime: "asc" } }, { generatedAt: "asc" }],
    take: cap + 1,
    select: ZERO_SIT_PICK_SELECT,
  });
  const capReached = rows.length > cap;
  const selected = rows.slice(0, cap);
  const base: ZeroSitStaleResult = {
    maxAgeDays: STALE_PENDING_PICK_MAX_AGE_DAYS,
    selected: selected.length,
    unpublished: 0,
    recorded: 0,
    capReached,
    pickIds: [],
  };
  if (selected.length === 0) return base;

  const byId = new Map(selected.map((r) => [r.id, r] as const));
  let recorded = 0;
  const unpublishedIds: string[] = [];
  const written = await input.db.$transaction(async (tx) => {
    // Re-validate the COMPLETE predicate, not just isPublished/result: a pick
    // the pipeline refreshed (dataFreshnessAt inside the window) or whose
    // kickoff moved into the past since the read is no longer stale-unstarted.
    const stillEligible = await tx.pick.findMany({
      where: { id: { in: [...byId.keys()] }, ...stalePredicate },
      select: { id: true },
    });
    const ids = stillEligible.map((r) => r.id);
    if (ids.length === 0) return { count: 0 };
    const updated = await tx.pick.updateMany({
      where: { id: { in: ids }, ...stalePredicate },
      data: { isPublished: false },
    });
    if (updated.count === 0) return updated;
    let updatedIds = ids;
    if (updated.count !== ids.length) {
      // A row changed between the re-select and the update. Our update sets
      // isPublished=false, so any targeted row still published was skipped;
      // only the rest were unpublished by this cycle.
      const stillPublished = await tx.pick.findMany({
        where: { id: { in: ids }, isPublished: true },
        select: { id: true },
      });
      const skipped = new Set(stillPublished.map((r) => r.id));
      updatedIds = ids.filter((id) => !skipped.has(id));
      if (updatedIds.length !== updated.count) {
        console.warn(
          `[zero-sit] stale unpublish: updateMany reported ${updated.count} rows but ` +
            `${updatedIds.length} targeted rows are now unpublished; another writer ` +
            `unpublished a targeted row in the same window. Recording the ${updatedIds.length}.`,
        );
      }
    }
    for (const id of updatedIds) {
      const row = byId.get(id);
      if (!row) continue;
      await tx.jarvisMemoryEvent.create({ data: staleUnpublishMemoryEvent(row, now) });
      recorded++;
      unpublishedIds.push(id);
    }
    return updated;
  });

  return {
    ...base,
    unpublished: written.count,
    recorded,
    pickIds: unpublishedIds.slice(0, SAMPLE_CAP),
  };
}

// ── VOID half ───────────────────────────────────────────────────────────────

function emptyByCode(): Record<ZeroSitVoidRcaCode, number> {
  return {
    OVERDUE_NO_SCORE: 0,
    SCORE_MISMATCH_CROSS_PATH: 0,
    AMBIGUOUS_TEAM_NAME: 0,
    FIXTURE_NOT_FOUND: 0,
  };
}

function emptySkips(): Record<ZeroSitSkipReason, number> {
  return {
    NO_FREE_SPORT: 0,
    SCOREBOARD_FETCH_FAILED: 0,
    DATE_NOT_FETCHED: 0,
    UNDER_MIN_AGE: 0,
    GRADABLE: 0,
    DISPUTED_HOLD: 0,
    ORIENT_FAIL: 0,
    MISMATCH_UNDER_24H: 0,
    RESCHEDULED_PENDING: 0,
    WRITE_RACE_LOST: 0,
    WRITE_FAILED: 0,
  };
}

/**
 * Scoreboard dates for one sport's candidates, published rows first: their
 * days fill the budget before any unpublished row's day, so the acceptance
 * cohort (published overdue picks) cannot be starved by a long unpublished
 * tail. Oldest-first inside each group, matching the backfill lane.
 */
export function scoreboardDatesPublishedFirst(
  rows: readonly Pick<ZeroSitPickRow, "isPublished" | "game">[],
  opts: { readonly now: Date; readonly maxDays: number },
): { espnKeys: string[]; isoKeys: string[] } {
  const published = uniqueScoreboardDates(
    rows.filter((r) => r.isPublished).map((r) => r.game.commenceTime),
    { maxDays: opts.maxDays, now: opts.now, order: "oldest" },
  );
  const espnKeys = [...published.espnKeys];
  const isoKeys = [...published.isoKeys];
  if (espnKeys.length >= opts.maxDays) return { espnKeys, isoKeys };
  const all = uniqueScoreboardDates(
    rows.map((r) => r.game.commenceTime),
    { maxDays: Number.MAX_SAFE_INTEGER, now: opts.now, order: "oldest" },
  );
  const seen = new Set(espnKeys);
  for (let i = 0; i < all.espnKeys.length && espnKeys.length < opts.maxDays; i++) {
    const k = all.espnKeys[i]!;
    if (seen.has(k)) continue;
    seen.add(k);
    espnKeys.push(k);
    isoKeys.push(all.isoKeys[i]!);
  }
  return { espnKeys, isoKeys };
}

async function persistZeroSitVoid(
  db: ZeroSitDb,
  row: ZeroSitPickRow,
  decision: Extract<ZeroSitDecision, { kind: "void" }>,
  now: Date,
  cutoff: Date,
): Promise<{ written: boolean; gameCanceled: boolean }> {
  let gameCanceled = false;
  const payload = buildZeroSitVoidPayload({ row, decision, now });
  const written = await db.$transaction(async (tx) => {
    // Idempotent: PENDING-scoped, so a race loser (or a pick another lane
    // graded meanwhile) matches zero rows and appends nothing.
    //
    // The kickoff bound rides in the WRITE, not only in the candidate read.
    // EVERY void this lane issues is gated on ageHours >= the minimum age
    // (decideZeroSitVoid returns skip below the floor), and that age is
    // computed from the commenceTime captured when the candidates were
    // loaded. Between that read and this statement the lane fetches
    // scoreboards over the network for up to ZERO_SIT_VOID_CAP picks, so the
    // window is wide, and Prisma's default isolation does not lock the game
    // row. A contest rescheduled into the future in that window would be
    // VOIDed permanently on an age that no longer holds. As a relation filter
    // the database evaluates the bound as part of the update itself: a moved
    // game matches nothing, count comes back 0, and the caller records
    // WRITE_RACE_LOST and leaves the pick PENDING for the next cycle. The
    // unpublish half of this lane already carries its full predicate into its
    // own updateMany for the same reason.
    const updated = await tx.pick.updateMany({
      where: { id: row.id, result: "PENDING", game: { commenceTime: { lt: cutoff } } },
      data: { result: "VOID", settledAt: now },
    });
    if (updated.count === 0) return updated;
    // TRANSACTIONAL OUTBOX (same lane as settle-sport.ts and the free runner):
    // the event rides in the settlement transaction; the outbox worker closes
    // VOID events as receipts (non-decisive) and never rewrites this payload.
    await tx.pickSettlementEvent.create({
      data: {
        pickId: row.id,
        gameId: row.game.id,
        result: "VOID",
        settledAt: now,
        status: "PENDING",
        payload,
      },
    });
    await enqueuePostSettlementWork(
      tx.postSettlementWork as unknown as PostSettlementWorkDelegate,
      [
        { subjectId: row.id, kind: "CLV_GRADE" },
        { subjectId: row.id, kind: "SNAPSHOT_OUTCOME" },
      ],
    );
    if (decision.cancelGame) {
      // Never clobber a recorded FINAL; only a SCHEDULED or LIVE (a stale feed
      // state) row becomes CANCELED. POSTPONED is deliberately NOT in the
      // predicate: a postponed contest may be rescheduled outside the original
      // date window, so the original board no longer listing it is absence of
      // evidence, not evidence of cancellation. Cancellation needs positive
      // evidence; the pick is still voided FIXTURE_NOT_FOUND above and the row
      // keeps its POSTPONED status.
      // Same kickoff bound as the pick write above. The pick statement locks
      // the PICK row, not the game, so a reschedule can still commit between
      // the two statements inside this transaction; without the bound a game
      // moved into the future and still SCHEDULED would be marked CANCELED.
      const canceled = await tx.game.updateMany({
        where: {
          id: row.game.id,
          status: { in: ["SCHEDULED", "LIVE"] },
          commenceTime: { lt: cutoff },
        },
        data: { status: "CANCELED" },
      });
      gameCanceled = canceled.count > 0;
    }
    return updated;
  });
  return { written: written.count > 0, gameCanceled };
}

/**
 * VOID half. Loads PENDING picks past the minimum age (published rows first,
 * oldest kickoff first, capped), fetches the free scoreboard once per sport
 * for their dates (strict ESPN: a partial board is an error), re-runs the
 * free matcher per pick, and voids through the outbox lane per
 * decideZeroSitVoid. Any ESPN fetch error skips that sport for the cycle; a
 * write failure skips that pick only.
 */
export async function voidSittingPicks(input: {
  readonly db: ZeroSitDb;
  readonly now?: Date;
  readonly sportKey?: string | null;
  readonly cap?: number;
  readonly scoreboardMaxDays?: number;
  readonly fetchScores?: typeof fetchScoresMultiSource;
  /** Route deadline (epoch ms, zeroSitDeadline): the lane stops before its next fetch or write once reached. */
  readonly deadlineAtMs?: number;
  /** Wall clock for the deadline check (tests inject one); the decision clock stays `now`. */
  readonly clock?: () => number;
}): Promise<ZeroSitVoidResult> {
  const now = input.now ?? new Date();
  const cap = input.cap ?? ZERO_SIT_VOID_CAP;
  const scoreboardMaxDays = input.scoreboardMaxDays ?? ZERO_SIT_SCOREBOARD_MAX_DAYS;
  const fetchScores = input.fetchScores ?? fetchScoresMultiSource;
  const clock = input.clock ?? ((): number => Date.now());
  const pastDeadline = (): boolean => input.deadlineAtMs !== undefined && clock() >= input.deadlineAtMs;
  const cutoff = new Date(now.getTime() - ZERO_SIT_VOID_MIN_AGE_HOURS * 60 * 60 * 1000);

  const rows = await input.db.pick.findMany({
    where: {
      result: "PENDING",
      game: {
        commenceTime: { lt: cutoff },
        ...(input.sportKey ? { sport: { key: input.sportKey } } : {}),
      },
    },
    orderBy: [{ isPublished: "desc" }, { game: { commenceTime: "asc" } }],
    take: cap + 1,
    select: ZERO_SIT_PICK_SELECT,
  });
  const capReached = rows.length > cap;
  const candidates = rows.slice(0, cap);

  const result: ZeroSitVoidResult = {
    minAgeHours: ZERO_SIT_VOID_MIN_AGE_HOURS,
    inspected: candidates.length,
    capReached,
    voided: 0,
    gamesCanceled: 0,
    byCode: emptyByCode(),
    skippedByReason: emptySkips(),
    deadlineHit: false,
    remaining: candidates.length,
    voids: [],
    skipped: [],
    scoreboardFailures: [],
  };
  const skip = (row: ZeroSitPickRow, reason: ZeroSitSkipReason): void => {
    result.remaining -= 1;
    result.skippedByReason[reason] += 1;
    if (result.skipped.length < SAMPLE_CAP) {
      result.skipped.push({ pickId: row.id, sportKey: row.game.sport?.key ?? "", reason });
    }
  };

  const bySport = new Map<string, ZeroSitPickRow[]>();
  for (const row of candidates) {
    const key = row.game.sport?.key ?? "";
    const list = bySport.get(key) ?? [];
    list.push(row);
    bySport.set(key, list);
  }

  for (const [sportKey, sportRows] of bySport) {
    const freeSport: Sport | null = ODDS_KEY_TO_FREE[sportKey] ?? null;
    if (!freeSport) {
      for (const row of sportRows) skip(row, "NO_FREE_SPORT");
      continue;
    }
    // Deadline before every scoreboard fetch: one range can hold the route
    // for 12s per division group, so it is never started past the budget.
    if (pastDeadline()) {
      result.deadlineHit = true;
      break;
    }
    const { espnKeys, isoKeys } = scoreboardDatesPublishedFirst(sportRows, {
      now,
      maxDays: scoreboardMaxDays,
    });
    let board: readonly NormalizedGame[] = [];
    try {
      // strictEspn: a date whose board lost a division group (an FBS 5xx or
      // timeout with FCS healthy) surfaces as an `espn <dates>: ...` error
      // instead of a silently partial board that would read every FBS
      // fixture as "not found" (espn-scores.ts fetchEspnScoreboard).
      const multi = await fetchScores(freeSport, {
        espnDateKeys: espnKeys,
        isoDateKeys: isoKeys,
        strictEspn: true,
      });
      // ESPN is the fixture authority for this lane; any ESPN error means the
      // board is incomplete and nothing may be voided on it this cycle.
      // Secondary-source errors (unregistered sources refused by clearance)
      // are routine and do not block.
      const espnErrors = multi.errors.filter((e) => e.startsWith("espn"));
      if (espnErrors.length > 0) {
        result.scoreboardFailures.push({ sportKey, errors: espnErrors.slice(0, 5) });
        for (const row of sportRows) skip(row, "SCOREBOARD_FETCH_FAILED");
        continue;
      }
      board = multi.games;
    } catch (err) {
      result.scoreboardFailures.push({
        sportKey,
        errors: [err instanceof Error ? err.message : String(err)],
      });
      for (const row of sportRows) skip(row, "SCOREBOARD_FETCH_FAILED");
      continue;
    }

    const fetchedKeys = new Set(espnKeys);
    const finals = buildTrustedFinals(board, []);

    for (const row of sportRows) {
      const dateKey = toEspnDateKey(row.game.commenceTime);
      if (!dateKey || !fetchedKeys.has(dateKey)) {
        skip(row, "DATE_NOT_FETCHED");
        continue;
      }
      const pick: PendingPick = {
        pickId: row.id,
        pickType: row.pickType as PendingPick["pickType"],
        selection: row.selection,
        line: selectGradingLine({ clvLockLine: row.clvLockLine, line: row.line }),
        homeTeam: row.game.homeTeamName,
        awayTeam: row.game.awayTeamName,
        sportKey,
        gameDateIso: row.game.commenceTime.toISOString(),
      };
      const outcome = settlePendingPicks([pick], finals, { postponedCandidates: board })[0];
      if (!outcome) {
        result.remaining -= 1;
        continue;
      }
      const decision = decideZeroSitVoid({ row, outcome, board, now });
      if (decision.kind === "skip") {
        skip(row, decision.reason);
        continue;
      }
      // Deadline before every candidate write; the row stays PENDING and is
      // re-inspected next cycle (the lane is idempotent).
      if (pastDeadline()) {
        result.deadlineHit = true;
        break;
      }
      let persisted: { written: boolean; gameCanceled: boolean };
      try {
        persisted = await persistZeroSitVoid(input.db, row, decision, now, cutoff);
      } catch (err) {
        // Per-pick isolation: one poison row (a transient DB error, an event
        // unique collision) must not stop every other void this cycle.
        console.warn(
          `[zero-sit] WRITE_FAILED pick=${row.id} game=${row.game.id} sport=${sportKey}: ` +
            (err instanceof Error ? err.message : String(err)),
        );
        skip(row, "WRITE_FAILED");
        continue;
      }
      if (!persisted.written) {
        skip(row, "WRITE_RACE_LOST");
        continue;
      }
      result.remaining -= 1;
      result.voided += 1;
      result.byCode[decision.rcaCode] += 1;
      if (persisted.gameCanceled) result.gamesCanceled += 1;
      if (result.voids.length < SAMPLE_CAP) {
        result.voids.push({
          pickId: row.id,
          gameId: row.game.id,
          sportKey,
          rcaCode: decision.rcaCode,
          ageHours: round1(hoursBetween(now, row.game.commenceTime)),
          gameCanceled: persisted.gameCanceled,
        });
      }
      console.warn(
        `[zero-sit] VOID pick=${row.id} game=${row.game.id} sport=${sportKey} rca=${decision.rcaCode}: ${decision.reason}`,
      );
    }
    if (result.deadlineHit) break;
  }
  if (result.deadlineHit) {
    console.warn(
      `[zero-sit] route deadline reached: ${result.remaining} of ${candidates.length} candidates not ` +
        "inspected this cycle; the lane is idempotent and the next cycle takes them.",
    );
  }

  return result;
}

/** Both halves, stale first (cheap, no network), then the void lane. */
export async function runZeroSitLane(input: {
  readonly db: ZeroSitDb;
  readonly now?: Date;
  readonly sportKey?: string | null;
  readonly fetchScores?: typeof fetchScoresMultiSource;
  /** Route deadline for the void half (zeroSitDeadline); the stale half is one local transaction. */
  readonly deadlineAtMs?: number;
  readonly clock?: () => number;
}): Promise<ZeroSitLaneResult> {
  const now = input.now ?? new Date();
  const stale = await unpublishStalePendingPicks({
    db: input.db,
    now,
    sportKey: input.sportKey ?? null,
  });
  const voids = await voidSittingPicks({
    db: input.db,
    now,
    sportKey: input.sportKey ?? null,
    ...(input.fetchScores ? { fetchScores: input.fetchScores } : {}),
    ...(input.deadlineAtMs !== undefined ? { deadlineAtMs: input.deadlineAtMs } : {}),
    ...(input.clock ? { clock: input.clock } : {}),
  });
  return { lane: "zero-sit", stale, voids };
}
