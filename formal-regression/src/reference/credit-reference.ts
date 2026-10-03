/**
 * REFERENCE / TEST-DOUBLE IMPLEMENTATION — NOT production code.
 *
 * A small, self-contained in-memory reimplementation of the flagship
 * no-double-spend property formalized in W2-02's `CreditReservation.tla`
 * (LedgerNeverExceedsBalance, NeverOverAdmit). This exists ONLY as a
 * second, independent oracle to cross-check the same property tests run
 * against the REAL `credit-admission.ts` (`createPgCreditAuthorizationPort`
 * + `InMemoryCreditLedgerDb`, see `../tests/credit-reservation.real.property.test.ts`).
 * This model intentionally has no snapshot/admissibility layer, no
 * settle/release accounting nuance beyond the TLA+ spec's own — it mirrors
 * `Authorize`/`Settle`/`Release` exactly and nothing more.
 */

export type ReservationState = "HELD" | "SETTLED" | "RELEASED" | "REFUSED";

export class ReferenceCreditLedger {
  private reserved = 0;
  private readonly states = new Map<string, ReservationState>();

  constructor(
    private readonly verifiedBalance: number,
    private readonly requestCost: number,
  ) {}

  get reservedTotal(): number {
    return this.reserved;
  }

  /** Mirrors Authorize(t): ONE atomic guarded transition, no read-then-write gap. */
  authorize(attemptId: string): "HELD" | "REFUSED" {
    if (this.reserved + this.requestCost <= this.verifiedBalance) {
      this.reserved += this.requestCost;
      this.states.set(attemptId, "HELD");
      return "HELD";
    }
    this.states.set(attemptId, "REFUSED");
    return "REFUSED";
  }

  settle(attemptId: string): void {
    if (this.states.get(attemptId) === "HELD") this.states.set(attemptId, "SETTLED");
  }

  release(attemptId: string): void {
    if (this.states.get(attemptId) === "HELD") {
      this.states.set(attemptId, "RELEASED");
      this.reserved -= this.requestCost;
    }
  }

  admittedCount(): number {
    let n = 0;
    for (const s of this.states.values()) if (s === "HELD" || s === "SETTLED") n++;
    return n;
  }
}
