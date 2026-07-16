/**
 * Sport-agnostic purged + embargoed walk-forward splitter with a SEALED
 * forward holdout (handoff §2 P0; López de Prado purge/embargo).
 *
 * Differences from the existing week-keyed `replay-harness.ts` (which this
 * generalizes, not replaces): folds are cut on DECISION TIMESTAMPS, so the
 * same splitter serves NFL weeks, MLB daily slates, and props alike (§6
 * sport-agnostic engine). Purging removes training rows whose event windows
 * overlap the test fold's window; the embargo removes a further time margin
 * after the test window so autocorrelated information cannot bleed backward
 * into a later training fold.
 *
 * The SEALED HOLDOUT (handoff §2 P0 "one most-recent season held as an
 * untouched forward holdout until founder sign-off") is enforced in code:
 * rows matching the holdout predicate are hidden behind a getter that THROWS
 * unless called with the literal founder token. Nothing in the automated
 * pipeline holds that token; a human types it at sign-off time. Tuning on
 * the holdout is therefore a runtime error, not a code-review hope (§5
 * "thresholds tuned ONLY on inner/disjoint folds").
 *
 * Pure, deterministic, no I/O.
 */

export interface TimedRow {
  /** Stable id (game id, prop id...). */
  readonly id: string;
  /** Decision instant — features are frozen as of this time (ISO UTC). */
  readonly decisionAt: string;
  /** Event end (final whistle / last out) — defines the overlap window for purging (ISO UTC). */
  readonly eventEndAt: string;
}

export interface WalkForwardFold<R extends TimedRow> {
  readonly fold: number;
  readonly train: readonly R[];
  readonly test: readonly R[];
  /** Rows dropped from train because their event window overlaps the test window. */
  readonly purged: readonly R[];
  /** Rows dropped from train because they fall inside the post-test embargo. */
  readonly embargoed: readonly R[];
  readonly testStart: string;
  readonly testEnd: string;
}

export interface WalkForwardOptions {
  /** Number of sequential test folds to cut (>= 1). */
  readonly folds: number;
  /** Minimum fraction of rows (by time order) reserved as the first training window, (0,1). */
  readonly minTrainFraction: number;
  /** Embargo width in milliseconds applied after each test window. */
  readonly embargoMs: number;
}

function ms(iso: string, label: string): number {
  const v = Date.parse(iso);
  if (!Number.isFinite(v)) throw new RangeError(`${label} is not a valid ISO instant: ${iso}`);
  return v;
}

/**
 * Cut expanding-window walk-forward folds over time-ordered rows.
 *
 * Rows are sorted by decisionAt; the timeline after the initial training
 * fraction is divided into `folds` contiguous test blocks. For fold k:
 *   train = all rows with decisionAt < testStart, MINUS
 *     - purged: train rows whose [decisionAt, eventEndAt] overlaps
 *       [testStart, testEnd] (their outcome resolves inside the test window), MINUS
 *     - embargoed: (for later folds) rows whose decisionAt falls within
 *       embargoMs after ANY EARLIER test window's end (leakage via
 *       autocorrelation across the boundary).
 *   test = rows with decisionAt in [testStart, testEnd).
 */
export function walkForwardSplits<R extends TimedRow>(
  rows: readonly R[],
  opts: WalkForwardOptions,
): WalkForwardFold<R>[] {
  if (opts.folds < 1 || !Number.isInteger(opts.folds)) {
    throw new RangeError(`folds must be a positive integer, got ${opts.folds}`);
  }
  if (!(opts.minTrainFraction > 0 && opts.minTrainFraction < 1)) {
    throw new RangeError(`minTrainFraction must be in (0,1), got ${opts.minTrainFraction}`);
  }
  if (!(opts.embargoMs >= 0)) throw new RangeError(`embargoMs must be >= 0`);

  const sorted = [...rows].sort((a, b) => ms(a.decisionAt, "decisionAt") - ms(b.decisionAt, "decisionAt"));
  if (sorted.length < opts.folds + 1) return [];

  const firstTestIdx = Math.max(1, Math.floor(sorted.length * opts.minTrainFraction));
  const testable = sorted.length - firstTestIdx;
  if (testable < opts.folds) return [];
  const blockSize = Math.floor(testable / opts.folds);

  const foldsOut: WalkForwardFold<R>[] = [];
  const earlierTestEnds: number[] = [];

  for (let k = 0; k < opts.folds; k++) {
    const startIdx = firstTestIdx + k * blockSize;
    const endIdx = k === opts.folds - 1 ? sorted.length : startIdx + blockSize;
    const test = sorted.slice(startIdx, endIdx);
    if (test.length === 0) continue;
    const testStartMs = ms(test[0]!.decisionAt, "decisionAt");
    const testEndMs = Math.max(...test.map((r) => ms(r.eventEndAt, "eventEndAt")));

    const purged: R[] = [];
    const embargoed: R[] = [];
    const train: R[] = [];
    for (const row of sorted) {
      const d = ms(row.decisionAt, "decisionAt");
      if (d >= testStartMs) continue; // future rows never train for this fold
      const e = ms(row.eventEndAt, "eventEndAt");
      if (e < d) throw new RangeError(`row ${row.id}: eventEndAt precedes decisionAt`);
      // Purge: outcome resolves inside (or beyond the start of) the test window.
      if (e >= testStartMs) {
        purged.push(row);
        continue;
      }
      // Embargo: decision sits inside a margin after an earlier fold's test window.
      if (earlierTestEnds.some((endMs) => d > endMs && d <= endMs + opts.embargoMs)) {
        embargoed.push(row);
        continue;
      }
      train.push(row);
    }

    foldsOut.push({
      fold: k,
      train,
      test,
      purged,
      embargoed,
      testStart: new Date(testStartMs).toISOString(),
      testEnd: new Date(testEndMs).toISOString(),
    });
    earlierTestEnds.push(testEndMs);
  }
  return foldsOut;
}

// ── Sealed forward holdout ────────────────────────────────────────────────────

/** The literal token a HUMAN types at founder sign-off. Automated code must never hold it. */
export const FOUNDER_HOLDOUT_TOKEN = "FOUNDER-SIGNED-OFF-OPEN-THE-HOLDOUT";

export class SealedHoldoutError extends Error {
  constructor() {
    super(
      "The forward holdout is SEALED until founder sign-off (handoff §2 P0). " +
        "Tuning or evaluating on it before then voids every downstream guarantee.",
    );
    this.name = "SealedHoldoutError";
  }
}

export interface SealedSplit<R extends TimedRow> {
  /** Rows the automated pipeline may train/tune/evaluate on. */
  readonly working: readonly R[];
  /** Count + time range are inspectable; the ROWS are not, without the token. */
  readonly holdoutSummary: { readonly count: number; readonly from: string | null; readonly to: string | null };
  /** Throws SealedHoldoutError unless called with the exact founder token. */
  readonly openHoldout: (token: string) => readonly R[];
}

/**
 * Split rows into a working set and a sealed forward holdout. The predicate
 * marks holdout membership (canonically: the most recent season).
 */
export function sealHoldout<R extends TimedRow>(
  rows: readonly R[],
  isHoldout: (row: R) => boolean,
): SealedSplit<R> {
  const working: R[] = [];
  const holdout: R[] = [];
  for (const r of rows) (isHoldout(r) ? holdout : working).push(r);
  holdout.sort((a, b) => ms(a.decisionAt, "decisionAt") - ms(b.decisionAt, "decisionAt"));
  return {
    working,
    holdoutSummary: {
      count: holdout.length,
      from: holdout.length ? holdout[0]!.decisionAt : null,
      to: holdout.length ? holdout[holdout.length - 1]!.decisionAt : null,
    },
    openHoldout: (token: string) => {
      if (token !== FOUNDER_HOLDOUT_TOKEN) throw new SealedHoldoutError();
      return holdout;
    },
  };
}
