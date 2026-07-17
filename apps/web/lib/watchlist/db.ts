/**
 * Watchlist — persistence boundary.
 *
 * `db` is accepted as `unknown` at every public function and cast
 * internally to `WatchlistDb`, a small hand-written surface — not the
 * generated PrismaClient type — because the `Watchlist` model
 * (packages/db/prisma/schema.prisma, migration
 * 20260717120000_add_watchlist) is founder-applied; its Prisma Client
 * delegate does not exist until `prisma generate` runs against a schema
 * that includes it, so today's already-generated client type structurally
 * lacks `watchlist`. This mirrors
 * packages/ingestion-pipeline/src/line-archive.ts exactly (see its module
 * doc comment for the full rationale). The cast is honest: any object with
 * this shape works, including the real client once codegen catches up.
 *
 * Every exported function here is failure-isolated and NEVER throws —
 * callers (the API routes) get a discriminated `WatchlistDbResult` instead,
 * so a DB error — including the table genuinely not existing yet, because
 * the founder has not applied the migration — degrades to an honest 503,
 * never an unhandled 500.
 */

import type { WatchlistEntityType, WatchlistEntry } from "./types";

interface StoredWatchlistRow {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
}

/** Minimal Prisma-delegate-shaped surface this module depends on. */
export interface WatchlistDb {
  watchlist: {
    findMany(args: {
      where: { userId: string };
      orderBy?: { createdAt: "asc" | "desc" };
    }): Promise<StoredWatchlistRow[]>;
    findUnique(args: {
      where: {
        userId_entityType_entityId: {
          userId: string;
          entityType: string;
          entityId: string;
        };
      };
    }): Promise<StoredWatchlistRow | null>;
    count(args: { where: { userId: string } }): Promise<number>;
    create(args: {
      data: { userId: string; entityType: string; entityId: string };
    }): Promise<StoredWatchlistRow>;
    delete(args: {
      where: {
        userId_entityType_entityId: {
          userId: string;
          entityType: string;
          entityId: string;
        };
      };
    }): Promise<StoredWatchlistRow>;
  };
}

function toEntry(row: StoredWatchlistRow): WatchlistEntry {
  return {
    id: row.id,
    userId: row.userId,
    entityType: row.entityType as WatchlistEntityType,
    entityId: row.entityId,
    createdAt: row.createdAt,
  };
}

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Prisma P2021 = "table does not exist" — the honest signal that the
 *  founder has not applied the migration yet. Message-matched too, since a
 *  raw/adapter path can surface the same condition without the P-code. */
export function isTableMissingError(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return (
    code === "P2021" ||
    message.includes("does not exist in the current database") ||
    message.includes('relation "watchlist_entries" does not exist')
  );
}

/** Prisma P1001 = can't reach the database server (mirrors
 *  apps/web/lib/entitlements.ts's isDatabaseUnreachable). */
export function isDatabaseUnreachableError(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return code === "P1001" || message.includes("Can't reach database server");
}

/** Prisma P2002 = unique constraint violation — the race where two
 *  concurrent follow requests both attempt the create. */
function isUniqueConstraintError(error: unknown): boolean {
  return errorCode(error) === "P2002";
}

/** Prisma P2025 = record not found — the target of `delete`/`update`
 *  doesn't exist. Treated as an idempotent no-op by `deleteWatchlistEntry`. */
function isRecordNotFoundError(error: unknown): boolean {
  return errorCode(error) === "P2025";
}

export type WatchlistDbResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: "table_missing" }
  | { readonly ok: false; readonly reason: "unreachable" }
  | { readonly ok: false; readonly reason: "error"; readonly message: string };

function failureFrom<T>(error: unknown): WatchlistDbResult<T> {
  if (isTableMissingError(error)) return { ok: false, reason: "table_missing" };
  if (isDatabaseUnreachableError(error)) return { ok: false, reason: "unreachable" };
  return { ok: false, reason: "error", message: errorMessage(error) };
}

export async function listWatchlistEntries(
  dbArg: unknown,
  userId: string,
): Promise<WatchlistDbResult<WatchlistEntry[]>> {
  const db = dbArg as WatchlistDb;
  try {
    const rows = await db.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return { ok: true, data: rows.map(toEntry) };
  } catch (error) {
    return failureFrom(error);
  }
}

export async function countWatchlistEntries(
  dbArg: unknown,
  userId: string,
): Promise<WatchlistDbResult<number>> {
  const db = dbArg as WatchlistDb;
  try {
    const count = await db.watchlist.count({ where: { userId } });
    return { ok: true, data: count };
  } catch (error) {
    return failureFrom(error);
  }
}

export async function findWatchlistEntry(
  dbArg: unknown,
  userId: string,
  entityType: WatchlistEntityType,
  entityId: string,
): Promise<WatchlistDbResult<WatchlistEntry | null>> {
  const db = dbArg as WatchlistDb;
  try {
    const row = await db.watchlist.findUnique({
      where: { userId_entityType_entityId: { userId, entityType, entityId } },
    });
    return { ok: true, data: row ? toEntry(row) : null };
  } catch (error) {
    return failureFrom(error);
  }
}

export interface CreateWatchlistEntryResult {
  readonly entry: WatchlistEntry;
  /** false when a concurrent request already created the row and this call
   *  raced into the unique-constraint path — the caller still gets the
   *  authoritative row, just not the one it inserted. */
  readonly created: boolean;
}

/**
 * Idempotent create: on a unique-constraint race (P2002 — a concurrent
 * follow of the same entity), re-fetches and returns the existing row
 * instead of surfacing an error. Callers that want cap-enforcement should
 * check `findWatchlistEntry` + `countWatchlistEntries` BEFORE calling this
 * (see the follow route) — this function only guarantees idempotency, not
 * limit enforcement, since limits are a tier decision that belongs to the
 * caller, not this persistence boundary.
 */
export async function createWatchlistEntry(
  dbArg: unknown,
  userId: string,
  entityType: WatchlistEntityType,
  entityId: string,
): Promise<WatchlistDbResult<CreateWatchlistEntryResult>> {
  const db = dbArg as WatchlistDb;
  try {
    const row = await db.watchlist.create({ data: { userId, entityType, entityId } });
    return { ok: true, data: { entry: toEntry(row), created: true } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existing = await findWatchlistEntry(dbArg, userId, entityType, entityId);
      if (existing.ok && existing.data) {
        return { ok: true, data: { entry: existing.data, created: false } };
      }
      // The race resolved (row exists per Postgres) but our re-fetch failed
      // or came back empty — report the original constraint failure rather
      // than inventing a synthetic entry.
      return failureFrom(error);
    }
    return failureFrom(error);
  }
}

/** Idempotent delete: a target that was never followed is reported as
 *  `deleted: false` with `ok: true`, not an error — unfollowing something
 *  you don't follow is a no-op success, not a failure. */
export async function deleteWatchlistEntry(
  dbArg: unknown,
  userId: string,
  entityType: WatchlistEntityType,
  entityId: string,
): Promise<WatchlistDbResult<{ deleted: boolean }>> {
  const db = dbArg as WatchlistDb;
  try {
    await db.watchlist.delete({
      where: { userId_entityType_entityId: { userId, entityType, entityId } },
    });
    return { ok: true, data: { deleted: true } };
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return { ok: true, data: { deleted: false } };
    }
    return failureFrom(error);
  }
}
