/**
 * AI control-plane budget reservations — the atomic reservation engine
 * (blueprint §C).
 *
 * The one guarantee that makes concurrency safe lives in the DATABASE, not in
 * this file: a reservation is a SINGLE conditional UPDATE
 *
 *     UPDATE "ai_budget_windows"
 *     SET "reservedUsd" = "reservedUsd" + $amount, "updatedAt" = now()
 *     WHERE id = $window AND "reservedUsd" + "settledUsd" + $amount <= "capUsd"
 *     RETURNING id;
 *
 * — never a read-then-write. Postgres row locking serializes concurrent writers
 * on the same window row, and the WHERE guard admits EXACTLY the set of holds
 * that still fit under `capUsd`. So N concurrent `reserve()` calls against a cap
 * that fits M can authorize at most M; the rest see zero rows updated and are
 * refused with `BudgetBlocked`. The post-storm invariant
 * `reservedUsd + settledUsd <= capUsd` therefore holds by construction — a
 * property a mock can never prove, which is why the acceptance test runs against
 * real Postgres.
 *
 * Multi-scope reservation (a spend counts against its daily AND monthly AND
 * surface caps at once) acquires every window in a FIXED lexicographic id order
 * inside ONE interactive transaction. Fixed ordering is deadlock-free; the
 * transaction makes it all-or-nothing — if ANY window's conditional update
 * matches zero rows the whole transaction rolls back and `BudgetBlocked` is
 * thrown, so no partial holds ever leak.
 *
 * DORMANT + additive: nothing imports this at runtime yet, and NO cash cost
 * mode is enabled anywhere. `db` is accepted as `unknown` and cast to a small
 * hand-written delegate surface (`BudgetDb`) — NOT the generated PrismaClient
 * type — because the two budget models are founder-applied and their Prisma
 * Client delegates do not exist until `prisma generate` runs against a schema
 * that includes them. This mirrors apps/web/lib/ai-control-plane/ledger.ts.
 *
 * Parameterization: amounts are ALWAYS passed as bound query parameters
 * (`$executeRawUnsafe(sql, ...values)` / `$queryRawUnsafe(sql, ...values)` send
 * values over the wire as typed parameters, never string-interpolated) and cast
 * `::numeric` in-SQL so Decimal arithmetic is exact. No amount is ever
 * concatenated into a SQL string.
 */

import { BudgetBlocked } from "./errors";
import type { CostMode } from "./cost-mode";

/** Scope dimension a budget window caps. */
export type BudgetScopeKind =
  | "REQUEST"
  | "DAILY"
  | "MONTHLY"
  | "SURFACE"
  | "PROVIDER_ACCOUNT"
  | "ENTITY";

/** Lifecycle of a single reservation hold. */
export type ReservationState = "HELD" | "SETTLED" | "RELEASED" | "EXPIRED";

/**
 * Minimal Prisma-delegate-shaped surface the engine depends on. Any object with
 * these raw-query methods works, including the real generated PrismaClient (and
 * an interactive-transaction `tx`). `$executeRawUnsafe` returns the affected row
 * count; `$queryRawUnsafe` returns the selected rows.
 */
export interface BudgetDb {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $transaction<T>(fn: (tx: BudgetDb) => Promise<T>): Promise<T>;
}

/** Input to {@link reserve}. */
export interface ReserveInput {
  /** One or more window ids to hold against. Acquired in fixed lexicographic order. */
  readonly windowIds: readonly string[];
  /** Worst-case estimate to hold against EACH window (same spend, many scopes). */
  readonly amountUsd: number;
  /** The invocation this hold belongs to. */
  readonly invocationId: string;
  /** Injected clock. */
  readonly now: Date;
  /** Auto-release safety-net deadline (sweepExpired releases HELD rows past this). */
  readonly expiresAt: Date;
  /** Deterministic id factory (tests inject). Defaults to a random id. */
  readonly idFactory?: () => string;
}

/** One created hold row (returned per acquired window). */
export interface ReservationHandle {
  readonly reservationId: string;
  readonly windowId: string;
}

/** Result of a successful {@link reserve}: one handle per window, all HELD. */
export interface ReserveResult {
  readonly invocationId: string;
  readonly amountUsd: number;
  readonly reservations: readonly ReservationHandle[];
}

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Which cost modes require a CASH reservation before dispatch (blueprint §C
 * lane rule). ONLY the two billable modes reserve:
 *
 *   - BUDGETED_CASH        → reserve (cash within caps)
 *   - EMERGENCY_RELIABILITY→ reserve (owner-enabled cash escalation)
 *
 * The non-billable lanes NEVER take a cash hold and bypass reservation entirely:
 *
 *   - NO_BILLABLE_EXTERNAL   → no external billable call occurs
 *   - CONFIRMED_CREDITS_ONLY → spend is against confirmed credits, not cash
 *                              (credit accounting is PR-D; no cash cap applies)
 *
 * (A LOCAL / free-allowance provider lane likewise carries no cash cost.)
 */
export function requiresCashReservation(mode: CostMode): boolean {
  return mode === "BUDGETED_CASH" || mode === "EMERGENCY_RELIABILITY";
}

/** Input to {@link estimateWorstCaseUsd}. */
export interface WorstCaseEstimateInput {
  /** The task's hard cap on vendor cash — the conservative worst case to hold. */
  readonly maxVendorCashUsd: number;
  /** Pricing version the estimate is computed under. Missing → fail closed. */
  readonly pricingVersion?: string;
  /**
   * Recognized pricing versions. When provided, a `pricingVersion` outside this
   * set fails closed (BudgetBlocked). When omitted, only presence is required.
   */
  readonly knownPricingVersions?: ReadonlySet<string>;
}

/**
 * Worst-case cash estimate to reserve, computed under a pricing version.
 *
 * FAIL CLOSED (blueprint §C): a missing or unknown pricing version throws
 * `BudgetBlocked` — for a BILLABLE mode we must never hold (and therefore never
 * dispatch) against an un-priceable call. Callers invoke this ONLY for billable
 * modes; non-billable lanes skip reservation (see {@link requiresCashReservation}).
 *
 * The worst case is the task's declared `maxVendorCashUsd` cap: we cannot know
 * the exact token cost pre-call, so we hold the ceiling and settle the remainder
 * back afterward. (Token-precise estimation is a later pricing PR; the fail-closed
 * pricing-version gate is what PR-C locks in.)
 */
export function estimateWorstCaseUsd(input: WorstCaseEstimateInput): number {
  const version = input.pricingVersion?.trim();
  if (version === undefined || version === "") {
    throw new BudgetBlocked(
      "cannot estimate worst-case cost: no pricing version is set. A billable " +
        "invocation must fail closed rather than reserve against an un-priceable call.",
    );
  }
  if (input.knownPricingVersions && !input.knownPricingVersions.has(version)) {
    throw new BudgetBlocked(
      `cannot estimate worst-case cost: pricing version "${version}" is not recognized. ` +
        "A billable invocation fails closed on unknown pricing.",
    );
  }
  if (
    typeof input.maxVendorCashUsd !== "number" ||
    !Number.isFinite(input.maxVendorCashUsd) ||
    input.maxVendorCashUsd < 0
  ) {
    throw new BudgetBlocked(
      "cannot estimate worst-case cost: maxVendorCashUsd must be a finite number >= 0.",
    );
  }
  return input.maxVendorCashUsd;
}

/**
 * Reserve `amountUsd` against every window in `windowIds`, all-or-nothing.
 *
 * Acquires the windows in FIXED lexicographic id order inside one interactive
 * transaction (deadlock-free). Each window is held via the atomic conditional
 * UPDATE; a zero-row result means the cap would be exceeded, which throws
 * `BudgetBlocked` and rolls the whole transaction back (no partial holds leak).
 * On success, one HELD `AiBudgetReservation` row exists per window.
 */
export async function reserve(
  db: unknown,
  input: ReserveInput,
): Promise<ReserveResult> {
  const budgetDb = db as BudgetDb;
  const idFactory = input.idFactory ?? randomId;
  const amount = input.amountUsd;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    throw new BudgetBlocked("reserve: amountUsd must be a finite number >= 0.");
  }
  if (input.windowIds.length === 0) {
    throw new BudgetBlocked("reserve: at least one windowId is required.");
  }

  // Fixed lexicographic order (dedup) → deadlock-free multi-window acquisition.
  const orderedWindowIds = [...new Set(input.windowIds)].sort();

  const handles = await budgetDb.$transaction(async (tx) => {
    const created: ReservationHandle[] = [];
    for (const windowId of orderedWindowIds) {
      // THE atomic guard. One statement; row lock + WHERE admits only holds that
      // still fit under capUsd. Zero rows updated ⇒ the cap would be exceeded.
      const affected = await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_windows"
           SET "reservedUsd" = "reservedUsd" + $1::numeric,
               "updatedAt" = now()
         WHERE "id" = $2
           AND "reservedUsd" + "settledUsd" + $1::numeric <= "capUsd"`,
        amount,
        windowId,
      );
      if (affected !== 1) {
        // Either the window is missing (0 rows) or the cap would be exceeded.
        // Throwing rolls the whole transaction back — no window keeps a hold.
        throw new BudgetBlocked(
          `budget window "${windowId}" cannot admit a hold of ${amount} USD ` +
            `(cap exceeded or window missing); no partial holds were taken.`,
        );
      }

      const reservationId = idFactory();
      await tx.$executeRawUnsafe(
        `INSERT INTO "ai_budget_reservations"
           ("id", "invocationId", "windowId", "amountUsd", "state", "createdAt", "expiresAt")
         VALUES ($1, $2, $3, $4::numeric, 'HELD', $5, $6)`,
        reservationId,
        input.invocationId,
        windowId,
        amount,
        input.now,
        input.expiresAt,
      );
      created.push({ reservationId, windowId });
    }
    return created;
  });

  return { invocationId: input.invocationId, amountUsd: amount, reservations: handles };
}

/** Row shape read back when settling/releasing a reservation. */
interface ReservationRow {
  readonly windowId: string;
  readonly amountUsd: string | number;
  readonly state: string;
}

async function loadHeldReservation(
  tx: BudgetDb,
  reservationId: string,
  op: "settle" | "release",
): Promise<{ windowId: string; amount: string }> {
  // Lock the reservation row so a concurrent settle/release/sweep can't race.
  const rows = await tx.$queryRawUnsafe<ReservationRow[]>(
    `SELECT "windowId", "amountUsd"::text AS "amountUsd", "state"
       FROM "ai_budget_reservations"
      WHERE "id" = $1
      FOR UPDATE`,
    reservationId,
  );
  const row = rows[0];
  if (!row) {
    throw new BudgetBlocked(`${op}: reservation "${reservationId}" does not exist.`);
  }
  if (row.state !== "HELD") {
    // Double-settle / settle-after-release / release-after-settle are guarded:
    // only a HELD reservation can transition. Idempotency is the caller's job.
    throw new BudgetBlocked(
      `${op}: reservation "${reservationId}" is ${row.state}, not HELD; ` +
        `refusing to ${op} it twice.`,
    );
  }
  return { windowId: row.windowId, amount: String(row.amountUsd) };
}

/**
 * Settle a HELD reservation with the ACTUAL spend (blueprint §C):
 *   - move the reservation HELD → SETTLED (recording `settledUsd = actualUsd`),
 *   - add `actualUsd` to the window's `settledUsd`,
 *   - subtract the originally-held `amountUsd` from the window's `reservedUsd`
 *     (releasing the worst-case remainder).
 *
 * All three happen in one transaction. Double-settle is guarded: a reservation
 * not in HELD state throws `BudgetBlocked`.
 */
export async function settle(
  db: unknown,
  reservationId: string,
  actualUsd: number,
): Promise<void> {
  const budgetDb = db as BudgetDb;
  if (typeof actualUsd !== "number" || !Number.isFinite(actualUsd) || actualUsd < 0) {
    throw new BudgetBlocked("settle: actualUsd must be a finite number >= 0.");
  }
  await budgetDb.$transaction(async (tx) => {
    const { windowId, amount } = await loadHeldReservation(tx, reservationId, "settle");
    await tx.$executeRawUnsafe(
      `UPDATE "ai_budget_windows"
          SET "reservedUsd" = "reservedUsd" - $1::numeric,
              "settledUsd"  = "settledUsd"  + $2::numeric,
              "updatedAt"   = now()
        WHERE "id" = $3`,
      amount,
      actualUsd,
      windowId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "ai_budget_reservations"
          SET "state" = 'SETTLED', "settledUsd" = $1::numeric
        WHERE "id" = $2 AND "state" = 'HELD'`,
      actualUsd,
      reservationId,
    );
  });
}

/**
 * Release a HELD reservation without a charge (blueprint §C): move HELD →
 * RELEASED and subtract the held `amountUsd` from the window's `reservedUsd`.
 * Used when the invocation failed / was blocked before it spent. Guarded the
 * same way as {@link settle} — only a HELD reservation can be released.
 */
export async function release(db: unknown, reservationId: string): Promise<void> {
  const budgetDb = db as BudgetDb;
  await budgetDb.$transaction(async (tx) => {
    const { windowId, amount } = await loadHeldReservation(tx, reservationId, "release");
    await tx.$executeRawUnsafe(
      `UPDATE "ai_budget_windows"
          SET "reservedUsd" = "reservedUsd" - $1::numeric,
              "updatedAt"   = now()
        WHERE "id" = $2`,
      amount,
      windowId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "ai_budget_reservations"
          SET "state" = 'RELEASED'
        WHERE "id" = $1 AND "state" = 'HELD'`,
      reservationId,
    );
  });
}

/** Summary of a {@link sweepExpired} pass. */
export interface SweepResult {
  readonly releasedReservationIds: readonly string[];
}

/**
 * Safety-net sweep: RELEASE stale HELD reservations whose `expiresAt` has passed
 * (blueprint §C). Each released hold subtracts its `amountUsd` from its window's
 * `reservedUsd`, so an abandoned invocation never permanently sequesters budget.
 *
 * AMBIGUOUS exclusion (blueprint §C): a reservation whose invocation attempt is
 * AMBIGUOUS (we cannot prove whether the vendor charged us) must NEVER be
 * auto-released — releasing it could free budget for a spend that actually
 * happened, i.e. a double-spend. It holds until a receipt reconciles it. PR-C
 * has no reconciliation yet, so the mechanism is a STATE gate: the sweep only
 * touches rows still in `HELD`. When an attempt is AMBIGUOUS, its reservation is
 * transitioned OUT of `HELD` into a dedicated non-swept state by the (later)
 * reconciliation PR; a caller that already knows an invocation is ambiguous can
 * pass its ids in `excludeInvocationIds` to keep those holds even while HELD.
 */
export async function sweepExpired(
  db: unknown,
  now: Date,
  opts: { readonly excludeInvocationIds?: readonly string[] } = {},
): Promise<SweepResult> {
  const budgetDb = db as BudgetDb;
  const excluded = new Set(opts.excludeInvocationIds ?? []);

  return budgetDb.$transaction(async (tx) => {
    // Lock the candidate stale HELD rows. The AMBIGUOUS exclusion is applied in
    // application code (below) rather than in SQL so no array parameter is bound
    // — a reservation whose invocation is AMBIGUOUS is skipped, never released.
    const staleAll = await tx.$queryRawUnsafe<
      Array<{ id: string; windowId: string; amountUsd: string | number; invocationId: string }>
    >(
      `SELECT "id", "windowId", "amountUsd"::text AS "amountUsd", "invocationId"
         FROM "ai_budget_reservations"
        WHERE "state" = 'HELD'
          AND "expiresAt" <= $1
        FOR UPDATE`,
      now,
    );
    const stale = staleAll.filter((r) => !excluded.has(r.invocationId));

    const releasedReservationIds: string[] = [];
    for (const row of stale) {
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_windows"
            SET "reservedUsd" = "reservedUsd" - $1::numeric,
                "updatedAt"   = now()
          WHERE "id" = $2`,
        String(row.amountUsd),
        row.windowId,
      );
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_reservations"
            SET "state" = 'EXPIRED'
          WHERE "id" = $1 AND "state" = 'HELD'`,
        row.id,
      );
      releasedReservationIds.push(row.id);
    }
    return { releasedReservationIds };
  });
}
