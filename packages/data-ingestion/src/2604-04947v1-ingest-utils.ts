/**
 * SUMMIR: A Hallucination-Aware Framework for Ranking Sports Insights from LLMs (arXiv:2604.04947v1) — REPLACEMENT for [1478]
 *
 * arXiv:2604.04947v1 · lane:mixed · verdict:ADAPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: General ingest utilities: string-to-number coercion with fail-closed nulls, per-field coverage statistics over row batches, and z-score outlier flags for feed anomaly triage.
 *
 * Improvement (record):
 * Add a FactScore-style atomic verification gate to GSE's pre-game content pipeline: every LLM-extracted insight is verified against its source article before entering any draft, and insights are ranked with SUMMIR features trained on Garrett's actual engagement data.
 *
 * ACCEPTANCE GATE:
 * ADAPT bar: hallucination gate must catch ≥90% of planted false insights (adversarial eval) without dropping >15% of true ones, and SUMMIR-ranked posts must correlate positively with engagement vs chronological posting.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: ingest utility. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2604.04947v1" as const;
export const LANE = "mixed" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT bar: hallucination gate must catch ≥90% of planted false insights (adversarial eval) without dropping >15% of true ones, and SUMMIR-ranked posts must correlate positively with engagement vs chronological posting.`;

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
