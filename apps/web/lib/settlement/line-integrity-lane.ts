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
 *   VOID half (voidDefectiveSettledPicks): a SETTLED, published pick whose
 *   stored line was not quoted by any bookmaker for that game and market at or
 *   before `generatedAt` has its result set to VOID through the same
 *   transactional outbox the graders use — one PickSettlementEvent carrying
 *   rcaCode LINE_NOT_QUOTED and the evidence, plus post-settlement work rows.
 *   The recorded result is WITHDRAWN, never rewritten in place to some other
 *   outcome, and `settledAt` is NEVER re-stamped: the pick was settled when it
 *   was settled, and moving that timestamp would falsify the settlement
 *   history the calibration loader reads. (This is the C-254/C-256/C-258
 *   settledAt-preservation rule.)
 *
 *   UNPUBLISH half (unpublishDefectiveUnsettledPicks): an UNSETTLED published
 *   pick with the same defect is set isPublished=false in one PENDING-scoped
 *   updateMany. Nothing is deleted; the result stays PENDING and the zero-sit
 *   lane still owns its eventual grading or void.
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
 * progress, and `remainingToVoid` — the founder's flip precondition — could
 * never reach 0.
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
  const metadata = { half, pickId, lane: "line-integrity", at: now.toISOString() };
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
    ): Promise<Array<{ metadata: unknown }>>;
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
): Promise<LineIntegrityQuote[]> {
  const rows = await db.odds.findMany({
    where: {
      gameId: row.gameId,
      market: PICK_MARKET_TO_ODDS_MARKET[market],
      fetchedAt: { lte: asOf },
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
    quotes = await readQuotesAtPublish(db, row, market, judgement.asOf);
  } catch (err) {
    // Nothing is voided on missing evidence.
    console.warn(
      `[line-integrity] ODDS_READ_FAILED pick=${row.id} game=${row.gameId}: ` +
        (err instanceof Error ? err.message : String(err)),
    );
    half.skippedByReason.ODDS_READ_FAILED += 1;
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
  half.inspected = candidates.length;
  // Advance, or reset when this sweep ran out of rows so the next one wraps.
  await writeCursor(input.db, key, half.capReached ? candidates[candidates.length - 1]!.id : null, now);

  for (const row of candidates) {
    // Deadline before every odds read AND every write; the row is untouched
    // and the next cycle re-inspects it (the lane is idempotent).
    if (pastDeadline()) {
      half.deadlineHit = true;
      half.skippedByReason.DEADLINE_REACHED += candidates.length - candidates.indexOf(row);
      break;
    }
    const verdict = await verdictFor(input.db, row, half, "void", now);
    if (!verdict) continue;
    if (pastDeadline()) {
      half.deadlineHit = true;
      half.skippedByReason.DEADLINE_REACHED += 1;
      break;
    }
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
        // SNAPSHOT_OUTCOME only, and deliberately NOT CLV_GRADE.
        //
        // Enqueue covers a pick that somehow has no row; REOPEN covers the
        // normal case, where the original settlement already marked it DONE and
        // `createMany({skipDuplicates})` would silently do nothing, leaving the
        // signal snapshot holding the outcome this withdrawal just removed.
        // `drainPendingSnapshotOutcomes` treats VOID as a real result and
        // rewrites the snapshot, which is what we want.
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
  half.inspected = candidates.length;
  await writeCursor(input.db, key, half.capReached ? candidates[candidates.length - 1]!.id : null, now);

  for (const row of candidates) {
    if (pastDeadline()) {
      half.deadlineHit = true;
      half.skippedByReason.DEADLINE_REACHED += candidates.length - candidates.indexOf(row);
      break;
    }
    const verdict = await verdictFor(input.db, row, half, "unpublish", now);
    if (!verdict) continue;
    if (pastDeadline()) {
      half.deadlineHit = true;
      half.skippedByReason.DEADLINE_REACHED += 1;
      break;
    }
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
   */
  remainingInspected: number;
  remainingToVoid: number;
  remainingCapReached: boolean;
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
  where: Record<string, unknown>,
  cap: number,
  mode: LineIntegrityHalfName,
  now: Date,
): Promise<{ inspected: number; defective: number; capReached: boolean }> {
  const rows = await db.pick.findMany({
    where: { ...where, pickType: { in: [...LINE_INTEGRITY_MARKETS] } },
    orderBy: [{ generatedAt: "asc" }],
    take: cap + 1,
    select: LINE_INTEGRITY_PICK_SELECT,
  });
  const capReached = rows.length > cap;
  const candidates = rows.slice(0, cap);
  let defective = 0;
  const scratch = emptyHalf(true);
  for (const row of candidates) {
    // Same question the acting half asks, so the count and the action can
    // never disagree about what counts as a defect.
    if (await verdictFor(db, row, scratch, mode, now)) defective += 1;
  }
  return { inspected: candidates.length, defective, capReached };
}

/**
 * Read-only. Writes nothing, and is safe to call from the ops truth surface on
 * every request. Counts are labelled for exactly what they count.
 */
export async function surveyLineIntegrity(
  db: LineIntegrityDb,
  opts: { readonly cap?: number; readonly env?: NodeJS.ProcessEnv; readonly now?: Date } = {},
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
  const unsettled = await surveyHalf(db, { isPublished: true, result: "PENDING" }, cap, "unpublish", now);
  const settled = await surveyHalf(
    db,
    { isPublished: true, result: { in: ["WIN", "LOSS", "PUSH"] } },
    cap,
    "void",
    now,
  );

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
    voidedByLane,
    unpublishedByLane,
    laneEnabled: lineIntegrityVoidEnabled(env),
    publishGuardEnabled:
      env["LINE_INTEGRITY_PUBLISH_GUARD_ENABLED"]?.trim().toLowerCase() === "true",
  };
}
