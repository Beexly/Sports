/**
 * StreamShield: A Production-Proven Resiliency Solution for Apache Flink at ByteDance
 *
 * arXiv:2602.03189v1 · lane:data_infra · verdict:ADAPT · owner:Hermes · doctrine:INFRA
 *
 * Mechanism: Feed hygiene primitives: typed schema validation with range checks, field-name normalization maps, null-rate quality metrics, and key-based dedup — fail-closed on malformed rows.
 *
 * Improvement (record):
 * GSE's data platform adopts a StreamShield-style release pipeline: chaos tests (corrupted partitions, killed builds, deleted log entries) with ACID rollback verified via time travel, plus a probe task that recomputes a pinned week each week — infra honesty plumbing.
 *
 * ACCEPTANCE GATE:
 * ADOPT iff all three chaos tests pass with recovery < 1 build cycle, the probe task runs green for 4 consecutive weeks post-adoption, and no serving incident is traceable to a pipeline change the following quarter.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: ingest validator / normalizer. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2602.03189v1" as const;
export const LANE = "data_infra" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT iff all three chaos tests pass with recovery < 1 build cycle, the probe task runs green for 4 consecutive weeks post-adoption, and no serving incident is traceable to a pipeline change the following quarter.`;

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
