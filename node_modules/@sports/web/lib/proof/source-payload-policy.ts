/**
 * Source Payload Policy — separate forensic INTEGRITY from storage WASTE.
 *
 * Raw provider payloads are valuable for proof (you can show exactly what a source
 * returned), but storing unbounded raw JSON in Postgres (Neon) grows cost and bloats
 * the system of record. The integrity that actually matters is a content HASH + small
 * metadata — that proves what was fetched without warehousing it. This policy decides,
 * per mode, what gets stored where, and refuses an unlimited raw-in-Postgres default.
 *
 * Pure, no I/O. The default is hash-only; db-full requires a retention bound; the
 * object-storage path requires an object key (and is "planned" until R2/S3 is wired).
 */

export type PayloadMode = "hash-only" | "db-full" | "object-storage-planned";

/** Metadata kept in Postgres for EVERY snapshot regardless of mode — the proof anchor. */
export const ALWAYS_KEPT_METADATA = [
  "hash",
  "bytes",
  "provider",
  "sourceKind",
  "sport",
  "externalId",
  "fetchedAt",
  "ingestionRunId",
  "objectKey",
] as const;

export const PRODUCTION_DEFAULT_MODE: PayloadMode = "hash-only";

export interface PayloadPolicyOptions {
  /** Retention bound (days) for raw rows in db-full mode. Required there; ignored otherwise. */
  readonly retentionDays?: number;
  /** Object key for the object-storage path. Required there. */
  readonly objectKey?: string;
}

export interface PayloadPolicyDecision {
  readonly mode: PayloadMode;
  /** Whether the full raw payload is written to Postgres. */
  readonly storeRawInPostgres: boolean;
  /** Retention bound for raw rows (days). Null when no raw is stored in Postgres. */
  readonly retentionDays: number | null;
  /** Whether an object-storage key is required (object-storage path). */
  readonly requiresObjectKey: boolean;
  readonly metadataFields: readonly string[];
  readonly warnings: readonly string[];
}

const DEFAULT_DB_FULL_RETENTION_DAYS = 7;

/**
 * Resolve the storage decision for a payload mode. Production defaults to hash-only
 * (no raw in Postgres). db-full always carries a retention bound (and a warning when
 * it had to be defaulted). object-storage-planned requires an object key.
 */
export function resolvePayloadPolicy(
  mode: PayloadMode = PRODUCTION_DEFAULT_MODE,
  opts: PayloadPolicyOptions = {}
): PayloadPolicyDecision {
  const warnings: string[] = [];
  const metadataFields = [...ALWAYS_KEPT_METADATA];

  if (mode === "hash-only") {
    return {
      mode,
      storeRawInPostgres: false,
      retentionDays: null,
      requiresObjectKey: false,
      metadataFields,
      warnings,
    };
  }

  if (mode === "db-full") {
    let retentionDays = opts.retentionDays;
    if (retentionDays === undefined || !Number.isFinite(retentionDays) || retentionDays <= 0) {
      retentionDays = DEFAULT_DB_FULL_RETENTION_DAYS;
      warnings.push(
        `db-full stores raw payloads in Postgres — bounded retention is mandatory; defaulted to ${DEFAULT_DB_FULL_RETENTION_DAYS} days. Set retentionDays explicitly.`
      );
    }
    warnings.push("db-full grows the system of record — prefer hash-only or object storage for long-lived payloads.");
    return {
      mode,
      storeRawInPostgres: true,
      retentionDays,
      requiresObjectKey: false,
      metadataFields,
      warnings,
    };
  }

  // object-storage-planned
  if (!opts.objectKey || opts.objectKey.trim() === "") {
    warnings.push("object-storage mode requires an objectKey (and a hash) — none provided.");
  }
  warnings.push("object-storage path is PLANNED — wire R2/S3 before relying on it in production.");
  return {
    mode,
    storeRawInPostgres: false,
    retentionDays: null,
    requiresObjectKey: true,
    metadataFields,
    warnings,
  };
}
