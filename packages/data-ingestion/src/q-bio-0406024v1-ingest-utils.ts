/**
 * Projective geometry for human motion, with an application to injury risk
 *
 * arXiv:q-bio/0406024v1 · lane:mixed · verdict:ADAPT · owner:Mimo · doctrine:SITUATIONAL
 *
 * Mechanism: General ingest utilities: string-to-number coercion with fail-closed nulls, per-field coverage statistics over row batches, and z-score outlier flags for feed anomaly triage.
 *
 * Improvement (record):
 * Adapt the paper's redundancy formalism to NGS tracking data in gse_redundancy.py: compute motion-redundancy metrics per player from tracking, and test bottom-decile redundancy drops as an injury-risk feature for the injury-analytics lane.
 *
 * ACCEPTANCE GATE:
 * ADAPT bar: bottom-decile redundancy drops must associate with elevated subsequent injury incidence (OR > 1 with 95% CI excluding 1, workload-adjusted) on a hold-out season; if no signal, keep the metric as descriptive only and record the negative.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: ingest utility. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "q-bio/0406024v1" as const;
export const LANE = "mixed" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT bar: bottom-decile redundancy drops must associate with elevated subsequent injury incidence (OR > 1 with 95% CI excluding 1, workload-adjusted) on a hold-out season; if no signal, keep the metric as descriptive only and record the negative.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;

/** Coerced scalar type for normalized records. */
export type CoercedValue = number | string | boolean | null;

/**
 * Coerce declared numeric fields (strings like "12.5" become numbers);
 * non-coercible numerics become null. Other primitives pass through;
 * objects/arrays become null (fail-closed).
 */
export function coerceRecord(
  record: Record<string, unknown>,
  numericFields: string[],
): Record<string, CoercedValue> {
  const out: Record<string, CoercedValue> = {};
  for (const [k, v] of Object.entries(record)) {
    if (numericFields.includes(k)) {
      const n = typeof v === "string" ? Number(v) : v;
      out[k] = typeof n === "number" && Number.isFinite(n) ? n : null;
    } else if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      out[k] = Number.isFinite(v as number) || typeof v !== "number" ? (v as CoercedValue) : null;
    } else {
      out[k] = null;
    }
  }
  return out;
}

/** Fraction of rows where each field is present (non-null/undefined). */
export function fieldCoverage(rows: Array<Record<string, unknown>>): Record<string, number> | null {
  if (rows.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      counts[k] = (counts[k] ?? 0) + (v === null || v === undefined ? 0 : 1);
    }
  }
  for (const k of Object.keys(counts)) counts[k] = (counts[k] as number) / rows.length;
  return counts;
}

/** Flag values whose |z-score| exceeds the threshold. */
export function zScoreOutlierFlags(values: number[], threshold = 3): boolean[] | null {
  if (values.length < 2) return null;
  if (!values.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) return null;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - m) * (v - m), 0) / values.length);
  if (sd === 0) return values.map(() => false);
  return values.map((v) => Math.abs((v - m) / sd) > threshold);
}
