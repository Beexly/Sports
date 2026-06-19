/**
 * Calibration Learning LOADER (Wave A internal cockpit surface).
 *
 * WHAT THIS IS
 * The thin, never-throw server boundary between the live DB and the PURE
 * `buildCalibrationLearningReport` aggregator below. It reads the learning-eligible
 * pick signal snapshots WE ALREADY STORE (PickSignalSnapshot.* boolean signal
 * flags) joined to each settled pick's WIN/LOSS result, and computes — for each
 * signal flag — a signal-vs-outcome contingency: the win rate among picks WITH the
 * signal active versus WITHOUT, the difference, and a Wilson 95% interval on each
 * arm. The cockpit page (`/cockpit/calibration-learning`) renders the result.
 *
 * It exists to realize value from analytics/math libraries that are built and
 * tested but consumed by zero product surfaces: the statistics Pearson correlation
 * (signal-count vs win) and the probability-distributions Wilson interval — all
 * wired onto the snapshot flags + settled outcomes we already persist.
 *
 * WHY IT IS SAFE
 * - It REUSES the pure analytics/math libs; it re-implements no scoring, no CLV
 *   math, no counting. The aggregator is a pure function: array → report.
 * - It is READ-ONLY: it never writes, flips a gate, re-scores, or bumps a
 *   MODEL_VERSION. Nothing here feeds any scoring path — it is observability only.
 * - It NEVER touches the network.
 * - It NEVER throws. Any DB error, stub mode, or unreachable database degrades to
 *   a labeled honest-empty report (`dataMode: "unavailable"`) — never a fabricated
 *   number.
 *
 * HONESTY (the entire point of this surface)
 * - The learning-eligible sample is TINY (order ~16 at time of writing). Below the
 *   documented floor (DEFAULT_MIN_CALIBRATION_SAMPLE = 100, mirrored here) the
 *   report is `status: "INSUFFICIENT"` and the page leads with "not enough
 *   learning-eligible data to infer anything — this is exploratory".
 * - EVERYTHING here is exploratory CORRELATION, hypothesis-generating ONLY. It is
 *   NEVER presented as proof, NEVER as predictive, and NEVER as a model input. A
 *   signal that co-occurs with wins on 16 picks tells us nothing reliable; the page
 *   says so plainly and the per-signal differences carry wide Wilson intervals.
 * - A signal present in zero loaded picks is OMITTED entirely (no 0% row), so we do
 *   not invent a contingency for a signal we never observed active.
 * - Only WIN/LOSS decide a rate; nothing else is counted.
 */

import { db, Prisma } from "@sports/db";

import { proportionConfidenceInterval } from "@/lib/math/probability-distributions";
import { pearsonCorrelation } from "@/lib/math/statistics";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cap the read — this is a rollup, not a per-row ledger. */
const CALIBRATION_LEARNING_LIMIT = 5000;

/**
 * Learning-eligibility floor: the number of decided (WIN/LOSS) learning-eligible
 * picks below which this surface self-suppresses to an honest INSUFFICIENT state.
 * Mirrors DEFAULT_MIN_CALIBRATION_SAMPLE (= 100) used by the calibrator. Below it,
 * any per-signal difference is noise, so the contingency is framed as exploratory
 * only and the headline "lift" is withheld.
 */
export const CALIBRATION_LEARNING_MIN_SAMPLE = 100;

/**
 * The signal flags we surface, in display order. Keyed to the PickSignalSnapshot
 * boolean columns. `hadOddsSignal` is intentionally omitted — it is always true
 * (the primary input), so it carries no contrast.
 */
const SIGNAL_FLAGS: ReadonlyArray<{ readonly key: SignalFlagKey; readonly label: string }> = [
  { key: "hadLineMovementSignal", label: "Line movement" },
  { key: "hadRestSignal", label: "Rest" },
  { key: "hadScheduleSignal", label: "Schedule density" },
  { key: "hadAtsFormSignal", label: "ATS form" },
  { key: "hadH2HSignal", label: "Head-to-head form" },
  { key: "hadVenueSignal", label: "Venue ATS form" },
  { key: "hadWeatherSignal", label: "Weather" },
  { key: "hadInjurySignal", label: "Injury" },
  { key: "hadRatingsSignal", label: "Team ratings" },
  { key: "hadPlayerSignal", label: "Player availability" },
  { key: "hadOfficialsSignal", label: "Officials" },
  { key: "hadVenueEnvironmentSignal", label: "Venue environment" },
  { key: "hadPaceSignal", label: "Pace" },
  { key: "hadMilestoneSignal", label: "Milestone" },
];

/** Keys of the boolean signal flags the report inspects. */
export type SignalFlagKey =
  | "hadLineMovementSignal"
  | "hadRestSignal"
  | "hadScheduleSignal"
  | "hadAtsFormSignal"
  | "hadH2HSignal"
  | "hadVenueSignal"
  | "hadWeatherSignal"
  | "hadInjurySignal"
  | "hadRatingsSignal"
  | "hadPlayerSignal"
  | "hadOfficialsSignal"
  | "hadVenueEnvironmentSignal"
  | "hadPaceSignal"
  | "hadMilestoneSignal";

// ---------------------------------------------------------------------------
// Read-only record shape consumed by the pure aggregator
// ---------------------------------------------------------------------------

/**
 * One learning-eligible (or settled canonical) pick mapped to only the fields the
 * aggregator consumes: its settled result plus the boolean signal flags that were
 * active when it was scored.
 */
export interface LearningSnapshotRecord {
  /** Settled result. Only WIN/LOSS decide; PUSH/VOID/PENDING are non-decisions. */
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";
  /** Active-signal flags at prediction time, keyed by flag column. */
  readonly flags: Readonly<Record<SignalFlagKey, boolean>>;
}

// ---------------------------------------------------------------------------
// Report shapes
// ---------------------------------------------------------------------------

export type CalibrationLearningStatus = "OK" | "INSUFFICIENT";

/** One arm (with-signal OR without-signal) of a contingency. */
export interface ContingencyArm {
  /** Decided picks (WIN + LOSS) in this arm. */
  readonly decided: number;
  readonly wins: number;
  readonly losses: number;
  /** Win rate over decided picks (0–1), or null when none decided. */
  readonly winRate: number | null;
  /** Wilson 95% interval [low, high] on the win rate, or null when none decided. */
  readonly ci95: readonly [number, number] | null;
}

/** A signal-vs-outcome contingency for one boolean signal flag. */
export interface SignalContingency {
  readonly key: SignalFlagKey;
  readonly label: string;
  /** Picks where the signal was active. */
  readonly withSignal: ContingencyArm;
  /** Picks where the signal was NOT active. */
  readonly withoutSignal: ContingencyArm;
  /**
   * Observed win-rate difference (withSignal − withoutSignal), or null when
   * either arm has no decided picks. This is a raw co-occurrence delta, NOT a
   * causal or predictive effect.
   */
  readonly winRateDifference: number | null;
}

/**
 * An exploratory correlation of signal-count (how many flags were active on a
 * pick) against the win outcome, over the decided picks. Pearson r from the
 * statistics lib; null when it cannot be computed (e.g. zero variance or <2
 * decided picks). Correlation is NOT causation and NOT predictive — included only
 * as a hypothesis-generating summary number.
 */
export interface SignalCountCorrelation {
  /** Decided picks the correlation was computed over. */
  readonly decided: number;
  /** Pearson r in [-1, 1], or null when undefined. */
  readonly r: number | null;
}

export interface CalibrationLearningReport {
  readonly status: CalibrationLearningStatus;
  /** Total learning-eligible records loaded (any result). */
  readonly totalRecords: number;
  /** Decided records (WIN/LOSS) — the only ones that enter a rate. */
  readonly decidedRecords: number;
  /** Sample floor the status is measured against. */
  readonly floor: number;
  /** Human-readable note when INSUFFICIENT. */
  readonly insufficientNote: string | null;
  /**
   * Per-signal contingencies. ONLY signals present (active) in ≥1 loaded pick are
   * included — a signal never observed active is omitted entirely.
   */
  readonly contingencies: readonly SignalContingency[];
  /** Exploratory signal-count vs win correlation. */
  readonly signalCountCorrelation: SignalCountCorrelation;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function isDecided(result: LearningSnapshotRecord["result"]): result is "WIN" | "LOSS" {
  return result === "WIN" || result === "LOSS";
}

/** Build a contingency arm from a set of decided-or-not records. */
function arm(records: readonly LearningSnapshotRecord[]): ContingencyArm {
  let wins = 0;
  let losses = 0;
  for (const r of records) {
    if (r.result === "WIN") wins++;
    else if (r.result === "LOSS") losses++;
  }
  const decided = wins + losses;
  const winRate = decided > 0 ? wins / decided : null;
  const ci95: readonly [number, number] | null =
    decided > 0 ? proportionConfidenceInterval(wins, decided, 0.95) : null;
  return { decided, wins, losses, winRate, ci95 };
}

/** Count active signal flags on one record (excludes the always-on odds signal). */
function activeSignalCount(record: LearningSnapshotRecord): number {
  let n = 0;
  for (const { key } of SIGNAL_FLAGS) {
    if (record.flags[key]) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Pure aggregator — array → report. No I/O, no DB, fully testable.
// ---------------------------------------------------------------------------

/**
 * Compute the calibration-learning report from a set of mapped learning-eligible
 * records. PURE: no DB, no side effects, deterministic.
 *
 * Self-suppresses to INSUFFICIENT when the decided sample is below the floor —
 * below-floor co-occurrence is noise, so the page leads with the exploratory
 * caveat and withholds any headline read. The per-signal contingencies are still
 * computed (honest counts + wide intervals) for the small sample they describe.
 *
 * A signal active in zero loaded picks is OMITTED — we do not fabricate a row for
 * a signal we never observed.
 */
export function buildCalibrationLearningReport(
  records: readonly LearningSnapshotRecord[],
): CalibrationLearningReport {
  const totalRecords = records.length;

  const decided = records.filter((r) => isDecided(r.result));
  const decidedRecords = decided.length;

  // ── Per-signal contingencies (Wilson interval on each arm) ────────────────
  const contingencies: SignalContingency[] = [];
  for (const { key, label } of SIGNAL_FLAGS) {
    const presentInAny = records.some((r) => r.flags[key]);
    if (!presentInAny) continue; // omit a signal never observed active

    const withRecs = records.filter((r) => r.flags[key]);
    const withoutRecs = records.filter((r) => !r.flags[key]);
    const withSignal = arm(withRecs);
    const withoutSignal = arm(withoutRecs);

    const winRateDifference =
      withSignal.winRate !== null && withoutSignal.winRate !== null
        ? withSignal.winRate - withoutSignal.winRate
        : null;

    contingencies.push({ key, label, withSignal, withoutSignal, winRateDifference });
  }

  // ── Exploratory signal-count vs win correlation (statistics: Pearson r) ────
  // x = active signal count on the pick, y = 1 for WIN / 0 for LOSS, over the
  // decided picks only. pearsonCorrelation returns null on zero variance / n<2.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of decided) {
    xs.push(activeSignalCount(r));
    ys.push(r.result === "WIN" ? 1 : 0);
  }
  const r = pearsonCorrelation(xs, ys);
  const signalCountCorrelation: SignalCountCorrelation = {
    decided: decidedRecords,
    r: r === null || !Number.isFinite(r) ? null : r,
  };

  // ── Status floor gate ──────────────────────────────────────────────────────
  const status: CalibrationLearningStatus =
    decidedRecords < CALIBRATION_LEARNING_MIN_SAMPLE ? "INSUFFICIENT" : "OK";
  const insufficientNote =
    status === "INSUFFICIENT"
      ? `Not enough learning-eligible data to infer anything — ${decidedRecords} / ` +
        `${CALIBRATION_LEARNING_MIN_SAMPLE} decided learning-eligible picks. This is exploratory ` +
        `only. The contingencies below are honest counts for this small sample, but the differences ` +
        `are dominated by noise and must not be read as a signal "working".`
      : null;

  return {
    status,
    totalRecords,
    decidedRecords,
    floor: CALIBRATION_LEARNING_MIN_SAMPLE,
    insufficientNote,
    contingencies,
    signalCountCorrelation,
  };
}

// ---------------------------------------------------------------------------
// DB boundary — never-throw loader
// ---------------------------------------------------------------------------

/**
 * Whether the report was computed from a reachable DB (`live`) or degraded to the
 * honest-empty report because the DB was unreachable / in stub mode (`unavailable`).
 */
export type CalibrationLearningDataMode = "live" | "unavailable";

export interface CalibrationLearningLoadResult {
  readonly dataMode: CalibrationLearningDataMode;
  /** ISO timestamp the report was loaded (for the cockpit "generated" stamp). */
  readonly loadedAtIso: string;
  /** Plain-language note explaining the data mode (esp. why it is unavailable). */
  readonly note: string;
  readonly report: CalibrationLearningReport;
}

/**
 * Field selection for the read — the settled pick result plus its signal snapshot
 * boolean flags. Only learning-eligible snapshots are read (the same gate the
 * calibration page uses), so picks settled while learning was off never enter the
 * sample.
 */
const learningPickSelect = Prisma.validator<Prisma.PickSelect>()({
  result: true,
  signalSnapshot: {
    select: {
      hadLineMovementSignal: true,
      hadRestSignal: true,
      hadScheduleSignal: true,
      hadAtsFormSignal: true,
      hadH2HSignal: true,
      hadVenueSignal: true,
      hadWeatherSignal: true,
      hadInjurySignal: true,
      hadRatingsSignal: true,
      hadPlayerSignal: true,
      hadOfficialsSignal: true,
      hadVenueEnvironmentSignal: true,
      hadPaceSignal: true,
      hadMilestoneSignal: true,
    },
  },
});

type LearningPickRow = Prisma.PickGetPayload<{ select: typeof learningPickSelect }>;

/** Map one learning-eligible Pick row to the aggregator's read-only record shape. */
function mapRow(pick: LearningPickRow): LearningSnapshotRecord {
  const s = pick.signalSnapshot;
  return {
    result: pick.result,
    flags: {
      hadLineMovementSignal: s?.hadLineMovementSignal ?? false,
      hadRestSignal: s?.hadRestSignal ?? false,
      hadScheduleSignal: s?.hadScheduleSignal ?? false,
      hadAtsFormSignal: s?.hadAtsFormSignal ?? false,
      hadH2HSignal: s?.hadH2HSignal ?? false,
      hadVenueSignal: s?.hadVenueSignal ?? false,
      hadWeatherSignal: s?.hadWeatherSignal ?? false,
      hadInjurySignal: s?.hadInjurySignal ?? false,
      hadRatingsSignal: s?.hadRatingsSignal ?? false,
      hadPlayerSignal: s?.hadPlayerSignal ?? false,
      hadOfficialsSignal: s?.hadOfficialsSignal ?? false,
      hadVenueEnvironmentSignal: s?.hadVenueEnvironmentSignal ?? false,
      hadPaceSignal: s?.hadPaceSignal ?? false,
      hadMilestoneSignal: s?.hadMilestoneSignal ?? false,
    },
  };
}

/**
 * Read the learning-eligible, decided picks the contingency runs over.
 *
 * Mirrors the calibration page's eligibility gate exactly: WIN/LOSS results,
 * non-bootstrap, with a signal snapshot whose `eligibleForLearning` is true. This
 * is the same spine the 100-record floor is measured against. Returns null on ANY
 * DB error so the caller degrades to honest-empty.
 */
async function readLearningPicks(): Promise<LearningPickRow[] | null> {
  try {
    return await db.pick.findMany({
      where: {
        result: { in: ["WIN", "LOSS"] },
        isBootstrap: false,
        signalSnapshot: { is: { eligibleForLearning: true } },
      },
      orderBy: { settledAt: "asc" },
      take: CALIBRATION_LEARNING_LIMIT,
      select: learningPickSelect,
    });
  } catch {
    return null;
  }
}

/**
 * Load the calibration-learning report from the live DB.
 *
 * NEVER THROWS. On any DB error / stub mode it returns a labeled honest-empty
 * report (`dataMode: "unavailable"`, `report: buildCalibrationLearningReport([])` →
 * INSUFFICIENT) so the surface degrades to truthful empty states instead of
 * crashing or fabricating numbers. When the DB is reachable, every figure traces
 * to real learning-eligible snapshots or to an honest empty state. It NEVER feeds
 * any scoring path — this is a read-only observability surface only.
 */
export async function loadCalibrationLearning(
  now: Date = new Date(),
): Promise<CalibrationLearningLoadResult> {
  const loadedAtIso = now.toISOString();

  let picks: LearningPickRow[] | null;
  try {
    picks = await readLearningPicks();
  } catch {
    // Defensive: the inner read already swallows errors, but never let a surprise
    // reject escape this boundary.
    picks = null;
  }

  if (picks === null) {
    return {
      dataMode: "unavailable",
      loadedAtIso,
      note:
        "The database was unreachable (or running in stub mode), so the calibration-learning " +
        "exploration could not be computed. This is an honest-empty report — the INSUFFICIENT " +
        "status below reflects zero records loaded, not a small sample. Restore the database " +
        "connection to populate it.",
      report: buildCalibrationLearningReport([]),
    };
  }

  const records = picks.map(mapRow);

  return {
    dataMode: "live",
    loadedAtIso,
    note:
      records.length === 0
        ? "The database is reachable but holds no learning-eligible settled picks yet. We are " +
          "building the record; the figures below are honest reads over a real (empty) sample."
        : `Computed from ${records.length} learning-eligible settled picks read live from the database.`,
    report: buildCalibrationLearningReport(records),
  };
}
