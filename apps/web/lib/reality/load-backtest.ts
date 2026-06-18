/**
 * Reality-engine backtest LOADER (Workstream A4 cockpit surface).
 *
 * WHAT THIS IS
 * The thin, never-throw server boundary between the live DB and the PURE
 * `runBacktest` aggregator in `apps/web/lib/reality/backtest.ts`.
 * It reads REAL settled, canonical, published picks (mirroring the same
 * canonical filter used by load-diagnostics.ts), maps each row to the
 * aggregator's `BacktestRecord` shape, and calls `runBacktest`. The cockpit
 * page (`/cockpit/reality`) renders the result alongside the diagnostics panel.
 *
 * WHY IT IS SAFE
 * - It REUSES the aggregator; it re-implements no scoring, no CLV math, no counting.
 * - It is READ-ONLY: it never writes, flips a gate, or touches scoring.
 * - It NEVER throws. Any DB error, stub mode, or unreachable database degrades to a
 *   labeled honest-empty report (`dataMode: "unavailable"`) — never a fabricated
 *   number, never a silent zero presented as confidence.
 * - It changes NO public behavior, NO schema, NO gate. This is an internal,
 *   admin-gated mirror of the offline A4 backtest.
 *
 * HONESTY (non-negotiable)
 * - When the DB is reachable but empty, the report is honest-empty with
 *   `dataMode: "live"` (we really observed zero settled records).
 * - When the DB is unreachable / in stub mode, `dataMode: "unavailable"` and the
 *   report is `runBacktest([])` — which returns INSUFFICIENT_SAMPLE honestly.
 * - Optional fields on BacktestRecord that are not stored on the Pick table
 *   (nullProb, lineMovement, bookDispersion, bookCount, edgeDecision, freshness)
 *   are UNSET, not fabricated. The aggregator degrades honestly when they are absent.
 * - Raw win rate is NEVER presented as profit — the aggregator enforces the
 *   −110 break-even (52.38%) comparison and the caller renders it that way.
 */

import { db, Prisma } from "@sports/db";
import { runBacktest, type BacktestRecord, type BacktestReport } from "@/lib/reality/backtest";

/** Cap the read — the backtest is a rollup, not a per-row ledger. */
const BACKTEST_PICK_LIMIT = 5000;

/**
 * Whether the backtest was computed from a reachable DB (`live`) or degraded to the
 * honest-empty INSUFFICIENT_SAMPLE report because the DB was unreachable / in stub
 * mode (`unavailable`).
 */
export type BacktestDataMode = "live" | "unavailable";

/** The loader's return: the pure report plus data-provenance label and note. */
export interface BacktestLoadResult {
  /** Honest provenance — never claim "live" over a fabricated/empty stub read. */
  readonly dataMode: BacktestDataMode;
  /** ISO timestamp the report was loaded (for the cockpit "generated" stamp). */
  readonly loadedAtIso: string;
  /** Plain-language note explaining the data mode (esp. why it is unavailable). */
  readonly note: string;
  /** The pure backtest report (INSUFFICIENT_SAMPLE when dataMode is "unavailable"). */
  readonly report: BacktestReport;
}

/**
 * Field selection for the backtest read — only the columns `runBacktest` consumes.
 * Sport + commenceTime come from the joined Game. Optional backtest fields that are
 * not stored on the Pick row (nullProb, lineMovement, bookDispersion, bookCount,
 * edgeDecision, freshness) are intentionally NOT selected — never fabricated.
 */
const backtestPickSelect = Prisma.validator<Prisma.PickSelect>()({
  modelVersion: true,
  generatedAt: true,
  confidence: true,
  result: true,
  clvVerdict: true,
  clvValue: true,
  pickType: true,
  game: {
    select: {
      commenceTime: true,
      sport: { select: { key: true, name: true } },
    },
  },
});

type BacktestPick = Prisma.PickGetPayload<{ select: typeof backtestPickSelect }>;

/** Map the engine PickType enum to the aggregator's coarse market space. */
function marketOf(pickType: BacktestPick["pickType"]): string {
  switch (pickType) {
    case "SPREAD":
      return "SPREAD";
    case "TOTAL":
      return "TOTAL";
    case "MONEYLINE":
      return "MONEYLINE";
    default:
      return "OTHER";
  }
}

/** Map one settled Pick row to the aggregator's read-only BacktestRecord shape. */
function mapPickToBacktestRecord(pick: BacktestPick): BacktestRecord {
  return {
    modelVersion: pick.modelVersion ?? null,
    generatedAt: pick.generatedAt ? pick.generatedAt.toISOString() : null,
    confidence: typeof pick.confidence === "number" ? pick.confidence : null,
    result: pick.result,
    clvVerdict: pick.clvVerdict,
    clvValue: typeof pick.clvValue === "number" ? pick.clvValue : null,
    sport: pick.game.sport.key || pick.game.sport.name || null,
    market: marketOf(pick.pickType),
    // Optional enrichment fields (nullProb, lineMovement, bookDispersion, etc.) are
    // NOT stored on the Pick table — intentionally absent, never fabricated.
  };
}

/** A DB error that means "no reachable database" (degrade, not crash). */
function isDatabaseUnreachable(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "P1001" ||
    message.includes("Can't reach database server") ||
    message.includes("stub") ||
    message.includes("DATABASE_URL")
  );
}

/**
 * Read the canonical settled published picks for the backtest run.
 *
 * Mirrors the exact filter from load-diagnostics.ts: real WIN/LOSS/PUSH/VOID
 * results, published, non-bootstrap, excluding the seed model version.
 * Ordered chronologically (ascending generatedAt) so the backtest's holdout
 * split takes the chronological tail — the honest out-of-sample direction.
 * Returns null on ANY DB error so the caller can degrade to the honest-empty report.
 */
async function readSettledPicksForBacktest(): Promise<BacktestPick[] | null> {
  try {
    return await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      orderBy: { generatedAt: "asc" },
      take: BACKTEST_PICK_LIMIT,
      select: backtestPickSelect,
    });
  } catch {
    return null;
  }
}

/**
 * Load the reality backtest report from the live DB.
 *
 * NEVER THROWS. On any DB error / stub mode it returns a labeled honest-empty report
 * (`dataMode: "unavailable"`, `report: runBacktest([])` → INSUFFICIENT_SAMPLE) — so
 * the surface degrades to truthful empty states instead of crashing or fabricating
 * numbers. When the DB is reachable, every figure in the returned report traces to
 * real settled-pick rows or to an honest "insufficient sample" explanation.
 *
 * Raw win rate in the returned report is ALWAYS framed against the −110 break-even
 * (52.38%) by the aggregator itself — the caller must NOT reframe it as profit.
 * The holdout (out-of-sample) number is the honest one; in-sample is optimistic by
 * construction and is labeled as such.
 */
export async function loadRealityBacktest(now: Date = new Date()): Promise<BacktestLoadResult> {
  const loadedAtIso = now.toISOString();

  let picks: BacktestPick[] | null;
  try {
    picks = await readSettledPicksForBacktest();
  } catch (error) {
    // Defensive: the inner read already swallows errors, but never let a surprise
    // reject escape this boundary.
    void isDatabaseUnreachable(error);
    picks = null;
  }

  // DB unreachable / stub mode → honest-empty INSUFFICIENT_SAMPLE report.
  if (picks === null) {
    return {
      dataMode: "unavailable",
      loadedAtIso,
      note:
        "The database was unreachable (or running in stub mode), so the backtest could not be " +
        "computed. This is an honest-empty report — the INSUFFICIENT_SAMPLE status below is " +
        "because zero records were loaded, not because the sample is small. Restore the " +
        "database connection to populate it.",
      report: runBacktest([]),
    };
  }

  const records: BacktestRecord[] = picks.map(mapPickToBacktestRecord);

  return {
    dataMode: "live",
    loadedAtIso,
    note:
      records.length === 0
        ? "The database is reachable but holds no canonical settled published picks yet. " +
          "We are building the record; the INSUFFICIENT_SAMPLE status below reflects a real " +
          "(empty) read, not a database error."
        : `Computed from ${records.length} canonical settled published picks read live from the database.`,
    report: runBacktest(records),
  };
}
