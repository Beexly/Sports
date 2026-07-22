/**
 * ============================================================================
 * DORMANT / LAB-ONLY — Wave 3 batch1 EXTENSION.
 * READ-ONLY receipt-export seam. Pure, typed, side-effect-free.
 * NOT wired into any production surface: no writes to any store, no scheduler,
 * no cron, no I/O, no network. Nothing here is imported by a production route,
 * worker, or job.
 * ============================================================================
 *
 * A typed READ seam over the latest Formal Heartbeat outcome, for NOVA /
 * Founder OS / the Capability Governor to READ (never write). The seam is a
 * single-method interface (`HeartbeatReceiptReader.latest()`) plus a pure
 * builder that projects a `HeartbeatResult` (heartbeat.ts) into a small,
 * serializable `FormalHeartbeatReceipt`, plus an in-memory REFERENCE reader
 * for the lab/tests. The reference reader holds at most the most-recent
 * receipt in process memory; it is explicitly lab-only and is not a store.
 *
 * The receipt is a read model, not an assertion of enforcement: it carries the
 * heartbeat's pass/fail, per-invariant summary, and the anytime-valid
 * e-process budget state. It says nothing the underlying run did not already
 * compute.
 */

import type { HeartbeatResult, InvariantCheck, InvariantName } from "./heartbeat.js";
import { INVARIANT_NAMES } from "./heartbeat.js";

/**
 * A serializable, read-only snapshot ("receipt") of one Formal Heartbeat run.
 * Every field is derived from the `HeartbeatResult` it was built from — no
 * field asserts anything the run did not compute.
 */
export interface FormalHeartbeatReceipt {
  /** Caller-supplied stable id for this receipt. */
  readonly receiptId: string;
  /** ISO-8601 instant the receipt was minted (caller-supplied; not read from a
   *  wall clock here — this module never reads the clock). */
  readonly generatedAtIso: string;
  /** Number of projected abstract states re-checked in the window. */
  readonly windowStateCount: number;
  /** True iff the window had zero invariant violations. */
  readonly pass: boolean;
  /** Total invariant evaluations across the window. */
  readonly totalChecks: number;
  /** Total invariant violations across the window. */
  readonly totalViolations: number;
  /** The full invariant set that was evaluated (stable order). */
  readonly invariantsChecked: readonly InvariantName[];
  /** Distinct invariants that had at least one violation in the window. */
  readonly violatedInvariants: readonly InvariantName[];
  /** e-process wealth E_t after burning the window (1/alpha is the boundary). */
  readonly budgetWealth: number;
  /** True once the SLO error budget is exhausted (anytime-valid reject). */
  readonly budgetExhausted: boolean;
  /** Number of Bernoulli observations fed to the e-process. */
  readonly observationCount: number;
}

/** Caller-supplied identity/time for a receipt (kept out of the pure core so
 *  this module reads no clock and generates no id itself). */
export interface HeartbeatReceiptMeta {
  readonly receiptId: string;
  readonly generatedAtIso: string;
}

/**
 * Pure projection of a `HeartbeatResult` into a `FormalHeartbeatReceipt`.
 * Deterministic; no side effects, no clock reads (identity/time come from
 * `meta`). `violatedInvariants` is the distinct set of invariants that had a
 * violation somewhere in the window, in `INVARIANT_NAMES` order.
 */
export function toFormalHeartbeatReceipt(
  result: HeartbeatResult,
  meta: HeartbeatReceiptMeta,
): FormalHeartbeatReceipt {
  const violated = new Set<InvariantName>();
  for (const report of result.stateReports) {
    for (const v of report.violations as readonly InvariantCheck[]) {
      violated.add(v.invariant);
    }
  }
  const violatedInvariants = INVARIANT_NAMES.filter((n) => violated.has(n));

  return {
    receiptId: meta.receiptId,
    generatedAtIso: meta.generatedAtIso,
    windowStateCount: result.stateReports.length,
    pass: result.pass,
    totalChecks: result.totalChecks,
    totalViolations: result.totalViolations,
    invariantsChecked: INVARIANT_NAMES,
    violatedInvariants,
    budgetWealth: result.budgetWealth,
    budgetExhausted: result.budgetExhausted,
    observationCount: result.observations.length,
  };
}

/**
 * The READ seam. Consumers (NOVA / Founder OS / the Capability Governor) hold
 * only this — a single method that returns the latest receipt, or `null` when
 * no heartbeat has been recorded yet. There is no write method on this
 * interface: the read side cannot mutate heartbeat state.
 */
export interface HeartbeatReceiptReader {
  latest(): FormalHeartbeatReceipt | null;
}

/**
 * LAB-ONLY in-memory reference reader. Holds at most the most-recent receipt
 * in process memory. NOT a store, NOT persisted, NOT wired to anything — it
 * exists so the lab and tests can exercise the read seam. `record()` is a
 * lab-only mutator kept OFF the `HeartbeatReceiptReader` interface, so a
 * consumer that receives the seam as `HeartbeatReceiptReader` gets a
 * read-only view with no way to write.
 */
export class InMemoryHeartbeatReceiptReader implements HeartbeatReceiptReader {
  #latest: FormalHeartbeatReceipt | null = null;

  latest(): FormalHeartbeatReceipt | null {
    return this.#latest;
  }

  /** LAB-ONLY: seed/replace the in-memory receipt. Never called by any
   *  production surface. */
  record(receipt: FormalHeartbeatReceipt): void {
    this.#latest = receipt;
  }
}
