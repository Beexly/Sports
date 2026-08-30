/**
 * Cash OS (R1) — the Commercial Operating Layer's revenue-tracking core.
 *
 * Additive business instrumentation, unrelated to the SRQC/formal work
 * elsewhere in this repo. Two layers, same split as settlement-health.ts /
 * ai-control-plane/formal-incident.ts:
 *
 *   1. PURE evaluators (`computeMrr`, `cashOsGreen`) — no DB, fully testable
 *      with plain fixtures.
 *   2. A thin DB-backed aggregator (`computeCashSnapshot`) that composes the
 *      pure evaluators with real `RevenueEvent` / `ProductActivation` rows,
 *      via the same minimal parameterized-SQL seam
 *      (`ControlSqlClient`-shaped) used by `lib/ai-control-plane/*` — no new
 *      database client, no ORM coupling.
 */

/** Minimal parameterized-SQL seam. Positional params are $1..$n. */
export interface CashSqlClient {
  query<T = Record<string, unknown>>(text: string, params: readonly unknown[]): Promise<T[]>;
}

/**
 * Adapt a PrismaClient-like object (e.g. `@sports/db`'s `db`) to
 * `CashSqlClient` via `$queryRawUnsafe`. Mirrors
 * `lib/ai-control-plane/control-store.ts`'s `prismaSqlClient` but kept as its
 * own copy here so Cash OS has no import-time coupling to the AI control
 * plane module. Throws if the client has no raw-SQL capability (e.g. the
 * repository's no-op stub client) rather than silently pretending success.
 */
export function prismaCashSqlClient(client: unknown): CashSqlClient {
  return {
    async query<T>(text: string, params: readonly unknown[]): Promise<T[]> {
      const raw = (
        client as { $queryRawUnsafe?: (q: string, ...values: unknown[]) => Promise<unknown> }
      )?.$queryRawUnsafe;
      if (typeof raw !== "function") {
        throw new Error(
          "Cash OS SQL client has no raw-SQL capability (stub or misconfigured " +
            "Prisma client) — refusing to compute a CashSnapshot from a store " +
            "that cannot be queried.",
        );
      }
      const result = await raw.call(client, text, ...params);
      if (!Array.isArray(result)) {
        throw new Error("Cash OS SQL query returned a non-array result.");
      }
      return result as T[];
    },
  };
}

export type CashSnapshot = {
  mrrCents: number;
  mrrTrend7d: number;
  activations7d: number;
  affiliateCents30d: number;
  pilotCents30d: number;
  payingUsers: number;
};

export type FunnelTargets = { mrrCents: number; weeklyActives: number };

const DAY_MS = 864e5;

/**
 * MRR = sum of sub_start/sub_renew amounts within the trailing 30 days.
 * Pure, no DB — the caller supplies the event fixture. sub_cancel and
 * affiliate/pilot kinds never contribute to MRR; events older than 30 days
 * (relative to `now`) are excluded.
 */
export function computeMrr(
  events: { kind: string; amountCents: number; at: Date }[],
  now = new Date(),
): number {
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  return events
    .filter((e) => e.at >= monthAgo && (e.kind === "sub_start" || e.kind === "sub_renew"))
    .reduce((a, e) => a + e.amountCents, 0);
}

/**
 * Independence Gate check: green only when BOTH the MRR target and the
 * weekly-activations target are met or exceeded. Pure — boundary-inclusive
 * (exactly at target is green).
 */
export function cashOsGreen(s: CashSnapshot, t: FunnelTargets): boolean {
  return s.mrrCents >= t.mrrCents && s.activations7d >= t.weeklyActives;
}

// ───────────────────────── DB-backed aggregator ─────────────────────────

/**
 * Assemble a full CashSnapshot from live `revenue_event` / `product_activation`
 * rows. Composes `computeMrr` for the current window; `mrrTrend7d` is this
 * week's MRR contribution minus the prior week's (both computed the same way,
 * over 7-day sub-windows) so a stalled or shrinking business shows negative
 * trend rather than being silently masked by the 30-day MRR figure.
 */
export async function computeCashSnapshot(
  sql: CashSqlClient,
  now: Date = new Date(),
): Promise<CashSnapshot> {
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

  const [mrrRows, thisWeekRows, lastWeekRows, activationRows, affiliateRows, pilotRows, payingRows] =
    await Promise.all([
      sql.query<{ amountCents: string | number }>(
        `SELECT "amountCents" FROM "revenue_event"
          WHERE "at" >= $1 AND "kind" IN ('sub_start', 'sub_renew')`,
        [monthAgo],
      ),
      sql.query<{ amountCents: string | number }>(
        `SELECT "amountCents" FROM "revenue_event"
          WHERE "at" >= $1 AND "at" < $2 AND "kind" IN ('sub_start', 'sub_renew')`,
        [weekAgo, now],
      ),
      sql.query<{ amountCents: string | number }>(
        `SELECT "amountCents" FROM "revenue_event"
          WHERE "at" >= $1 AND "at" < $2 AND "kind" IN ('sub_start', 'sub_renew')`,
        [twoWeeksAgo, weekAgo],
      ),
      sql.query<{ n: string | number }>(
        `SELECT COUNT(*) AS n FROM "product_activation" WHERE "day" >= $1`,
        [weekAgo],
      ),
      sql.query<{ total: string | number | null }>(
        `SELECT SUM("amountCents") AS total FROM "revenue_event"
          WHERE "at" >= $1 AND "kind" IN ('affiliate_cpa', 'affiliate_revshare')`,
        [monthAgo],
      ),
      sql.query<{ total: string | number | null }>(
        `SELECT SUM("amountCents") AS total FROM "revenue_event"
          WHERE "at" >= $1 AND "kind" = 'pilot_invoice'`,
        [monthAgo],
      ),
      sql.query<{ n: string | number }>(
        `SELECT COUNT(DISTINCT "userId") AS n FROM "revenue_event"
          WHERE "at" >= $1 AND "kind" IN ('sub_start', 'sub_renew') AND "userId" IS NOT NULL`,
        [monthAgo],
      ),
    ]);

  const sumCents = (rows: { amountCents: string | number }[]): number =>
    rows.reduce((a, r) => a + Number(r.amountCents), 0);

  const mrrCents = sumCents(mrrRows);
  const thisWeekMrr = sumCents(thisWeekRows);
  const lastWeekMrr = sumCents(lastWeekRows);

  return {
    mrrCents,
    mrrTrend7d: thisWeekMrr - lastWeekMrr,
    activations7d: Number(activationRows[0]?.n ?? 0),
    affiliateCents30d: Number(affiliateRows[0]?.total ?? 0),
    pilotCents30d: Number(pilotRows[0]?.total ?? 0),
    payingUsers: Number(payingRows[0]?.n ?? 0),
  };
}

/** Truncate a Date to UTC midnight (the `day` bucket key for ProductActivation). */
export function utcDayFloor(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/**
 * Upsert a `ProductActivation` row for (userId, today UTC, surface): first
 * visit of the day for that surface inserts count=1; a repeat visit the same
 * day increments count. A different surface (or a different day) is a
 * separate row — ON CONFLICT targets the (userId, day, surface) unique key.
 */
export async function recordActivation(
  sql: CashSqlClient,
  userId: string,
  surface: string,
  now: Date = new Date(),
): Promise<void> {
  const day = utcDayFloor(now);
  await sql.query(
    `INSERT INTO "product_activation" ("id", "userId", "day", "surface", "count")
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT ("userId", "day", "surface")
     DO UPDATE SET "count" = "product_activation"."count" + 1`,
    [`${userId}:${day.toISOString()}:${surface}`, userId, day, surface],
  );
}
