/**
 * Stored-signal reader — the READER half the `signals` table never had.
 *
 * The write cron (`/api/cron/signal-ledger-write`, hourly) fills `signals`
 * from the four measured entity tables, but until now the only reader was
 * `/api/ops/signal-ledger-state`, which counts rows and deliberately selects
 * no values. A table that is written and never read is fuel with no engine —
 * the same disease `composeLedger` had before the shadow composer.
 *
 * This module closes the loop: it reads stored rows back out as
 * `LedgerCandidate[]` so the production composer (`composeLedgerShadow` →
 * `composeByEntity` → `composeLedger`) can run against the PERSISTED ledger,
 * not just a fresh projection of the entity tables. The census cron reports
 * both series side by side (`data.shadow` = projected, `data.shadowStored` =
 * stored) — same math, different fuel — which is what makes a divergence
 * between "what the tables say today" and "what the ledger holds" visible.
 *
 * READ-ONLY. Selects only; never inserts, updates, or deletes. The db handle
 * is injected as a minimal interface (same pattern as the loader/writer) so
 * this is unit-testable with fakes and can never drag a full Prisma client
 * into a test.
 */

import type { EntityType, LedgerCandidate } from "@sports/prediction-engine";

/** Prisma returns DateTime as Date; a serialized/cached client may hand back ISO strings. */
type DateLike = Date | string;

function toIso(value: DateLike): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** The subset of the Prisma client this reader needs. Injected, never imported. */
export interface SignalStoreDb {
  signal: {
    findMany(args: unknown): Promise<
      ReadonlyArray<{
        entityType: string;
        entityId: string;
        key: string;
        category: string;
        value: number;
        weight: number;
        confidence: number;
        capturedAt: DateLike;
        season: number;
        week: number;
      }>
    >;
  };
}

export interface StoredSignalFilter {
  /** Restrict to an entity class. The schema stores "player" | "team" as strings. */
  readonly entityType?: EntityType;
  readonly entityId?: string;
  readonly season?: number;
  readonly week?: number;
  /** Cap rows per call. Bounds the compose cost on a growing ledger. */
  readonly limit?: number;
}

export interface StoredSignalReport {
  /** Rows that survived validation and mapping. */
  readonly candidates: readonly LedgerCandidate[];
  /** Rows read before validation. */
  readonly rowsRead: number;
  /** Rows dropped (bad entityType, non-finite value/weight, bad timestamp). */
  readonly rowsDropped: number;
}

const DEFAULT_LIMIT = 50_000;

function isEntityType(value: string): value is EntityType {
  return value === "player" || value === "team";
}

/**
 * Read the persisted ledger and map it to composer input.
 *
 * A stored row that cannot be honestly composed — unknown entityType,
 * non-finite value or negative weight, unparsable timestamp — is DROPPED and
 * counted, never defaulted. The composer must never blend a synthetic vote,
 * and a stored row that fails validation is a data-quality finding, not fuel.
 */
export async function readStoredSignals(
  db: SignalStoreDb,
  filter: StoredSignalFilter = {},
): Promise<StoredSignalReport> {
  const where: Record<string, unknown> = {};
  if (filter.entityType !== undefined) where.entityType = filter.entityType;
  if (filter.entityId !== undefined) where.entityId = filter.entityId;
  if (filter.season !== undefined) where.season = filter.season;
  if (filter.week !== undefined) where.week = filter.week;

  const rows = await db.signal.findMany({
    where,
    orderBy: { capturedAt: "desc" },
    take: filter.limit ?? DEFAULT_LIMIT,
  });

  const candidates: LedgerCandidate[] = [];
  let rowsDropped = 0;
  for (const r of rows) {
    if (!isEntityType(r.entityType)) {
      rowsDropped += 1;
      continue;
    }
    if (!r.entityId || !r.key) {
      rowsDropped += 1;
      continue;
    }
    if (!Number.isFinite(r.value) || !Number.isFinite(r.weight) || r.weight < 0) {
      rowsDropped += 1;
      continue;
    }
    if (!Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1) {
      rowsDropped += 1;
      continue;
    }
    let capturedAt: string;
    try {
      capturedAt = toIso(r.capturedAt);
      if (!Number.isFinite(Date.parse(capturedAt))) throw new Error("bad timestamp");
    } catch {
      rowsDropped += 1;
      continue;
    }
    candidates.push({
      entityType: r.entityType,
      entityId: r.entityId,
      key: r.key,
      category: r.category,
      value: r.value,
      weight: r.weight,
      confidence: r.confidence,
      capturedAt,
      season: r.season,
      week: r.week,
    });
  }

  return { candidates, rowsRead: rows.length, rowsDropped };
}
