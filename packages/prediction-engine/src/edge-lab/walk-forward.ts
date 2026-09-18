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
 * Optional groupKey: when supplied, no group may appear on both the train
 * and test side of any fold (one fixture can contribute several markets
 * whose outcomes move together). When omitted, folds are cut by row index
 * exactly as before — byte-identical for existing callers.
 *
 * The SEALED HOLDOUT (handoff §2 P0 "one most-recent season held as an
 * untouched forward holdout until founder sign-off") is enforced in code:
 * rows matching the holdout predicate are hidden behind a getter that THROWS
 * unless called with BOTH the literal founder token AND process.env
 * GSE_ALLOW_HOLDOUT_OPEN === "true".
 *
 * Pure, deterministic, no I/O (the env var read is a human-operated gate,
 * not a data dependency).
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

export interface WalkForwardOptions<R extends TimedRow = TimedRow> {
  /** Number of sequential test folds to cut (>= 1). */
  readonly folds: number;
  /** Minimum fraction of rows (by time order) reserved as the first training window, (0,1). */
  readonly minTrainFraction: number;
  /** Embargo width in milliseconds applied after each test window. */
  readonly embargoMs: number;
  /**
   * Optional fixture/group key. When supplied, every member of a group is
   * assigned together so a fold boundary cannot put the same fixture on
   * both sides. When omitted, cuts stay row-index (existing behaviour).
   */
  readonly groupKey?: (row: R) => string;
}

function ms(iso: string, label: string): number {
  const v = Date.parse(iso);
  if (!Number.isFinite(v)) throw new RangeError(`${label} is not a valid ISO instant: ${iso}`);
  return v;
}

function cutFoldsFromSorted<R extends TimedRow>(
  sorted: readonly R[],
  opts: WalkForwardOptions<R>,
  /**
   * Decision instants used for train-skip and embargo classification.
   * Ordering and test-window edges still use `row.decisionAt` (earliest).
   * Grouped folds pass every member's decisionAt so a later member inside
   * an embargo cannot ride in on the earliest member's timestamp.
   */
  classificationAts: (row: R) => readonly string[] = (row) => [row.decisionAt],
): WalkForwardFold<R>[] {
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
      const instants = classificationAts(row).map((iso) => ms(iso, "decisionAt"));
      if (instants.length === 0) {
        throw new RangeError(`row ${row.id}: no decision instants for classification`);
      }
      // Any member at or after testStart is future relative to this fold.
      if (instants.some((d) => d >= testStartMs)) continue;
      const e = ms(row.eventEndAt, "eventEndAt");
      const dMin = Math.min(...instants);
      if (e < dMin) throw new RangeError(`row ${row.id}: eventEndAt precedes decisionAt`);
      if (e >= testStartMs) {
        purged.push(row);
        continue;
      }
      if (
        earlierTestEnds.some((endMs) =>
          instants.some((d) => d > endMs && d <= endMs + opts.embargoMs),
        )
      ) {
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

/**
 * Cut expanding-window walk-forward folds over time-ordered rows.
 *
 * Rows are sorted by decisionAt; the timeline after the initial training
 * fraction is divided into `folds` contiguous test blocks. For fold k:
 *   train = all rows with decisionAt < testStart, MINUS
 *     - purged: train rows whose [decisionAt, eventEndAt] overlaps
 *       [testStart, testEnd], MINUS
 *     - embargoed: rows whose decisionAt falls within embargoMs after
 *       ANY EARLIER test window's end (grouped folds: ANY member).
 *   test = rows with decisionAt in [testStart, testEnd).
 *
 * When `groupKey` is supplied the same arithmetic runs over groups
 * ordered by each group's earliest decisionAt, then expanded back to
 * rows, so a fixture cannot sit on both sides of a fold. Purge uses
 * the group's latest eventEndAt; embargo and train-skip classify on
 * every member's decisionAt. A later member inside an embargo window
 * embargoes the whole group rather than riding into train on the
 * earliest timestamp.
 */
export function walkForwardSplits<R extends TimedRow>(
  rows: readonly R[],
  opts: WalkForwardOptions<R>,
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

  if (!opts.groupKey) {
    return cutFoldsFromSorted(sorted, opts);
  }

  const groupKey = opts.groupKey;
  const groups: { key: string; members: R[] }[] = [];
  const indexByKey = new Map<string, number>();
  for (const row of sorted) {
    const key = groupKey(row);
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({ key, members: [row] });
    } else {
      groups[existing]!.members.push(row);
    }
  }

  type GroupRow = TimedRow & { readonly members: R[] };
  const groupRows: GroupRow[] = groups.map((g) => {
    const first = g.members[0]!;
    const lastEnd = g.members.reduce(
      (acc, r) => Math.max(acc, ms(r.eventEndAt, "eventEndAt")),
      ms(first.eventEndAt, "eventEndAt"),
    );
    // decisionAt stays the earliest member: that is the ORDERING key.
    // Embargo/train classification is passed separately and inspects every
    // member so a later timestamp cannot hide inside the earliest one.
    return {
      id: g.key,
      decisionAt: first.decisionAt,
      eventEndAt: new Date(lastEnd).toISOString(),
      members: g.members,
    };
  });

  const groupFolds = cutFoldsFromSorted(
    groupRows,
    {
      folds: opts.folds,
      minTrainFraction: opts.minTrainFraction,
      embargoMs: opts.embargoMs,
    },
    (g) => g.members.map((m) => m.decisionAt),
  );

  return groupFolds.map((fold) => ({
    fold: fold.fold,
    train: fold.train.flatMap((g) => g.members),
    test: fold.test.flatMap((g) => g.members),
    purged: fold.purged.flatMap((g) => g.members),
    embargoed: fold.embargoed.flatMap((g) => g.members),
    testStart: fold.testStart,
    testEnd: fold.testEnd,
  }));
}

// ── Sealed forward holdout ────────────────────────────────────────────────────

/** The literal token a HUMAN types at founder sign-off. Automated code must never hold it. */
export const FOUNDER_HOLDOUT_TOKEN = "FOUNDER-SIGNED-OFF-OPEN-THE-HOLDOUT";

/**
 * The env var a HUMAN sets at founder sign-off, alongside the literal token.
 * Deliberately absent from CI/dev (.env.example, CI secrets) so a
 * copy-pasted or hard-coded token alone can never open the holdout in an
 * unattended environment — both gates must be true at the same time, set by
 * hand, in the same sign-off session.
 */
export const HOLDOUT_OPEN_ENV_VAR = "GSE_ALLOW_HOLDOUT_OPEN";

export class SealedHoldoutError extends Error {
  constructor() {
    super(
      "The forward holdout is SEALED until founder sign-off (handoff §2 P0). " +
        "Tuning or evaluating on it before then voids every downstream guarantee. " +
        `Opening it requires BOTH the literal founder token AND process.env.${HOLDOUT_OPEN_ENV_VAR} === "true" ` +
        "— the env var is deliberately absent in CI/dev, so a leaked or hard-coded token alone cannot open it.",
    );
    this.name = "SealedHoldoutError";
  }
}

export interface SealedSplit<R extends TimedRow> {
  /** Rows the automated pipeline may train/tune/evaluate on. */
  readonly working: readonly R[];
  /** Count + time range are inspectable; the ROWS are not, without the token. */
  readonly holdoutSummary: { readonly count: number; readonly from: string | null; readonly to: string | null };
  /**
   * Throws SealedHoldoutError unless called with the exact founder token AND
   * process.env[GSE_ALLOW_HOLDOUT_OPEN] === "true" — both are required.
   */
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
      if (token !== FOUNDER_HOLDOUT_TOKEN || process.env[HOLDOUT_OPEN_ENV_VAR] !== "true") {
        throw new SealedHoldoutError();
      }
      return holdout;
    },
  };
}
