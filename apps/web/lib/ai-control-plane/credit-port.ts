/**
 * CreditAuthorizationPort (directive §10.8) — the seam through which the
 * control plane authorizes CONFIRMED_CREDITS_ONLY spend.
 *
 * WHY A PORT: a fresh credit snapshot is NOT enough under concurrency — ten
 * simultaneous calls can each read the same remaining balance and
 * collectively exceed it, turning "credits only" into a cash overage. Credit
 * authorization must therefore RESERVE atomically against the authoritative
 * credit truth, exactly like the cash engine reserves against budget
 * windows.
 *
 * OWNERSHIP: NOVA remains the canonical owner of all credit tables. The
 * control plane CONSUMES this interface; S5 IMPLEMENTS it against NOVA-owned
 * persistence. Nothing in this repository implements a real adapter.
 *
 * FAIL CLOSED (§10.8, tested): until a real adapter exists,
 * CONFIRMED_CREDITS_ONLY is UNREACHABLE in production — the sealed executor
 * wires {@link failClosedCreditAuthorizationPort}, whose every method throws
 * `BudgetBlocked`. There is no production parameter through which to inject
 * a different port.
 */

import { BudgetBlocked } from "./errors";
import type { Entity, RegisteredAiTaskClass } from "./contracts";

/** What the control plane asks the credit authority to reserve. */
export interface CreditAuthorizationRequest {
  /** The caller's idempotency handle — authorization happens pre-claim. */
  readonly requestId: string;
  readonly taskClass: RegisteredAiTaskClass;
  readonly entity: Entity;
  /** Worst case of the ENTIRE attempt plan (§10.4), exact 6-dp decimal string. */
  readonly worstCaseUsd: string;
  /** Idempotency version, mirroring the cash engine (§10.6). */
  readonly reservationVersion: number;
  readonly now: Date;
}

/** An atomic hold against CONFIRMED credit truth (never a snapshot read). */
export interface CreditReservation {
  readonly creditReservationId: string;
  readonly requestId: string;
  /** The grant the hold is pinned to (confirmed-credit label requires it). */
  readonly grantAllocationRef: string;
  readonly heldUsd: string;
}

/**
 * The port (§10.8). Semantics mirror the cash engine's lifecycle:
 *   - `authorizeAndReserve` — atomic check-and-hold against confirmed
 *     credits; MUST be safe under unbounded concurrency (a snapshot read is
 *     a non-conforming implementation).
 *   - `settleProvisional` — apply the provisional actual, release remainder.
 *   - `reconcile` — confirm from an authoritative receipt.
 *   - `release` — free the hold when no charge occurred.
 * Every method fails closed: an unavailable credit authority means NO
 * credit-funded dispatch.
 */
export interface CreditAuthorizationPort {
  authorizeAndReserve(
    request: CreditAuthorizationRequest,
  ): Promise<CreditReservation>;
  settleProvisional(
    creditReservationId: string,
    actualUsd: string,
    now: Date,
  ): Promise<void>;
  reconcile(
    creditReservationId: string,
    confirmedUsd: string,
    now: Date,
  ): Promise<void>;
  release(creditReservationId: string, now: Date): Promise<void>;
}

/**
 * The ONLY production credit port until S5 lands a real NOVA-backed adapter:
 * every method refuses. This is what makes CONFIRMED_CREDITS_ONLY
 * unreachable in production (§10.8) — and it is tested.
 */
export const failClosedCreditAuthorizationPort: CreditAuthorizationPort = {
  async authorizeAndReserve(): Promise<never> {
    throw new BudgetBlocked(
      "CONFIRMED_CREDITS_ONLY requires a real CreditAuthorizationPort adapter " +
        "(S5, NOVA-owned persistence). No adapter is wired — credit-funded " +
        "dispatch is unreachable and fails closed.",
    );
  },
  async settleProvisional(): Promise<never> {
    throw new BudgetBlocked(
      "No CreditAuthorizationPort adapter is wired — cannot settle a credit " +
        "reservation that can never have existed.",
    );
  },
  async reconcile(): Promise<never> {
    throw new BudgetBlocked(
      "No CreditAuthorizationPort adapter is wired — cannot reconcile a credit " +
        "reservation that can never have existed.",
    );
  },
  async release(): Promise<never> {
    throw new BudgetBlocked(
      "No CreditAuthorizationPort adapter is wired — cannot release a credit " +
        "reservation that can never have existed.",
    );
  },
};
