/**
 * APNs device registration — persistence.
 *
 * Mirrors lib/push/subscription-db.ts: same discriminated result type, same
 * table-missing / unreachable / error classification, same "never a 500"
 * contract. The difference is the shape of the row, not the discipline.
 *
 * The `apns_devices` table is new. Until the founder applies its migration,
 * every call returns `{ ok: false, reason: "table_missing" }` and the route
 * answers an honest 503 — which is the correct state for a client that has
 * been told pushes are not activated yet, not an error worth a stack trace.
 */

export type ApnsDeviceDbResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: "table_missing" }
  | { readonly ok: false; readonly reason: "unreachable" }
  | { readonly ok: false; readonly reason: "error"; readonly message: string };

export interface ApnsDeviceRow {
  readonly id: string;
  readonly token: string;
  readonly platform: "ios";
  readonly createdAt: Date;
}

export interface ApnsDeviceDbLike {
  apnsDevice: {
    upsert(args: {
      where: { token: string };
      create: {
        userId: string;
        token: string;
        platform: "ios";
        appDeviceId?: string | null;
      };
      update: { userId: string; platform: "ios"; appDeviceId?: string | null };
    }): Promise<ApnsDeviceRow>;
    deleteMany(args: { where: { userId: string; token: string } }): Promise<{ count: number }>;
    deleteManyByUser?(args: { where: { userId: string } }): Promise<{ count: number }>;
  };
}

function isTableMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /apns_devices|does not exist|Unknown table|42P01/i.test(message);
}

function isDatabaseUnreachableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNREFUSED|ETIMEDOUT|P1001|can't reach database/i.test(message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Registers (or re-points) a device token.
 *
 * The upsert is keyed on the token, which is globally unique per device. A
 * reader who signs out and back in on the same phone REPLACES the row's
 * userId rather than accumulating one row per account — otherwise a shared
 * family tablet would keep a previous account's push routing alive.
 */
export async function upsertApnsDevice(
  db: ApnsDeviceDbLike,
  userId: string,
  input: { readonly token: string; readonly platform?: "ios"; readonly appDeviceId?: string | null },
): Promise<ApnsDeviceDbResult<ApnsDeviceRow>> {
  try {
    const row = await db.apnsDevice.upsert({
      where: { token: input.token },
      create: {
        userId,
        token: input.token,
        platform: "ios",
        appDeviceId: input.appDeviceId ?? null,
      },
      update: { userId, platform: "ios", appDeviceId: input.appDeviceId ?? null },
    });
    return { ok: true, data: row };
  } catch (error) {
    if (isTableMissingError(error)) return { ok: false, reason: "table_missing" };
    if (isDatabaseUnreachableError(error)) return { ok: false, reason: "unreachable" };
    return { ok: false, reason: "error", message: errorMessage(error) };
  }
}

/**
 * Removes a token, or every token for the user when `token` is omitted.
 *
 * Unsubscribe-by-user is what sign-out and account deletion call: leaving
 * rows behind means a sold device keeps receiving another person's graded
 * picks, and the server has no other way to learn the device is gone.
 */
export async function deleteApnsDevice(
  db: ApnsDeviceDbLike,
  userId: string,
  token?: string,
): Promise<ApnsDeviceDbResult<{ readonly deleted: number }>> {
  try {
    const result = token
      ? await db.apnsDevice.deleteMany({ where: { userId, token } })
      : db.apnsDevice.deleteManyByUser
        ? await db.apnsDevice.deleteManyByUser({ where: { userId } })
        : { count: 0 };
    return { ok: true, data: { deleted: result.count } };
  } catch (error) {
    if (isTableMissingError(error)) return { ok: false, reason: "table_missing" };
    if (isDatabaseUnreachableError(error)) return { ok: false, reason: "unreachable" };
    return { ok: false, reason: "error", message: errorMessage(error) };
  }
}
