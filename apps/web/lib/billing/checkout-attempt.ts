/**
 * Durable checkout attempt — server-authoritative checkout idempotency.
 *
 * Replaces the rejected per-intent-UUID-in-a-React-useRef design (PR #156).
 * Every guarantee lives HERE and in the CheckoutAttempt table, never in
 * component lifetime:
 *
 *  1. The client may send a per-visit `clientIntentId` (a UUID hint). The
 *     server creates-or-retrieves ONE CheckoutAttempt row per
 *     (userId, intent) via the (userId, activeClientIntentId) unique
 *     constraint — create + catch-P2002-then-fetch, never check-then-insert —
 *     so any number of concurrent requests converge on the same attempt.
 *  2. AUDIT IDENTITY (directive 5.4): `originalClientIntentId` is immutable —
 *     written once, never cleared. `activeClientIntentId` is the separate
 *     active-key column: equal to the original while the attempt owns the
 *     intent, NULL once a terminal attempt releases it. Terminal generations
 *     therefore stay fully traceable forever.
 *  3. The attempt binds an immutable `requestFingerprint`: a sha256 over the
 *     CANONICAL commercial request (directive 5.5 — tier, interval, price,
 *     currency, quantity, trial terms, promotion policy, tax behavior,
 *     commercial-terms version, consent, origin class, metadata version) via
 *     canonical JSON. Same intent + different fingerprint is a hard 409.
 *  4. The Stripe idempotency key derives from (userId, attempt id) and is
 *     ALSO persisted on the row (`stripeIdempotencyKey`), so ambiguous
 *     retries and the repair job always see/reuse the exact original key.
 *  5. Outcome preservation (directive 5.3): a Stripe error is classified
 *     (see stripe-outcome.ts); AMBIGUOUS outcomes keep the attempt AND key —
 *     a fresh attempt is only minted once reconciliation proves the original
 *     absent or expired. States: CREATED → REQUEST_IN_FLIGHT →
 *     SESSION_CREATED → COMPLETED, plus AMBIGUOUS / FAILED / EXPIRED /
 *     CANCELED.
 *  6. DURABILITY IS A PRECONDITION (directive 5.2): a create that does not
 *     echo the written row (the stub client's `{ id: "stub" }` sentinel)
 *     throws a typed CheckoutAttemptPersistenceError — this module never
 *     "tolerates" a store that pretends to write. The route additionally
 *     calls requireDurableWriteStore("stripe-checkout") BEFORE any Stripe
 *     side effect.
 */

import { randomUUID } from "node:crypto";
import { sha256CanonicalJson } from "@/lib/billing/canonical-json";
import { getCurrentPricingPhaseId } from "@/lib/pricing/pricing-phases";

// ~24h, matching Stripe's documented idempotency-key retention window. An
// attempt older than this can no longer replay its original session response,
// so reusing it would be a silent fresh request under a stale identity.
export const CHECKOUT_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

// A Stripe Checkout Session lives at most ~24h after ITS creation. The last
// session an attempt could possibly have created is one minted right at the
// attempt TTL, so only past (expiresAt + this window) is "every session this
// attempt could have created has itself died" provable on time alone.
export const CHECKOUT_SESSION_MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;

// Minimum quiet time (since the attempt's last write) before ANY
// reconciliation — inline or batch — may consult Stripe and treat "no session
// found" as proof of absence. A request claimed moments ago may still be
// mid-flight at Stripe: listing before its create commits would "prove" a
// session absent that is about to exist. Shared truth for the repair job's
// REPAIR_MIN_AGE_MS and the inline past-TTL reconcile guard.
export const CHECKOUT_RECONCILE_MIN_AGE_MS = 10 * 60 * 1000;

export type CheckoutAttemptStatus =
  | "CREATED"
  | "REQUEST_IN_FLIGHT"
  | "SESSION_CREATED"
  | "AMBIGUOUS"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELED";

/** Statuses from which a request may claim the attempt and talk to Stripe.
 * REQUEST_IN_FLIGHT is excluded (another request holds the claim), as are all
 * terminal states. SESSION_CREATED is claimable only for the replay path
 * (retrieval of the existing session URL failed → idempotent re-create). */
export const CLAIMABLE_STATUSES = ["CREATED", "AMBIGUOUS", "SESSION_CREATED"] as const;

export interface CheckoutAttemptRecord {
  id: string;
  originalClientIntentId: string | null;
  activeClientIntentId: string | null;
  userId: string | null;
  subjectUserId: string;
  subjectEmail: string | null;
  customerId: string | null;
  tier: string;
  interval: string;
  priceId: string;
  currency: string;
  quantity: number;
  requestFingerprint: string;
  fingerprintVersion: string;
  status: CheckoutAttemptStatus;
  lastOutcomeClass: string | null;
  stripeIdempotencyKey: string;
  stripeSessionId: string | null;
  stripeSubscriptionId: string | null;
  lastErrorKind: string | null;
  expiresAt: Date;
}

/**
 * Minimal structural slice of the Prisma client this module needs — keeps the
 * helper unit-testable against an in-memory fake that enforces the unique
 * constraint exactly like Postgres.
 */
export interface CheckoutAttemptDb {
  checkoutAttempt: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    findUnique(args: {
      where: {
        userId_activeClientIntentId: { userId: string; activeClientIntentId: string };
      };
    }): Promise<unknown>;
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
}

/** Malformed attempt / intent identifier — mapped to a typed 4xx, never a generic 500. */
export class CheckoutAttemptIdError extends Error {
  readonly kind = "checkout_attempt_id" as const;
  constructor(message: string) {
    super(message);
    this.name = "CheckoutAttemptIdError";
  }
}

/**
 * Same (userId, intent) presented with a DIFFERENT request fingerprint — the
 * caller must surface HTTP 409 and never reuse the key.
 */
export class CheckoutIntentConflictError extends Error {
  readonly kind = "checkout_intent_conflict" as const;
  constructor(message: string) {
    super(message);
    this.name = "CheckoutIntentConflictError";
  }
}

/**
 * The store did not durably persist the attempt (e.g. the stub Prisma client
 * returned its `{ id: "stub" }` sentinel instead of echoing the row). Mapped
 * to a typed 503 — NO Stripe side effect may follow (directive 5.2).
 */
export class CheckoutAttemptPersistenceError extends Error {
  readonly kind = "checkout_attempt_persistence" as const;
  constructor(message: string) {
    super(message);
    this.name = "CheckoutAttemptPersistenceError";
  }
}

/**
 * An unresolved attempt (REQUEST_IN_FLIGHT / AMBIGUOUS / SESSION_CREATED) is
 * past its TTL but its true outcome at Stripe could not be proven right now —
 * a session it created may STILL be open and payable, so minting a fresh
 * generation (fresh Stripe key → possible second payable session) is
 * forbidden (directive 5.3). Mapped to a typed 409; the repair cron owns the
 * durable resolution.
 */
export class CheckoutAttemptUnresolvedError extends Error {
  readonly kind = "checkout_attempt_unresolved" as const;
  constructor(message: string) {
    super(message);
    this.name = "CheckoutAttemptUnresolvedError";
  }
}

// Client intent hints are UUIDs (crypto.randomUUID in the browser).
const CLIENT_INTENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server attempt ids are minted app-side as `ca_<uuid>` (see
// mintCheckoutAttemptId) so the id is known BEFORE the insert and a
// non-echoing store is detectable (see CheckoutAttemptPersistenceError).
const CHECKOUT_ATTEMPT_ID_RE =
  /^ca_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidClientIntentId(value: string): boolean {
  return CLIENT_INTENT_ID_RE.test(value);
}

export function isValidCheckoutAttemptId(value: string): boolean {
  return CHECKOUT_ATTEMPT_ID_RE.test(value);
}

export function mintCheckoutAttemptId(): string {
  return `ca_${randomUUID()}`;
}

/**
 * Version string for the CURRENT commercial terms a checkout is made under.
 * Folded into the request fingerprint so a pricing-phase advance or a
 * Terms-consent flag flip invalidates stale intents instead of silently
 * reusing an idempotency key minted under different terms.
 */
export function currentCommercialTermsVersion(): string {
  const consent =
    process.env["STRIPE_TERMS_CONSENT_ENABLED"] === "true" ? "on" : "off";
  return `phase=${getCurrentPricingPhaseId()};terms-consent=${consent}`;
}

export const REQUEST_FINGERPRINT_VERSION = "v2";

/**
 * The FULL canonical commercial request (directive 5.5). Every field that
 * changes what Stripe would charge — or under which terms — is here; any
 * change to any of them yields a different fingerprint and therefore a 409
 * instead of a silent idempotency-key reuse.
 */
export interface CheckoutCommercialParams {
  userId: string;
  tier: string;
  interval: string;
  priceId: string;
  currency: string;
  quantity: number;
  /** Trial terms, or null when no trial is offered. */
  trialTerms: { trialDays: number } | null;
  /** Promotion/coupon policy in effect ("none" today: no promo codes at checkout). */
  promotionPolicy: "none" | "codes-allowed";
  /** Stripe tax behavior ("unspecified" today: automatic tax not enabled). */
  taxBehavior: "unspecified" | "automatic";
  /** Commercial-terms version (pricing phase + consent flag), see currentCommercialTermsVersion. */
  termsVersion: string;
  /** Whether point-of-sale ToS consent collection is required. */
  consentRequired: boolean;
  /** Class of success/cancel origin (never full URLs — env-dependent). */
  originClass: string;
  /** Version of the metadata contract stamped into the session/subscription. */
  metadataVersion: string;
}

/**
 * Builds today's ACTUAL commercial params for a checkout, mirroring exactly
 * what lib/stripe.ts createCheckoutSession sends: quantity 1, no trial, no
 * promotion codes, unspecified tax behavior, dashboard/pricing origin class,
 * metadata contract v1. If createCheckoutSession gains a knob, it MUST be
 * added here so the fingerprint keeps covering the full request.
 */
export function currentCheckoutCommercialParams(input: {
  userId: string;
  tier: string;
  interval: string;
  priceId: string;
  currency: string;
}): CheckoutCommercialParams {
  return {
    userId: input.userId,
    tier: input.tier,
    interval: input.interval,
    priceId: input.priceId,
    currency: input.currency,
    quantity: 1,
    trialTerms: null,
    promotionPolicy: "none",
    taxBehavior: "unspecified",
    termsVersion: currentCommercialTermsVersion(),
    consentRequired: process.env["STRIPE_TERMS_CONSENT_ENABLED"] === "true",
    originClass: "app-default",
    metadataVersion: "1",
  };
}

/**
 * Canonical fingerprint binding an attempt to its exact commercial request.
 * Canonical-JSON (sorted keys) + sha256 — field ORDER cannot matter, field
 * VALUES always do.
 */
export function computeRequestFingerprint(params: CheckoutCommercialParams): string {
  return sha256CanonicalJson(
    {
      version: REQUEST_FINGERPRINT_VERSION,
      userId: params.userId,
      tier: params.tier,
      interval: params.interval,
      priceId: params.priceId,
      currency: params.currency.toLowerCase(),
      quantity: params.quantity,
      trialTerms: params.trialTerms,
      promotionPolicy: params.promotionPolicy,
      taxBehavior: params.taxBehavior,
      termsVersion: params.termsVersion,
      consentRequired: params.consentRequired,
      originClass: params.originClass,
      metadataVersion: params.metadataVersion,
    },
    "gse-checkout-attempt",
  );
}

/**
 * Durable Stripe idempotency key for a checkout attempt. Derived from
 * (userId, attemptId) — stable across reloads, devices, and retries — and
 * persisted on the attempt row at mint time.
 */
export function stripeIdempotencyKeyForAttempt(userId: string, attemptId: string): string {
  return `gse-checkout-${userId}-${attemptId}`;
}

export interface GetOrCreateCheckoutAttemptInput {
  userId: string;
  clientIntentId: string | null;
  /** Immutable subject snapshot (retention: survives user deletion). */
  subjectEmail: string | null;
  customerId: string | null;
  tier: string;
  interval: string;
  priceId: string;
  currency: string;
  quantity?: number;
  requestFingerprint: string;
  /**
   * Inline single-attempt reconciliation against Stripe's authoritative
   * state (see reconcileOneCheckoutAttempt in checkout-attempt-repair.ts).
   * Invoked at most once when an UNRESOLVED attempt (REQUEST_IN_FLIGHT /
   * AMBIGUOUS / SESSION_CREATED) is found past its TTL: elapsed time alone is
   * NEVER proof that its session does not exist (directive 5.3). Must throw
   * on transport failure. When omitted, such attempts fail closed with
   * CheckoutAttemptUnresolvedError.
   */
  reconcileUnresolved?: (attempt: CheckoutAttemptRecord) => Promise<void>;
  /** Injectable clock for tests. */
  now?: Date;
}

export interface GetOrCreateCheckoutAttemptResult {
  attempt: CheckoutAttemptRecord;
  /** True when an existing (non-dead) attempt was retrieved instead of created. */
  reused: boolean;
}

/** True only for a Prisma P2002 unique-constraint violation. */
function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Fail-closed persistence check: the store must ECHO the row we wrote
 * (Prisma always returns the created row). A sentinel/no-op result means the
 * write did not happen — never proceed toward a Stripe side effect on it.
 */
function assertDurablyCreated(
  created: unknown,
  data: Record<string, unknown>,
): CheckoutAttemptRecord {
  const row =
    created && typeof created === "object" ? (created as Record<string, unknown>) : null;
  if (!row || row["id"] !== data["id"]) {
    throw new CheckoutAttemptPersistenceError(
      "The checkout-attempt store did not durably persist the attempt row " +
        "(no-op/stub write detected). Refusing to continue toward Stripe.",
    );
  }
  return { ...data, ...row } as unknown as CheckoutAttemptRecord;
}

/**
 * Transactionally create-or-retrieve the ONE durable attempt for this
 * request. Race-safe via the (userId, activeClientIntentId) unique
 * constraint: concurrent creates collide on P2002 and losers fetch the
 * winner's row.
 *
 * - no clientIntentId          → mint a fresh server attempt (own intent)
 * - live attempt, same fp      → return it (route claims it before Stripe)
 * - live attempt, diff fp      → CheckoutIntentConflictError (→ 409)
 * - AMBIGUOUS attempt, same fp → returned as-is: the retry reuses the SAME
 *                                attempt and the SAME Stripe idempotency key
 * - FAILED/EXPIRED/CANCELED, past-TTL CREATED, or past-(TTL + session
 *   lifetime) attempt → PROVEN dead: release its ACTIVE key (original intent
 *   id stays on the row forever), mint a fresh generation
 * - unresolved past-TTL attempt (REQUEST_IN_FLIGHT/AMBIGUOUS/SESSION_CREATED)
 *   → reconcile inline against Stripe (input.reconcileUnresolved) — released
 *   only on proof of absence/expiry; a still-open session is returned as-is;
 *   otherwise CheckoutAttemptUnresolvedError (fail closed, never a fresh key
 *   on elapsed time alone — directive 5.3)
 * - COMPLETED attempt          → returned as-is (caller refuses a new session)
 */
export async function getOrCreateCheckoutAttempt(
  dbc: CheckoutAttemptDb,
  input: GetOrCreateCheckoutAttemptInput,
): Promise<GetOrCreateCheckoutAttemptResult> {
  const now = input.now ?? new Date();
  const quantity = input.quantity ?? 1;

  const buildCreateData = (): Record<string, unknown> => {
    const id = mintCheckoutAttemptId();
    return {
      id,
      originalClientIntentId: input.clientIntentId,
      activeClientIntentId: input.clientIntentId,
      userId: input.userId,
      subjectUserId: input.userId,
      subjectEmail: input.subjectEmail,
      customerId: input.customerId,
      tier: input.tier,
      interval: input.interval,
      priceId: input.priceId,
      currency: input.currency.toLowerCase(),
      quantity,
      requestFingerprint: input.requestFingerprint,
      fingerprintVersion: REQUEST_FINGERPRINT_VERSION,
      status: "CREATED",
      stripeIdempotencyKey: stripeIdempotencyKeyForAttempt(input.userId, id),
      expiresAt: new Date(now.getTime() + CHECKOUT_ATTEMPT_TTL_MS),
    };
  };

  // Token-less request: each one is its own intent; no constraint to race on.
  if (!input.clientIntentId) {
    const data = buildCreateData();
    const created = await dbc.checkoutAttempt.create({ data });
    return { attempt: assertDurablyCreated(created, data), reused: false };
  }

  if (!isValidClientIntentId(input.clientIntentId)) {
    throw new CheckoutAttemptIdError(
      "clientIntentId must be a UUID (as minted by crypto.randomUUID).",
    );
  }

  // Bounded convergence loop: each iteration either creates the row, returns
  // the existing live row, conflicts/fails-closed (throw), reconciles an
  // unresolved past-TTL row (at most once), or releases a proven-dead row and
  // retries. Two concurrent expired-retries can interleave once; four
  // iterations are ample.
  const reconciled = new Set<string>();
  for (let attemptNo = 0; attemptNo < 4; attemptNo++) {
    const data = buildCreateData();
    let created: unknown;
    let createdOk = false;
    try {
      created = await dbc.checkoutAttempt.create({ data });
      createdOk = true;
    } catch (err) {
      if (!isUniqueConstraintViolation(err)) throw err;
    }
    if (createdOk) {
      return { attempt: assertDurablyCreated(created, data), reused: false };
    }

    const existingRaw = await dbc.checkoutAttempt.findUnique({
      where: {
        userId_activeClientIntentId: {
          userId: input.userId,
          activeClientIntentId: input.clientIntentId,
        },
      },
    });
    if (!existingRaw) {
      // The competing row vanished between our create and fetch (e.g. it was
      // released by another expired-retry) — try to create again.
      continue;
    }
    const existing = existingRaw as CheckoutAttemptRecord;

    const pastTtl = new Date(existing.expiresAt).getTime() <= now.getTime();

    // A dead attempt releases ONLY its active key so a FRESH generation —
    // with a fresh Stripe idempotency key — can claim the intent.
    // originalClientIntentId is IMMUTABLE and stays on the row: terminal
    // history remains fully traceable (directive 5.4).
    //
    // "Dead" is a PROVEN condition, never elapsed time alone (directive 5.3):
    //  - terminal statuses (FAILED/EXPIRED/CANCELED) were proven when set;
    //  - CREATED past TTL never claimed the Stripe call — no session can
    //    exist, so time alone IS proof;
    //  - REQUEST_IN_FLIGHT/AMBIGUOUS/SESSION_CREATED past TTL may have a
    //    session still open (a session created late in the attempt's life
    //    outlives the attempt TTL by up to a full session lifetime). Those
    //    are dead on time alone only past expiresAt + session lifetime;
    //    inside that window they require Stripe reconciliation (below).
    const provablyBeyondAnySession =
      new Date(existing.expiresAt).getTime() + CHECKOUT_SESSION_MAX_LIFETIME_MS <=
      now.getTime();
    const dead =
      existing.status === "EXPIRED" ||
      existing.status === "FAILED" ||
      existing.status === "CANCELED" ||
      (pastTtl && (existing.status === "CREATED" || provablyBeyondAnySession));
    if (dead) {
      const terminalStatus =
        existing.status === "FAILED" || existing.status === "CANCELED"
          ? existing.status
          : "EXPIRED";
      await dbc.checkoutAttempt.updateMany({
        where: { id: existing.id, activeClientIntentId: input.clientIntentId },
        data: { activeClientIntentId: null, status: terminalStatus },
      });
      continue;
    }

    if (pastTtl) {
      // Unresolved past-TTL attempt: a fresh generation is only allowed after
      // reconciliation PROVES the original absent or expired. Reconcile
      // inline at most once, then re-read the row: a proven-terminal result
      // is released on the next iteration; a still-open session is returned
      // as-is (the route replays its URL); anything unproven fails closed.
      // Min-age guard (mirrors the repair job's REPAIR_MIN_AGE_MS): a row
      // written to very recently may belong to a request STILL mid-flight at
      // Stripe — listing sessions before its create commits would "prove"
      // absent a session that is about to exist. Fail closed instead.
      const lastWriteAt = (existing as { updatedAt?: Date | string }).updatedAt;
      const quietLongEnough =
        lastWriteAt != null &&
        now.getTime() - new Date(lastWriteAt).getTime() >= CHECKOUT_RECONCILE_MIN_AGE_MS;
      if (input.reconcileUnresolved && quietLongEnough && !reconciled.has(existing.id)) {
        reconciled.add(existing.id);
        await input.reconcileUnresolved(existing);
        continue;
      }
      if (
        existing.status === "COMPLETED" ||
        (existing.status === "SESSION_CREATED" && existing.stripeSessionId)
      ) {
        // COMPLETED: the intent is done forever — the route refuses a new
        // session. SESSION_CREATED: reconciliation (or the expiry webhook)
        // confirmed the bound session still open/payable — reuse it; never
        // mint a second payable session.
        if (existing.requestFingerprint !== input.requestFingerprint) {
          throw new CheckoutIntentConflictError(
            "This checkout intent was already started with different parameters. " +
              "Refresh and try again.",
          );
        }
        return { attempt: existing, reused: true };
      }
      throw new CheckoutAttemptUnresolvedError(
        "A previous checkout attempt for this intent has an unresolved outcome. " +
          "It is being reconciled — please retry shortly.",
      );
    }

    if (existing.requestFingerprint !== input.requestFingerprint) {
      throw new CheckoutIntentConflictError(
        "This checkout intent was already started with different parameters. " +
          "Refresh and try again.",
      );
    }

    return { attempt: existing, reused: true };
  }

  // Only reachable under a pathological delete/release storm — surface it.
  throw new Error("checkout attempt create-or-retrieve did not converge");
}

/**
 * Claim the attempt for the exclusive right to talk to Stripe: atomically
 * CREATED/AMBIGUOUS/SESSION_CREATED → REQUEST_IN_FLIGHT. Exactly one of N
 * concurrent requests wins (updateMany count === 1); losers must surface
 * 409 "in progress" and NOT call Stripe.
 */
export async function claimCheckoutAttemptForStripeRequest(
  dbc: CheckoutAttemptDb,
  attemptId: string,
): Promise<boolean> {
  const res = await dbc.checkoutAttempt.updateMany({
    where: { id: attemptId, status: { in: [...CLAIMABLE_STATUSES] } },
    data: { status: "REQUEST_IN_FLIGHT" },
  });
  return res.count === 1;
}

/**
 * Record a classified Stripe session-create failure on the claimed attempt
 * (REQUEST_IN_FLIGHT → outcome status). Terminal outcomes release the ACTIVE
 * key in the SAME update (the original intent id is never touched).
 */
export async function recordCheckoutAttemptOutcome(
  dbc: CheckoutAttemptDb,
  attemptId: string,
  outcome: {
    status: CheckoutAttemptStatus;
    releasesActiveKey: boolean;
    outcomeClass: string;
    errorKind: string;
  },
): Promise<void> {
  await dbc.checkoutAttempt.updateMany({
    where: { id: attemptId, status: "REQUEST_IN_FLIGHT" },
    data: {
      status: outcome.status,
      lastOutcomeClass: outcome.outcomeClass,
      lastErrorKind: outcome.errorKind,
      ...(outcome.releasesActiveKey ? { activeClientIntentId: null } : {}),
    },
  });
}

/**
 * Bind a successfully created Stripe session onto the claimed attempt
 * (REQUEST_IN_FLIGHT → SESSION_CREATED). Returns false when the row was not
 * in the claimed state (e.g. a webhook already advanced it) — callers treat
 * a false/throwing bind as "repair job will reconcile", never as fatal.
 */
export async function bindCheckoutSessionToAttempt(
  dbc: CheckoutAttemptDb,
  attemptId: string,
  sessionId: string,
  customerId: string | null,
): Promise<boolean> {
  const res = await dbc.checkoutAttempt.updateMany({
    where: { id: attemptId, status: "REQUEST_IN_FLIGHT" },
    data: {
      status: "SESSION_CREATED",
      stripeSessionId: sessionId,
      ...(customerId ? { customerId } : {}),
      lastOutcomeClass: null,
      lastErrorKind: null,
    },
  });
  return res.count === 1;
}
