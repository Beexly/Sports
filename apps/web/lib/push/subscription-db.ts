/**
 * Push subscriptions — persistence boundary.
 *
 * Mirrors apps/web/lib/watchlist/db.ts exactly (same doc-comment rationale
 * applies verbatim): `db` is accepted as `unknown` at every public function
 * and cast internally to `PushSubscriptionDb`, a small hand-written surface
 * — not the generated PrismaClient type — because the `PushSubscription`
 * model (packages/db/prisma/schema.prisma, migration
 * 20260719120000_add_push_subscriptions) is founder-applied. The cast is
 * honest: any object with this shape works, including the real client once
 * the founder runs the migration.
 *
 * Every exported function here is failure-isolated and NEVER throws —
 * callers (the API routes, the watchlist alert dispatch fan-out) get a
 * discriminated `PushSubscriptionDbResult` instead, so a DB error —
 * including the table genuinely not existing yet — degrades to an honest
 * 503 (routes) or an honest empty fan-out (dispatch), never an unhandled
 * 500 or a thrown error.
 */

export interface StoredPushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}

/** Minimal Prisma-delegate-shaped surface this module depends on. */
export interface PushSubscriptionDb {
  pushSubscription: {
    findMany(args: { where: { userId: string } }): Promise<StoredPushSubscriptionRow[]>;
    upsert(args: {
      where: { endpoint: string };
      create: { userId: string; endpoint: string; p256dh: string; auth: string };
      update: { userId: string; p256dh: string; auth: string };
    }): Promise<StoredPushSubscriptionRow>;
    deleteMany(args: {
      where: { userId: string; endpoint: string };
    }): Promise<{ count: number }>;
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
 *  founder has not applied the migration yet. */
export function isTableMissingError(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return (
    code === "P2021" ||
    message.includes("does not exist in the current database") ||
    message.includes('relation "push_subscriptions" does not exist')
  );
}

/** Prisma P1001 = can't reach the database server (mirrors
 *  apps/web/lib/entitlements.ts's isDatabaseUnreachable). */
export function isDatabaseUnreachableError(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return code === "P1001" || message.includes("Can't reach database server");
}

export type PushSubscriptionDbResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: "table_missing" }
  | { readonly ok: false; readonly reason: "unreachable" }
  | { readonly ok: false; readonly reason: "error"; readonly message: string };

function failureFrom<T>(error: unknown): PushSubscriptionDbResult<T> {
  if (isTableMissingError(error)) return { ok: false, reason: "table_missing" };
  if (isDatabaseUnreachableError(error)) return { ok: false, reason: "unreachable" };
  return { ok: false, reason: "error", message: errorMessage(error) };
}

/** Every stored subscription for a user — the fan-out list the watchlist
 *  alert dispatch (channels/web-push-channel.ts caller) sends to. */
export async function listPushSubscriptionsForUser(
  dbArg: unknown,
  userId: string,
): Promise<PushSubscriptionDbResult<StoredPushSubscriptionRow[]>> {
  const db = dbArg as PushSubscriptionDb;
  try {
    const rows = await db.pushSubscription.findMany({ where: { userId } });
    return { ok: true, data: rows };
  } catch (error) {
    return failureFrom(error);
  }
}

/**
 * Upsert keyed on `endpoint` (globally unique — it IS the push service's
 * per-device delivery address). Re-subscribing the same device refreshes
 * its keys in place rather than accumulating duplicate rows; a device
 * moving between accounts (rare, but possible on a shared browser) is
 * re-owned to the new `userId` rather than left orphaned on the old one.
 */
export async function upsertPushSubscription(
  dbArg: unknown,
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<PushSubscriptionDbResult<StoredPushSubscriptionRow>> {
  const db = dbArg as PushSubscriptionDb;
  try {
    const row = await db.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth },
      update: { userId, p256dh, auth },
    });
    return { ok: true, data: row };
  } catch (error) {
    return failureFrom(error);
  }
}

/**
 * Delete scoped to (userId, endpoint) — never a bare endpoint delete — so
 * one signed-in caller can never remove another user's subscription by
 * guessing/replaying an endpoint string. Idempotent: deleting a
 * subscription that doesn't exist (or belongs to someone else) reports
 * `deleted: false` with `ok: true`, not an error, matching
 * deleteWatchlistEntry's unfollow-what-you-don't-follow doctrine.
 */
export async function deletePushSubscription(
  dbArg: unknown,
  userId: string,
  endpoint: string,
): Promise<PushSubscriptionDbResult<{ deleted: boolean }>> {
  const db = dbArg as PushSubscriptionDb;
  try {
    const result = await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true, data: { deleted: result.count > 0 } };
  } catch (error) {
    return failureFrom(error);
  }
}
