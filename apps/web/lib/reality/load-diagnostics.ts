/**
 * Reality-engine diagnostics LOADER (Workstream-K cockpit surface).
 *
 * WHAT THIS IS
 * The thin, never-throw server boundary between the live DB and the PURE
 * `buildDiagnosticsReport` aggregator in `apps/web/lib/reality/diagnostics.ts`.
 * It reads REAL settled, canonical, published picks (mirroring how clv-capture /
 * settlement and the gate-audit loader read picks — only the fields the aggregator
 * needs), maps each row to the aggregator's `SettledPickRecord` shape, derives the
 * calibration-readiness input from the learning-eligible snapshot count, and calls
 * the aggregator. The cockpit page (`/cockpit/reality`) renders the result.
 *
 * WHY IT IS SAFE
 * - It REUSES the aggregator; it re-implements no scoring, no CLV math, no counting.
 * - It is READ-ONLY: it never writes, flips a gate, or touches scoring.
 * - It NEVER throws. Any DB error, stub mode, or unreachable database degrades to a
 *   labeled honest-empty report (`dataMode: "unavailable"`) — never a fabricated
 *   number, never a silent zero presented as confidence.
 * - It changes NO public behavior, NO schema, NO gate. This is an internal,
 *   admin-gated mirror of the offline diagnostics.
 *
 * HONESTY (non-negotiable)
 * - When the DB is reachable but empty, the report is honest-empty with
 *   `dataMode: "live"` (we really observed zero settled records).
 * - When the DB is unreachable / in stub mode, `dataMode: "unavailable"` and the
 *   eligible-sample size stays UNKNOWN (the aggregator renders "unknown", never 0).
 * - The learning-eligible count is READ from the snapshot table; if that read fails
 *   it is left null so the calibration line says "unknown" rather than guessing.
 */

import { db, Prisma } from "@sports/db";
import {
  buildDiagnosticsReport,
  type DiagnosticsReport,
  type SettledPickRecord,
  type CalibrationReadinessInput,
} from "@/lib/reality/diagnostics";

/** Cap the read — diagnostics are a rollup, not a per-row ledger. */
const REALITY_PICK_LIMIT = 5000;

/**
 * Whether the diagnostics were computed from a reachable DB (`live`) or degraded
 * to the honest-empty report because the DB was unreachable / in stub mode
 * (`unavailable`). The cockpit banner reads this to label the surface truthfully.
 */
export type DiagnosticsDataMode = "live" | "unavailable";

/** The loader's return: the pure report plus the data-provenance label + a note. */
export interface DiagnosticsLoadResult {
  /** Honest provenance — never claim "live" over a fabricated/empty stub read. */
  readonly dataMode: DiagnosticsDataMode;
  /** ISO timestamp the report was loaded (for the cockpit "generated" stamp). */
  readonly loadedAtIso: string;
  /** Plain-language note explaining the data mode (esp. why it is unavailable). */
  readonly note: string;
  /** The pure diagnostics report (honest-empty when dataMode is "unavailable"). */
  readonly report: DiagnosticsReport;
}

/**
 * Field selection for the diagnostics read — only the columns the aggregator
 * consumes. Sport + commenceTime come from the joined Game; the derived signals the
 * aggregator can tolerate as missing (line-movement reversal, book dispersion,
 * nullProb) are NOT stored on the Pick row and are intentionally left undefined so
 * the aggregator degrades honestly rather than fabricating them.
 */
const realityPickSelect = Prisma.validator<Prisma.PickSelect>()({
  pickType: true,
  tier: true,
  confidence: true,
  result: true,
  clvVerdict: true,
  clvValue: true,
  clvKind: true,
  generatedAt: true,
  game: {
    select: {
      commenceTime: true,
      sport: { select: { key: true, name: true } },
    },
  },
});

type RealityPick = Prisma.PickGetPayload<{ select: typeof realityPickSelect }>;

/** Map the engine PickType enum to the aggregator's coarse market space. */
function marketOf(pickType: RealityPick["pickType"]): string {
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

/** Map one settled Pick row to the aggregator's read-only record shape. */
function mapPickToRecord(pick: RealityPick): SettledPickRecord {
  return {
    sport: pick.game.sport.key || pick.game.sport.name || null,
    market: marketOf(pick.pickType),
    result: pick.result,
    tier: pick.tier,
    confidence: typeof pick.confidence === "number" ? pick.confidence : null,
    clvVerdict: pick.clvVerdict,
    clvValue: typeof pick.clvValue === "number" ? pick.clvValue : null,
    clvKind: pick.clvKind,
    generatedAt: pick.generatedAt ? pick.generatedAt.toISOString() : null,
    commenceTime: pick.game.commenceTime ? pick.game.commenceTime.toISOString() : null,
  };
}

/** A DB error that means "no reachable database" (degrade, not crash). */
function isDatabaseUnreachable(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "P1001" ||
    message.includes("Can't reach database server") ||
    message.includes("stub") ||
    message.includes("DATABASE_URL")
  );
}

/**
 * Read the canonical, settled, published picks the diagnostics run over.
 *
 * Mirrors the gate-audit / settlement read: real WIN/LOSS/PUSH/VOID results,
 * published, non-bootstrap, excluding the seed model version. Returns null on ANY
 * DB error so the caller can degrade to the honest-empty report.
 */
async function readSettledPicks(): Promise<RealityPick[] | null> {
  try {
    return await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      orderBy: { settledAt: "desc" },
      take: REALITY_PICK_LIMIT,
      select: realityPickSelect,
    });
  } catch {
    return null;
  }
}

/**
 * Count settled, canonical, learning-eligible snapshots — the calibration spine the
 * aggregator compares to its 100 floor. Returns null on ANY DB error so the
 * calibration line honestly reads "unknown" rather than a fabricated count.
 */
async function readEligibleLearningCount(): Promise<number | null> {
  try {
    return await db.pick.count({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        isBootstrap: false,
        signalSnapshot: { is: { eligibleForLearning: true } },
      },
    });
  } catch {
    return null;
  }
}

/**
 * Load the reality diagnostics report from the live DB.
 *
 * NEVER THROWS. On any DB error / stub mode it returns a labeled honest-empty report
 * (`dataMode: "unavailable"`, eligible-sample UNKNOWN) built by the same pure
 * aggregator over zero records — so the surface degrades to truthful empty states
 * instead of crashing or fabricating numbers. When the DB is reachable, every figure
 * in the returned report traces to real settled-pick rows or to an honest "unknown".
 */
export async function loadRealityDiagnostics(now: Date = new Date()): Promise<DiagnosticsLoadResult> {
  const loadedAtIso = now.toISOString();

  let picks: RealityPick[] | null;
  let eligibleCount: number | null;
  try {
    [picks, eligibleCount] = await Promise.all([readSettledPicks(), readEligibleLearningCount()]);
  } catch (error) {
    // Defensive: the inner reads already swallow errors, but never let a surprise
    // reject escape this boundary.
    void isDatabaseUnreachable(error);
    picks = null;
    eligibleCount = null;
  }

  // DB unreachable / stub mode → honest-empty report, eligible-sample UNKNOWN.
  if (picks === null) {
    const readiness: CalibrationReadinessInput = { eligibleSampleSize: null };
    return {
      dataMode: "unavailable",
      loadedAtIso,
      note:
        "The database was unreachable (or running in stub mode), so diagnostics could not be " +
        "computed. This is an honest-empty report — every figure below is a placeholder, not a " +
        "fabricated number. Restore the database connection to populate it.",
      report: buildDiagnosticsReport([], readiness),
    };
  }

  const records = picks.map(mapPickToRecord);
  const readiness: CalibrationReadinessInput = { eligibleSampleSize: eligibleCount };

  return {
    dataMode: "live",
    loadedAtIso,
    note:
      records.length === 0
        ? "The database is reachable but holds no canonical settled published picks yet. We are " +
          "building the record; the figures below are honest zeros over a real (empty) read."
        : `Computed from ${records.length} canonical settled published picks read live from the database.`,
    report: buildDiagnosticsReport(records, readiness),
  };
}
