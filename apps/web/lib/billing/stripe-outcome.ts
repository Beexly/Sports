/**
 * Stripe session-create outcome classification (directive 5.3).
 *
 * "Stripe threw" is NOT one fact — it is four very different facts, and
 * collapsing them all to FAILED (as the draft did) silently converts
 * "outcome unknown" into "safe to mint a fresh idempotency key", which is
 * exactly the double-session/double-billing hole this module closes.
 *
 *   DEFINITIVE_REJECTION      Stripe processed the request and refused it
 *                             (e.g. card errors). No session exists. Safe to
 *                             mark the attempt FAILED and release its intent.
 *   AMBIGUOUS_NETWORK_OUTCOME The request may or may not have committed at
 *                             Stripe (connection dropped mid-flight, Stripe
 *                             5xx). The attempt AND its idempotency key MUST
 *                             be retained; only reconciliation (webhook or
 *                             repair job) may resolve it.
 *   RETRIABLE_NO_REQUEST_SENT Provably no state changed at Stripe (e.g. rate
 *                             limited before processing). The SAME attempt +
 *                             key is immediately retriable.
 *   CONFIGURATION_FAILURE     Our credentials/parameters are wrong (auth,
 *                             permission, invalid params, idempotency-key
 *                             misuse). Retrying cannot help until an operator
 *                             fixes configuration. FAILED + incident.
 *
 * Classification is STRUCTURAL on the Stripe SDK's `type` discriminant (not
 * `instanceof`) so it works identically for the real SDK, mocks, and errors
 * that crossed a serialization boundary. Unknown errors classify as
 * AMBIGUOUS_NETWORK_OUTCOME — the fail-closed default: never mint a fresh key
 * on an outcome we cannot prove.
 */

/** Mirrors the `CheckoutOutcomeClass` Prisma enum (packages/db/prisma/schema.prisma). */
export type CheckoutOutcomeClass =
  | "DEFINITIVE_REJECTION"
  | "AMBIGUOUS_NETWORK_OUTCOME"
  | "RETRIABLE_NO_REQUEST_SENT"
  | "CONFIGURATION_FAILURE";

/** Stripe SDK error `type` discriminants → outcome class. */
const STRIPE_ERROR_TYPE_OUTCOME: Readonly<Record<string, CheckoutOutcomeClass>> = {
  // The connection failed or dropped: the request may have reached Stripe.
  StripeConnectionError: "AMBIGUOUS_NETWORK_OUTCOME",
  // Stripe answered 5xx: it RECEIVED the request; its effect is unknown.
  StripeAPIError: "AMBIGUOUS_NETWORK_OUTCOME",
  // Stripe processed and definitively refused.
  StripeCardError: "DEFINITIVE_REJECTION",
  // Our request/credentials are wrong — operator problem, not retriable as-is.
  StripeInvalidRequestError: "CONFIGURATION_FAILURE",
  StripeAuthenticationError: "CONFIGURATION_FAILURE",
  StripePermissionError: "CONFIGURATION_FAILURE",
  // Same idempotency key replayed with different parameters — a programming/
  // configuration defect by definition (the fingerprint gate should make this
  // unreachable; if it fires, fail closed and investigate).
  StripeIdempotencyError: "CONFIGURATION_FAILURE",
  // Rejected by the rate limiter before processing: provably no state change.
  StripeRateLimitError: "RETRIABLE_NO_REQUEST_SENT",
};

/**
 * Classify an error thrown by `stripe.checkout.sessions.create`.
 * Unknown shapes → AMBIGUOUS_NETWORK_OUTCOME (fail closed).
 */
export function classifyStripeSessionCreateError(err: unknown): CheckoutOutcomeClass {
  if (err !== null && typeof err === "object") {
    const type = (err as { type?: unknown }).type;
    if (typeof type === "string") {
      const mapped = STRIPE_ERROR_TYPE_OUTCOME[type];
      if (mapped) return mapped;
    }
  }
  return "AMBIGUOUS_NETWORK_OUTCOME";
}

/** Mirrors the `CheckoutAttemptStatus` Prisma enum values a failed create can land in. */
export type OutcomeAttemptStatus = "CREATED" | "AMBIGUOUS" | "FAILED";

export interface OutcomeTransition {
  /** Status the attempt transitions to from REQUEST_IN_FLIGHT. */
  status: OutcomeAttemptStatus;
  /**
   * Whether the attempt releases its active intent key. ONLY true for
   * genuinely terminal outcomes — an ambiguous or retriable attempt keeps its
   * key so every retry reuses the SAME Stripe idempotency key.
   */
  releasesActiveKey: boolean;
  /** Client-facing HTTP status for the checkout route. */
  httpStatus: 400 | 502 | 503;
  /** Machine-readable error code for the route's JSON body. */
  errorCode: string;
}

const OUTCOME_TRANSITIONS: Readonly<Record<CheckoutOutcomeClass, OutcomeTransition>> = {
  DEFINITIVE_REJECTION: {
    status: "FAILED",
    releasesActiveKey: true,
    httpStatus: 400,
    errorCode: "checkout_rejected",
  },
  AMBIGUOUS_NETWORK_OUTCOME: {
    // Key retained. The same attempt is retried (same key) or resolved by
    // reconciliation; a fresh attempt is only minted after reconciliation
    // proves the original absent/expired.
    status: "AMBIGUOUS",
    releasesActiveKey: false,
    httpStatus: 503,
    errorCode: "checkout_outcome_ambiguous",
  },
  RETRIABLE_NO_REQUEST_SENT: {
    // Back to CREATED: immediately retriable with the SAME key.
    status: "CREATED",
    releasesActiveKey: false,
    httpStatus: 503,
    errorCode: "checkout_retriable",
  },
  CONFIGURATION_FAILURE: {
    status: "FAILED",
    releasesActiveKey: true,
    httpStatus: 502,
    errorCode: "checkout_configuration_failure",
  },
};

/** The attempt-state transition + HTTP mapping for a classified outcome. */
export function transitionForOutcome(outcome: CheckoutOutcomeClass): OutcomeTransition {
  return OUTCOME_TRANSITIONS[outcome];
}
