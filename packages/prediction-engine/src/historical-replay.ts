/**
 * Historical replay — pre-game feature assembly for the backfill settlement engine.
 *
 * THE #1 NON-NEGOTIABLE: NO LOOKAHEAD.
 * A backfilled pick must be scored using ONLY information that existed BEFORE
 * kickoff. The final score (and anything derived from it) is allowed at EXACTLY
 * one place — the settlement step that grades an ALREADY-COMMITTED pick. A single
 * lookahead leak poisons the entire calibration corpus, so the design makes the
 * leak structurally hard: this module splits a raw nflverse `schedules` row into
 * two disjoint, type-separated halves and the scorer can only ever see the first.
 *
 *   PreGameFeatures  — lines (spread/total/moneyline), schedule, venue. NO scores.
 *   SettlementFacts  — homeScore, awayScore, result. The grader's ONLY input.
 *
 * `assemblePreGameFeatures` REFUSES (throws) if a post-kickoff field is present on
 * the object it is told to treat as pre-game, and its return type structurally
 * cannot carry a score. `extractSettlementFacts` is the only function that reads
 * the score columns. The scorer reuses the FROZEN model (scoreGame) unchanged —
 * we never fork or reimplement it.
 *
 * nflverse `schedules` (games.csv, Lee Sharpe's nfldata) ships pre-game lines for
 * free under CC-BY-4.0: spread_line / total_line / home_moneyline / away_moneyline
 * are the closing market as of kickoff — a legal, no-lookahead source of the lines
 * we would have priced against. spread_line is HOME-perspective (negative = home
 * favored), matching scoring.ts / settlement.ts / clv.ts.
 *
 * Pure and dependency-free (only @sports/types). No I/O, no DB — fully unit-testable.
 */

import type { OddsInput, BookmakerOddsInput, ScoredPick, PickType } from "@sports/types";
import { scoreGame } from "./scoring.js";
import { MODEL_VERSION, WEIGHTS } from "./constants.js";
import { calculatePickResult, type SettlementResult } from "./settlement.js";
import {
  computeSpreadClv,
  computeTotalClv,
  computeMoneylineClv,
  type ClvVerdict,
} from "./clv.js";

/**
 * The raw set of columns a single nflverse `schedules` row can contain. Both
 * pre-game (lines, schedule) AND post-game (scores, result) fields live in the
 * SAME upstream row — which is exactly why splitting them deliberately matters.
 * All optional/nullable because historical coverage varies by season.
 */
export interface RawScheduleRow {
  readonly gameKey: string; // nflverse game_id, e.g. "2023_01_KC_DET"
  readonly season: number;
  readonly week: number;
  readonly gameType?: string | null; // REG | POST | ...
  readonly homeTeam: string; // abbreviation
  readonly awayTeam: string;
  readonly commenceTime?: string | null; // ISO kickoff if known
  // ── Pre-game (legal to use when scoring) ──
  readonly spreadLine?: number | null; // HOME-perspective closing spread
  readonly totalLine?: number | null;
  readonly homeMoneyline?: number | null; // American
  readonly awayMoneyline?: number | null;
  readonly restHome?: number | null;
  readonly restAway?: number | null;
  readonly roof?: string | null;
  readonly surface?: string | null;
  // ── POST-GAME (NEVER legal to use when scoring) ──
  readonly homeScore?: number | null;
  readonly awayScore?: number | null;
  readonly result?: number | null; // home margin (home_score - away_score)
}

/** Columns that, if present on a row treated as pre-game, are a lookahead leak. */
export const POST_KICKOFF_FIELDS = ["homeScore", "awayScore", "result"] as const;
export type PostKickoffField = (typeof POST_KICKOFF_FIELDS)[number];

/**
 * Pre-game features ONLY. This type structurally cannot carry a final score — there
 * is no homeScore/awayScore/result field — so a downstream scorer literally has no
 * post-game field to read. That is the no-lookahead guarantee at the type level.
 */
export interface PreGameFeatures {
  readonly gameKey: string;
  readonly season: number;
  readonly week: number;
  readonly gameType: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: string; // ISO; a synthetic stable time if upstream lacked one
  readonly spreadLine: number | null; // HOME-perspective
  readonly totalLine: number | null;
  readonly homeMoneyline: number | null;
  readonly awayMoneyline: number | null;
  readonly restHome: number | null;
  readonly restAway: number | null;
}

/** The grader's ONLY input — the post-game truth, isolated from scoring. */
export interface SettlementFacts {
  readonly gameKey: string;
  readonly homeScore: number;
  readonly awayScore: number;
}

export class LookaheadLeakError extends Error {
  constructor(public readonly field: PostKickoffField) {
    super(
      `historical-replay: refusing to assemble pre-game features — post-kickoff field "${field}" ` +
        "is present on the object passed as pre-game data. The final score may ONLY be read by " +
        "extractSettlementFacts at the settlement step, never by feature assembly.",
    );
    this.name = "LookaheadLeakError";
  }
}

/**
 * Build the leakage-safe pre-game feature view of a schedule row.
 *
 * Refuses (throws LookaheadLeakError) when ANY post-kickoff field carries a real
 * value on the supplied object — the structural defense against a caller sneaking a
 * score into the pre-game path. A null/undefined post-game field is fine (the
 * column simply being present in the row shape is not a leak; a non-null VALUE is).
 *
 * The returned object has no score field at all, so even a buggy downstream consumer
 * cannot read one.
 */
export function assemblePreGameFeatures(row: RawScheduleRow): PreGameFeatures {
  for (const field of POST_KICKOFF_FIELDS) {
    const value = row[field];
    if (value !== undefined && value !== null) {
      throw new LookaheadLeakError(field);
    }
  }

  // A stable, deterministic kickoff if upstream omitted one. nflverse weeks are
  // sequential; we only need a within-history ordering + an "as-of" stamp that is
  // unambiguously pre-result. Never derived from any post-game fact.
  const commenceTime =
    row.commenceTime && row.commenceTime.trim() !== ""
      ? row.commenceTime
      : syntheticKickoff(row.season, row.week);

  return {
    gameKey: row.gameKey,
    season: row.season,
    week: row.week,
    gameType: row.gameType && row.gameType.trim() !== "" ? row.gameType : "REG",
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    commenceTime,
    spreadLine: numOrNull(row.spreadLine),
    totalLine: numOrNull(row.totalLine),
    homeMoneyline: intOrNull(row.homeMoneyline),
    awayMoneyline: intOrNull(row.awayMoneyline),
    restHome: numOrNull(row.restHome),
    restAway: numOrNull(row.restAway),
  };
}

/**
 * Extract the settlement truth from a schedule row. This is the ONLY function that
 * reads the final score — and it does NOT read any line/feature, so it can never
 * influence a pick. Returns null when the game has no final score (not yet played
 * or missing in the archive): such a game cannot be settled and must be skipped.
 */
export function extractSettlementFacts(row: RawScheduleRow): SettlementFacts | null {
  const homeScore = intOrNull(row.homeScore);
  const awayScore = intOrNull(row.awayScore);
  if (homeScore === null || awayScore === null) return null;
  return { gameKey: row.gameKey, homeScore, awayScore };
}

/**
 * Synthesize the `OddsInput` the FROZEN scorer consumes, from PRE-GAME features only.
 *
 * The live pipeline forms its consensus from many bookmaker rows; nflverse gives one
 * authoritative closing line per market. The nflverse closing line is NOT a single
 * book's quote — it is the market consensus as of kickoff (Lee Sharpe's nfldata,
 * aggregated). The honest reconstruction of "a fully-priced consensus line" is to
 * present it at the scorer's IDEAL market depth, so the depth/volatility components
 * reflect a settled consensus rather than a thin 2-book quote. We replicate that one
 * closing number across MARKET_DEPTH_IDEAL_BOOKS synthetic rows, priced at standard
 * -110 vig for spread/total and at the nflverse moneyline for H2H.
 *
 * This does NOT manufacture an edge: every book carries the SAME line, so consensus
 * is unanimous and dispersion is zero (which is true of a single consensus close),
 * and the edge component is driven only by the -110 vig / nflverse ML — exactly what
 * the live scorer would see. The pick is marked isBootstrap by the caller and never
 * enters canonical history unless an owner promotes it.
 *
 * Crucially, the input is built from `PreGameFeatures`, which has no score field —
 * so this function structurally cannot leak a result into scoring.
 */
// One consensus closing line, presented at the scorer's ideal depth (a single
// settled close represents the whole market, not a thin 2-book quote).
const SYNTHETIC_BOOK_COUNT = WEIGHTS.MARKET_DEPTH_IDEAL_BOOKS;
const STD_VIG_PRICE = -110;

export function buildHistoricalOddsInput(features: PreGameFeatures): OddsInput {
  const bookmakerOdds: BookmakerOddsInput[] = [];

  for (let i = 0; i < SYNTHETIC_BOOK_COUNT; i++) {
    const book = `nflverse-close-${i + 1}`;
    if (features.spreadLine !== null) {
      bookmakerOdds.push({
        bookmaker: book,
        market: "SPREADS",
        spread: features.spreadLine, // HOME-perspective, as scoring/settlement expect
        homeSpreadPrice: STD_VIG_PRICE,
        awaySpreadPrice: STD_VIG_PRICE,
      });
    }
    if (features.totalLine !== null) {
      bookmakerOdds.push({
        bookmaker: book,
        market: "TOTALS",
        total: features.totalLine,
        overPrice: STD_VIG_PRICE,
        underPrice: STD_VIG_PRICE,
      });
    }
    if (features.homeMoneyline !== null && features.awayMoneyline !== null) {
      bookmakerOdds.push({
        bookmaker: book,
        market: "H2H",
        homePrice: features.homeMoneyline,
        awayPrice: features.awayMoneyline,
      });
    }
  }

  return {
    gameId: features.gameKey, // settle/idempotency key — the nflverse game_id
    homeTeam: features.homeTeam,
    awayTeam: features.awayTeam,
    commenceTime: new Date(features.commenceTime),
    sport: "americanfootball_nfl",
    bookmakerOdds,
    context: {
      // Pre-game context only. Opening == current (one closing snapshot), rest days
      // are physical schedule facts known pre-kickoff. No score-derived field.
      openingSpread: features.spreadLine,
      currentSpread: features.spreadLine,
      openingTotal: features.totalLine,
      currentTotal: features.totalLine,
      restDaysHome: features.restHome,
      restDaysAway: features.restAway,
      bookmakerCoverageMax: SYNTHETIC_BOOK_COUNT,
      hasSpreadMarket: features.spreadLine !== null,
      hasTotalMarket: features.totalLine !== null,
      hasH2HMarket: features.homeMoneyline !== null && features.awayMoneyline !== null,
    },
  };
}

/**
 * Run the FROZEN model on one historical game's pre-game features. Thin wrapper over
 * the unchanged `scoreGame` — no scoring logic lives here. The `asOf` clock is the
 * (pre-kickoff) kickoff time, so the proof receipt's frozen timestamp is honestly
 * pre-result. Returns the scorer's picks (zero, one, or several markets).
 */
export function scoreHistoricalGame(features: PreGameFeatures): ScoredPick[] {
  const input = buildHistoricalOddsInput(features);
  // Score "as of" kickoff — the latest pre-result instant. scoreGame is the frozen
  // model; we pass the kickoff so dataFreshnessAt/asOf are pre-kickoff, not "now".
  return scoreGame(input, new Date(features.commenceTime));
}

/**
 * Idempotency key for a backfilled pick — mirrors the live DB unique constraint
 * [gameId, pickType]. Re-running the backfill keys on this and upserts, so a game is
 * never double-counted. (gameId here is the stable nflverse game_id.)
 */
export function backfillPickKey(gameId: string, pickType: PickType): string {
  return `${gameId}::${pickType}`;
}

export interface SettledHistoricalPick {
  readonly gameKey: string;
  readonly pickType: PickType;
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly marketFairProb: number | null;
  readonly entryOdds: number | null;
  readonly bookmakerCount: number;
  readonly modelVersion: string;
  readonly asOf: string; // ISO pre-kickoff timestamp the pick was frozen at
  readonly idempotencyKey: string;
  // ── Settlement (graded AFTER the pick was committed) ──
  readonly result: SettlementResult;
  readonly homeScore: number;
  readonly awayScore: number;
  // ── CLV (entry == nflverse close, so honestly MATCHED unless we lack a line) ──
  readonly clvValue: number | null;
  readonly clvVerdict: ClvVerdict | null;
}

/**
 * Settle one already-scored historical pick against the known final score.
 *
 * This is the ONE place a result enters the pipeline. It takes a pick the FROZEN
 * model already committed to (from scoreHistoricalGame) plus the isolated
 * SettlementFacts, and grades WIN/LOSS/PUSH via the unchanged settlement function.
 * It NEVER feeds the score back into scoring.
 *
 * CLV honesty: our entry line IS the nflverse closing line (the only line the
 * archive gives), so for spread/total the CLV is by construction 0 → MATCHED_CLOSE;
 * moneyline likewise compares the entry price to itself. We surface that honestly
 * rather than inventing a separate close we do not have.
 */
export function settleHistoricalPick(
  pick: ScoredPick,
  facts: SettlementFacts,
  homeTeam: string,
): SettledHistoricalPick {
  const result = calculatePickResult(
    pick.pickType,
    pick.selection,
    pick.line,
    homeTeam,
    facts.homeScore,
    facts.awayScore,
    "americanfootball_nfl",
  );

  const { clvValue, clvVerdict } = gradeHistoricalClv(pick, homeTeam);

  const entryOdds =
    pick.entryPrice ?? (pick.pickType === "MONEYLINE" ? Math.round(pick.line) : STD_VIG_PRICE);

  return {
    gameKey: facts.gameKey,
    pickType: pick.pickType,
    selection: pick.selection,
    line: pick.line,
    confidence: pick.confidence,
    edgeScore: pick.edgeScore,
    marketFairProb: pick.marketFairProb ?? null,
    entryOdds,
    bookmakerCount: pick.bookmakerCount,
    modelVersion: pick.modelVersion,
    asOf: pick.dataFreshnessAt.toISOString(),
    idempotencyKey: backfillPickKey(facts.gameKey, pick.pickType),
    result,
    homeScore: facts.homeScore,
    awayScore: facts.awayScore,
    clvValue,
    clvVerdict,
  };
}

/**
 * Grade CLV for a historical pick. Entry line == nflverse close (we only have the
 * one closing line), so spread/total CLV is 0 (MATCHED) and moneyline compares the
 * entry price to itself. Honest by construction — no invented separate close.
 */
function gradeHistoricalClv(
  pick: ScoredPick,
  homeTeam: string,
): { clvValue: number | null; clvVerdict: ClvVerdict | null } {
  if (pick.pickType === "SPREAD") {
    const side = pick.selection.startsWith(homeTeam) ? "HOME" : "AWAY";
    const r = computeSpreadClv(pick.line, pick.line, side);
    return { clvValue: r.clvPoints, clvVerdict: r.verdict };
  }
  if (pick.pickType === "TOTAL") {
    const side = pick.selection.toUpperCase().startsWith("OVER") ? "OVER" : "UNDER";
    const r = computeTotalClv(pick.line, pick.line, side);
    return { clvValue: r.clvPoints, clvVerdict: r.verdict };
  }
  if (pick.pickType === "MONEYLINE") {
    const price = pick.entryPrice ?? Math.round(pick.line);
    if (!Number.isFinite(price) || price === 0) return { clvValue: null, clvVerdict: null };
    const r = computeMoneylineClv(price, price);
    return { clvValue: r.clvProbability, clvVerdict: r.verdict };
  }
  return { clvValue: null, clvVerdict: null };
}

/**
 * Strip the post-game fields off a raw row, yielding a row safe to pass into the
 * pre-game path. This is the EXPLICIT split: the orchestrator separates the two
 * halves up front so `assemblePreGameFeatures` (the public entry point that scoring
 * uses) keeps its strict refuse-on-any-score guard. The grader reads the ORIGINAL
 * row via `extractSettlementFacts`, so no information is lost — only quarantined.
 */
function stripPostGame(row: RawScheduleRow): RawScheduleRow {
  const { homeScore: _h, awayScore: _a, result: _r, ...preGame } = row;
  void _h;
  void _a;
  void _r;
  return { ...preGame, homeScore: null, awayScore: null, result: null };
}

/**
 * Full single-game replay: split the row into disjoint pre-game / settlement halves,
 * assemble pre-game features, run the frozen model, then settle every produced pick
 * against the isolated final score. Returns [] when the game has no settleable final
 * score (skipped, never guessed). Feature assembly and settlement read DISJOINT data.
 */
export function replayAndSettleGame(row: RawScheduleRow): SettledHistoricalPick[] {
  const facts = extractSettlementFacts(row); // the only score read (from the raw row)
  if (!facts) return []; // unplayed / unscored → cannot settle
  // Feature assembly only ever sees the quarantined, score-free row.
  const features = assemblePreGameFeatures(stripPostGame(row));
  const picks = scoreHistoricalGame(features);
  return picks.map((pick) => settleHistoricalPick(pick, facts, features.homeTeam));
}

function numOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function intOrNull(v: number | null | undefined): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.round(n);
}

/** Deterministic, unambiguously pre-result kickoff stamp for a (season, week). */
function syntheticKickoff(season: number, week: number): string {
  // Anchor to the NFL season's early September and step a week at a time. Only used
  // for ordering + an as-of timestamp; never compared against any post-game fact.
  const base = Date.UTC(season, 8, 1, 17, 0, 0); // Sep 1, 17:00 UTC
  const weekMs = (week - 1) * 7 * 24 * 60 * 60 * 1000;
  return new Date(base + weekMs).toISOString();
}
