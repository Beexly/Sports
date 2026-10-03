/**
 * Anchor census — MEASURE the league baseline instead of assuming it.
 *
 * V3-350 (`signal-ledger-sources.ts`) requires an `AnchorTable` and deliberately
 * refuses to invent one: a key with no anchor is DROPPED, never voted neutral.
 * That is the right default and it left the chain unrunnable, because nothing in
 * the repo measured those anchors. This module is the missing census: given the
 * same entity rows the adapters read, it computes each key's population mean
 * (`anchor`) and standard deviation (`spread`) and returns them in exactly the
 * `AnchorTable` shape the adapters consume.
 *
 * The design constraint is that an anchor is a MEASUREMENT, not a policy:
 *
 *  - Anchor and spread come from the caller's rows. Nothing is hardcoded, so the
 *    census cannot be "tuned" by editing a constant (the failure that produced
 *    the inverted book path in AGENTS.md).
 *  - A key with fewer than MIN_CENSUS_ROWS rows earns NO anchor. A mean over 3
 *    observations is a fabricated baseline wearing a measurement's clothes, and
 *    it would then be consumed by `normalizeReading` as if it were real.
 *  - Zero variance yields a zero spread, and `normalizeReading` already treats a
 *    non-positive spread as "no anchor" (returns 0). The census reports it as
 *    `zero-variance` rather than dropping it silently, so the founder can see a
 *    dead key instead of a key that quietly vanished.
 *
 * Determinism: no wall clock, no `Math.random`, no `process.env`. Identical rows
 * produce byte-identical output on any machine, which is what makes the census
 * safe to run in a report and diffable between seasons.
 *
 * Read-only and db-free: it takes rows, it never fetches them, and it writes
 * nothing. Whether these values reach the ledger is a separate, founder-gated
 * decision that this module does not presume.
 */

/** Minimum rows before a key's mean is treated as a real population statistic. */
export const MIN_CENSUS_ROWS = 30;

/** Population standard deviation, clamped away from zero. */
export const MIN_SPREAD = 1e-9;

export type AnchorCensusStatus = "measured" | "insufficient-rows" | "zero-variance";

export interface CensusEntry {
  readonly key: string;
  /** Population mean of the observed raw readings. Meaningless unless measured. */
  readonly anchor: number;
  /** Population standard deviation. */
  readonly spread: number;
  /** Rows that carried this key with a finite value. */
  readonly n: number;
  /** Fraction of candidate rows for this key that had a usable value. */
  readonly coverage: number;
  readonly status: AnchorCensusStatus;
}

export interface CensusReport {
  readonly entries: readonly CensusEntry[];
  /** Keys with a usable anchor, in AnchorTable shape. */
  readonly anchors: Readonly<Record<string, { anchor: number; spread: number }>>;
  readonly measuredCount: number;
  readonly skippedCount: number;
  /** The keys the census refused to measure, with the reason. Never silently dropped. */
  readonly skipped: readonly { key: string; reason: AnchorCensusStatus; n: number }[];
}

/** One observed raw reading for a key. `value` is the RAW source reading, unnormalized. */
export interface CensusObservation {
  readonly key: string;
  readonly value: number;
}

function isFiniteNumber(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Welford's online mean/variance.
 *
 * Chosen over the two-pass sum-of-squares formula because a single catastrophic
 * reading (a corrupted EPA of 1e12) poisons `sumSq` in the two-pass form and can
 * even produce a NEGATIVE variance after cancellation. Welford keeps the running
 * M2 term bounded and cannot go negative from rounding.
 */
export class RunningStats {
  private count = 0;
  private mean = 0;
  private m2 = 0;

  push(value: number): void {
    this.count += 1;
    const delta = value - this.mean;
    this.mean += delta / this.count;
    this.m2 += delta * (value - this.mean);
  }

  get n(): number {
    return this.count;
  }

  get average(): number {
    return this.count === 0 ? Number.NaN : this.mean;
  }

  /** Population standard deviation (divides by n, matching the census semantics). */
  get stdDev(): number {
    if (this.count === 0) return Number.NaN;
    const variance = this.m2 / this.count;
    return variance > 0 ? Math.sqrt(variance) : 0;
  }
}

/**
 * Measure the per-key league baseline and spread from observed raw readings.
 *
 * `keys` lists every key the caller intends to project. It is REQUIRED and must
 * be complete, because a key absent from `keys` cannot be distinguished from a key
 * that was simply never observed — and the second reading is the one that hides a
 * dead producer. Listing a key with zero observations yields `insufficient-rows`,
 * not a silent absence.
 */
export function censusAnchors(
  keys: readonly string[],
  observations: readonly CensusObservation[],
  options: { minRows?: number } = {},
): CensusReport {
  const minRows = options.minRows ?? MIN_CENSUS_ROWS;

  const groups = new Map<string, RunningStats>();
  for (const key of keys) groups.set(key, new RunningStats());

  // Rows presented per key, including ones whose value was unusable, so coverage
  // is honest: a key whose column is 100% NULL has coverage 0, not "no rows".
  const presented = new Map<string, number>();
  for (const o of observations) {
    const presentedCount = presented.get(o.key);
    if (presentedCount === undefined) presented.set(o.key, 1);
    else presented.set(o.key, presentedCount + 1);
    const stats = groups.get(o.key);
    if (stats && isFiniteNumber(o.value)) stats.push(o.value);
  }

  const entries: CensusEntry[] = [];
  const skipped: { key: string; reason: AnchorCensusStatus; n: number }[] = [];
  const anchors: Record<string, { anchor: number; spread: number }> = {};

  for (const key of keys) {
    const stats = groups.get(key) ?? new RunningStats();
    const n = stats.n;
    const total = presented.get(key) ?? 0;
    const coverage = total > 0 ? n / total : 0;

    if (n < minRows) {
      entries.push({ key, anchor: Number.NaN, spread: Number.NaN, n, coverage, status: "insufficient-rows" });
      skipped.push({ key, reason: "insufficient-rows", n });
      continue;
    }

    const spread = stats.stdDev;
    if (!isFiniteNumber(spread) || spread < MIN_SPREAD) {
      // Every observation is identical. There is no scale to normalize against,
      // so there is no honest anchor — reported, not dropped.
      entries.push({ key, anchor: stats.average, spread: 0, n, coverage, status: "zero-variance" });
      skipped.push({ key, reason: "zero-variance", n });
      continue;
    }

    entries.push({ key, anchor: stats.average, spread, n, coverage, status: "measured" });
    anchors[key] = { anchor: stats.average, spread };
  }

  const measuredCount = Object.keys(anchors).length;
  return {
    entries,
    anchors,
    measuredCount,
    skippedCount: skipped.length,
    skipped,
  };
}

/** Render a census as plain text, most-evidenced key first. Deterministic ordering. */
export function formatCensusReport(report: CensusReport): string {
  const measured = report.entries
    .filter((e) => e.status === "measured")
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  const skipped = report.entries
    .filter((e) => e.status !== "measured")
    .sort((a, b) => a.key.localeCompare(b.key));

  const lines: string[] = [];
  lines.push(`signal-ledger anchor census: ${report.measuredCount} measured, ${report.skippedCount} skipped`);
  lines.push("");
  lines.push("MEASURED (n >= floor, usable spread)");
  if (measured.length === 0) {
    lines.push("  (none - every key is below the row floor or has no spread)");
  }
  for (const e of measured) {
    lines.push(
      `  ${e.key.padEnd(30)} n=${String(e.n).padStart(6)}  anchor=${e.anchor.toFixed(4).padStart(10)}  spread=${e.spread
        .toFixed(4)
        .padStart(8)}  coverage=${(e.coverage * 100).toFixed(1)}%`,
    );
  }
  lines.push("");
  lines.push("SKIPPED (no anchor earned - these project to NOTHING, by design)");
  if (skipped.length === 0) {
    lines.push("  (none)");
  }
  for (const e of skipped) {
    lines.push(`  ${e.key.padEnd(30)} ${e.status.padEnd(18)} n=${e.n}  coverage=${(e.coverage * 100).toFixed(1)}%`);
  }
  return lines.join("\n");
}
