/**
 * ContinuityBench: A Benchmark and Systems Study of Stateful Failover in Multi-Provider LLM Routing
 *
 * arXiv:2607.15899v1 · lane:data_infra · verdict:ADAPT · owner:Hermes · doctrine:INFRA
 *
 * Mechanism: Feed hygiene primitives: typed schema validation with range checks, field-name normalization maps, null-rate quality metrics, and key-based dedup — fail-closed on malformed rows.
 *
 * Improvement (record):
 * Build a HandoffBench for the GSE agent-bus that plants 2-3 factual anchors in every parent-to-subagent task and measures the Handoff Preservation Rate of returned reports with a calibrated LLM judge, turning anchor loss into a standing reliability metric.
 *
 * ACCEPTANCE GATE:
 * ADAPT if: (a) the continuitybench harness reproduces the treatment-vs-baseline CPR gap (treatment >=95%, baseline <=5%); (b) the retry-storm repro shows fixed-interval retries destabilizing and jittered backoff stabilizing; (c) judge calibration on 20 hand-labeled handoff cases reaches >=90% agreement. Adopt HPR as a standing gate only if a pilot shows >=1 anchor-loss event the parent would otherwise not have caught.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: ingest validator / normalizer. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2607.15899v1" as const;
export const LANE = "data_infra" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT if: (a) the continuitybench harness reproduces the treatment-vs-baseline CPR gap (treatment >=95%, baseline <=5%); (b) the retry-storm repro shows fixed-interval retries destabilizing and jittered backoff stabilizing; (c) judge calibration on 20 hand-labeled handoff cases reaches >=90% agreement. Adopt HPR as a standing gate only if a pilot shows >=1 anchor-loss event the parent would otherwise not have caught.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;

/** Supported primitive field types for feed schemas. */
export type FieldType = "number" | "string" | "boolean";

/** One field's contract inside a feed schema. */
export interface FieldSpec {
  name: string;
  type: FieldType;
  required: boolean;
  min?: number;
  max?: number;
}

/** Validation outcome with human-readable errors. */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Validate one raw record against a typed schema. Fail-closed: collects errors. */
export function validateRecord(spec: FieldSpec[], record: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  for (const f of spec) {
    const v: unknown = record[f.name];
    if (v === undefined || v === null) {
      if (f.required) errors.push("missing required field: " + f.name);
      continue;
    }
    const t = typeof v;
    if (t !== f.type) {
      errors.push("field " + f.name + ": expected " + f.type + ", got " + t);
      continue;
    }
    if (f.type === "number") {
      const n = v as number;
      if (!Number.isFinite(n)) errors.push("field " + f.name + ": non-finite number");
      if (f.min !== undefined && n < f.min) errors.push("field " + f.name + ": below min " + f.min);
      if (f.max !== undefined && n > f.max) errors.push("field " + f.name + ": above max " + f.max);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Rename feed fields via a mapping (unmapped keys pass through unchanged). */
export function normalizeFeedFields(
  record: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[mapping[k] ?? k] = v;
  }
  return out;
}

/** Fraction of null/undefined values in a column sample. */
export function nullRate(values: unknown[]): number | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const n = values.filter((v) => v === null || v === undefined).length;
  return n / values.length;
}

/** Deduplicate rows by a key function, keeping first occurrence order. */
export function dedupeByKey<T>(rows: T[], key: (r: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = key(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}
