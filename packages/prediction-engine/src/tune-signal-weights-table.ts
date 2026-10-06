/**
 * Measured signal weights — the CALL SITE for `tuneSignalWeights`.
 *
 * WHY THIS FILE EXISTS. `tune-signal-weights.ts` (#924) shipped as a pure
 * function behind a barrel export with ZERO non-test callers, measured in
 * `docs/ops/wiring-backlog-2026-10-01.md` Tier 1 item 4: "Zero non-test callers
 * (barrel export only)." Meanwhile every signal the composer has ever been
 * handed arrived with the flat `CATEGORY_PRIORS` weight — HEALTH 1.0,
 * PRODUCTION 1.0 (`signal-ledger-populator.ts:68-73`) — and `signal-scale-fit.ts`
 * measured why that uniform 1 is not a neutral default but a false claim: the
 * ten persisted keys span a 103x range of standard deviations, so a flat weight
 * asserts that ten different units contribute equally. It is the tuner calling
 * this module that turns that claim into a measurement.
 *
 * WHAT IT DOES. It calls `tuneSignalWeights` — the correlation and grouping
 * work stays in #924's function rather than being reimplemented here — and then
 * pays the evidence floor in the currency the repo has PROVEN is the honest one.
 *
 * THE ROW-COUNT CORRECTION IS THE POINT, NOT A DETAIL. `tuneSignalWeights`
 * scales its multiplier by `sqrt(n / MIN_SAMPLES)` where `n` is the ROW count,
 * and that is only valid if rows are independent. `tune-signal-weights-grouped.ts`
 * already established that they are not, twice, with two independent
 * measurements: AGENTS.md's "FIXTURE TRIPLICATION" (every NFL fixture exists as
 * THREE `games` rows) and `signal-scale-fit.ts`'s within-player fit (24,497
 * `pgs.fantasy_ppr` rows come from only 125 independent games). So this module
 * reports the row-counted multiplier as `rowMultiplier` and derives the weight
 * that the composer actually uses from the DISTINCT FIXTURE count instead. A key
 * with 5,000 rows across 12 fixtures clears #924's 100-row floor and is refused
 * here, which is the correct answer rather than a failure.
 *
 * ANTI-PREDICTIVE KEYS GET WEIGHT 0, NOT A NEGATIVE WEIGHT. #924's tuner
 * deliberately preserves sign so an inverted signal is represented honestly.
 * That honesty cannot be expressed in the ledger's `weight` column: `weight` is
 * `Float @default(1) // base importance (>= 0)`, `buildCandidate` DROPS any row
 * with `weight < 0`, and `compositeScore` does `Math.max(0, weight)`. Passing
 * the negative through would therefore not invert the signal — it would make the
 * row vanish (or flatten to zero) with no report, which is the silent-drop
 * failure this repo treats as a defect. So an anti-predictive key is EXCLUDED
 * from voting at weight 0 and REPORTED as `anti-predictive` with its correlation
 * intact. Inverting a signal the data contradicts is a decision for a human,
 * not a side effect of a tuner.
 *
 * THE ROW VALUE'S SCALE DOES NOT AFFECT THE RESULT. `KeyOutcome.value` is
 * documented as a normalized −1..1 reading and `signals.value` is stored on that
 * scale, but the persisted table predates the normalization pass, so a key may
 * hold rows written on two different affine scales. That is stated, not hidden:
 * `readings` in each entry carries the observed min/max/spread so a bimodal
 * artifact inside one key is visible in the report. It does not silently skew a
 * number, because point-biserial correlation is invariant to a positive affine
 * transform of ONE scale — only a genuine MIXTURE of two scales within a key
 * would bias it, and that is what `spread` is there to expose.
 *
 * Determinism: no wall clock, no `Math.random`, no `process.env`, no db. The
 * same sample produces byte-identical output, which is what makes a committed
 * table diffable between refits.
 */

import {
  MIN_SAMPLES,
  tuneSignalWeights,
  type KeyOutcome,
  type TunedWeight,
} from "./tune-signal-weights.js";
import { multiplierFrom } from "./tune-signal-weights-grouped.js";

/**
 * Evidence floor counted in DISTINCT FIXTURES, never rows.
 *
 * Deliberately the same number as `MIN_SAMPLES` and `MIN_SCALE_FIXTURES`: all
 * three express one law (a key needs ~100 independent observations before it may
 * move a score), and `assertFloorsAgree` in the test suite fails if they drift.
 * Exported separately because they are counted in different currencies, and a
 * caller reporting on this table needs to say which one it applied.
 */
export const MIN_FIXTURES = 100;

/**
 * One observation: a reading plus its SETTLED outcome, carrying the identity of
 * the independent unit it came from.
 *
 * `fixtureKey` is REQUIRED and never inferred. The repo's own measurement is
 * that a wrong group key (or a missing one defaulted to the row id) silently
 * reintroduces exactly the inflation this module exists to remove, so a caller
 * that cannot name the fixture cannot reach this type at all.
 */
export interface FixtureKeyOutcome extends KeyOutcome {
  /** Independent unit — for NFL, the fixture identity (season x week). */
  readonly fixtureKey: string;
}

/**
 * Why a key earned, refused, or was excluded. Every value is a real fitted
 * state; there is no "defaulted" case, because a defaulted weight is precisely
 * the thing this module exists to delete.
 */
export type MeasuredVerdict =
  /** Cleared both floors with a positive correlation. The only earning path. */
  | "earned"
  /** Below the ROW floor (100). */
  | "insufficient-sample"
  /** Cleared the row floor but not the DISTINCT-FIXTURE floor. */
  | "insufficient-fixtures"
  /** Correlation is negative: the key anti-predicts and is excluded from voting. */
  | "anti-predictive"
  /** No measurable relationship — flat, or degenerate input. */
  | "inert";

/** Observed spread of a key's readings, so a mixed-scale artifact is visible. */
export interface ReadingShape {
  readonly min: number;
  readonly max: number;
  readonly spread: number;
}

/** One key's measured weight, with every intermediate number retained. */
export interface MeasuredKeyWeight {
  readonly key: string;
  /** Usable rows fed in. Diagnostic only — NOT the evidence count. */
  readonly rows: number;
  /** DISTINCT fixtures. This is the evidence count that drives the floor. */
  readonly fixtures: number;
  /** Point-biserial correlation, from `tuneSignalWeights`. −1..1. */
  readonly correlation: number;
  /** #924's multiplier computed on the ROW count. Shown for comparison. */
  readonly rowMultiplier: number;
  /** How much the row count overstated the weight. 1.0 = no duplication. */
  readonly inflation: number;
  /**
   * The weight the composer uses. In 0..1, never negative (see the file header):
   * an anti-predictive key is 0 and reported, not inverted.
   */
  readonly weight: number;
  readonly verdict: MeasuredVerdict;
  /** Plain-language reason, always populated. Never silently dropped. */
  readonly reason: string;
  readonly readings: ReadingShape;
}

/** A frozen weight table plus the provenance of the fit that produced it. */
export interface SignalWeightTable {
  /** Version string identifying the fit these weights came from. */
  readonly version: string;
  /** Population the fit measured, e.g. "signals @ 118,462 rows". */
  readonly source: string;
  /** `key -> weight`. THE thing a caller hands the composer. */
  readonly weights: Readonly<Record<string, number>>;
  /** Every key measured, strongest evidence first. */
  readonly entries: readonly MeasuredKeyWeight[];
  /** Rows offered to the tuner, including rows later dropped as unusable. */
  readonly rowsOffered: number;
  /** Rows that reached the tuner (finite value, non-empty key). */
  readonly rowsUsed: number;
  readonly measuredCount: number;
  /** Keys that earned weight. */
  readonly earnedCount: number;
  /** Keys present and honest, but not currently allowed to move a score. */
  readonly zeroWeightCount: number;
  /** Deterministic plain-text report for the ops artifact. */
  readonly reportText: string;
}

export interface MeasureSignalWeightsOptions {
  /** Row floor. Defaults to #924's `MIN_SAMPLES`. */
  readonly minSamples?: number;
  /** DISTINCT-FIXTURE floor. Defaults to `MIN_FIXTURES`. */
  readonly minFixtures?: number;
  /** Version string recorded on the table. */
  readonly version?: string;
  /** Population description recorded on the table. */
  readonly source?: string;
}

function isFiniteNumber(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n);
}

/** Observed min/max/spread of a key's readings, or null when none survived. */
function shapeOf(rows: readonly FixtureKeyOutcome[]): ReadingShape | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    const v = r.value;
    if (!isFiniteNumber(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    n += 1;
  }
  if (n === 0) return null;
  const mean = sum / n;
  let sq = 0;
  for (const r of rows) {
    if (!isFiniteNumber(r.value)) continue;
    const d = r.value - mean;
    sq += d * d;
  }
  return { min, max, spread: Math.sqrt(sq / n) };
}

/**
 * Measure a weight for every distinct key in the sample.
 *
 * PURE and db-free. Rows with an empty key or a non-finite reading are dropped
 * BEFORE the tuner runs — a non-finite value is not evidence and would drag the
 * correlation toward zero, and an empty key would produce a table entry nothing
 * can consume. Both are counted so a key that stops appearing is visible rather
 * than silent.
 */
export function measureSignalWeights(
  sample: readonly FixtureKeyOutcome[],
  options: MeasureSignalWeightsOptions = {},
): SignalWeightTable {
  const minSamples = options.minSamples ?? MIN_SAMPLES;
  const minFixtures = options.minFixtures ?? MIN_FIXTURES;
  const version = options.version ?? "unversioned";
  const source = options.source ?? "unspecified population";

  // Filter FIRST, then hand the surviving rows to #924's tuner. Its `pointBiserial`
  // already returns 0 for degenerate input, but feeding it NaN would report a
  // key as `inert` for the wrong reason — a key whose evidence is unreadable is
  // not a key with no effect.
  const usable: FixtureKeyOutcome[] = [];
  for (const row of sample) {
    if (typeof row.key !== "string" || row.key.length === 0) continue;
    if (!isFiniteNumber(row.value)) continue;
    if (row.outcome !== 0 && row.outcome !== 1) continue;
    if (typeof row.fixtureKey !== "string" || row.fixtureKey.length === 0) continue;
    usable.push(row);
  }

  // THE CALL. #924 owns the correlation and the per-key grouping; this module
  // does not reimplement either, it corrects what the result is scaled BY.
  const tuned: readonly TunedWeight[] = tuneSignalWeights(usable);

  // DISTINCT fixtures per key, computed alongside rather than by asking the
  // tuner again, because #924's `TunedWeight.n` is the row count by contract.
  const fixturesByKey = new Map<string, Set<string>>();
  for (const row of usable) {
    const set = fixturesByKey.get(row.key);
    if (set) set.add(row.fixtureKey);
    else fixturesByKey.set(row.key, new Set([row.fixtureKey]));
  }

  const entries: MeasuredKeyWeight[] = [];
  for (const t of tuned) {
    const keyRows = usable.filter((r) => r.key === t.key);
    const fixtures = fixturesByKey.get(t.key)?.size ?? 0;

    // The honest multiplier: same law as `correlationToMultiplier`, but paid in
    // distinct fixtures. `multiplierFrom` takes the floor as an argument, so a
    // caller raising the fixture floor does not silently keep #924's 100.
    const honest = multiplierFrom(t.correlation, fixtures, minFixtures);
    const inflation = t.multiplier === 0 ? 1 : Math.abs(t.multiplier / honest || 1);

    let verdict: MeasuredVerdict;
    let reason: string;
    let weight = honest;

    if (t.n < minSamples) {
      verdict = "insufficient-sample";
      reason = `${t.n} usable rows, below the row floor of ${minSamples}`;
      weight = 0;
    } else if (fixtures < minFixtures) {
      verdict = "insufficient-fixtures";
      reason =
        `${t.n} rows but only ${fixtures} distinct fixtures, below the floor of ${minFixtures}; ` +
        `the rows are restatements of a few games, not ${t.n} independent observations ` +
        `(the row-count multiplier would have claimed ${t.multiplier.toFixed(4)})`;
      weight = 0;
    } else if (t.correlation < 0) {
      verdict = "anti-predictive";
      reason =
        `r=${t.correlation.toFixed(4)} over ${fixtures} fixtures — the key anti-predicts, so it is ` +
        `excluded from voting at weight 0 rather than inverted; the sign is preserved here and the ` +
        `decision to invert it belongs to a human`;
      weight = 0;
    } else if (t.correlation === 0) {
      verdict = "inert";
      reason = `r=0 over ${fixtures} fixtures — no measurable relationship to the outcome`;
      weight = 0;
    } else {
      verdict = "earned";
      reason = `r=${t.correlation.toFixed(4)} over ${fixtures} distinct fixtures`;
    }

    entries.push({
      key: t.key,
      rows: t.n,
      fixtures,
      correlation: t.correlation,
      rowMultiplier: t.multiplier,
      inflation,
      weight,
      verdict,
      reason,
      readings: shapeOf(keyRows) ?? { min: 0, max: 0, spread: 0 },
    });
  }

  // Strongest measured evidence first, so the founder report leads with what
  // works. Ties break on |correlation| then key, so the order is total and the
  // report is byte-stable between refits of an unchanged population.
  entries.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (Math.abs(b.correlation) !== Math.abs(a.correlation)) {
      return Math.abs(b.correlation) - Math.abs(a.correlation);
    }
    return a.key.localeCompare(b.key);
  });

  const weights: Record<string, number> = {};
  for (const e of entries) weights[e.key] = e.weight;

  const earned = entries.filter((e) => e.verdict === "earned");
  const table: SignalWeightTable = {
    version,
    source,
    weights: Object.freeze(weights),
    entries: Object.freeze(entries),
    rowsOffered: sample.length,
    rowsUsed: usable.length,
    measuredCount: entries.length,
    earnedCount: earned.length,
    zeroWeightCount: entries.length - earned.length,
    reportText: formatWeightReport({
      version,
      source,
      entries,
      rowsOffered: sample.length,
      rowsUsed: usable.length,
    }),
  };
  return table;
}

/**
 * The weight the composer should use for `key`, or `null` when the key was
 * never measured.
 *
 * `null` is deliberately distinct from `0`. "Measured, and it earns nothing" and
 * "never measured" have different fixes — the first needs evidence, the second
 * needs a producer — and a caller that collapses them cannot tell which problem
 * it has.
 */
export function measuredWeightFor(table: SignalWeightTable, key: string): number | null {
  // `noUncheckedIndexedAccess` makes the absent-key case `undefined` rather than
  // a lie about the type, which is exactly the distinction this function exists
  // to preserve: absent is silence, 0 is a measurement.
  const w: number | undefined = table.weights[key];
  return w !== undefined && isFiniteNumber(w) ? w : null;
}

/** Render a weight table as a deterministic plain-text ops report. */
export function formatWeightReport(input: {
  readonly version: string;
  readonly source: string;
  readonly entries: readonly MeasuredKeyWeight[];
  readonly rowsOffered: number;
  readonly rowsUsed: number;
}): string {
  const earned = input.entries.filter((e) => e.verdict === "earned");
  const rest = input.entries.filter((e) => e.verdict !== "earned");

  const lines: string[] = [];
  lines.push(
    `signal weight table ${input.version} — ${input.source}: ` +
      `${input.entries.length} keys measured, ${earned.length} earned weight, ${rest.length} at zero`,
  );
  lines.push(
    `  rows offered ${input.rowsOffered}, used ${input.rowsUsed} ` +
      `(dropped ${input.rowsOffered - input.rowsUsed}: empty key, non-finite reading, or unusable outcome)`,
  );
  lines.push("");
  lines.push("EARNED (weight fitted on predictive power vs a settled outcome, evidence in distinct fixtures)");
  if (earned.length === 0) lines.push("  (none - no key cleared both floors with a joinable outcome)");
  for (const e of earned) {
    lines.push(
      `  ${e.key.padEnd(30)} weight=${e.weight.toFixed(4).padStart(7)}  r=${e.correlation
        .toFixed(4)
        .padStart(8)}  fixtures=${String(e.fixtures).padStart(4)}  rows=${String(e.rows).padStart(6)}  spread=${e.readings.spread.toFixed(4)}`,
    );
  }
  lines.push("");
  lines.push("ZERO WEIGHT (present and honest, but not currently allowed to move a score)");
  for (const e of rest) {
    lines.push(
      `  ${e.key.padEnd(30)} weight=0.0000  r=${e.correlation.toFixed(4).padStart(8)}  ` +
        `fixtures=${String(e.fixtures).padStart(4)}  rows=${String(e.rows).padStart(6)}  ${e.verdict}: ${e.reason}`,
    );
  }
  return lines.join("\n");
}