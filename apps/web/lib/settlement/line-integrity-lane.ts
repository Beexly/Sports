/**
 * Line-integrity remediation lane (C-282; ledger C-197 finding, C-281 guard).
 *
 * Founder-delegated 2026-09-08, via orchestrator. Founder policy since
 * 2026-09-05 is that no pick ever sits on a human, so the remediation for
 * C-197 is automated rather than hand-run — the same posture as the zero-sit
 * lane (zero-sit-lane.ts), whose transactional-outbox shape this one copies.
 *
 * WHAT THE DEFECT ACTUALLY IS. The engine stores the arithmetic MEAN of every
 * book's quoted line (scoring.ts `avgSpread` / `avgTotal`) in `Pick.line`, the
 * field the product displays as a price and settles against. Where books agree
 * that mean IS a quoted line; where they disagree it is not, and the member is
 * shown something no book offers. C-197 called this a model-predicted margin;
 * it is not (C-281 records the correction), but the consequence it describes —
 * an unplaceable pick, graded against a price that never existed — stands.
 *
 * WHAT THIS LANE DOES, when LINE_INTEGRITY_VOID_ENABLED is true:
 *
 *   THE TWO HALVES JUDGE DIFFERENT LINES AGAINST DIFFERENT BOARDS. Saying
 *   "the stored line" and "the same defect" for both, as this header once did,
 *   describes the wrong evidence and the wrong population (CodeRabbit, #733).
 *
 *   VOID half (voidDefectiveSettledPicks): a SETTLED, published pick whose
 *   GRADING line — `clvLockLine`, or an immutable proof receipt's line, never
 *   the drifting `line` column — was not quoted by any bookmaker for that game
 *   and market AT OR BEFORE publish time. A legacy row carrying neither lock
 *   nor receipt is SKIPPED (NO_PUBLISH_LOCK), because there is no trustworthy
 *   record of what was published. Its result is set to VOID, and the withdrawal
 *   is recorded as an append-only JarvisMemoryEvent carrying rcaCode
 *   LINE_NOT_QUOTED and the evidence, plus post-settlement work rows.
 *
 *   NOT a second PickSettlementEvent: `PickSettlementEvent.pickId` is @unique
 *   and a settled pick already owns its grading event, so the ORIGINAL event is
 *   left intact and the withdrawal is a new fact recorded beside it. The first
 *   version of this lane tried to write a second one and could not void a
 *   single pick. Operators looking for the record should read the memory event,
 *   not the settlement event.
 *
 *   The recorded result is WITHDRAWN, never rewritten in place to some other
 *   outcome, and `settledAt` is NEVER re-stamped: the pick was settled when it
 *   was settled, and moving that timestamp would falsify the settlement
 *   history the calibration loader reads. (This is the C-254/C-256/C-258
 *   settledAt-preservation rule.)
 *
 *   UNPUBLISH half (unpublishDefectiveUnsettledPicks): an UNSETTLED published
 *   pick whose DISPLAYED line (`line`, what the member is looking at) is not
 *   quoted on the CURRENT board — quotes inside the platform's odds-freshness
 *   window, not a book's whole history — is set isPublished=false in one
 *   PENDING-scoped updateMany. A game whose board has gone quiet is skipped
 *   (NO_FRESH_QUOTES), never unpublished. Nothing is deleted; the result stays
 *   PENDING and the zero-sit lane still owns its eventual grading or void.
 *
 * WHY VOID AND NOT RE-GRADE. Re-grading a settled pick against a book line
 * requires choosing WHICH book line at WHICH timestamp, which is a policy
 * nobody has approved, and it would rewrite a published result. The lane
 * withdraws the claim instead. scripts/ops/regrade-against-book-lines.ts
 * reports what a re-grade would change, and writes nothing.
 *
 * CONSERVATIVE BY CONSTRUCTION. A pick with no odds rows readable for its game
 * and market is voided ONLY under the explicit NO_QUOTE_ROWS branch, and that
 * branch fires only when the query succeeded and returned nothing — a read
 * failure skips the pick, so nothing is voided on missing evidence. Every
 * write is scoped by the state it read (result and isPublished in the `where`),
 * so a race loser writes nothing and a second run is a no-op. A write failure
 * on one pick is isolated and the loop continues. Per-run caps bound the work.
 *
 * DEFAULT OFF. The flag ships false. Turning it on withdraws published results,
 * which is a founder action; see docs/ops/LINE_INTEGRITY_DECISION_2026-09-08.md.
 */

import { isBaseballSport, isQuotedBookLine } from "@sports/prediction-engine";
import { isRealBookmakerKey } from "@/lib/calibration/publish-time-market-p";
import { FRESHNESS_THRESHOLD_MS } from "@sports/data-ingestion";
import {
  enqueuePostSettlementWork,
  reopenPostSettlementWork,
  type PostSettlementWorkDelegate,
} from "@sports/ingestion-pipeline";
import type { SettlementRootCauseCode } from "./root-cause-analysis";

/** The RCA code every void from this lane carries. */
export const LINE_INTEGRITY_RCA_CODE: Extract<SettlementRootCauseCode, "LINE_NOT_QUOTED"> =
  "LINE_NOT_QUOTED";

export const LINE_INTEGRITY_ACTOR = "system:settle-picks:line-integrity";
export const LINE_INTEGRITY_MEMORY_SCOPE = "settlement.line-integrity";
/**
 * Scope for the sweep cursors. Separate from the action scope above so the
 * ops counts (which filter on metadata.action) can never pick a cursor up.
 */
export const LINE_INTEGRITY_CURSOR_SCOPE = "settlement.line-integrity.cursor";
export const LINE_INTEGRITY_POLICY_REF = "docs/ops/LINE_INTEGRITY_DECISION_2026-09-08.md";
export const LINE_INTEGRITY_EVENT_SCHEMA_VERSION = 1;

/**
 * How far back a quote may be and still count as the CURRENT board, for the
 * PENDING half only (Devin Review, #733).
 *
 * Deliberately the platform's own odds-freshness line rather than a number
 * invented here: `FRESHNESS_THRESHOLD_MS` is what the ingestion gate already
 * calls a stale pregame board (4h, owner-tunable via ODDS_FRESHNESS_MAX_HOURS),
 * and a second definition of "stale odds" in a lane that unpublishes picks is
 * exactly the divergence this repo keeps paying for.
 */
export const LINE_INTEGRITY_PENDING_FRESHNESS_MS = FRESHNESS_THRESHOLD_MS;

/** Oldest-first cap on candidates inspected per cycle, per half. */
export const LINE_INTEGRITY_VOID_CAP = 50;
export const LINE_INTEGRITY_UNPUBLISH_CAP = 200;
/** Cap on the sample arrays returned for the ops surface. */
const SAMPLE_CAP = 20;

/**
 * Durable sweep cursor (Devin Review, #733 round 2).
 *
 * Both halves take the OLDEST `cap` candidates each cycle, and "candidate"
 * means every published SPREAD/TOTAL pick in the relevant state — not just the
 * defective ones, because "was this line quoted" needs the odds table and
 * cannot be expressed in the `where`. So once the oldest `cap` rows are CLEAN,
 * the same clean rows are re-selected every cycle forever and a defect sitting
 * behind them is never reached. The lane would look healthy while making zero
 * progress, and `remainingToVoid` could never reach 0. (The flip precondition
 * has since moved off that number entirely — see
 * LineIntegritySweepCompleteness — for a related reason: a capped sample of an
 * uncapped population can never establish that nothing remains.)
 *
 * The cursor is the last pick id inspected, appended to JarvisMemoryEvent
 * (schema.prisma is frozen, so no new table or column). Each cycle resumes
 * after it; when a sweep runs out of rows the cursor resets and the next sweep
 * starts from the beginning. Re-inspecting a clean row costs one odds read and
 * changes nothing, so wrapping is safe — and it is REQUIRED rather than
 * one-and-done: a pick generated long ago can settle later and land behind a
 * cursor that has already passed it.
 */
export type LineIntegrityHalfName = "void" | "unpublish";

/**
 * Cursor key. Includes the `?sport=` scope: a sport-scoped run walks a
 * DIFFERENT population, so letting it advance the global cursor would skip
 * rows the unscoped sweep has never seen (Devin Review, #733).
 */
function cursorKey(half: LineIntegrityHalfName, sportKey: string | null | undefined): string {
  return `${half}:${sportKey ?? "*"}`;
}

async function readCursor(
  db: LineIntegrityDb,
  half: string,
): Promise<string | null> {
  const rows = await db.jarvisMemoryEvent.findMany({
    where: {
      scope: LINE_INTEGRITY_CURSOR_SCOPE,
      metadata: { path: ["half"], equals: half },
    },
    orderBy: { created_at: "desc" },
    take: 1,
    select: { metadata: true },
  });
  const meta = rows[0]?.metadata as { pickId?: unknown } | null | undefined;
  return typeof meta?.pickId === "string" && meta.pickId.length > 0 ? meta.pickId : null;
}

async function writeCursor(
  db: LineIntegrityDb,
  half: string,
  pickId: string | null,
  now: Date,
): Promise<void> {
  // `wrapped` is an EXPLICIT boolean rather than "pickId is null", because that
  // is the fact the completeness signal below has to query and JSON-null
  // filtering is not something to rest a flip precondition on.
  const metadata = {
    half,
    pickId,
    wrapped: pickId === null,
    lane: "line-integrity",
    at: now.toISOString(),
  };
  await db.jarvisMemoryEvent.create({
    data: {
      memory_type: "observation",
      memory_state: "confirmed",
      scope: LINE_INTEGRITY_CURSOR_SCOPE,
      title: `Line integrity sweep cursor (${half})`,
      summary:
        pickId === null
          ? `${half} sweep reached the end of the population; the next sweep restarts from the oldest pick.`
          : `${half} sweep resumes after pick ${pickId}.`,
      full_text: JSON.stringify(metadata),
      source_type: "cron",
      source_ref: "settle-picks:line-integrity",
      source_timestamp: now,
      actor: LINE_INTEGRITY_ACTOR,
      owner: "system",
      confidence: 100,
      tags: ["line-integrity", "cursor", half],
      metadata,
    },
  });
}

/**
 * Where the durable cursor must land once a sweep stops (Devin Review, #733).
 *
 * THE DEFECT THIS EXISTS TO PREVENT. Both halves used to advance the cursor to
 * the LAST candidate of the page, before the loop ran. That is correct only if
 * the loop always finishes the page. It does not: the route deadline breaks out
 * of it. The cursor then pointed past rows nobody had looked at, and the next
 * cycle resumed AFTER them — so every candidate behind a deadline break was
 * skipped until the sweep wrapped all the way round. Defective picks stayed
 * published for a full wrap, and the more the lane was time-pressured the more
 * it skipped, which is the opposite of the behaviour under load that a
 * remediation lane needs.
 *
 * The rule, and it is ONE rule for both halves on purpose — the same "two
 * implementations of one rule" divergence this PR already had to fix once:
 *
 *   no candidates at all       -> reset. Nothing follows the cursor, so the
 *                                 next sweep must wrap to the oldest row.
 *   none handled               -> DO NOT WRITE. The cursor stays exactly where
 *                                 it was; every candidate is re-selected next
 *                                 cycle. (An already-expired deadline lands
 *                                 here.)
 *   whole page handled, and it -> reset, as above.
 *     was the last page
 *   otherwise                  -> the last candidate actually handled, so the
 *                                 first untouched one is selected next cycle.
 *
 * "Handled" means the row reached a terminal decision — voided, unpublished,
 * skipped for a stated reason, lost a write race, or failed its write. A row
 * whose odds read returned but whose write was cut off by the deadline is NOT
 * handled: it was never written, the lane is idempotent, and the next cycle
 * re-inspects it.
 */
export function sweepCursorTarget(input: {
  readonly candidateIds: readonly string[];
  /** Index of the last candidate that reached a terminal decision; -1 if none. */
  readonly lastHandledIndex: number;
  readonly capReached: boolean;
}): { readonly write: false } | { readonly write: true; readonly pickId: string | null } {
  if (input.candidateIds.length === 0) return { write: true, pickId: null };
  if (input.lastHandledIndex < 0) return { write: false };
  const finishedPage = input.lastHandledIndex === input.candidateIds.length - 1;
  if (finishedPage && !input.capReached) return { write: true, pickId: null };
  return { write: true, pickId: input.candidateIds[input.lastHandledIndex]! };
}

/** Pick markets that carry a points line. MONEYLINE has none and is out of scope. */
export const LINE_INTEGRITY_MARKETS = ["SPREAD", "TOTAL"] as const;
export type LineIntegrityMarket = (typeof LINE_INTEGRITY_MARKETS)[number];

/** Pick market -> the OddsMarket enum value whose rows carry that line. */
const PICK_MARKET_TO_ODDS_MARKET: Record<LineIntegrityMarket, "SPREADS" | "TOTALS"> = {
  SPREAD: "SPREADS",
  TOTAL: "TOTALS",
};

/**
 * Flag read. There is no zero-sit flag to mirror literally — that lane ships
 * always-on — so this uses the repo's established env-flag idiom
 * (free-settlement-runner.ts, public-surface-truth/route.ts): trimmed,
 * lower-cased, exact "true", default false.
 */
export function lineIntegrityVoidEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["LINE_INTEGRITY_VOID_ENABLED"]?.trim().toLowerCase() === "true";
}

export type LineIntegrityDefectKind =
  /** Odds rows exist for the game and market by generatedAt; none carries the stored line. */
  | "LINE_NOT_QUOTED"
  /** No odds row at all for the game and market by generatedAt: the line has no book basis. */
  | "NO_QUOTE_ROWS";

export type LineIntegrityQuote = {
  readonly id: string;
  readonly bookmaker: string;
  readonly fetchedAt: Date;
  /** The line this row quotes, in the pick's unit (points). */
  readonly line: number | null;
};

/**
 * The latest row per REAL bookmaker at or before `asOf` — the repo's
 * publish-time odds resolver contract (apps/web/lib/calibration/
 * publish-time-market-p.ts `latestH2hRowPerBookmaker`, C-253/C-110).
 *
 * Why this and not "every earlier row" (Devin Review, #733): the odds table is
 * append-only, so a game accumulates a row per book per refresh cycle. Matching
 * the stored line against ALL of them lets a SUPERSEDED quote — or a non-book
 * writer like `rundown_default` — vouch for a line no bookmaker was offering at
 * publish time. That fails OPEN: the lane would skip a defective pick as
 * LINE_IS_QUOTED. The check is "was this line on the board when we published",
 * which is one snapshot per book, not the union of history.
 */
export function latestQuotePerBookmaker(
  quotes: readonly LineIntegrityQuote[],
  asOf: Date,
): LineIntegrityQuote[] {
  const eligible = quotes
    .filter((q) => isRealBookmakerKey(q.bookmaker) && q.line !== null && Number.isFinite(q.line))
    .filter((q) => q.fetchedAt.getTime() <= asOf.getTime())
    .sort((a, b) => {
      const dt = b.fetchedAt.getTime() - a.fetchedAt.getTime();
      if (dt !== 0) return dt;
      const dk = a.bookmaker.localeCompare(b.bookmaker);
      if (dk !== 0) return dk;
      return (a.line ?? 0) - (b.line ?? 0);
    });
  const latest = new Map<string, LineIntegrityQuote>();
  for (const q of eligible) {
    const key = q.bookmaker.trim();
    if (!latest.has(key)) latest.set(key, q);
  }
  return [...latest.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, q]) => q);
}

export type LineIntegrityVerdict =
  | { readonly kind: "ok"; readonly matchedQuoteId: string }
  | {
      readonly kind: "defect";
      readonly defect: LineIntegrityDefectKind;
      /** The nearest line any book quoted, or null when no book quoted one. */
      readonly bookLine: number | null;
      readonly sourceIds: readonly string[];
    };

/**
 * Was `storedLine` a line some book quoted? Pure; the caller supplies the rows.
 *
 * `bookLine` on a defect is the NEAREST quoted line, reported so the evidence
 * shows how far off the stored value was. It is explicitly NOT a corrected
 * line and nothing grades against it.
 */
export function classifyStoredLine(
  storedLine: number,
  quotes: readonly LineIntegrityQuote[],
): LineIntegrityVerdict {
  const quoted = quotes.filter(
    (q): q is LineIntegrityQuote & { line: number } => q.line !== null && Number.isFinite(q.line),
  );
  if (quoted.length === 0) {
    return { kind: "defect", defect: "NO_QUOTE_ROWS", bookLine: null, sourceIds: quotes.map((q) => q.id) };
  }
  const match = quoted.find((q) => isQuotedBookLine(storedLine, [q.line]));
  if (match) return { kind: "ok", matchedQuoteId: match.id };

  let nearest = quoted[0]!;
  for (const q of quoted) {
    if (Math.abs(q.line - storedLine) < Math.abs(nearest.line - storedLine)) nearest = q;
  }
  return {
    kind: "defect",
    defect: "LINE_NOT_QUOTED",
    bookLine: nearest.line,
    // Bounded: the evidence names the books that DID quote, not every row.
    sourceIds: quoted.slice(0, 25).map((q) => q.id),
  };
}

/**
 * SQL-free screen used by the ops truth surface, where joining the odds table
 * per pick is not affordable. It is a PROXY for the real rule above and is
 * labelled as one everywhere it is reported: a line off the half-point grid is
 * certainly not a book line, but a line ON the grid may still never have been
 * quoted, so this UNDER-counts and never over-counts.
 */
export function isOffHalfPointGrid(line: number): boolean {
  if (!Number.isFinite(line)) return true;
  const doubled = Math.abs(line) * 2;
  // The stored value is a mean, so allow float drift around a grid point.
  return Math.abs(doubled - Math.round(doubled)) > 1e-9;
}

/**
 * The value settlement actually grades against (the no-drift rule,
 * selectGradingLine in the engine). `Pick.line` is rewritten on every refresh
 * cycle while a pick is PENDING; `clvLockLine` is captured once at publish and
 * is immutable, so it — not `line` — is what a settled result rests on.
 *
 * Classifying `line` instead (Devin Review, #733) makes the lane withdraw
 * results that were graded against a perfectly good locked line, and keep
 * defective ones whose drifted `line` happens to look fine. Measured on
 * production 2026-09-09, the two differ enough to matter: 312 settled SPREAD
 * picks are off-grid on `line` but only 186 on the grading line.
 *
 * `??` not `||`, so a genuine pick'em / even-total lock of 0 is honored.
 */
export function lineIntegrityGradingLine(
  pick: Pick<LineIntegrityPickRow, "clvLockLine" | "line">,
): number {
  return pick.clvLockLine ?? pick.line;
}

/** A baseball run line is always ±1.5 (2.5 and 3.5 are the offered alternates). */
export function isNonStandardRunline(sportKey: string, pickType: string, line: number): boolean {
  if (pickType !== "SPREAD" || !isBaseballSport(sportKey)) return false;
  if (!Number.isFinite(line)) return true;
  return ![1.5, 2.5, 3.5].some((valid) => Math.abs(Math.abs(line) - valid) < 1e-9);
}

export type LineIntegrityPickRow = {
  readonly id: string;
  readonly gameId: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  /** Write-once publish lock. Settlement grades THIS, not `line` (no-drift rule). */
  readonly clvLockLine: number | null;
  /**
   * Immutable pre-kickoff proof receipt, when one was minted. Its `line` and
   * `asOf` are the only other trustworthy record of what was published and
   * when, and they rescue legacy rows that predate `clvLockLine`.
   */
  readonly proofReceipt: { readonly line: number; readonly asOf: Date } | null;
  readonly result: string;
  readonly settledAt: Date | null;
  readonly isPublished: boolean;
  readonly generatedAt: Date;
  readonly modelVersion: string;
  readonly game: { readonly id: string; readonly sport: { readonly key: string } | null };
};

/** Structural transaction surface (mirrors zero-sit-lane.ts's doctrine). */
export type LineIntegrityTx = {
  pick: { updateMany(args: Record<string, unknown>): Promise<{ count: number }> };
  postSettlementWork: unknown;
  jarvisMemoryEvent: { create(args: Record<string, unknown>): Promise<unknown> };
  /** Withdraws the signal snapshot's outcome atomically with the VOID. */
  pickSignalSnapshot: { updateMany(args: Record<string, unknown>): Promise<{ count: number }> };
};

export type LineIntegrityDb = {
  pick: {
    findMany(args: Record<string, unknown>): Promise<LineIntegrityPickRow[]>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  odds: {
    findMany(args: Record<string, unknown>): Promise<
      Array<{
        id: string;
        bookmaker: string;
        fetchedAt: Date;
        spread: number | null;
        total: number | null;
      }>
    >;
  };
  jarvisMemoryEvent: {
    create(args: Record<string, unknown>): Promise<unknown>;
    count(args: Record<string, unknown>): Promise<number>;
    findMany(
      args: Record<string, unknown>,
    ): Promise<Array<{ metadata: unknown; created_at?: Date }>>;
  };
  $transaction(fn: (tx: LineIntegrityTx) => Promise<{ count: number }>): Promise<{ count: number }>;
};

export type LineIntegritySkipReason =
  | "MARKET_OUT_OF_SCOPE"
  | "ODDS_READ_FAILED"
  | "LINE_IS_QUOTED"
  /**
   * A SETTLED pick with no `clvLockLine` and no proof receipt. `line` is
   * rewritten on every refresh, so for such a row there is no trustworthy
   * record of WHICH line was published or WHEN — judging the current `line`
   * against quotes capped at `generatedAt` compares a possibly post-publish
   * value against pre-publish odds and can void a legitimately quoted pick
   * (Devin Review, #733). The lane refuses to guess.
   */
  | "NO_PUBLISH_LOCK"
  /**
   * PENDING half only: no book has quoted this game and market inside the
   * freshness window, so there is no CURRENT board to judge the displayed line
   * against. Skipped, never unpublished — a quiet feed is missing evidence, and
   * unpublishing on it would let one ingestion outage clear the board.
   */
  | "NO_FRESH_QUOTES"
  /** The route deadline was reached before this pick's read or write. */
  | "DEADLINE_REACHED"
  | "WRITE_RACE_LOST"
  | "WRITE_FAILED";

export type LineIntegrityAction = {
  readonly pickId: string;
  readonly gameId: string;
  readonly sportKey: string;
  readonly pickType: string;
  readonly defect: LineIntegrityDefectKind;
  readonly storedLine: number;
  /** The value the verdict was actually about (lock/receipt, or displayed line). */
  readonly judgedLine: number;
  readonly bookLine: number | null;
};

export type LineIntegrityHalfResult = {
  readonly enabled: boolean;
  /**
   * Candidates that reached a terminal decision this cycle — NOT the number
   * selected. A deadline break leaves the rest in `DEADLINE_REACHED`, and the
   * two reconcile: `inspected + DEADLINE_REACHED === candidates selected`.
   * Naming this after the wider number is the C-241/C-246/C-250 defect class.
   */
  inspected: number;
  acted: number;
  capReached: boolean;
  /** The route deadline stopped this half before every candidate was handled. */
  deadlineHit: boolean;
  skippedByReason: Record<LineIntegritySkipReason, number>;
  actions: LineIntegrityAction[];
};

export type LineIntegrityLaneResult = {
  readonly lane: "line-integrity";
  readonly enabled: boolean;
  readonly voids: LineIntegrityHalfResult;
  readonly unpublished: LineIntegrityHalfResult;
};

const LINE_INTEGRITY_PICK_SELECT = {
  id: true,
  gameId: true,
  pickType: true,
  selection: true,
  line: true,
  clvLockLine: true,
  proofReceipt: { select: { line: true, asOf: true } },
  result: true,
  settledAt: true,
  isPublished: true,
  generatedAt: true,
  modelVersion: true,
  game: { select: { id: true, sport: { select: { key: true } } } },
} as const;

function emptySkips(): Record<LineIntegritySkipReason, number> {
  return {
    MARKET_OUT_OF_SCOPE: 0,
    ODDS_READ_FAILED: 0,
    LINE_IS_QUOTED: 0,
    NO_PUBLISH_LOCK: 0,
    NO_FRESH_QUOTES: 0,
    DEADLINE_REACHED: 0,
    WRITE_RACE_LOST: 0,
    WRITE_FAILED: 0,
  };
}

function emptyHalf(enabled: boolean): LineIntegrityHalfResult {
  return {
    enabled,
    inspected: 0,
    acted: 0,
    capReached: false,
    deadlineHit: false,
    skippedByReason: emptySkips(),
    actions: [],
  };
}

/**
 * Read the books' quoted lines for one pick, as of publish time.
 *
 * `lte: generatedAt` is the "at or before publish" bound: a line a book posted
 * AFTER we published cannot justify what we published.
 */
async function readQuotesAtPublish(
  db: LineIntegrityDb,
  row: LineIntegrityPickRow,
  market: LineIntegrityMarket,
  asOf: Date,
  /**
   * Lower bound on `fetchedAt`, for the PENDING half only (Devin Review, #733).
   *
   * The settled half reconstructs the board as it stood at publish time, where
   * the oldest surviving row per book is exactly the right answer. The pending
   * half asks a different question — is this line placeable on the board RIGHT
   * NOW — and with no lower bound `latestQuotePerBookmaker` happily treats a
   * book's three-week-old row as its current quote. An obsolete matching line
   * then vouches for a pick every live book has moved away from, keeping an
   * unplaceable pick published: the precise failure this half exists to end.
   */
  freshSince?: Date,
): Promise<LineIntegrityQuote[]> {
  const rows = await db.odds.findMany({
    where: {
      gameId: row.gameId,
      market: PICK_MARKET_TO_ODDS_MARKET[market],
      fetchedAt: freshSince ? { lte: asOf, gte: freshSince } : { lte: asOf },
    },
    select: { id: true, bookmaker: true, fetchedAt: true, spread: true, total: true },
  });
  const all: LineIntegrityQuote[] = rows.map((o) => ({
    id: o.id,
    bookmaker: o.bookmaker,
    fetchedAt: o.fetchedAt,
    line: market === "SPREAD" ? o.spread : o.total,
  }));
  // One snapshot per real book, never the union of history. See
  // latestQuotePerBookmaker for why matching against every earlier row fails open.
  return latestQuotePerBookmaker(all, asOf);
}

export type LineIntegrityJudgedVerdict = Extract<LineIntegrityVerdict, { kind: "defect" }> & {
  readonly judgedLine: number;
  readonly basis: string;
};

export function buildLineIntegrityPayload(args: {
  readonly row: LineIntegrityPickRow;
  readonly verdict: LineIntegrityJudgedVerdict;
  readonly decidedAt: Date;
}): Record<string, unknown> {
  const { row, verdict, decidedAt } = args;
  return {
    schemaVersion: LINE_INTEGRITY_EVENT_SCHEMA_VERSION,
    lane: "line-integrity",
    actor: LINE_INTEGRITY_ACTOR,
    policyRef: LINE_INTEGRITY_POLICY_REF,
    rcaCode: LINE_INTEGRITY_RCA_CODE,
    decidedAt: decidedAt.toISOString(),
    reason:
      verdict.defect === "NO_QUOTE_ROWS"
        ? "No bookmaker quoted any line for this game and market at or before generatedAt, so the published line had no book basis."
        : "The stored line was not quoted by any bookmaker for this game and market at or before generatedAt.",
    evidence: {
      defect: verdict.defect,
      /**
       * THE VALUE THIS VERDICT IS ABOUT, and how it was chosen. For a settled
       * pick that is the publication lock (or the proof receipt's line); for a
       * pending pick it is the line currently on display. Citing anything else
       * would make the evidence describe a number the decision did not use
       * (Devin Review, #733).
       */
      judgedLine: verdict.judgedLine,
      judgedBasis: verdict.basis,
      /** The current `line` column, which drifts on refresh; kept for forensics. */
      storedLine: row.line,
      clvLockLine: row.clvLockLine,
      proofReceiptLine: row.proofReceipt?.line ?? null,
      bookLine: verdict.bookLine,
      sourceIds: verdict.sourceIds,
      pickType: row.pickType,
      selection: row.selection,
      generatedAt: row.generatedAt.toISOString(),
      modelVersion: row.modelVersion,
      sportKey: row.game.sport?.key ?? "",
      // The result being withdrawn, and the settlement time being PRESERVED.
      priorResult: row.result,
      settledAt: row.settledAt ? row.settledAt.toISOString() : null,
    },
  };
}

/**
 * Durable, append-only record of one VOID. Shares the shape and scope of the
 * UNPUBLISH record below so the ops surface can count both from one store and
 * tell them apart by `metadata.action`.
 */
export function lineIntegrityVoidMemoryEvent(
  row: LineIntegrityPickRow,
  verdict: LineIntegrityJudgedVerdict,
  now: Date,
): Record<string, unknown> {
  const payload = buildLineIntegrityPayload({ row, verdict, decidedAt: now });
  const sportKey = row.game.sport?.key ?? "";
  const metadata = { ...payload, action: "VOID" };
  return {
    memory_type: "decision",
    memory_state: "confirmed",
    scope: LINE_INTEGRITY_MEMORY_SCOPE,
    title: `Line integrity: voided settled pick ${row.id}`,
    summary:
      `${sportKey} ${row.pickType} "${row.selection}": graded line ` +
      `${verdict.judgedLine} (${verdict.basis}) was not quoted by any bookmaker at or before ` +
      `${row.generatedAt.toISOString()} (nearest quoted ${verdict.bookLine ?? "NONE"}). ` +
      `Prior result ${row.result} WITHDRAWN to VOID by the settle-picks cron under ` +
      `${LINE_INTEGRITY_POLICY_REF}. settledAt preserved; the original grading ` +
      `PickSettlementEvent is untouched.`,
    full_text: JSON.stringify(metadata),
    source_type: "cron",
    source_ref: "settle-picks:line-integrity",
    source_timestamp: now,
    actor: LINE_INTEGRITY_ACTOR,
    owner: "system",
    confidence: 100,
    tags: ["line-integrity", "void", sportKey, row.pickType],
    metadata,
  };
}

/**
 * Durable, append-only record of one UNPUBLISH. The unpublish half writes no
 * PickSettlementEvent (nothing was settled), so without this the action would
 * leave no trace and the ops surface could not count it — exactly the same
 * reason the zero-sit stale half writes one (zero-sit-lane.ts).
 */
export function lineIntegrityUnpublishMemoryEvent(
  row: LineIntegrityPickRow,
  verdict: LineIntegrityJudgedVerdict,
  now: Date,
): Record<string, unknown> {
  const sportKey = row.game.sport?.key ?? "";
  const metadata = {
    action: "UNPUBLISH",
    rcaCode: LINE_INTEGRITY_RCA_CODE,
    defect: verdict.defect,
    lane: "line-integrity",
    actor: LINE_INTEGRITY_ACTOR,
    policy: LINE_INTEGRITY_POLICY_REF,
    pickId: row.id,
    gameId: row.gameId,
    sportKey,
    pickType: row.pickType,
    modelVersion: row.modelVersion,
    judgedLine: verdict.judgedLine,
    judgedBasis: verdict.basis,
    storedLine: row.line,
    bookLine: verdict.bookLine,
    sourceIds: verdict.sourceIds,
    generatedAt: row.generatedAt.toISOString(),
    unpublishedAt: now.toISOString(),
  };
  return {
    memory_type: "decision",
    memory_state: "confirmed",
    scope: LINE_INTEGRITY_MEMORY_SCOPE,
    title: `Line integrity: unpublished pick ${row.id}`,
    summary:
      `${sportKey} ${row.pickType} "${row.selection}": displayed line ${verdict.judgedLine} ` +
      `(${verdict.basis}) is not quoted by any bookmaker on the current board ` +
      `(nearest quoted ${verdict.bookLine ?? "NONE"}). ` +
      `isPublished set false by the settle-picks cron under ${LINE_INTEGRITY_POLICY_REF}. ` +
      `Row kept, result untouched.`,
    full_text: JSON.stringify(metadata),
    source_type: "cron",
    source_ref: "settle-picks:line-integrity",
    source_timestamp: now,
    actor: LINE_INTEGRITY_ACTOR,
    owner: "system",
    confidence: 100,
    tags: ["line-integrity", "unpublish", sportKey, row.pickType],
    metadata,
  };
}

/**
 * Inspect one candidate and return its verdict, or null when it must be
 * skipped. Shared by both halves so the two can never diverge on what counts
 * as the defect (the sibling-lane pattern this repo keeps hitting).
 */
/**
 * Which line to judge, against odds as of when — and it is NOT the same
 * question for the two halves (Devin Review, #733).
 *
 * SETTLED ("what did we grade?"): the pick's result rests on the line that was
 * locked at publication, so judge `clvLockLine` against the board as it stood
 * at `generatedAt`. A legacy row with no lock has no trustworthy record of
 * which line was published — `line` is rewritten on every refresh — so it is
 * rescued only by an immutable proof receipt (its own `line` at its own
 * `asOf`), and otherwise SKIPPED as NO_PUBLISH_LOCK rather than judged on a
 * possibly post-publish value against pre-publish odds.
 *
 * PENDING ("what are we showing?"): nothing has been graded. The member is
 * looking at `line` right now and would try to place THAT, so judge the
 * displayed line against the CURRENT board. Judging the lock here would leave
 * a presently unplaceable pick published because its publish-time lock was
 * fine — the opposite of what this lane is for.
 */
export type LineIntegrityJudgement =
  | { readonly kind: "judge"; readonly line: number; readonly asOf: Date; readonly basis: string }
  | { readonly kind: "skip"; readonly reason: Extract<LineIntegritySkipReason, "NO_PUBLISH_LOCK"> };

export function judgementFor(
  row: LineIntegrityPickRow,
  mode: LineIntegrityHalfName,
  now: Date,
): LineIntegrityJudgement {
  if (mode === "unpublish") {
    return { kind: "judge", line: row.line, asOf: now, basis: "displayed_line_now" };
  }
  if (row.clvLockLine !== null && row.clvLockLine !== undefined) {
    return { kind: "judge", line: row.clvLockLine, asOf: row.generatedAt, basis: "clv_lock_at_publish" };
  }
  if (row.proofReceipt) {
    return {
      kind: "judge",
      line: row.proofReceipt.line,
      asOf: row.proofReceipt.asOf,
      basis: "proof_receipt_at_as_of",
    };
  }
  return { kind: "skip", reason: "NO_PUBLISH_LOCK" };
}

async function verdictFor(
  db: LineIntegrityDb,
  row: LineIntegrityPickRow,
  half: LineIntegrityHalfResult,
  mode: LineIntegrityHalfName,
  now: Date,
): Promise<
  | (Extract<LineIntegrityVerdict, { kind: "defect" }> & { judgedLine: number; basis: string })
  | null
> {
  const market = LINE_INTEGRITY_MARKETS.find((m) => m === row.pickType);
  if (!market) {
    half.skippedByReason.MARKET_OUT_OF_SCOPE += 1;
    return null;
  }
  const judgement = judgementFor(row, mode, now);
  if (judgement.kind === "skip") {
    half.skippedByReason[judgement.reason] += 1;
    return null;
  }
  let quotes: LineIntegrityQuote[];
  try {
    quotes = await readQuotesAtPublish(
      db,
      row,
      market,
      judgement.asOf,
      // PENDING only: judge the displayed line against the CURRENT board, not
      // against whatever each book last said at any point in history.
      ...(mode === "unpublish"
        ? [new Date(judgement.asOf.getTime() - LINE_INTEGRITY_PENDING_FRESHNESS_MS)]
        : []),
    );
  } catch (err) {
    // Nothing is voided on missing evidence.
    console.warn(
      `[line-integrity] ODDS_READ_FAILED pick=${row.id} game=${row.gameId}: ` +
        (err instanceof Error ? err.message : String(err)),
    );
    half.skippedByReason.ODDS_READ_FAILED += 1;
    return null;
  }
  // A pending pick with NO fresh quote at all is not evidence of a defect, it
  // is absence of evidence, and the lane never acts on that. NO_QUOTE_ROWS
  // stays a defect for the SETTLED half, where "no book ever quoted this at
  // publish time" is a real and permanent finding about a published pick.
  if (mode === "unpublish" && quotes.length === 0) {
    half.skippedByReason.NO_FRESH_QUOTES += 1;
    return null;
  }
  const verdict = classifyStoredLine(judgement.line, quotes);
  if (verdict.kind === "ok") {
    half.skippedByReason.LINE_IS_QUOTED += 1;
    return null;
  }
  return { ...verdict, judgedLine: judgement.line, basis: judgement.basis };
}

function record(half: LineIntegrityHalfResult, row: LineIntegrityPickRow, verdict: LineIntegrityJudgedVerdict): void {
  half.acted += 1;
  if (half.actions.length < SAMPLE_CAP) {
    half.actions.push({
      pickId: row.id,
      gameId: row.gameId,
      sportKey: row.game.sport?.key ?? "",
      pickType: row.pickType,
      defect: verdict.defect,
      storedLine: row.line,
      judgedLine: verdict.judgedLine,
      bookLine: verdict.bookLine,
    });
  }
}

/**
 * VOID half: settled published picks whose stored line was never quoted.
 *
 * The pick write NEVER touches `settledAt`. The update is scoped to the exact
 * result the candidate was read at, so a race loser writes nothing and a second
 * run finds the row already VOID and no longer selects it.
 */
export async function voidDefectiveSettledPicks(input: {
  readonly db: LineIntegrityDb;
  readonly now?: Date;
  readonly cap?: number;
  readonly enabled?: boolean;
  /** `?sport=` scope, exactly as the free, backfill and zero-sit lanes take it. */
  readonly sportKey?: string | null;
  /** Route deadline (epoch ms); the lane stops before its next read or write. */
  readonly deadlineAtMs?: number;
  /** Wall clock for the deadline check (tests inject one). */
  readonly clock?: () => number;
}): Promise<LineIntegrityHalfResult> {
  const enabled = input.enabled ?? lineIntegrityVoidEnabled();
  const half = emptyHalf(enabled);
  if (!enabled) return half;

  const now = input.now ?? new Date();
  const cap = input.cap ?? LINE_INTEGRITY_VOID_CAP;
  const clock = input.clock ?? ((): number => Date.now());
  const pastDeadline = (): boolean =>
    input.deadlineAtMs !== undefined && clock() >= input.deadlineAtMs;
  const key = cursorKey("void", input.sportKey);
  const cursor = await readCursor(input.db, key);
  const rows = await input.db.pick.findMany({
    where: {
      isPublished: true,
      result: { in: ["WIN", "LOSS", "PUSH"] },
      pickType: { in: [...LINE_INTEGRITY_MARKETS] },
      // A sport-scoped cycle must not touch another sport's picks (Devin
      // Review, #733): every sibling lane scopes, this one did not.
      ...(input.sportKey ? { game: { sport: { key: input.sportKey } } } : {}),
    },
    orderBy: [{ id: "asc" }],
    // Resume after the last row inspected, so clean rows cannot hold the
    // oldest page forever and starve defects behind them. See readCursor.
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: cap + 1,
    select: LINE_INTEGRITY_PICK_SELECT,
  });
  half.capReached = rows.length > cap;
  const candidates = rows.slice(0, cap);
  // The cursor is written AFTER the loop, from the last row actually handled.
  // See sweepCursorTarget: writing it here skipped everything behind a deadline
  // break for a whole wrap of the population.
  let lastHandledIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i]!;
    // Deadline before every odds read AND every write; the row is untouched
    // and the next cycle re-inspects it (the lane is idempotent).
    if (pastDeadline()) {
      half.deadlineHit = true;
      half.skippedByReason.DEADLINE_REACHED += candidates.length - i;
      break;
    }
    const verdict = await verdictFor(input.db, row, half, "void", now);
    if (!verdict) {
      lastHandledIndex = i;
      continue;
    }
    if (pastDeadline()) {
      half.deadlineHit = true;
      // This row AND every candidate behind it. Counting only this one left the
      // rest in no bucket at all, so `inspected + DEADLINE_REACHED` did not
      // reconcile to the candidates the sweep selected.
      half.skippedByReason.DEADLINE_REACHED += candidates.length - i;
      break;
    }
    // From here the row reaches a terminal decision on every path — written,
    // race lost, or write failed — so the cursor may pass it.
    lastHandledIndex = i;
    let written: { count: number };
    try {
      written = await input.db.$transaction(async (tx) => {
        // Scoped to the result we READ. settledAt is deliberately absent from
        // `data`: the pick was settled when it was settled.
        const updated = await tx.pick.updateMany({
          where: { id: row.id, result: row.result, isPublished: true },
          data: { result: "VOID" },
        });
        if (updated.count === 0) return updated;
        // NOT a PickSettlementEvent. `PickSettlementEvent.pickId` is @unique
        // (schema.prisma) — one event per pick, for all time — and an ALREADY
        // SETTLED pick necessarily owns one already, written by the grader that
        // settled it. Creating a second violates the constraint, rolls the whole
        // transaction back, and lands in the catch below as WRITE_FAILED: the
        // first version of this lane could not void a single pick, and the unit
        // tests passed only because the test double did not enforce the
        // constraint the database does (Devin Review, #733).
        //
        // The withdrawal is therefore recorded as an append-only
        // JarvisMemoryEvent, the same durable store the UNPUBLISH half below
        // uses. That LEAVES THE ORIGINAL GRADING EVENT INTACT, which is the
        // right outcome regardless: the grader's evidence for how this pick was
        // settled is history, and a withdrawal is a new fact about it, not a
        // correction of it. Adding a table or relaxing the constraint is not
        // available — law 2 freezes schema.prisma.
        await tx.jarvisMemoryEvent.create({
          data: lineIntegrityVoidMemoryEvent(row, verdict, now),
        });
        // WITHDRAW THE SIGNAL SNAPSHOT'S OUTCOME HERE, IN THIS TRANSACTION.
        //
        // A CORRECTION TO WHAT THIS COMMENT USED TO SAY (Devin Review, #733).
        // It claimed the reopened SNAPSHOT_OUTCOME work would rewrite the
        // snapshot because "drainPendingSnapshotOutcomes treats VOID as a real
        // result". The first half is true and the second half is not, and I
        // asserted it without reading the writer. `recordPickSettlementSnapshot`
        // updates `where: { pickId, settlementResult: null }`; an already-graded
        // pick's snapshot has a non-null result, so the update matches nothing,
        // the findUnique fallback returns "already-settled", and the work row is
        // marked DONE having changed NOTHING. The snapshot would keep the old
        // WIN or LOSS, with `eligibleForLearning` still true, for a pick the
        // record now says was withdrawn.
        //
        // WHAT THAT WOULD AND WOULD NOT HAVE REACHED, stated exactly rather
        // than at the scale it first appears. Both calibration crons
        // (calibration-metrics, backtest-calibration) and the gate slate also
        // filter `pick.result in [WIN, LOSS(, PUSH)]`, so a VOID pick drops out
        // there on its own and the published calibration numbers were never
        // exposed. What was exposed is the snapshot store itself: the admin
        // dashboard's `snapshots.learningEligible` counts snapshots WITHOUT
        // joining the pick, so it would have counted withdrawn picks as
        // learning-eligible — and, more simply, the row pair would contradict
        // itself, Pick saying VOID while its snapshot said LOSS.
        //
        // So the withdrawal is written directly, atomically with the VOID, and
        // does not depend on a drain running later. `learningEligibleAt` is
        // cleared with the flag; leaving a timestamp on a record that is no
        // longer eligible is the kind of half-truth this lane exists to remove.
        await tx.pickSignalSnapshot.updateMany({
          where: { pickId: row.id },
          data: { settlementResult: "VOID", eligibleForLearning: false, learningEligibleAt: null },
        });
        // SNAPSHOT_OUTCOME work is still enqueued and reopened, and it is NOT
        // redundant: it covers the pick that has NO snapshot row at all, where
        // the updateMany above matches nothing and the drain's create-fallback
        // path writes one with the VOID outcome. Where a row does exist the
        // drain now finds it already withdrawn and completes as a no-op.
        //
        // Deliberately NOT CLV_GRADE.
        //
        // CLV IS DIFFERENT AND MUST NOT BE REOPENED. CLV is a claim about a bet
        // that stood; a withdrawn pick has none. An earlier revision of this
        // lane reopened it, and because the CLV drain accepted any non-PENDING
        // result that would have MINTED a fresh public CLV verdict for a pick
        // we had just retracted (Devin Review, #733). The existing verdict is
        // left on the row as history and filtered out of every public sample by
        // loadPublicClvPolicy instead.
        const workDelegate = tx.postSettlementWork as unknown as PostSettlementWorkDelegate;
        await enqueuePostSettlementWork(workDelegate, [
          { subjectId: row.id, kind: "SNAPSHOT_OUTCOME" },
        ]);
        await reopenPostSettlementWork(workDelegate, row.id, ["SNAPSHOT_OUTCOME"]);
        return updated;
      });
    } catch (err) {
      // Per-pick isolation: one poison row must not stop the cycle.
      console.warn(
        `[line-integrity] WRITE_FAILED pick=${row.id} game=${row.gameId}: ` +
          (err instanceof Error ? err.message : String(err)),
      );
      half.skippedByReason.WRITE_FAILED += 1;
      continue;
    }
    if (written.count === 0) {
      half.skippedByReason.WRITE_RACE_LOST += 1;
      continue;
    }
    record(half, row, verdict);
    console.warn(
      `[line-integrity] VOID pick=${row.id} game=${row.gameId} rca=${LINE_INTEGRITY_RCA_CODE} ` +
        `stored=${row.line} book=${verdict.bookLine ?? "NONE"}`,
    );
  }
  half.inspected = lastHandledIndex + 1;
  const target = sweepCursorTarget({
    candidateIds: candidates.map((c) => c.id),
    lastHandledIndex,
    capReached: half.capReached,
  });
  if (target.write) await writeCursor(input.db, key, target.pickId, now);
  return half;
}

/**
 * UNPUBLISH half: unsettled published picks with the same defect.
 *
 * Nothing is deleted and the result stays PENDING — the zero-sit lane still
 * owns grading or voiding it. The write is scoped to isPublished=true and
 * result PENDING, so a second run selects nothing.
 */
export async function unpublishDefectiveUnsettledPicks(input: {
  readonly db: LineIntegrityDb;
  readonly now?: Date;
  readonly cap?: number;
  readonly enabled?: boolean;
  /** `?sport=` scope, exactly as the free, backfill and zero-sit lanes take it. */
  readonly sportKey?: string | null;
  /** Route deadline (epoch ms); the lane stops before its next read or write. */
  readonly deadlineAtMs?: number;
  /** Wall clock for the deadline check (tests inject one). */
  readonly clock?: () => number;
}): Promise<LineIntegrityHalfResult> {
  const enabled = input.enabled ?? lineIntegrityVoidEnabled();
  const half = emptyHalf(enabled);
  if (!enabled) return half;

  const now = input.now ?? new Date();
  const cap = input.cap ?? LINE_INTEGRITY_UNPUBLISH_CAP;
  const clock = input.clock ?? ((): number => Date.now());
  const pastDeadline = (): boolean =>
    input.deadlineAtMs !== undefined && clock() >= input.deadlineAtMs;
  const key = cursorKey("unpublish", input.sportKey);
  const cursor = await readCursor(input.db, key);
  const rows = await input.db.pick.findMany({
    where: {
      isPublished: true,
      result: "PENDING",
      pickType: { in: [...LINE_INTEGRITY_MARKETS] },
      ...(input.sportKey ? { game: { sport: { key: input.sportKey } } } : {}),
    },
    orderBy: [{ id: "asc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: cap + 1,
    select: LINE_INTEGRITY_PICK_SELECT,
  });
  half.capReached = rows.length > cap;
  const candidates = rows.slice(0, cap);
  // Cursor after the loop, from the last row handled. See sweepCursorTarget.
  let lastHandledIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i]!;
    if (pastDeadline()) {
      half.deadlineHit = true;
      half.skippedByReason.DEADLINE_REACHED += candidates.length - i;
      break;
    }
    const verdict = await verdictFor(input.db, row, half, "unpublish", now);
    if (!verdict) {
      lastHandledIndex = i;
      continue;
    }
    if (pastDeadline()) {
      half.deadlineHit = true;
      half.skippedByReason.DEADLINE_REACHED += candidates.length - i;
      break;
    }
    lastHandledIndex = i;
    let written: { count: number };
    try {
      written = await input.db.$transaction(async (tx) => {
        const updated = await tx.pick.updateMany({
          where: { id: row.id, result: "PENDING", isPublished: true },
          data: { isPublished: false },
        });
        // Append-only record IN THE SAME TRANSACTION: an unpublish with no
        // durable trace is one the ops surface cannot count and nobody can
        // audit.
        if (updated.count > 0) {
          await tx.jarvisMemoryEvent.create({
            data: lineIntegrityUnpublishMemoryEvent(row, verdict, now),
          });
        }
        return updated;
      });
    } catch (err) {
      console.warn(
        `[line-integrity] WRITE_FAILED (unpublish) pick=${row.id} game=${row.gameId}: ` +
          (err instanceof Error ? err.message : String(err)),
      );
      half.skippedByReason.WRITE_FAILED += 1;
      continue;
    }
    if (written.count === 0) {
      half.skippedByReason.WRITE_RACE_LOST += 1;
      continue;
    }
    record(half, row, verdict);
    console.warn(
      `[line-integrity] UNPUBLISH pick=${row.id} game=${row.gameId} ` +
        `stored=${row.line} book=${verdict.bookLine ?? "NONE"}`,
    );
  }
  half.inspected = lastHandledIndex + 1;
  const target = sweepCursorTarget({
    candidateIds: candidates.map((c) => c.id),
    lastHandledIndex,
    capReached: half.capReached,
  });
  if (target.write) await writeCursor(input.db, key, target.pickId, now);
  return half;
}

/** Both halves. Unpublish first: it is the cheaper write and stops the bleed. */
export async function runLineIntegrityLane(input: {
  readonly db: LineIntegrityDb;
  readonly now?: Date;
  readonly enabled?: boolean;
  /** `?sport=` scope from the route; null/undefined means every sport. */
  readonly sportKey?: string | null;
  /** Route deadline (epoch ms, lineIntegrityDeadline). */
  readonly deadlineAtMs?: number;
  readonly clock?: () => number;
}): Promise<LineIntegrityLaneResult> {
  const enabled = input.enabled ?? lineIntegrityVoidEnabled();
  const budget = {
    ...(input.deadlineAtMs !== undefined ? { deadlineAtMs: input.deadlineAtMs } : {}),
    ...(input.clock ? { clock: input.clock } : {}),
  };
  const unpublished = await unpublishDefectiveUnsettledPicks({
    db: input.db,
    enabled,
    sportKey: input.sportKey ?? null,
    ...budget,
    ...(input.now ? { now: input.now } : {}),
  });
  const voids = await voidDefectiveSettledPicks({
    db: input.db,
    enabled,
    sportKey: input.sportKey ?? null,
    ...budget,
    ...(input.now ? { now: input.now } : {}),
  });
  return { lane: "line-integrity", enabled, voids, unpublished };
}

// ── Read-only survey for the ops truth surface (C-283) ──────────────────────

/**
 * Cap on the picks the survey inspects against the odds table per call. The
 * exact rule needs one odds read per pick, so the survey reports how many it
 * INSPECTED alongside every exact count; a count whose denominator is not
 * stated is the C-241/C-246/C-250 defect class.
 */
export const LINE_INTEGRITY_SURVEY_CAP = 300;

/**
 * Total odds reads one survey call may spend, across BOTH halves.
 *
 * Each candidate costs one sequential `db.odds.findMany`, so an uncapped survey
 * at cap 300 per half was up to 600 serial round-trips on a single request
 * (CodeRabbit, #733). The budget is shared, not per-half, so the ceiling is the
 * number stated here rather than twice it, and whichever half runs first cannot
 * silently starve the other of its whole allowance — the settled half is the
 * one the flip reads, so it is surveyed FIRST.
 */
export const LINE_INTEGRITY_SURVEY_ODDS_BUDGET = 240;

/**
 * COMPLETENESS, and why the sampled counts alone could never establish it
 * (Devin Review, #733).
 *
 * The flip precondition was documented as "`remainingToVoid` reads 0 with
 * `remainingCapReached` false". `surveyHalf` selects EVERY published settled
 * SPREAD/TOTAL pick, clean ones included, and production holds thousands, so
 * `remainingCapReached` is true on every call and always will be: remediation
 * only removes DEFECTIVE picks from that population (by making them VOID), and
 * the clean majority stays forever. The precondition was therefore unreachable
 * — the deliverable's own exit condition could not be satisfied by any amount
 * of correct remediation. It is the C-276 defect one level up: there the ACTING
 * half could never finish its page, here the COUNT can never cover its
 * population.
 *
 * A capped page cannot prove a negative about an uncapped population, and
 * loading the whole population per request is exactly the unbounded work the
 * survey was just told to stop doing. So the proof comes from the actor, not
 * the counter: the void half already walks the ENTIRE population with a durable
 * cursor that resets on exhaustion. Two consecutive resets bracket one complete
 * pass over every settled pick, and if no VOID was recorded between them, the
 * lane has looked at all of them and found nothing.
 *
 * That is a real completeness claim, it costs three cheap indexed reads and no
 * odds joins, and — stated plainly because it matters — it requires the lane to
 * have RUN. While `LINE_INTEGRITY_VOID_ENABLED` is off there are no wrap
 * markers and `voidSweepComplete` is false, which is the honest answer: nothing
 * has swept, so nothing is established.
 */
export type LineIntegritySweepCompleteness = {
  /** When the void half last finished a pass over the whole population. */
  lastWrapAt: string | null;
  /** The wrap before it. Two are needed to bracket one complete pass. */
  priorWrapAt: string | null;
  /**
   * VOIDs recorded between those two wraps — i.e. during one complete pass.
   * `null` when fewer than two wraps exist, which is NOT the same as 0 and must
   * never be rendered as it.
   */
  voidsInLastCompleteSweep: number | null;
  /**
   * True only when a complete pass has happened and acted on nothing. This, not
   * a capped sample, is what the flip is entitled to rely on.
   */
  voidSweepComplete: boolean;
};

async function loadSweepCompleteness(db: LineIntegrityDb): Promise<LineIntegritySweepCompleteness> {
  const empty: LineIntegritySweepCompleteness = {
    lastWrapAt: null,
    priorWrapAt: null,
    voidsInLastCompleteSweep: null,
    voidSweepComplete: false,
  };
  // The UNSCOPED void cursor only. A `?sport=` run walks a different
  // population, so its wraps say nothing about the whole board.
  const wraps = await db.jarvisMemoryEvent.findMany({
    where: {
      scope: LINE_INTEGRITY_CURSOR_SCOPE,
      metadata: { path: ["half"], equals: cursorKey("void", null) },
    },
    orderBy: { created_at: "desc" },
    take: 40,
    select: { metadata: true, created_at: true },
  });
  const wrapTimes = wraps
    .filter((w) => (w.metadata as { wrapped?: unknown } | null)?.wrapped === true)
    .map((w) => w.created_at)
    .filter((d): d is Date => d instanceof Date);
  if (wrapTimes.length === 0) return empty;
  const lastWrapAt = wrapTimes[0]!;
  if (wrapTimes.length < 2) {
    return { ...empty, lastWrapAt: lastWrapAt.toISOString() };
  }
  const priorWrapAt = wrapTimes[1]!;
  const voids = await db.jarvisMemoryEvent.count({
    where: {
      scope: LINE_INTEGRITY_MEMORY_SCOPE,
      metadata: { path: ["action"], equals: "VOID" },
      created_at: { gt: priorWrapAt, lte: lastWrapAt },
    },
  });
  return {
    lastWrapAt: lastWrapAt.toISOString(),
    priorWrapAt: priorWrapAt.toISOString(),
    voidsInLastCompleteSweep: voids,
    voidSweepComplete: voids === 0,
  };
}

/**
 * Wall-clock the lane leaves the settle-picks route after it stops.
 *
 * The lane runs at step 3c, AFTER zero-sit and BEFORE the slate freeze and the
 * outbox drain — steps that must run every cycle. A full page is up to 250
 * SEQUENTIAL odds reads (50 void + 200 unpublish), so without a budget the
 * lane can consume the route's remaining 300s `maxDuration` and starve the
 * settlement work it exists to protect (Devin Review, #733). A void lane that
 * starves settlement breaks the thing it is protecting.
 *
 * The route passes the SAME absolute deadline zero-sit uses, so the two lanes
 * share one tail reserve rather than each carving out their own.
 */
export function lineIntegrityDeadline(
  routeStartedAtMs: number,
  routeMaxDurationSeconds: number,
  tailReserveMs = 60_000,
): number {
  return routeStartedAtMs + routeMaxDurationSeconds * 1000 - tailReserveMs;
}

export type LineIntegrityBreakdown = { sportKey: string; pickType: string; count: number };

export type LineIntegritySurvey = {
  /**
   * Currently published UNSETTLED SPREAD/TOTAL picks whose GRADING line
   * (clvLockLine ?? line) is off the half-point grid, or is an MLB spread that
   * is not +/-1.5, 2.5 or 3.5 — counted over the rows this call inspected, NOT
   * over the whole population.
   *
   * It carries its own denominator and cap flag for the same reason every
   * other count here does. An earlier revision documented this as an "EXACT
   * count" while computing it over the first `cap` rows, which is precisely the
   * label-does-not-match-the-measurement defect this block exists to avoid
   * (C-241/C-246/C-250, Devin Review #733).
   *
   * Needs no odds join, so it is a cheap LOWER BOUND on the real defect within
   * that sample: off-grid is certainly not a book line, but a line ON the grid
   * may still never have been quoted. Never report it as
   * `publishedUnsettledNotQuoted`.
   */
  publishedUnsettledOffGridOrBadRunline: number;
  publishedUnsettledOffGridOrBadRunlineInspected: number;
  publishedUnsettledOffGridOrBadRunlineCapReached: boolean;
  publishedUnsettledOffGridOrBadRunlineBy: LineIntegrityBreakdown[];
  /**
   * Currently published UNSETTLED SPREAD/TOTAL picks inspected against the
   * odds table this call, and how many of those carried a line no bookmaker
   * quoted for that game and market at or before generatedAt. EXACT over
   * `publishedUnsettledInspected` rows; `publishedUnsettledCapReached` true
   * means more exist than were inspected and the count is a floor.
   */
  publishedUnsettledInspected: number;
  publishedUnsettledNotQuoted: number;
  publishedUnsettledCapReached: boolean;
  /**
   * SETTLED published SPREAD/TOTAL picks inspected against the odds table this
   * call, and how many the VOID half would act on right now. This is the
   * "remaining to void" figure. EXACT over `remainingInspected` rows;
   * `remainingCapReached` true means the count is a floor, not a total.
   *
   * IT IS A SPOT CHECK, NOT A COMPLETENESS PROOF. `remainingCapReached` is true
   * on every production call and always will be — the settled population is
   * thousands of picks and remediation only removes the defective ones — so a
   * `remainingToVoid` of 0 here means "none in the oldest sampled page", never
   * "none anywhere". `sweep.voidSweepComplete` is the claim about the whole
   * population; see LineIntegritySweepCompleteness.
   */
  remainingInspected: number;
  remainingToVoid: number;
  remainingCapReached: boolean;
  /**
   * True when a half stopped early because the shared odds-read budget ran out.
   * The inspected denominators shrink with it, and `capReached` is set too, so
   * no count is ever reported as covering more than it did.
   */
  surveyBudgetExhausted: boolean;
  /** Whole-population completeness for the VOID half. The flip reads THIS. */
  sweep: LineIntegritySweepCompleteness;
  /**
   * Picks VOIDED by this lane: append-only memory events in its scope whose
   * metadata.action is VOID.
   *
   * NOT a PickSettlementEvent count: `PickSettlementEvent.pickId` is @unique and
   * a settled pick already owns its grading event, so the void half records the
   * withdrawal as a memory event and leaves that grading event intact. Counting
   * settlement events here would have read 0 forever.
   */
  voidedByLane: number;
  /** Picks UNPUBLISHED by this lane: same store, metadata.action UNPUBLISH. */
  unpublishedByLane: number;
  /** Whether the remediation lane is currently enabled. */
  laneEnabled: boolean;
  /** Whether the publish-time guard (C-281) is currently enabled. */
  publishGuardEnabled: boolean;
};

async function surveyHalf(
  db: LineIntegrityDb,
  args: {
    readonly where: Record<string, unknown>;
    readonly cap: number;
    readonly mode: LineIntegrityHalfName;
    readonly now: Date;
    /** Rows already loaded by the caller; skips a duplicate query. */
    readonly rows?: LineIntegrityPickRow[];
    readonly capReached?: boolean;
    /** Shared odds-read allowance; see LINE_INTEGRITY_SURVEY_ODDS_BUDGET. */
    readonly budget: { remaining: number };
  },
): Promise<{ inspected: number; defective: number; capReached: boolean; budgetExhausted: boolean }> {
  let rows = args.rows;
  let capReached = args.capReached;
  if (rows === undefined || capReached === undefined) {
    const loaded = await db.pick.findMany({
      where: { ...args.where, pickType: { in: [...LINE_INTEGRITY_MARKETS] } },
      orderBy: [{ generatedAt: "asc" }],
      take: args.cap + 1,
      select: LINE_INTEGRITY_PICK_SELECT,
    });
    capReached = loaded.length > args.cap;
    rows = loaded;
  }
  const candidates = rows.slice(0, args.cap);
  let defective = 0;
  let inspected = 0;
  let budgetExhausted = false;
  const scratch = emptyHalf(true);
  for (const row of candidates) {
    // The budget bounds the SEQUENTIAL odds reads, which are the whole cost of
    // this survey. Stopping short is reported, never silently folded into the
    // count: `inspected` is the denominator and it shrinks with the sample.
    if (args.budget.remaining <= 0) {
      budgetExhausted = true;
      break;
    }
    args.budget.remaining -= 1;
    inspected += 1;
    // Same question the acting half asks, so the count and the action can
    // never disagree about what counts as a defect.
    if (await verdictFor(db, row, scratch, args.mode, args.now)) defective += 1;
  }
  return {
    inspected,
    defective,
    // A sample cut short by the budget is just as incomplete as one cut short
    // by the cap, and the flag the operator reads must say so.
    capReached: Boolean(capReached) || budgetExhausted,
    budgetExhausted,
  };
}

/**
 * Read-only. Writes nothing, and is safe to call from the ops truth surface on
 * every request. Counts are labelled for exactly what they count.
 */
export async function surveyLineIntegrity(
  db: LineIntegrityDb,
  opts: {
    readonly cap?: number;
    readonly env?: NodeJS.ProcessEnv;
    readonly now?: Date;
    /** Shared odds-read allowance across both halves. */
    readonly oddsBudget?: number;
  } = {},
): Promise<LineIntegritySurvey> {
  const cap = opts.cap ?? LINE_INTEGRITY_SURVEY_CAP;
  const env = opts.env ?? process.env;

  const unsettledRows = await db.pick.findMany({
    where: {
      isPublished: true,
      result: "PENDING",
      pickType: { in: [...LINE_INTEGRITY_MARKETS] },
    },
    orderBy: [{ generatedAt: "asc" }],
    take: cap + 1,
    select: LINE_INTEGRITY_PICK_SELECT,
  });
  const offGridCapReached = unsettledRows.length > cap;
  const offGridInspected = unsettledRows.slice(0, cap);
  const byKey = new Map<string, LineIntegrityBreakdown>();
  let offGrid = 0;
  for (const row of offGridInspected) {
    const sportKey = row.game.sport?.key ?? "";
    // The DISPLAYED line: this block counts published UNSETTLED picks, and the
    // unpublish half judges what the member is looking at right now.
    const graded = row.line;
    if (!isOffHalfPointGrid(graded) && !isNonStandardRunline(sportKey, row.pickType, graded)) {
      continue;
    }
    offGrid += 1;
    const key = `${sportKey}|${row.pickType}`;
    const entry = byKey.get(key) ?? { sportKey, pickType: row.pickType, count: 0 };
    entry.count += 1;
    byKey.set(key, entry);
  }

  const now = opts.now ?? new Date();
  const budget = { remaining: opts.oddsBudget ?? LINE_INTEGRITY_SURVEY_ODDS_BUDGET };
  // SETTLED FIRST, deliberately. The budget is shared, and this is the half the
  // flip precondition reads; surveying it second would let the pending half
  // spend the whole allowance and leave the number that matters unmeasured.
  const settled = await surveyHalf(db, {
    where: { isPublished: true, result: { in: ["WIN", "LOSS", "PUSH"] } },
    cap,
    mode: "void",
    now,
    budget,
  });
  // `unsettledRows` above is the SAME query this half would run — same where,
  // same order, same take. Re-running it was one wasted round-trip per call
  // (CodeRabbit, #733).
  const unsettled = await surveyHalf(db, {
    where: { isPublished: true, result: "PENDING" },
    cap,
    mode: "unpublish",
    now,
    rows: unsettledRows,
    capReached: offGridCapReached,
    budget,
  });
  const sweep = await loadSweepCompleteness(db);

  const voidedByLane = await db.jarvisMemoryEvent.count({
    where: {
      scope: LINE_INTEGRITY_MEMORY_SCOPE,
      metadata: { path: ["action"], equals: "VOID" },
    },
  });
  const unpublishedByLane = await db.jarvisMemoryEvent.count({
    where: {
      scope: LINE_INTEGRITY_MEMORY_SCOPE,
      metadata: { path: ["action"], equals: "UNPUBLISH" },
    },
  });

  return {
    publishedUnsettledOffGridOrBadRunline: offGrid,
    publishedUnsettledOffGridOrBadRunlineInspected: offGridInspected.length,
    publishedUnsettledOffGridOrBadRunlineCapReached: offGridCapReached,
    publishedUnsettledOffGridOrBadRunlineBy: [...byKey.values()].sort(
      (a, b) => b.count - a.count || a.sportKey.localeCompare(b.sportKey),
    ),
    publishedUnsettledInspected: unsettled.inspected,
    publishedUnsettledNotQuoted: unsettled.defective,
    publishedUnsettledCapReached: unsettled.capReached,
    remainingInspected: settled.inspected,
    remainingToVoid: settled.defective,
    remainingCapReached: settled.capReached,
    surveyBudgetExhausted: settled.budgetExhausted || unsettled.budgetExhausted,
    sweep,
    voidedByLane,
    unpublishedByLane,
    laneEnabled: lineIntegrityVoidEnabled(env),
    publishGuardEnabled:
      env["LINE_INTEGRITY_PUBLISH_GUARD_ENABLED"]?.trim().toLowerCase() === "true",
  };
}
