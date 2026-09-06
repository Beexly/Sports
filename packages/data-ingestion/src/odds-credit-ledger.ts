/**
 * Durable ledger for the credit governor (C-109). Append-only JarvisMemoryEvent
 * rows, latest row wins: the same pattern apps/web/lib/ops uses for the
 * ops.calibration.drift marker, chosen over a SettlementRun because the
 * marker must be visible to refresh-odds and the truth surface as well as to
 * settlement, and a paid ODDS call has no settlement run to hang off. No
 * schema change: three scopes on the existing table.
 *
 *   ops.odds.credits     {remaining, used, observedAt, source}   after every paid call
 *   ops.odds.paidScores  {sport, purpose, at}  (source_ref = sport) before a paid scores call
 *   ops.odds.paidOdds    {sport, purpose, at}  (source_ref = sport) before a paid odds call
 *
 * The db is a structural interface so this package keeps zero runtime
 * dependency on @sports/db; callers pass the Prisma client through
 * `db as unknown as OddsCreditLedgerDb`, as the settlement-run helpers do.
 * Every function is failure-isolated: a ledger outage never blocks a
 * settlement or a refresh, it only removes the pacing signal.
 *
 * The hourly slot is an ATOMIC reservation (`reservePaidCallSlot`): two
 * overlapping executions for the same sport (the :20 cron and the :22 autonomy
 * cycle, or two refresh-odds runs) used to both read the same latest marker
 * before either wrote one, pass the hourly limit, and both spend. The
 * reservation takes a transaction-scoped Postgres advisory mutex per sport,
 * reads the marker and writes it inside one transaction; without a real
 * Prisma client (the stub used when DATABASE_URL is unset, test fakes) it
 * falls back to the read-then-write path and says so once.
 */

import {
  buildOddsCreditTruth,
  PAID_CALL_PURPOSES,
  type OddsCreditObservation,
  type OddsCreditTruth,
  type PaidCallPurpose,
} from "./odds-credit-governor.js";

export const ODDS_CREDITS_SCOPE = "ops.odds.credits";
export const ODDS_PAID_CALL_SCOPE: Readonly<Record<PaidCallPurpose, string>> = {
  scores: "ops.odds.paidScores",
  odds: "ops.odds.paidOdds",
};

export interface PaidCallMarker {
  readonly sport: string;
  readonly purpose: PaidCallPurpose;
  /** ISO timestamp of the paid call. */
  readonly at: string;
}

interface LedgerRow {
  readonly full_text: string | null;
  readonly metadata: unknown;
}

/** The rows the ledger reads and writes (the Prisma delegate, or a transaction's). */
export interface OddsCreditLedgerRows {
  readonly jarvisMemoryEvent: {
    findFirst(args: {
      where: { scope: string; memory_type: "episodic"; source_ref?: string };
      orderBy: { created_at: "desc" };
      select: { full_text: true; metadata: true };
    }): Promise<LedgerRow | null>;
    findMany(args: {
      where: { scope: string; memory_type: "episodic"; created_at: { gte: Date } };
      orderBy: { created_at: "asc" | "desc" };
      select: { full_text: true; metadata: true };
      take: number;
    }): Promise<LedgerRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

/** What a reservation sees inside `$transaction`: the rows plus the raw-SQL door for the advisory mutex. */
export interface OddsCreditLedgerTx extends OddsCreditLedgerRows {
  $executeRaw?(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

export interface OddsCreditLedgerDb extends OddsCreditLedgerRows {
  /** Interactive transaction (a real Prisma client); absent on the stub client and most fakes. */
  $transaction?<T>(fn: (tx: OddsCreditLedgerTx) => Promise<T>): Promise<T>;
  $executeRaw?(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

function parseRow(row: LedgerRow): unknown {
  if (typeof row.metadata === "object" && row.metadata !== null) return row.metadata;
  if (row.full_text) {
    try {
      return JSON.parse(row.full_text);
    } catch {
      return null;
    }
  }
  return null;
}

function isObservation(raw: unknown): raw is OddsCreditObservation {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o["remaining"] === "number" && typeof o["observedAt"] === "string";
}

function isMarker(raw: unknown): raw is PaidCallMarker {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o["sport"] === "string" && typeof o["at"] === "string";
}

export async function recordCreditObservation(
  db: OddsCreditLedgerRows,
  obs: OddsCreditObservation,
): Promise<"ok" | "skipped" | "error"> {
  // odds-api-client parses a MISSING x-requests-* header as null, and the
  // callers skip null before reaching here. Belt and braces: a real post-call
  // response never reads remaining 0 AND used 0, so that pair is a header-less
  // response (proxy or CDN edge), not an observation: recording it would hold
  // every paid call on a zero the vendor never reported.
  if (obs.remaining === 0 && obs.used === 0) return "skipped";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: ODDS_CREDITS_SCOPE,
        title: `Odds API credits remaining=${obs.remaining}`,
        summary: `remaining=${obs.remaining} used=${obs.used ?? "n/a"} via ${obs.source}`,
        full_text: JSON.stringify(obs),
        source_type: `ops.odds.${obs.source}`,
        source_timestamp: new Date(obs.observedAt),
        actor: "system",
        owner: "system",
        confidence: 95,
        tags: ["odds-api", "credits"],
        metadata: obs as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

export async function loadLatestCreditObservation(
  db: OddsCreditLedgerRows,
): Promise<OddsCreditObservation | null> {
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: ODDS_CREDITS_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw = parseRow(row);
    return isObservation(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Bound on the observation window read for the truth surface and the projection. */
export const CREDIT_OBSERVATION_WINDOW_LIMIT = 500;

/**
 * Observations written since `since`, oldest first, bounded to the NEWEST
 * CREDIT_OBSERVATION_WINDOW_LIMIT rows: read newest-first and reversed, so on
 * a busy day the projection anchors on the latest readings, never on the
 * oldest 500 of the window.
 */
export async function loadCreditObservationsSince(
  db: OddsCreditLedgerRows,
  since: Date,
): Promise<OddsCreditObservation[]> {
  try {
    const rows = await db.jarvisMemoryEvent.findMany({
      where: { scope: ODDS_CREDITS_SCOPE, memory_type: "episodic", created_at: { gte: since } },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
      take: CREDIT_OBSERVATION_WINDOW_LIMIT,
    });
    return rows.map(parseRow).filter(isObservation).reverse();
  } catch {
    return [];
  }
}

function markerRowData(marker: PaidCallMarker): Record<string, unknown> {
  return {
    memory_type: "episodic",
    memory_state: "confirmed",
    scope: ODDS_PAID_CALL_SCOPE[marker.purpose],
    title: `Paid ${marker.purpose} call ${marker.sport}`,
    summary: `${marker.sport} ${marker.purpose} at ${marker.at}`,
    full_text: JSON.stringify(marker),
    source_type: "ops.odds.paid-call",
    source_ref: marker.sport,
    source_timestamp: new Date(marker.at),
    actor: "system",
    owner: "system",
    confidence: 95,
    tags: ["odds-api", "paid-call", marker.purpose],
    metadata: marker as object,
    owner_approval: true,
  };
}

/**
 * Append one paid-call marker unconditionally. The FIRST paid request of a
 * run is marked by `reservePaidCallSlot`; this records each ADDITIONAL paid
 * request the run made (a preseason leg, a Pinnacle archive request), so the
 * ledger counts every spend.
 */
export async function recordPaidCall(
  db: OddsCreditLedgerRows,
  marker: PaidCallMarker,
): Promise<"ok" | "error"> {
  try {
    await db.jarvisMemoryEvent.create({ data: markerRowData(marker) });
    return "ok";
  } catch {
    return "error";
  }
}

/** Latest marker for (purpose, sport); throws on a ledger error (callers decide how to isolate). */
async function readLatestMarkerAt(
  rows: OddsCreditLedgerRows,
  purpose: PaidCallPurpose,
  sport: string,
): Promise<Date | null> {
  const row = await rows.jarvisMemoryEvent.findFirst({
    where: { scope: ODDS_PAID_CALL_SCOPE[purpose], memory_type: "episodic", source_ref: sport },
    orderBy: { created_at: "desc" },
    select: { full_text: true, metadata: true },
  });
  if (!row) return null;
  const raw = parseRow(row);
  if (!isMarker(raw)) return null;
  const at = new Date(raw.at);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** Latest marker across the given purposes; throws on a ledger error. */
async function readLatestMarkerAcross(
  rows: OddsCreditLedgerRows,
  purposes: readonly PaidCallPurpose[],
  sport: string,
): Promise<Date | null> {
  const dates = await Promise.all(purposes.map((p) => readLatestMarkerAt(rows, p, sport)));
  return dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);
}

/** Latest paid call for (purpose, sport); null when none was ever recorded. */
export async function loadLatestPaidCallAt(
  db: OddsCreditLedgerRows,
  purpose: PaidCallPurpose,
  sport: string,
): Promise<Date | null> {
  try {
    return await readLatestMarkerAt(db, purpose, sport);
  } catch {
    return null;
  }
}

/**
 * Latest paid call for this sport across EVERY purpose (odds and scores);
 * null when none. Feeds the cross-purpose stale-zero probe cap.
 */
export async function loadLatestPaidCallAnyPurposeAt(
  db: OddsCreditLedgerRows,
  sport: string,
): Promise<Date | null> {
  try {
    return await readLatestMarkerAcross(db, PAID_CALL_PURPOSES, sport);
  } catch {
    return null;
  }
}

export interface ReservePaidCallSlotInput {
  readonly sport: string;
  /** The purpose the marker is written under. */
  readonly purpose: PaidCallPurpose;
  readonly now: Date;
  /**
   * Hold when a marker for any of `checkPurposes` is younger than this. 0
   * never holds: the marker is recorded unconditionally (an odds call while
   * the pace funds the budget is not hourly-capped but is still counted).
   */
  readonly intervalMs: number;
  /** Purposes whose markers count against the slot; defaults to [purpose]. A stale-zero probe passes every purpose. */
  readonly checkPurposes?: readonly PaidCallPurpose[];
  /**
   * Whether the client can really serialize the reservation. The @sports/db
   * stub client (DATABASE_URL unset) is a Proxy whose `$transaction` and
   * `$executeRaw` are functions that do nothing, so the shape check below
   * would pass while no mutex is ever taken; a caller that knows the client is
   * that stub (`isStubMode()` in @sports/db, which this package cannot import)
   * passes `false` and the reservation runs the non-atomic path, warned.
   * Omitted: detected from the client's shape.
   */
  readonly atomicCapable?: boolean;
}

export type PaidCallSlotReservation =
  | {
      readonly reserved: true;
      /** True when the read and the write ran under the advisory mutex in one transaction. */
      readonly atomic: boolean;
    }
  | { readonly reserved: false; readonly atomic: boolean; readonly lastAt: Date };

/** Advisory-mutex key: one per sport, so odds and scores reservations (and the cross-purpose probe) serialize. */
export function paidCallMutexKey(sport: string): string {
  return `odds-paid:${sport}`;
}

let warnedNonAtomicReservation = false;

/** Test hook: let a suite observe the one-time fallback warning again. */
export function resetPaidCallReservationWarning(): void {
  warnedNonAtomicReservation = false;
}

function withinInterval(lastAt: Date, now: Date, intervalMs: number): boolean {
  const age = now.getTime() - lastAt.getTime();
  return Number.isFinite(age) && age >= 0 && age < intervalMs;
}

/**
 * Atomically claim this sport's hourly paid-call slot: inside one transaction,
 * take the per-sport advisory mutex, read the latest marker for `checkPurposes`,
 * refuse when it is younger than `intervalMs`, otherwise write the marker.
 * A reservation is the only way a paid call proceeds; the marker no longer
 * needs a separate write.
 *
 * Fallbacks (both logged): a client without `$transaction` AND `$executeRaw`
 * (test fakes), or one the caller flagged `atomicCapable: false` (the stub
 * Prisma client, whose no-op `$transaction` passes the shape check), runs the
 * read-then-write path non-atomically, once-warned; a transaction that throws also falls back. A
 * ledger outage on the fallback itself reads as reserved (fail open, matching
 * every other ledger function: an outage removes the pacing signal, it never
 * blanks the board or stalls settlement).
 */
export async function reservePaidCallSlot(
  db: OddsCreditLedgerDb,
  input: ReservePaidCallSlotInput,
): Promise<PaidCallSlotReservation> {
  const purposes = input.checkPurposes ?? [input.purpose];
  const marker: PaidCallMarker = {
    sport: input.sport,
    purpose: input.purpose,
    at: input.now.toISOString(),
  };
  const attempt = async (rows: OddsCreditLedgerRows, atomic: boolean): Promise<PaidCallSlotReservation> => {
    const lastAt = await readLatestMarkerAcross(rows, purposes, input.sport);
    if (lastAt && withinInterval(lastAt, input.now, input.intervalMs)) {
      return { reserved: false, atomic, lastAt };
    }
    await rows.jarvisMemoryEvent.create({ data: markerRowData(marker) });
    return { reserved: true, atomic };
  };

  const canSerialize =
    input.atomicCapable !== false &&
    typeof db.$transaction === "function" &&
    typeof db.$executeRaw === "function";
  if (canSerialize && db.$transaction) {
    try {
      const key = paidCallMutexKey(input.sport);
      return await db.$transaction(async (tx) => {
        if (typeof tx.$executeRaw !== "function") {
          throw new Error("transaction client exposes no $executeRaw for the advisory mutex");
        }
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        return attempt(tx, true);
      });
    } catch (err) {
      console.warn(
        `[credit-ledger] ${input.sport} ${input.purpose}: atomic slot reservation failed, ` +
          `falling back to read-then-write: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else if (!warnedNonAtomicReservation) {
    warnedNonAtomicReservation = true;
    console.warn(
      input.atomicCapable === false
        ? "[credit-ledger] ledger client is the stub Prisma client (no database): hourly slot " +
            "reservations are read-then-write (non-atomic) in this process"
        : "[credit-ledger] ledger client has no $transaction/$executeRaw: hourly slot reservations " +
            "are read-then-write (non-atomic) in this process",
    );
  }
  try {
    return await attempt(db, false);
  } catch {
    return { reserved: true, atomic: false };
  }
}

/**
 * Truth-surface block (oddsInserting.dualPath.credits): latest reading plus a
 * projection from the last 24 hours of observations. Read-only; never throws.
 */
export async function loadOddsCreditTruth(
  db: OddsCreditLedgerRows,
  now: Date = new Date(),
): Promise<OddsCreditTruth> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [latest, last24h] = await Promise.all([
    loadLatestCreditObservation(db),
    loadCreditObservationsSince(db, since),
  ]);
  return buildOddsCreditTruth({ latest, last24h, now });
}
