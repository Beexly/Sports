/**
 * In-memory `CreditLedgerDb` test double.
 *
 * TEST-DOUBLE / REFERENCE ADAPTER — clearly labeled. This is NOT the real
 * production database boundary; it is a hand-written in-memory stand-in
 * for Postgres that speaks the exact `CreditLedgerDb` interface defined by
 * the REAL, unmodified `credit-admission.ts`
 * (`/workspace/wt/prd/apps/web/lib/ai-control-plane/credit-admission.ts`).
 *
 * The code actually under test is `createPgCreditAuthorizationPort(db)`
 * from that real file, imported verbatim — this adapter only stands in for
 * the `credit_grant_reservation_ledger` / `credit_grant_reservations`
 * tables and the row-lock it depends on. The critical atomicity property —
 * "the check `reservedMinorUnits + amount <= spendable` and the write of
 * the new `reservedMinorUnits` happen as ONE indivisible step, so two
 * concurrent authorizers can never both observe headroom and both admit
 * past capacity" — is reproduced here by doing the read-guard-write inside
 * `$executeRawUnsafe` with NO `await` between the check and the mutation
 * (this is the exact same guarantee Postgres row locking gives a single
 * `UPDATE ... WHERE ...` statement: no other transaction can observe or
 * mutate the row mid-statement). `$transaction` here additionally uses a
 * real per-connection FIFO mutex so that operations *within* one
 * `$transaction(fn)` callback are never reordered relative to another
 * concurrent `$transaction` callback touching the same tables — matching a
 * real Postgres transaction's isolation from other connections.
 */
import type { CreditLedgerDb } from "../../../../../wt/prd/apps/web/lib/ai-control-plane/credit-admission";

interface LedgerRow {
  grantId: string;
  reservedMinorUnits: number;
}

interface ReservationRow {
  id: string;
  grantId: string;
  amountMinorUnits: number;
  state: "HELD" | "SETTLED" | "RELEASED" | "EXPIRED";
}

/** Minimal FIFO async mutex — models one Postgres connection's serialized transactions. */
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => (release = resolve));
    const prev = this.tail;
    this.tail = next;
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export class InMemoryCreditLedgerDb implements CreditLedgerDb {
  readonly ledger = new Map<string, LedgerRow>();
  readonly reservations = new Map<string, ReservationRow>();
  private readonly mutex = new Mutex();

  /** Injectable fault: throw during a transaction (mid-flight crash simulation). */
  faultInTransaction: (() => void) | null = null;

  async $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> {
    // NOTE: pattern matching below is deliberately tolerant of optional SQL
    // type casts (e.g. `$1::bigint`) via `\$1(::\w+)?` — the real
    // credit-admission.ts file lives in a worktree this session does not
    // own and was observed changing cast annotations mid-session (other
    // concurrent work on the same shared checkout); matching on structure
    // (table name + operator shape) rather than an exact literal string is
    // what keeps this adapter honest instead of silently drifting stale.
    if (query.includes('INSERT INTO "credit_grant_reservation_ledger"') && query.includes("ON CONFLICT")) {
      const [grantId] = values as [string];
      if (!this.ledger.has(grantId)) {
        this.ledger.set(grantId, { grantId, reservedMinorUnits: 0 });
      }
      return 0;
    }
    if (
      query.includes('UPDATE "credit_grant_reservation_ledger"') &&
      /"reservedMinorUnits"\s*\+\s*\$1(::\w+)?\s*<=\s*\$3(::\w+)?/.test(query)
    ) {
      const [amount, grantId, spendableAtAuthTime] = values as [number, string, number];
      const row = this.ledger.get(grantId);
      if (!row) return 0;
      // Atomic guard + write: one synchronous step, no await in between.
      if (row.reservedMinorUnits + amount <= spendableAtAuthTime) {
        row.reservedMinorUnits += amount;
        return 1;
      }
      return 0;
    }
    if (query.includes('INSERT INTO "credit_grant_reservations"')) {
      const [id, grantId, amountMinorUnits] = values as [string, string, number, Date, Date];
      this.reservations.set(id, { id, grantId, amountMinorUnits, state: "HELD" });
      return 1;
    }
    if (
      query.includes('UPDATE "credit_grant_reservation_ledger"') &&
      /"reservedMinorUnits"\s*-\s*\$1(::\w+)?/.test(query)
    ) {
      const [amountStr, grantId] = values as [string, string];
      const amount = Number(amountStr);
      const row = this.ledger.get(grantId);
      if (row) row.reservedMinorUnits = Math.max(0, row.reservedMinorUnits - amount);
      return row ? 1 : 0;
    }
    if (query.includes('UPDATE "credit_grant_reservations"') && query.includes("'SETTLED'")) {
      const [actualMinorUnits, reservationId] = values as [number, string];
      const row = this.reservations.get(reservationId);
      if (!row || row.state !== "HELD") return 0;
      row.state = "SETTLED";
      void actualMinorUnits;
      return 1;
    }
    if (query.includes('UPDATE "credit_grant_reservations"') && query.includes("'RELEASED'")) {
      const [reservationId] = values as [string];
      const row = this.reservations.get(reservationId);
      if (!row || row.state !== "HELD") return 0;
      row.state = "RELEASED";
      return 1;
    }
    throw new Error(`InMemoryCreditLedgerDb: unrecognized $executeRawUnsafe, cannot fake it honestly:\n${query}`);
  }

  async $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T> {
    if (query.includes('FROM "credit_grant_reservations"') && query.includes("FOR UPDATE")) {
      const [reservationId] = values as [string];
      const row = this.reservations.get(reservationId);
      return (row
        ? [{ grantId: row.grantId, amountMinorUnits: String(row.amountMinorUnits), state: row.state }]
        : []) as unknown as T;
    }
    throw new Error(`InMemoryCreditLedgerDb: unrecognized $queryRawUnsafe, cannot fake it honestly:\n${query}`);
  }

  async $transaction<T>(fn: (tx: CreditLedgerDb) => Promise<T>): Promise<T> {
    return this.mutex.run(async () => {
      if (this.faultInTransaction) this.faultInTransaction();
      return fn(this);
    });
  }
}
