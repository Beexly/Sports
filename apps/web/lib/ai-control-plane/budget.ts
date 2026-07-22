/**
 * AI control-plane budget reservations — the atomic reservation engine
 * (blueprint §C, hardened per directive §10).
 *
 * THE CAP INVARIANT IS A DATABASE PROPERTY (§10.2), enforced twice:
 *
 *   1. App/SQL guard — a reservation is a SINGLE conditional UPDATE
 *
 *        UPDATE "ai_budget_windows"
 *           SET "reservedUsd" = "reservedUsd" + $amount
 *         WHERE id = $window
 *           AND "state" = 'ACTIVE'
 *           AND "reservedUsd" + "provisionalUsd" + "confirmedBilledUsd"
 *               + $amount <= "capUsd"
 *
 *      — never a read-then-write. Postgres row locking serializes concurrent
 *      writers; the WHERE guard admits EXACTLY the set of holds that fit.
 *   2. DB CHECK — the migration adds
 *      `reserved + provisional + confirmedBilled <= cap OR state =
 *      'OVERAGE_LOCKED'` plus nonnegativity CHECKs, so even a buggy writer
 *      cannot produce a silent negative or over-cap row.
 *
 * RESERVATION LIFECYCLE (§10.1):
 *
 *   HELD ──────────────┬─ settleProvisional ──► PROVISIONALLY_SETTLED
 *                      ├─ holdForReconciliation ► RECONCILIATION_HOLD
 *                      ├─ release ─────────────► RELEASED
 *                      └─ sweepExpired ────────► EXPIRED (proven-clean only)
 *   PROVISIONALLY_SETTLED ─ confirmSettlement ► CONFIRMED_SETTLED
 *   RECONCILIATION_HOLD ─── confirmSettlement ► CONFIRMED_SETTLED
 *
 * An AMBIGUOUS-after-dispatch charge moves to RECONCILIATION_HOLD and keeps
 * its money reserved. The sweeper's state gate skips everything not HELD, and
 * for stale HELD rows it queries the AUTHORITATIVE attempt ledger — a hold
 * whose invocation may have dispatched (any attempt DISPATCHED / SUCCEEDED /
 * TIMEOUT / AMBIGUOUS, or the invocation itself AMBIGUOUS) is converted to
 * RECONCILIATION_HOLD, never released. No caller-provided exclusion list
 * exists, because none would be sufficient.
 *
 * IDEMPOTENCY (§10.6): reserve is keyed by the DB-unique
 * (invocationId, windowId, reservationVersion); a duplicate reserve returns
 * the existing hold. settle/release/hold-for-reconciliation are idempotent
 * no-ops when the reservation is already in the target state with the same
 * amounts.
 *
 * EXACT DECIMALS (§10.6): every USD amount crosses this module as an exact
 * decimal STRING (validated, ≤ 6 dp) or an integer count of micro-USD
 * (bigint). Amounts are bound query parameters cast `::numeric` in-SQL; float
 * arithmetic never touches money.
 *
 * DORMANT + additive: nothing production-reachable enables a cash mode. `db`
 * is accepted as `unknown` and cast to the raw-SQL `BudgetDb` seam because
 * the budget models are founder-applied.
 */

import { BudgetBlocked } from "./errors";
import type { CostMode } from "./cost-mode";

// ─── Vocabulary ───────────────────────────────────────────────────────────────

/** Scope dimension a budget window caps (§10.5). */
export type BudgetScopeKind =
  | "REQUEST"
  | "DAILY"
  | "MONTHLY"
  | "SURFACE"
  | "PROVIDER_ACCOUNT"
  | "ENTITY"
  | "EMERGENCY_OVERRIDE";

/** Lifecycle of a single reservation hold (§10.1). */
export type ReservationState =
  | "HELD"
  | "PROVISIONALLY_SETTLED"
  | "RECONCILIATION_HOLD"
  | "CONFIRMED_SETTLED"
  | "RELEASED"
  | "EXPIRED";

/** Window circuit-breaker state (§10.2). */
export type BudgetWindowState = "ACTIVE" | "OVERAGE_LOCKED";

/** How a reconciled settlement was covered (§10.7). */
export type ConfirmedSettlementKind = "BILLED" | "CREDIT";

/**
 * Minimal Prisma-delegate-shaped surface the engine depends on. Any object
 * with these raw-query methods works, including the real generated
 * PrismaClient (and an interactive-transaction `tx`).
 */
export interface BudgetDb {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $transaction<T>(fn: (tx: BudgetDb) => Promise<T>): Promise<T>;
}

// ─── Exact decimal money (§10.6) ──────────────────────────────────────────────

const USD_DECIMAL_PATTERN = /^\d+(\.\d{1,6})?$/;
const MICROS_PER_USD = 1_000_000n;

/**
 * Parse a USD amount into exact micro-USD. Accepts a nonnegative decimal
 * string with ≤ 6 dp, or a number that round-trips exactly at 6 dp (policy
 * caps are validated to ≤ 6 dp upstream). Anything else fails closed.
 */
export function usdToMicros(value: string | number, label = "amount"): bigint {
  let text: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new BudgetBlocked(`${label} must be a finite number >= 0.`);
    }
    text = value.toFixed(6);
    // toFixed rounds; refuse a value that does not round-trip exactly.
    if (Number(text) !== value) {
      throw new BudgetBlocked(
        `${label} has more than 6 decimal places (${value}) — exact Decimal ` +
          "handling refuses lossy amounts.",
      );
    }
  } else {
    text = value.trim();
  }
  if (!USD_DECIMAL_PATTERN.test(text)) {
    throw new BudgetBlocked(
      `${label} "${text}" is not a nonnegative decimal with at most 6 decimal places.`,
    );
  }
  const [whole = "0", frac = ""] = text.split(".");
  return (
    BigInt(whole) * MICROS_PER_USD + BigInt((frac + "000000").slice(0, 6))
  );
}

/** Format exact micro-USD back into a canonical 6-dp decimal string. */
export function microsToUsd(micros: bigint): string {
  if (micros < 0n) {
    throw new BudgetBlocked("negative money amounts are unrepresentable.");
  }
  const whole = micros / MICROS_PER_USD;
  const frac = (micros % MICROS_PER_USD).toString().padStart(6, "0");
  return `${whole}.${frac}`;
}

/** Canonicalize any accepted USD representation to the 6-dp string form. */
export function toUsdString(value: string | number, label = "amount"): string {
  return microsToUsd(usdToMicros(value, label));
}

// ─── Lane rule ────────────────────────────────────────────────────────────────

/**
 * Which cost modes require a CASH reservation before dispatch (blueprint §C
 * lane rule). ONLY the two billable modes reserve:
 *
 *   - BUDGETED_CASH         → reserve (cash within caps)
 *   - EMERGENCY_RELIABILITY → reserve (owner-enabled cash escalation)
 *
 * NO_BILLABLE_EXTERNAL never takes a cash hold (no external billable call
 * occurs). CONFIRMED_CREDITS_ONLY spends against confirmed credits and is
 * gated by the CreditAuthorizationPort (§10.8) — which itself reserves
 * against NOVA-owned credit truth, not this cash engine.
 */
export function requiresCashReservation(mode: CostMode): boolean {
  return mode === "BUDGETED_CASH" || mode === "EMERGENCY_RELIABILITY";
}

// ─── Worst case of the ENTIRE attempt plan (§10.4) ────────────────────────────

/**
 * The pricing version this engine estimates under. Reserving against an
 * un-priceable call is forbidden (fail closed); token-precise per-model
 * pricing is a later PR — what §10.4 locks in is that the reservation covers
 * EVERY attempt the authority permits, not just the first.
 */
export const CONTROL_PLANE_PRICING_VERSION = "2026-07-22.1" as const;

/** The pricing versions this build recognizes. */
export const KNOWN_PRICING_VERSIONS: ReadonlySet<string> = new Set([
  CONTROL_PLANE_PRICING_VERSION,
]);

/** Input to {@link estimateAttemptPlanWorstCaseUsd}. */
export interface AttemptPlanWorstCaseInput {
  /**
   * The FULL permitted provider-route walk, in fallback order — every attempt
   * that may incur a charge. "local" carries no vendor cash cost.
   */
  readonly routes: readonly string[];
  /**
   * Ceiling of a single attempt's vendor cash (input + output + cache + tool
   * pricing all bounded by the authority's per-attempt cap).
   */
  readonly perAttemptCeilingUsd: string | number;
  /** Pricing version the estimate is computed under. Missing → fail closed. */
  readonly pricingVersion?: string;
  /** Recognized pricing versions; defaults to {@link KNOWN_PRICING_VERSIONS}. */
  readonly knownPricingVersions?: ReadonlySet<string>;
  /**
   * Provider-specific per-attempt minimum charges. An attempt's worst case is
   * max(perAttemptCeilingUsd, minimum).
   */
  readonly providerMinimumUsd?: Readonly<Record<string, string | number>>;
}

/**
 * Worst-case cash of the ENTIRE attempt plan (§10.4): the sum, over every
 * permitted billable attempt (retry/fallback count included), of that
 * attempt's ceiling — covering the worst real-world path, e.g. an ambiguous
 * (possibly charged) attempt FOLLOWED by a successful fallback: both are in
 * the sum because both routes are in the plan.
 *
 * FAIL CLOSED: a missing or unknown pricing version throws `BudgetBlocked` —
 * a billable invocation must never hold (and therefore never dispatch)
 * against an un-priceable call.
 *
 * Returns an exact 6-dp decimal string.
 */
export function estimateAttemptPlanWorstCaseUsd(
  input: AttemptPlanWorstCaseInput,
): string {
  const version = input.pricingVersion?.trim();
  if (version === undefined || version === "") {
    throw new BudgetBlocked(
      "cannot estimate worst-case cost: no pricing version is set. A billable " +
        "invocation must fail closed rather than reserve against an un-priceable call.",
    );
  }
  const known = input.knownPricingVersions ?? KNOWN_PRICING_VERSIONS;
  if (!known.has(version)) {
    throw new BudgetBlocked(
      `cannot estimate worst-case cost: pricing version "${version}" is not ` +
        "recognized. A billable invocation fails closed on unknown pricing.",
    );
  }
  const ceiling = usdToMicros(input.perAttemptCeilingUsd, "perAttemptCeilingUsd");
  let total = 0n;
  for (const route of input.routes) {
    if (route === "local") continue; // no vendor cash cost
    const rawMin = input.providerMinimumUsd?.[route];
    const minimum =
      rawMin === undefined ? 0n : usdToMicros(rawMin, `providerMinimumUsd.${route}`);
    total += ceiling > minimum ? ceiling : minimum;
  }
  return microsToUsd(total);
}

// ─── Required budget scopes come from policy (§10.5) ──────────────────────────

/** Context the executor resolves scope templates against. Never caller-chosen. */
export interface BudgetScopeContext {
  readonly entity: string;
  readonly surface: string;
  readonly requestId: string;
  readonly providerAccount?: string;
  readonly emergencyOverrideId?: string;
  /** Clock used to derive the UTC daily/monthly window keys. */
  readonly now: Date;
}

/** A window id resolved from a policy template, with its classified kind. */
export interface ResolvedBudgetWindow {
  readonly windowId: string;
  readonly scopeKind: BudgetScopeKind;
}

const PLACEHOLDER_PATTERN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}
function utcMonthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

function classifyScopeKind(template: string): BudgetScopeKind {
  const segments = template.split(":");
  if (segments.includes("daily")) return "DAILY";
  if (segments.includes("monthly")) return "MONTHLY";
  const head = segments[0];
  switch (head) {
    case "request":
      return "REQUEST";
    case "surface":
      return "SURFACE";
    case "provider-account":
      return "PROVIDER_ACCOUNT";
    case "entity":
      return "ENTITY";
    case "emergency":
    case "emergency-override":
      return "EMERGENCY_OVERRIDE";
    default:
      throw new BudgetBlocked(
        `budget scope template "${template}" has an unclassifiable scope kind — ` +
          "failing closed rather than guessing a cap dimension.",
      );
  }
}

/**
 * Resolve the policy registry's required budget-scope templates into concrete
 * window ids (§10.5). Call sites never choose window ids: the ONLY inputs are
 * the registry templates and the executor-derived context.
 *
 * FAIL CLOSED:
 *   - an EMPTY template list under a billable mode is refused by the caller
 *     (there is no such thing as an unscoped cash spend);
 *   - an unknown placeholder, or a placeholder whose context value is missing
 *     (e.g. {providerAccount} with no account resolved), throws BudgetBlocked;
 *   - time-scoped templates get a deterministic UTC window key appended so
 *     the SAME scope always maps to the SAME row.
 */
export function resolveRequiredBudgetWindows(
  templates: readonly string[],
  ctx: BudgetScopeContext,
): readonly ResolvedBudgetWindow[] {
  const substitutions: Record<string, string | undefined> = {
    entity: ctx.entity,
    surface: ctx.surface,
    requestId: ctx.requestId,
    providerAccount: ctx.providerAccount,
    emergencyOverrideId: ctx.emergencyOverrideId,
  };
  const resolved: ResolvedBudgetWindow[] = [];
  const seen = new Set<string>();
  for (const template of templates) {
    const scopeKind = classifyScopeKind(template);
    const substituted = template.replace(
      PLACEHOLDER_PATTERN,
      (_match, name: string) => {
        const value = substitutions[name];
        if (value === undefined || value === "") {
          throw new BudgetBlocked(
            `budget scope template "${template}" requires "{${name}}" but the ` +
              "executor context has no value for it — failing closed.",
          );
        }
        return value;
      },
    );
    let windowId = substituted;
    if (scopeKind === "DAILY") windowId = `${substituted}:${utcDayKey(ctx.now)}`;
    if (scopeKind === "MONTHLY")
      windowId = `${substituted}:${utcMonthKey(ctx.now)}`;
    if (!seen.has(windowId)) {
      seen.add(windowId);
      resolved.push({ windowId, scopeKind });
    }
  }
  return resolved;
}

// ─── Owner incidents (§10.2) ──────────────────────────────────────────────────

/** An overage incident the owner must see. */
export interface BudgetOverageIncident {
  readonly kind: "BUDGET_OVERAGE_LOCKED";
  readonly invocationId: string;
  readonly windowId: string;
  readonly reservationId: string;
  readonly heldUsd: string;
  readonly actualUsd: string;
  readonly at: Date;
}

/**
 * Non-throwing owner-incident sink. Implementations MUST swallow their own
 * failures — an incident-report failure never un-settles a real charge.
 */
export type OwnerIncidentSink = (
  incident: BudgetOverageIncident,
) => Promise<void>;

// ─── Reserve (§10.2/§10.4/§10.6) ──────────────────────────────────────────────

/** Input to {@link reserve}. */
export interface ReserveInput {
  /** Window ids resolved from policy (§10.5). Acquired in lexicographic order. */
  readonly windowIds: readonly string[];
  /** Worst case of the ENTIRE attempt plan, held against EACH window (§10.4). */
  readonly amountUsd: string | number;
  /** The invocation this hold belongs to (FK-enforced, §10.6). */
  readonly invocationId: string;
  /** Idempotency version (§10.6); defaults to 1. */
  readonly reservationVersion?: number;
  /** Injected clock. */
  readonly now: Date;
  /** Sweep deadline (the sweeper still verifies attempt state, §10.1). */
  readonly expiresAt: Date;
  /** Deterministic id factory (tests inject). Defaults to a random id. */
  readonly idFactory?: () => string;
}

/** One hold row (per acquired window). */
export interface ReservationHandle {
  readonly reservationId: string;
  readonly windowId: string;
  /** True when this call found the hold already present (idempotent replay). */
  readonly reused: boolean;
}

/** Result of a successful {@link reserve}. */
export interface ReserveResult {
  readonly invocationId: string;
  readonly reservationVersion: number;
  /** Canonical 6-dp decimal string. */
  readonly amountUsd: string;
  readonly reservations: readonly ReservationHandle[];
}

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

interface ExistingReservationRow {
  readonly id: string;
  readonly amountUsd: string;
  readonly state: string;
}

/**
 * Reserve the worst-case amount against every window, all-or-nothing.
 *
 * Zero-dollar rule (§10.3): a zero (or negative) amount authorizes NOTHING
 * billable — it is refused outright, never "trivially reserved".
 *
 * Idempotent (§10.6): the insert is `ON CONFLICT (invocationId, windowId,
 * reservationVersion) DO NOTHING`; when the hold already exists in HELD with
 * the same amount the existing handle is returned and the window is NOT
 * charged again. A same-key duplicate with a different amount or a
 * non-HELD state is a hard conflict.
 *
 * Atomic (§10.2): windows are acquired in fixed lexicographic order inside
 * ONE transaction; each window is charged by the single conditional UPDATE
 * (`state = 'ACTIVE'` — an OVERAGE_LOCKED window admits nothing) and a
 * zero-row result rolls the whole transaction back. No partial holds leak.
 */
export async function reserve(
  db: unknown,
  input: ReserveInput,
): Promise<ReserveResult> {
  const budgetDb = db as BudgetDb;
  const idFactory = input.idFactory ?? randomId;
  const version = input.reservationVersion ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new BudgetBlocked("reserve: reservationVersion must be an integer >= 1.");
  }
  const amountMicros = usdToMicros(input.amountUsd, "reserve.amountUsd");
  if (amountMicros <= 0n) {
    // §10.3: zero dollars authorizes nothing billable.
    throw new BudgetBlocked(
      "reserve: a zero-dollar reservation authorizes nothing billable — " +
        "refusing to create an empty hold that would admit a cash dispatch.",
    );
  }
  const amount = microsToUsd(amountMicros);
  if (input.windowIds.length === 0) {
    throw new BudgetBlocked(
      "reserve: at least one required budget window is mandatory for a " +
        "billable invocation (§10.5) — an unscoped cash spend is unrepresentable.",
    );
  }

  // Fixed lexicographic order (dedup) → deadlock-free multi-window acquisition.
  const orderedWindowIds = [...new Set(input.windowIds)].sort();

  const handles = await budgetDb.$transaction(async (tx) => {
    const created: ReservationHandle[] = [];
    for (const windowId of orderedWindowIds) {
      const reservationId = idFactory();
      let inserted: number;
      try {
        inserted = await tx.$executeRawUnsafe(
          `INSERT INTO "ai_budget_reservations"
             ("id", "invocationId", "windowId", "reservationVersion",
              "amountUsd", "state", "createdAt", "updatedAt", "expiresAt")
           VALUES ($1, $2, $3, $4, $5::numeric, 'HELD', $6, $6, $7)
           ON CONFLICT ("invocationId", "windowId", "reservationVersion")
           DO NOTHING`,
          reservationId,
          input.invocationId,
          windowId,
          version,
          amount,
          input.now,
          input.expiresAt,
        );
      } catch (error) {
        // FK violation: the window is not provisioned, or the invocation row
        // does not exist. Both fail closed (§10.5/§10.6).
        throw new BudgetBlocked(
          `reserve: cannot hold against window "${windowId}" for invocation ` +
            `"${input.invocationId}" — the required window or invocation row ` +
            `does not exist (fail closed): ${String(
              error instanceof Error ? error.message : error,
            )}`,
        );
      }

      if (inserted === 0) {
        // §10.6 idempotent replay: the (invocation, window, version) hold
        // already exists. Reuse it ONLY when it matches exactly.
        const rows = await tx.$queryRawUnsafe<ExistingReservationRow[]>(
          `SELECT "id", "amountUsd"::text AS "amountUsd", "state"
             FROM "ai_budget_reservations"
            WHERE "invocationId" = $1 AND "windowId" = $2
              AND "reservationVersion" = $3
            FOR UPDATE`,
          input.invocationId,
          windowId,
          version,
        );
        const existing = rows[0];
        if (
          existing &&
          existing.state === "HELD" &&
          usdToMicros(existing.amountUsd) === amountMicros
        ) {
          created.push({ reservationId: existing.id, windowId, reused: true });
          continue; // window already charged by the original reserve
        }
        throw new BudgetBlocked(
          `reserve: duplicate reservation key (invocation "${input.invocationId}", ` +
            `window "${windowId}", version ${version}) exists in state ` +
            `"${existing?.state ?? "MISSING"}" with a different amount — ` +
            "refusing a conflicting duplicate reserve.",
        );
      }

      // THE atomic cap guard (§10.2). One statement; row lock + WHERE admits
      // only holds that fit under capUsd on an ACTIVE (not OVERAGE_LOCKED)
      // window. Zero rows updated ⇒ blocked ⇒ whole transaction rolls back.
      const affected = await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_windows"
            SET "reservedUsd" = "reservedUsd" + $1::numeric,
                "updatedAt" = now()
          WHERE "id" = $2
            AND "state" = 'ACTIVE'
            AND "reservedUsd" + "provisionalUsd" + "confirmedBilledUsd"
                + $1::numeric <= "capUsd"`,
        amount,
        windowId,
      );
      if (affected !== 1) {
        throw new BudgetBlocked(
          `budget window "${windowId}" cannot admit a hold of ${amount} USD ` +
            "(cap exceeded, window OVERAGE_LOCKED, or window missing); no " +
            "partial holds were taken.",
        );
      }
      created.push({ reservationId, windowId, reused: false });
    }
    return created;
  });

  return {
    invocationId: input.invocationId,
    reservationVersion: version,
    amountUsd: amount,
    reservations: handles,
  };
}

// ─── Shared row loading ───────────────────────────────────────────────────────

interface InvocationReservationRow {
  readonly id: string;
  readonly windowId: string;
  readonly amountUsd: string;
  readonly provisionalUsd: string | null;
  readonly confirmedUsd: string | null;
  readonly confirmedKind: string | null;
  readonly state: string;
}

async function loadInvocationReservations(
  tx: BudgetDb,
  invocationId: string,
  reservationVersion: number,
): Promise<InvocationReservationRow[]> {
  // Lock the rows so concurrent settle/release/sweep serialize. Window-id
  // order matches reserve's acquisition order (deadlock-free).
  return tx.$queryRawUnsafe<InvocationReservationRow[]>(
    `SELECT "id", "windowId", "amountUsd"::text AS "amountUsd",
            "provisionalUsd"::text AS "provisionalUsd",
            "confirmedUsd"::text AS "confirmedUsd",
            "confirmedKind", "state"
       FROM "ai_budget_reservations"
      WHERE "invocationId" = $1 AND "reservationVersion" = $2
      ORDER BY "windowId"
      FOR UPDATE`,
    invocationId,
    reservationVersion,
  );
}

function invariantBreach(op: string, detail: string): never {
  // A guarded window update matched zero rows: the DB state contradicts the
  // locked reservation rows. Never retried, never silently absorbed.
  throw new BudgetBlocked(
    `${op}: budget-window invariant breach (${detail}). The window row ` +
      "refused a guarded update that the locked reservation rows imply must " +
      "fit — refusing to continue against inconsistent financial state.",
  );
}

// ─── Provisional settlement (§10.2/§10.7) ─────────────────────────────────────

/** Input to {@link settleProvisional}. */
export interface SettleProvisionalInput {
  readonly invocationId: string;
  readonly reservationVersion?: number;
  /** The provisional ACTUAL spend (never the worst-case cap, §10.7). */
  readonly actualUsd: string | number;
  readonly now: Date;
  /** §10.2: fires on actual > hold. Non-throwing by contract. */
  readonly incidents?: OwnerIncidentSink;
}

/** Result of {@link settleProvisional}. */
export interface SettleProvisionalResult {
  /** True when the actual exceeded the hold on at least one window (§10.2). */
  readonly overage: boolean;
  readonly settledReservationIds: readonly string[];
}

/**
 * Provisionally settle every HELD reservation of an invocation with the
 * ACTUAL spend (§10.7: provisional, NOT confirmed — reconciliation confirms
 * later):
 *   - reservation HELD → PROVISIONALLY_SETTLED (provisionalUsd = actual);
 *   - window: reservedUsd -= hold, provisionalUsd += actual.
 *
 * OVERAGE (§10.2): when actual > hold the REAL charge is preserved (the full
 * actual lands in provisionalUsd — never truncated to fit the cap), the
 * window moves to OVERAGE_LOCKED in the SAME statement (blocking every
 * further reserve — the circuit breaker), and the owner-incident sink fires
 * after commit. Silent over-cap state is impossible: the DB CHECK admits
 * over-cap ONLY together with OVERAGE_LOCKED.
 *
 * Idempotent (§10.6): reservations already PROVISIONALLY_SETTLED with the
 * same actual are skipped; a different actual is a hard conflict.
 */
export async function settleProvisional(
  db: unknown,
  input: SettleProvisionalInput,
): Promise<SettleProvisionalResult> {
  const budgetDb = db as BudgetDb;
  const version = input.reservationVersion ?? 1;
  const actualMicros = usdToMicros(input.actualUsd, "settle.actualUsd");
  const actual = microsToUsd(actualMicros);

  const incidents: BudgetOverageIncident[] = [];
  const settledIds: string[] = [];

  await budgetDb.$transaction(async (tx) => {
    const rows = await loadInvocationReservations(tx, input.invocationId, version);
    if (rows.length === 0) {
      throw new BudgetBlocked(
        `settle: no reservation exists for invocation "${input.invocationId}" ` +
          `version ${version}.`,
      );
    }
    for (const row of rows) {
      if (row.state === "PROVISIONALLY_SETTLED") {
        if (
          row.provisionalUsd !== null &&
          usdToMicros(row.provisionalUsd) === actualMicros
        ) {
          continue; // idempotent replay
        }
        throw new BudgetBlocked(
          `settle: reservation "${row.id}" is already provisionally settled ` +
            `with a DIFFERENT amount (${row.provisionalUsd} ≠ ${actual}) — ` +
            "refusing a conflicting duplicate settle.",
        );
      }
      if (row.state !== "HELD") {
        throw new BudgetBlocked(
          `settle: reservation "${row.id}" is ${row.state}, not HELD — only a ` +
            "held reservation can be provisionally settled.",
        );
      }
      const heldMicros = usdToMicros(row.amountUsd);
      const overage = actualMicros > heldMicros;
      // §10.2 app guard + conditional SQL + (backstop) DB CHECK, one statement.
      const affected = await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_windows"
            SET "reservedUsd" = "reservedUsd" - $1::numeric,
                "provisionalUsd" = "provisionalUsd" + $2::numeric,
                "state" = CASE WHEN $3 THEN 'OVERAGE_LOCKED' ELSE "state" END,
                "updatedAt" = now()
          WHERE "id" = $4
            AND "reservedUsd" >= $1::numeric`,
        row.amountUsd,
        actual,
        overage,
        row.windowId,
      );
      if (affected !== 1) {
        invariantBreach(
          "settle",
          `window "${row.windowId}" reservedUsd < held ${row.amountUsd}`,
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_reservations"
            SET "state" = 'PROVISIONALLY_SETTLED',
                "provisionalUsd" = $1::numeric,
                "overage" = $2,
                "updatedAt" = $3
          WHERE "id" = $4 AND "state" = 'HELD'`,
        actual,
        overage,
        input.now,
        row.id,
      );
      settledIds.push(row.id);
      if (overage) {
        incidents.push({
          kind: "BUDGET_OVERAGE_LOCKED",
          invocationId: input.invocationId,
          windowId: row.windowId,
          reservationId: row.id,
          heldUsd: row.amountUsd,
          actualUsd: actual,
          at: input.now,
        });
      }
    }
  });

  // Owner incidents AFTER commit — the lock + preserved charge are already
  // durable; a sink failure never un-settles the real charge.
  if (input.incidents) {
    for (const incident of incidents) {
      try {
        await input.incidents(incident);
      } catch {
        // Non-throwing by contract.
      }
    }
  }

  return { overage: incidents.length > 0, settledReservationIds: settledIds };
}

// ─── Release (§10.1/§10.6) ────────────────────────────────────────────────────

/** Input to {@link release} / {@link holdForReconciliation}. */
export interface ReservationSelector {
  readonly invocationId: string;
  readonly reservationVersion?: number;
  readonly now: Date;
}

/**
 * Release every HELD reservation of an invocation without a charge (§10.1:
 * FAILED_NO_CHARGE / pre-dispatch blocks). Window: reservedUsd -= hold,
 * releasedUsd += hold. Idempotent: already-RELEASED/EXPIRED rows are skipped;
 * settled or reconciliation-held rows are a hard conflict (money that may
 * have moved is never "released").
 */
export async function release(
  db: unknown,
  input: ReservationSelector,
): Promise<void> {
  const budgetDb = db as BudgetDb;
  const version = input.reservationVersion ?? 1;
  await budgetDb.$transaction(async (tx) => {
    const rows = await loadInvocationReservations(tx, input.invocationId, version);
    if (rows.length === 0) {
      throw new BudgetBlocked(
        `release: no reservation exists for invocation "${input.invocationId}" ` +
          `version ${version}.`,
      );
    }
    for (const row of rows) {
      if (row.state === "RELEASED" || row.state === "EXPIRED") continue; // idempotent
      if (row.state !== "HELD") {
        throw new BudgetBlocked(
          `release: reservation "${row.id}" is ${row.state} — a settled or ` +
            "reconciliation-held reservation can never be released without " +
            "authoritative reconciliation.",
        );
      }
      const affected = await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_windows"
            SET "reservedUsd" = "reservedUsd" - $1::numeric,
                "releasedUsd" = "releasedUsd" + $1::numeric,
                "updatedAt" = now()
          WHERE "id" = $2
            AND "reservedUsd" >= $1::numeric`,
        row.amountUsd,
        row.windowId,
      );
      if (affected !== 1) {
        invariantBreach(
          "release",
          `window "${row.windowId}" reservedUsd < held ${row.amountUsd}`,
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_reservations"
            SET "state" = 'RELEASED', "updatedAt" = $1
          WHERE "id" = $2 AND "state" = 'HELD'`,
        input.now,
        row.id,
      );
    }
  });
}

// ─── Reconciliation hold (§10.1) ──────────────────────────────────────────────

/**
 * Move every HELD reservation of an invocation to RECONCILIATION_HOLD
 * (§10.1: AMBIGUOUS_AFTER_DISPATCH). The money STAYS in reservedUsd (the cap
 * keeps counting it); disputedUsd mirrors it for §10.7 reporting. The sweeper
 * can never touch it — only authoritative reconciliation
 * ({@link confirmSettlement}) resolves it. Idempotent.
 */
export async function holdForReconciliation(
  db: unknown,
  input: ReservationSelector,
): Promise<void> {
  const budgetDb = db as BudgetDb;
  const version = input.reservationVersion ?? 1;
  await budgetDb.$transaction(async (tx) => {
    const rows = await loadInvocationReservations(tx, input.invocationId, version);
    if (rows.length === 0) {
      throw new BudgetBlocked(
        `holdForReconciliation: no reservation exists for invocation ` +
          `"${input.invocationId}" version ${version}.`,
      );
    }
    for (const row of rows) {
      if (row.state === "RECONCILIATION_HOLD") continue; // idempotent
      if (row.state !== "HELD") {
        throw new BudgetBlocked(
          `holdForReconciliation: reservation "${row.id}" is ${row.state}, ` +
            "not HELD.",
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_windows"
            SET "disputedUsd" = "disputedUsd" + $1::numeric,
                "updatedAt" = now()
          WHERE "id" = $2`,
        row.amountUsd,
        row.windowId,
      );
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_reservations"
            SET "state" = 'RECONCILIATION_HOLD', "updatedAt" = $1
          WHERE "id" = $2 AND "state" = 'HELD'`,
        input.now,
        row.id,
      );
    }
  });
}

// ─── Confirmed settlement (§10.7 — driven by later reconciliation PRs) ────────

/** Input to {@link confirmSettlement}. */
export interface ConfirmSettlementInput {
  readonly invocationId: string;
  readonly reservationVersion?: number;
  /** The reconciled amount from the authoritative receipt. */
  readonly confirmedUsd: string | number;
  /** BILLED cash or covered by CREDIT (§10.7 — tracked separately). */
  readonly kind: ConfirmedSettlementKind;
  readonly now: Date;
}

/**
 * Confirm settlement from an authoritative receipt: PROVISIONALLY_SETTLED or
 * RECONCILIATION_HOLD → CONFIRMED_SETTLED. Window movement:
 *   - from PROVISIONALLY_SETTLED: provisionalUsd -= provisional,
 *     confirmed{Billed,Credit}Usd += confirmed;
 *   - from RECONCILIATION_HOLD: reservedUsd -= hold, disputedUsd -= hold,
 *     confirmed{Billed,Credit}Usd += confirmed.
 * Idempotent on an identical confirmed amount + kind. The DB cap CHECK is the
 * backstop; a confirmation that would exceed the cap surfaces as a hard
 * error, never a silent write.
 */
export async function confirmSettlement(
  db: unknown,
  input: ConfirmSettlementInput,
): Promise<void> {
  const budgetDb = db as BudgetDb;
  const version = input.reservationVersion ?? 1;
  const confirmedMicros = usdToMicros(input.confirmedUsd, "confirm.confirmedUsd");
  const confirmed = microsToUsd(confirmedMicros);
  const confirmedColumn =
    input.kind === "BILLED" ? "confirmedBilledUsd" : "confirmedCreditUsd";

  await budgetDb.$transaction(async (tx) => {
    const rows = await loadInvocationReservations(tx, input.invocationId, version);
    if (rows.length === 0) {
      throw new BudgetBlocked(
        `confirm: no reservation exists for invocation "${input.invocationId}" ` +
          `version ${version}.`,
      );
    }
    for (const row of rows) {
      if (row.state === "CONFIRMED_SETTLED") {
        if (
          row.confirmedUsd !== null &&
          usdToMicros(row.confirmedUsd) === confirmedMicros &&
          row.confirmedKind === input.kind
        ) {
          continue; // idempotent replay
        }
        throw new BudgetBlocked(
          `confirm: reservation "${row.id}" is already confirmed with a ` +
            "different amount or kind — refusing a conflicting duplicate.",
        );
      }
      if (row.state === "PROVISIONALLY_SETTLED") {
        const provisional = row.provisionalUsd ?? "0";
        const affected = await tx.$executeRawUnsafe(
          `UPDATE "ai_budget_windows"
              SET "provisionalUsd" = "provisionalUsd" - $1::numeric,
                  "${confirmedColumn}" = "${confirmedColumn}" + $2::numeric,
                  "updatedAt" = now()
            WHERE "id" = $3
              AND "provisionalUsd" >= $1::numeric`,
          provisional,
          confirmed,
          row.windowId,
        );
        if (affected !== 1) {
          invariantBreach(
            "confirm",
            `window "${row.windowId}" provisionalUsd < ${provisional}`,
          );
        }
      } else if (row.state === "RECONCILIATION_HOLD") {
        const affected = await tx.$executeRawUnsafe(
          `UPDATE "ai_budget_windows"
              SET "reservedUsd" = "reservedUsd" - $1::numeric,
                  "disputedUsd" = "disputedUsd" - $1::numeric,
                  "${confirmedColumn}" = "${confirmedColumn}" + $2::numeric,
                  "updatedAt" = now()
            WHERE "id" = $3
              AND "reservedUsd" >= $1::numeric
              AND "disputedUsd" >= $1::numeric`,
          row.amountUsd,
          confirmed,
          row.windowId,
        );
        if (affected !== 1) {
          invariantBreach(
            "confirm",
            `window "${row.windowId}" reserved/disputed < held ${row.amountUsd}`,
          );
        }
      } else {
        throw new BudgetBlocked(
          `confirm: reservation "${row.id}" is ${row.state} — only a ` +
            "provisionally settled or reconciliation-held reservation can be " +
            "confirmed.",
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_reservations"
            SET "state" = 'CONFIRMED_SETTLED',
                "confirmedUsd" = $1::numeric,
                "confirmedKind" = $2,
                "updatedAt" = $3
          WHERE "id" = $4
            AND "state" IN ('PROVISIONALLY_SETTLED', 'RECONCILIATION_HOLD')`,
        confirmed,
        input.kind,
        input.now,
        row.id,
      );
    }
  });
}

// ─── The sweeper (§10.1) ──────────────────────────────────────────────────────

/** Summary of a {@link sweepExpired} pass. */
export interface SweepResult {
  /** Stale holds proven clean (no dispatch could have charged) — released. */
  readonly expiredReservationIds: readonly string[];
  /** Stale holds whose invocation may have charged — moved to RECONCILIATION_HOLD. */
  readonly movedToReconciliationIds: readonly string[];
}

interface StaleHoldRow {
  readonly id: string;
  readonly windowId: string;
  readonly invocationId: string;
  readonly amountUsd: string;
}

interface AttemptEvidenceRow {
  readonly invocationStatus: string | null;
  readonly possiblyCharged: boolean;
}

/**
 * Safety-net sweep for stale HELD reservations past `expiresAt` (§10.1).
 *
 * THE SWEEPER QUERIES THE AUTHORITATIVE ATTEMPT LEDGER — no caller-provided
 * exclusion list exists, because none would be sufficient. For each stale
 * hold it checks, inside the same transaction:
 *
 *   - the invocation's own status, and
 *   - whether ANY attempt row is DISPATCHED (in-flight or crashed
 *     mid-dispatch), SUCCEEDED (charged), TIMEOUT or AMBIGUOUS (possibly
 *     charged).
 *
 * If the invocation is AMBIGUOUS, missing, or any attempt possibly charged,
 * the hold is converted to RECONCILIATION_HOLD (money stays reserved) — the
 * sweeper CANNOT release it, and neither can any later sweep (the state gate
 * only selects HELD). Only a hold whose ledger proves no charge could exist
 * (no dispatched attempt at all, or every attempt failed cleanly before
 * charging) is expired and its money released.
 *
 * This is also the §10.9 crash-recovery path: a crash between reserve and
 * dispatch leaves a clean ledger → the hold expires and frees the budget; a
 * crash between dispatch and settle leaves a DISPATCHED/SUCCEEDED attempt →
 * the hold converts to RECONCILIATION_HOLD and the money stays locked until
 * reconciliation.
 */
export async function sweepExpired(db: unknown, now: Date): Promise<SweepResult> {
  const budgetDb = db as BudgetDb;

  return budgetDb.$transaction(async (tx) => {
    const stale = await tx.$queryRawUnsafe<StaleHoldRow[]>(
      `SELECT "id", "windowId", "invocationId", "amountUsd"::text AS "amountUsd"
         FROM "ai_budget_reservations"
        WHERE "state" = 'HELD'
          AND "expiresAt" <= $1
        ORDER BY "windowId"
        FOR UPDATE`,
      now,
    );

    const expiredReservationIds: string[] = [];
    const movedToReconciliationIds: string[] = [];

    for (const row of stale) {
      // AUTHORITATIVE attempt-state query (§10.1) — never a caller list.
      const evidence = await tx.$queryRawUnsafe<AttemptEvidenceRow[]>(
        `SELECT
           (SELECT i."status" FROM "ai_invocations" i
             WHERE i."id" = $1) AS "invocationStatus",
           EXISTS (
             SELECT 1 FROM "ai_attempts" a
              WHERE a."invocationId" = $1
                AND a."status" IN ('DISPATCHED', 'SUCCEEDED', 'TIMEOUT', 'AMBIGUOUS')
           ) AS "possiblyCharged"`,
        row.invocationId,
      );
      const verdict = evidence[0];
      const mustHold =
        verdict === undefined ||
        verdict.invocationStatus === null || // missing evidence → fail closed
        verdict.invocationStatus === "AMBIGUOUS" ||
        verdict.possiblyCharged;

      if (mustHold) {
        await tx.$executeRawUnsafe(
          `UPDATE "ai_budget_windows"
              SET "disputedUsd" = "disputedUsd" + $1::numeric,
                  "updatedAt" = now()
            WHERE "id" = $2`,
          row.amountUsd,
          row.windowId,
        );
        await tx.$executeRawUnsafe(
          `UPDATE "ai_budget_reservations"
              SET "state" = 'RECONCILIATION_HOLD', "updatedAt" = $1
            WHERE "id" = $2 AND "state" = 'HELD'`,
          now,
          row.id,
        );
        movedToReconciliationIds.push(row.id);
        continue;
      }

      const affected = await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_windows"
            SET "reservedUsd" = "reservedUsd" - $1::numeric,
                "releasedUsd" = "releasedUsd" + $1::numeric,
                "updatedAt" = now()
          WHERE "id" = $2
            AND "reservedUsd" >= $1::numeric`,
        row.amountUsd,
        row.windowId,
      );
      if (affected !== 1) {
        invariantBreach(
          "sweep",
          `window "${row.windowId}" reservedUsd < held ${row.amountUsd}`,
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE "ai_budget_reservations"
            SET "state" = 'EXPIRED', "updatedAt" = $1
          WHERE "id" = $2 AND "state" = 'HELD'`,
        now,
        row.id,
      );
      expiredReservationIds.push(row.id);
    }

    return { expiredReservationIds, movedToReconciliationIds };
  });
}
