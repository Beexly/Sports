import { createHash } from "node:crypto";

export type FetchServingStatus = "FRESH" | "STALE";
export type FetchSnapshotStorageMode = "hash-only" | "r2-object";

export interface FetchServingTableTarget {
  readonly kind: "r2-duckdb";
  readonly status: "INFRA";
  readonly bucketBinding: "R2_FETCH_ARCHIVE";
  readonly snapshotRelation: "fetch_store.source_snapshots";
  readonly servingRelation: "fetch_store.latest_by_source";
  readonly partitionKeys: readonly ["source_id", "fetched_date"];
}

export interface FetchServingSnapshotInput {
  readonly sourceId: string;
  readonly sourceKind: string;
  readonly fetchedAt: string | Date;
  readonly payload: unknown;
  readonly rowCount: number;
  readonly entityKey?: string | null;
  readonly ttlMs?: number | null;
  readonly storageMode?: FetchSnapshotStorageMode;
}

export interface FetchServingSnapshot {
  readonly sourceId: string;
  readonly sourceKind: string;
  readonly entityKey: string | null;
  readonly fetchedAt: string;
  readonly fetchedDate: string;
  readonly payloadHash: string;
  readonly payloadBytes: number;
  readonly rowCount: number;
  readonly storageMode: FetchSnapshotStorageMode;
  readonly objectKey: string;
  readonly target: FetchServingTableTarget;
}

export interface FetchServingRow {
  readonly sourceId: string;
  readonly sourceKind: string;
  readonly entityKey: string | null;
  readonly fetchedAt: string;
  readonly staleAfter: string | null;
  readonly status: FetchServingStatus;
  readonly payloadHash: string;
  readonly payloadBytes: number;
  readonly rowCount: number;
  readonly objectKey: string;
  readonly priced: false;
}

export interface FetchSnapshotPersistence {
  readonly target: FetchServingTableTarget;
  writeSnapshot(snapshot: FetchServingSnapshot): Promise<void>;
  readLatest(sourceId: string, sourceKind: string, entityKey?: string | null): Promise<FetchServingRow | null>;
}

export const FETCH_SERVING_TABLE_TARGET: FetchServingTableTarget = {
  bucketBinding: "R2_FETCH_ARCHIVE",
  kind: "r2-duckdb",
  partitionKeys: ["source_id", "fetched_date"],
  servingRelation: "fetch_store.latest_by_source",
  snapshotRelation: "fetch_store.source_snapshots",
  status: "INFRA",
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => {
    if (!isPlainRecord(nested)) return nested;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(nested).sort()) {
      sorted[key] = nested[key];
    }
    return sorted;
  });
}

function toIso(value: string | Date): string {
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}

function safeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._=-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildFetchServingSnapshot(input: FetchServingSnapshotInput): FetchServingSnapshot {
  const fetchedAt = toIso(input.fetchedAt);
  const fetchedDate = fetchedAt.slice(0, 10);
  const payloadText = stableStringify(input.payload);
  const payloadHash = createHash("sha256").update(payloadText).digest("hex");
  const sourceId = safeKey(input.sourceId);
  const sourceKind = safeKey(input.sourceKind);
  const entityKey = input.entityKey ? safeKey(input.entityKey) : null;
  const objectKey = [
    "fetch-store",
    `source_id=${sourceId}`,
    `fetched_date=${fetchedDate}`,
    entityKey ? `entity_key=${entityKey}` : "entity_key=all",
    `${sourceKind}-${payloadHash}.json`,
  ].join("/");

  return {
    entityKey,
    fetchedAt,
    fetchedDate,
    objectKey,
    payloadBytes: Buffer.byteLength(payloadText, "utf8"),
    payloadHash,
    rowCount: Math.max(0, Math.trunc(input.rowCount)),
    sourceId,
    sourceKind,
    storageMode: input.storageMode ?? "hash-only",
    target: FETCH_SERVING_TABLE_TARGET,
  };
}

export function buildFetchServingRow(
  snapshot: FetchServingSnapshot,
  options: { readonly now?: string | Date; readonly ttlMs?: number | null } = {},
): FetchServingRow {
  const ttlMs = options.ttlMs ?? null;
  const staleAfter =
    ttlMs === null ? null : new Date(new Date(snapshot.fetchedAt).getTime() + ttlMs).toISOString();
  const now = options.now === undefined ? null : new Date(toIso(options.now));
  const status =
    staleAfter !== null && now !== null && now.getTime() > new Date(staleAfter).getTime()
      ? "STALE"
      : "FRESH";

  return {
    entityKey: snapshot.entityKey,
    fetchedAt: snapshot.fetchedAt,
    objectKey: snapshot.objectKey,
    payloadBytes: snapshot.payloadBytes,
    payloadHash: snapshot.payloadHash,
    priced: false,
    rowCount: snapshot.rowCount,
    sourceId: snapshot.sourceId,
    sourceKind: snapshot.sourceKind,
    staleAfter,
    status,
  };
}

export function buildFetchServingPlan(
  input: FetchServingSnapshotInput,
  options: { readonly now?: string | Date } = {},
): { readonly snapshot: FetchServingSnapshot; readonly servingRow: FetchServingRow } {
  const snapshot = buildFetchServingSnapshot(input);
  return {
    servingRow: buildFetchServingRow(snapshot, { now: options.now, ttlMs: input.ttlMs }),
    snapshot,
  };
}
