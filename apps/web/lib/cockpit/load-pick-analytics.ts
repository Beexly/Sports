/**
 * Pick Analytics & Grading LOADER (Wave A internal cockpit surface).
 *
 * WHAT THIS IS
 * The thin, never-throw server boundary between the live DB and the PURE
 * `buildPickAnalyticsReport` aggregator below. It reads REAL settled, canonical,
 * published picks (mirroring the exact canonical filter used by
 * load-diagnostics.ts / load-backtest.ts), maps each row to the aggregator's
 * read-only `SettledPickRecord` shape, and calls the aggregator. The cockpit page
 * (`/cockpit/pick-analytics`) renders the result.
 *
 * It exists to realize value from analytics/math libraries that are built and
 * tested but consumed by zero product surfaces: statistics (Wilson confidence
 * intervals), probability-distributions (reliability-by-bin), streak analysis,
 * and bankroll/drawdown framing — all wired onto data we already store.
 *
 * WHY IT IS SAFE
 * - It REUSES the pure analytics/math libs; it re-implements no scoring, no CLV
 *   math, no counting. The aggregator is a pure function: array → report.
 * - It is READ-ONLY: it never writes, flips a gate, re-scores, or bumps a
 *   MODEL_VERSION.
 * - It NEVER throws. Any DB error, stub mode, or unreachable database degrades to
 *   a labeled honest-empty report (`dataMode: "unavailable"`) — never a fabricated
 *   number, never a silent zero presented as confidence.
 *
 * HONESTY (non-negotiable)
 * - Below the calibration floor (DEFAULT_MIN_CALIBRATION_SAMPLE settled, decided
 *   picks) the report is `status: "INSUFFICIENT_SAMPLE"` and the page renders the
 *   honest "building the record — N / floor" state.
 * - Win rates carry a Wilson 95% confidence interval so a small sample is never
 *   read as precision it does not have.
 * - The bankroll/drawdown framing uses a FLAT 1-unit stake at the standard −110
 *   break-even price (decimal 1.909). The Pick table does not store the actual bet
 *   price per pick, so a uniform documented assumption is used rather than
 *   fabricating per-pick odds. It is a shape illustration, not a P/L claim.
 * - Gated / VOID / no-bet picks are EXCLUDED from win-rate, streak, and bankroll
 *   math (only WIN/LOSS/PUSH decide), so the metrics do not over-count.
 */

import { db, Prisma } from "@sports/db";

import {
  proportionConfidenceInterval,
} from "@/lib/math/probability-distributions";
import {
  analyzeStreak,
  type Outcome,
  type StreakRecord,
} from "@/lib/analytics/streak";
import {
  analyzeDrawdown,
  cumulativeProfitLoss,
  type DrawdownAnalysis,
} from "@/lib/math/bankroll";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cap the read — this is a rollup, not a per-row ledger. */
const PICK_ANALYTICS_LIMIT = 5000;

/**
 * Calibration-eligibility floor: the number of decided (WIN/LOSS) settled picks
 * below which the surface self-suppresses to an honest INSUFFICIENT_SAMPLE state.
 * Matches the 100-record floor used elsewhere in the reality engine.
 */
export const PICK_ANALYTICS_MIN_SAMPLE = 100;

/**
 * Decimal odds used for the bankroll/drawdown shape illustration. The Pick table
 * does not store the bet price per pick, so a single documented assumption — the
 * standard −110 juice (52.38% break-even) — is used uniformly. This is honest:
 * it is labeled as an assumption, not presented as realized P/L.
 */
const FLAT_DECIMAL_ODDS_110 = 100 / 110 + 1; // 1.9090909…

/** Flat stake per settled pick, in units. */
const FLAT_STAKE_UNITS = 1;

/** Confidence bins (closed-open, last bin closes at 100) for reliability. */
const CONFIDENCE_BINS: ReadonlyArray<{ readonly lo: number; readonly hi: number; readonly label: string }> = [
  { lo: 50, hi: 60, label: "50–60%" },
  { lo: 60, hi: 70, label: "60–70%" },
  { lo: 70, hi: 80, label: "70–80%" },
  { lo: 80, hi: 90, label: "80–90%" },
  { lo: 90, hi: 101, label: "90–100%" },
];

// ---------------------------------------------------------------------------
// Read-only record shape consumed by the pure aggregator
// ---------------------------------------------------------------------------

/** A settled-pick row mapped to only the fields the aggregator consumes. */
export interface SettledPickRecord {
  /** Sport key/name, or null when unknown. */
  readonly sport: string | null;
  /** Coarse market space: SPREAD | TOTAL | MONEYLINE | OTHER. */
  readonly market: string;
  /** Engine tier gate: FREE | PREMIUM (the subscription gate, not display tier). */
  readonly tier: string;
  /** 0–100 confidence at publish, or null when missing. */
  readonly confidence: number | null;
  /** Settled result. Only WIN/LOSS/PUSH decide; VOID/PENDING are non-decisions. */
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";
  /** "BEAT_CLOSE" | "MATCHED_CLOSE" | "LOST_TO_CLOSE" | null. */
  readonly clvVerdict: string | null;
  /** Graded CLV — positive = beat the close — or null when ungraded. */
  readonly clvValue: number | null;
  /** Chronological key (ISO) used to order the bankroll/streak series. */
  readonly settledAtIso: string | null;
}

// ---------------------------------------------------------------------------
// Report shapes
// ---------------------------------------------------------------------------

export type PickAnalyticsStatus = "OK" | "INSUFFICIENT_SAMPLE";

/** A win-rate cell with a Wilson 95% confidence interval. */
export interface WinRateCell {
  /** Group label (tier name, sport key, or confidence-bin label). */
  readonly label: string;
  /** Decided picks (WIN + LOSS) in the group. */
  readonly decided: number;
  readonly wins: number;
  readonly losses: number;
  /** Pushes — excluded from the rate but reported for completeness. */
  readonly pushes: number;
  /** Win rate over decided picks, or null when none decided. */
  readonly winRate: number | null;
  /** Wilson 95% CI [low, high], or null when none decided. */
  readonly ci95: readonly [number, number] | null;
}

/** A reliability row: observed win rate vs the band's mean confidence. */
export interface ReliabilityRow {
  readonly label: string;
  /** Decided picks in this confidence band. */
  readonly decided: number;
  /** Mean confidence in the band (0–1), or null when empty. */
  readonly meanConfidence: number | null;
  /** Observed win rate (0–1), or null when none decided. */
  readonly observedWinRate: number | null;
  /** Wilson 95% CI on the observed rate, or null when none decided. */
  readonly ci95: readonly [number, number] | null;
}

/** CLV beat-rate aggregation across graded picks. */
export interface ClvAggregate {
  /** Picks carrying a CLV verdict. */
  readonly graded: number;
  /** Picks with verdict BEAT_CLOSE. */
  readonly beatClose: number;
  /** Fraction that beat the close, or null when none graded. */
  readonly beatRate: number | null;
  /** Wilson 95% CI on the beat rate, or null when none graded. */
  readonly beatRateCi95: readonly [number, number] | null;
  /** Mean graded clvValue across picks that carry one, or null when none. */
  readonly meanClvValue: number | null;
  /** Picks with a numeric clvValue (the meanClvValue denominator). */
  readonly clvValued: number;
}

/** Bankroll/drawdown framing over the chronological decided series. */
export interface BankrollFraming {
  /** Decided picks the series was built from. */
  readonly decided: number;
  /** Flat decimal odds assumption used (documented, not realized). */
  readonly assumedDecimalOdds: number;
  /** Flat stake per pick, in units. */
  readonly stakeUnits: number;
  /** Final cumulative P/L in units over the assumed flat series. */
  readonly finalUnits: number | null;
  /** Drawdown analysis over the running-balance curve. */
  readonly drawdown: DrawdownAnalysis;
}

export interface PickAnalyticsReport {
  readonly status: PickAnalyticsStatus;
  /** Total settled records loaded (WIN/LOSS/PUSH/VOID). */
  readonly totalRecords: number;
  /** Decided records (WIN/LOSS) — the calibration-eligible spine. */
  readonly decidedRecords: number;
  /** Sample floor the status is measured against. */
  readonly floor: number;
  /** Human-readable note when INSUFFICIENT_SAMPLE. */
  readonly insufficientNote: string | null;
  /** Overall decided win rate with a Wilson CI. */
  readonly overall: WinRateCell;
  /** Per-tier win rates (only tiers with ≥1 settled pick). */
  readonly byTier: readonly WinRateCell[];
  /** Per-sport win rates (only sports with ≥1 settled pick). */
  readonly bySport: readonly WinRateCell[];
  /** Per-confidence-bin win rates (only bins with ≥1 settled pick). */
  readonly byConfidenceBin: readonly WinRateCell[];
  /** Reliability rows — observed vs claimed confidence per band. */
  readonly reliability: readonly ReliabilityRow[];
  /** CLV beat-rate aggregation. */
  readonly clv: ClvAggregate;
  /** Streak analysis over the chronological decided series. */
  readonly streak: StreakRecord;
  /** Bankroll/drawdown shape illustration over the flat-stake series. */
  readonly bankroll: BankrollFraming;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function isDecided(result: SettledPickRecord["result"]): result is "WIN" | "LOSS" {
  return result === "WIN" || result === "LOSS";
}

/** Map the engine result enum to the streak/bankroll Outcome space. */
function outcomeOf(result: SettledPickRecord["result"]): Outcome | null {
  switch (result) {
    case "WIN":
      return "win";
    case "LOSS":
      return "loss";
    case "PUSH":
      return "push";
    default:
      // VOID / PENDING are non-decisions — excluded entirely.
      return null;
  }
}

/**
 * Build a win-rate cell for a labeled group. The Wilson CI (from
 * probability-distributions) is computed only when there is a decided sample.
 */
function winRateCell(label: string, picks: readonly SettledPickRecord[]): WinRateCell {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  for (const p of picks) {
    if (p.result === "WIN") wins++;
    else if (p.result === "LOSS") losses++;
    else if (p.result === "PUSH") pushes++;
  }
  const decided = wins + losses;
  const winRate = decided > 0 ? wins / decided : null;
  const ci95: readonly [number, number] | null =
    decided > 0 ? proportionConfidenceInterval(wins, decided, 0.95) : null;
  return { label, decided, wins, losses, pushes, winRate, ci95 };
}

/** Group picks by a string key, dropping null keys into "unknown". */
function groupBy(
  picks: readonly SettledPickRecord[],
  keyOf: (p: SettledPickRecord) => string | null,
): Map<string, SettledPickRecord[]> {
  const map = new Map<string, SettledPickRecord[]>();
  for (const p of picks) {
    const key = keyOf(p) ?? "unknown";
    const bucket = map.get(key);
    if (bucket) bucket.push(p);
    else map.set(key, [p]);
  }
  return map;
}

/** Sort cells by decided sample desc, then label asc, for a stable display. */
function sortCells(cells: WinRateCell[]): WinRateCell[] {
  return cells.sort((a, b) => (b.decided - a.decided) || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Pure aggregator — array → report. No I/O, no DB, fully testable.
// ---------------------------------------------------------------------------

/**
 * Compute the full pick-analytics report from a set of mapped settled-pick
 * records. PURE: no DB, no side effects, deterministic.
 *
 * Self-suppresses to INSUFFICIENT_SAMPLE when the decided sample is below the
 * floor — below-floor analysis is noise presented as signal.
 */
export function buildPickAnalyticsReport(records: readonly SettledPickRecord[]): PickAnalyticsReport {
  const totalRecords = records.length;

  // Decided = WIN/LOSS only. Pushes/VOID/PENDING never decide a rate.
  const decided = records.filter((p) => isDecided(p.result));
  const decidedRecords = decided.length;

  // ── Overall + segment win rates (statistics: Wilson CI) ──────────────────
  const overall = winRateCell("Overall", records);

  const byTier = sortCells(
    [...groupBy(records, (p) => p.tier).entries()].map(([tier, picks]) =>
      winRateCell(tier, picks),
    ),
  );

  const bySport = sortCells(
    [...groupBy(records, (p) => p.sport).entries()].map(([sport, picks]) =>
      winRateCell(sport, picks),
    ),
  );

  // ── Confidence-bin win rates + reliability (probability-distributions) ────
  const byConfidenceBin: WinRateCell[] = [];
  const reliability: ReliabilityRow[] = [];
  for (const bin of CONFIDENCE_BINS) {
    const inBin = records.filter(
      (p) => p.confidence !== null && p.confidence >= bin.lo && p.confidence < bin.hi,
    );
    if (inBin.length === 0) continue; // omit empty bins rather than printing 0%

    const cell = winRateCell(bin.label, inBin);
    byConfidenceBin.push(cell);

    const confidences = inBin
      .map((p) => p.confidence)
      .filter((c): c is number => c !== null);
    const meanConfidence =
      confidences.length > 0
        ? confidences.reduce((s, c) => s + c, 0) / confidences.length / 100
        : null;

    reliability.push({
      label: bin.label,
      decided: cell.decided,
      meanConfidence,
      observedWinRate: cell.winRate,
      ci95: cell.ci95,
    });
  }

  // ── CLV beat-rate aggregation (from clvVerdict / clvValue) ────────────────
  let graded = 0;
  let beatClose = 0;
  let clvSum = 0;
  let clvValued = 0;
  for (const p of records) {
    if (p.clvVerdict !== null) {
      graded++;
      if (p.clvVerdict === "BEAT_CLOSE") beatClose++;
    }
    if (typeof p.clvValue === "number" && Number.isFinite(p.clvValue)) {
      clvSum += p.clvValue;
      clvValued++;
    }
  }
  const clv: ClvAggregate = {
    graded,
    beatClose,
    beatRate: graded > 0 ? beatClose / graded : null,
    beatRateCi95: graded > 0 ? proportionConfidenceInterval(beatClose, graded, 0.95) : null,
    meanClvValue: clvValued > 0 ? clvSum / clvValued : null,
    clvValued,
  };

  // ── Chronological decided series for streak + bankroll ────────────────────
  // Order by settledAt asc (nulls last, stable) so the streak tail and bankroll
  // curve read chronologically.
  const chronological = [...records]
    .filter((p) => outcomeOf(p.result) !== null)
    .sort((a, b) => {
      const ax = a.settledAtIso ?? "";
      const bx = b.settledAtIso ?? "";
      if (ax === bx) return 0;
      if (ax === "") return 1;
      if (bx === "") return -1;
      return ax < bx ? -1 : 1;
    });

  const outcomes: Outcome[] = [];
  for (const p of chronological) {
    const o = outcomeOf(p.result);
    if (o !== null) outcomes.push(o);
  }

  // ── Streak analysis (streak.ts) ───────────────────────────────────────────
  const streak = analyzeStreak(outcomes);

  // ── Bankroll / drawdown framing (bankroll.ts) ─────────────────────────────
  // Flat 1-unit stake at the documented −110 assumption. Push = no change.
  const bankrollOutcomes: Array<"win" | "loss" | "push"> = outcomes.filter(
    (o): o is "win" | "loss" | "push" => o === "win" || o === "loss" || o === "push",
  );
  const stakes = bankrollOutcomes.map(() => FLAT_STAKE_UNITS);
  const oddsSeries = bankrollOutcomes.map(() => FLAT_DECIMAL_ODDS_110);
  const cumulative = cumulativeProfitLoss(stakes, bankrollOutcomes, oddsSeries);
  // Running balance series for drawdown: start at 0 units P/L, then each step.
  const balanceCurve = [0, ...cumulative];
  const drawdown = analyzeDrawdown(balanceCurve);
  const finalUnits = cumulative.length > 0 ? (cumulative[cumulative.length - 1] ?? null) : null;

  const bankroll: BankrollFraming = {
    decided: decidedRecords,
    assumedDecimalOdds: FLAT_DECIMAL_ODDS_110,
    stakeUnits: FLAT_STAKE_UNITS,
    finalUnits,
    drawdown,
  };

  // ── Status floor gate ─────────────────────────────────────────────────────
  const status: PickAnalyticsStatus =
    decidedRecords < PICK_ANALYTICS_MIN_SAMPLE ? "INSUFFICIENT_SAMPLE" : "OK";
  const insufficientNote =
    status === "INSUFFICIENT_SAMPLE"
      ? `Building the record — ${decidedRecords} / ${PICK_ANALYTICS_MIN_SAMPLE} decided settled picks. ` +
        `Below the floor, segment win rates are noise presented as signal, so headline grading ` +
        `self-suppresses. The counts and confidence intervals below remain honest for the small ` +
        `sample they describe.`
      : null;

  return {
    status,
    totalRecords,
    decidedRecords,
    floor: PICK_ANALYTICS_MIN_SAMPLE,
    insufficientNote,
    overall,
    byTier,
    bySport,
    byConfidenceBin,
    reliability,
    clv,
    streak,
    bankroll,
  };
}

// ---------------------------------------------------------------------------
// DB boundary — never-throw loader
// ---------------------------------------------------------------------------

/**
 * Whether the report was computed from a reachable DB (`live`) or degraded to the
 * honest-empty report because the DB was unreachable / in stub mode (`unavailable`).
 */
export type PickAnalyticsDataMode = "live" | "unavailable";

export interface PickAnalyticsLoadResult {
  readonly dataMode: PickAnalyticsDataMode;
  /** ISO timestamp the report was loaded (for the cockpit "generated" stamp). */
  readonly loadedAtIso: string;
  /** Plain-language note explaining the data mode (esp. why it is unavailable). */
  readonly note: string;
  readonly report: PickAnalyticsReport;
}

/**
 * Field selection for the read — only the columns the aggregator consumes. Sport
 * comes from the joined Game. The actual bet price per pick is NOT stored, so the
 * bankroll framing uses a documented flat assumption rather than fabricating it.
 */
const pickAnalyticsSelect = Prisma.validator<Prisma.PickSelect>()({
  pickType: true,
  tier: true,
  confidence: true,
  result: true,
  clvVerdict: true,
  clvValue: true,
  settledAt: true,
  game: {
    select: {
      sport: { select: { key: true, name: true } },
    },
  },
});

type PickAnalyticsRow = Prisma.PickGetPayload<{ select: typeof pickAnalyticsSelect }>;

/** Map the engine PickType enum to the coarse market space. */
function marketOf(pickType: PickAnalyticsRow["pickType"]): string {
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
function mapRow(pick: PickAnalyticsRow): SettledPickRecord {
  return {
    sport: pick.game.sport.key || pick.game.sport.name || null,
    market: marketOf(pick.pickType),
    tier: pick.tier,
    confidence: typeof pick.confidence === "number" ? pick.confidence : null,
    result: pick.result,
    clvVerdict: pick.clvVerdict,
    clvValue: typeof pick.clvValue === "number" ? pick.clvValue : null,
    settledAtIso: pick.settledAt ? pick.settledAt.toISOString() : null,
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
 * Read the canonical, settled, published picks the analytics run over.
 *
 * Mirrors the load-diagnostics / load-backtest filter exactly: real
 * WIN/LOSS/PUSH/VOID results, published, non-bootstrap, excluding the seed model
 * version. Returns null on ANY DB error so the caller degrades to honest-empty.
 */
async function readSettledPicks(): Promise<PickAnalyticsRow[] | null> {
  try {
    return await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      orderBy: { settledAt: "asc" },
      take: PICK_ANALYTICS_LIMIT,
      select: pickAnalyticsSelect,
    });
  } catch {
    return null;
  }
}

/**
 * Load the pick-analytics report from the live DB.
 *
 * NEVER THROWS. On any DB error / stub mode it returns a labeled honest-empty
 * report (`dataMode: "unavailable"`, `report: buildPickAnalyticsReport([])` →
 * INSUFFICIENT_SAMPLE) so the surface degrades to truthful empty states instead
 * of crashing or fabricating numbers. When the DB is reachable, every figure in
 * the returned report traces to real settled-pick rows or to an honest empty
 * state.
 */
export async function loadPickAnalytics(now: Date = new Date()): Promise<PickAnalyticsLoadResult> {
  const loadedAtIso = now.toISOString();

  let picks: PickAnalyticsRow[] | null;
  try {
    picks = await readSettledPicks();
  } catch (error) {
    // Defensive: the inner read already swallows errors, but never let a surprise
    // reject escape this boundary.
    void isDatabaseUnreachable(error);
    picks = null;
  }

  if (picks === null) {
    return {
      dataMode: "unavailable",
      loadedAtIso,
      note:
        "The database was unreachable (or running in stub mode), so pick analytics could not be " +
        "computed. This is an honest-empty report — the INSUFFICIENT_SAMPLE status below reflects " +
        "zero records loaded, not a small sample. Restore the database connection to populate it.",
      report: buildPickAnalyticsReport([]),
    };
  }

  const records = picks.map(mapRow);

  return {
    dataMode: "live",
    loadedAtIso,
    note:
      records.length === 0
        ? "The database is reachable but holds no canonical settled published picks yet. We are " +
          "building the record; the figures below are honest zeros over a real (empty) read."
        : `Computed from ${records.length} canonical settled published picks read live from the database.`,
    report: buildPickAnalyticsReport(records),
  };
}
