/**
 * Durable checkout attempt — server-authoritative checkout idempotency.
 *
 * Replaces the rejected per-intent-UUID-in-a-React-useRef design (PR #156).
 * Every guarantee lives HERE and in the CheckoutAttempt table, never in
 * component lifetime:
 *
 *  1. The client may send a per-visit `clientIntentId` (a UUID hint). The
 *     server creates-or-retrieves ONE CheckoutAttempt row per
 *     (userId, clientIntentId) via the table's compound unique constraint —
 *     create + catch-P2002-then-fetch, never check-then-insert — so two
 *     concurrent requests converge on the same attempt.
 *  2. The attempt binds an immutable `requestFingerprint` (sha256 over
 *     user + tier + interval + priceId + currency + current commercial
 *     terms). Same intent id + different fingerprint is a hard conflict
 *     (HTTP 409): an idempotency key is never silently reused with changed
 *     Stripe parameters.
 *  3. Token-less requests mint a fresh server attempt. Rationale: without a
 *     client token there is no way to distinguish "same intent retried"
 *     from "new intent", so treating each token-less request as its own
 *     intent is the safe default — it can at worst create an extra Checkout
 *     Session (harmless; nothing is charged until completion), never bind
 *     two different intents to one Stripe idempotency key.
 *  4. The Stripe idempotency key derives from (userId, attempt id), so an
 *     unknown-network-outcome retry replays the SAME Checkout Session.
 *  5. Attempts expire after ~24h (Stripe's idempotency-key window). An
 *     expired or FAILED attempt is never reused — the dead row releases its
 *     clientIntentId and the retry mints a fresh attempt (fresh Stripe key).
 *  6. The attempt id is stamped into Checkout Session AND subscription
 *     metadata so the checkout.session.completed webhook can reconcile the
 *     attempt (COMPLETED + stripeSubscriptionId).
 */

import { randomUUID } from "node:crypto";
import { sha256Hex } from "@/lib/api-auth/hash";
import { getCurrentPricingPhaseId } from "@/lib/pricing/pricing-phases";

// ~24h, matching Stripe's documented idempotency-key retention window. An
// attempt older than this can no longer replay its original session response,
// so reusing it would be a silent fresh request under a stale identity.
export const CHECKOUT_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

export type CheckoutAttemptStatus =
  | "CREATED"
  | "SESSION_CREATED"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED";

export interface CheckoutAttemptRecord {
  id: string;
  clientIntentId: string | null;
  userId: string;
  customerId: string | null;
  tier: string;
  interval: string;
  priceId: string;
  currency: string;
  requestFingerprint: string;
  status: CheckoutAttemptStatus;
  stripeSessionId: string | null;
  stripeSubscriptionId: string | null;
  lastErrorKind: string | null;
  expiresAt: Date;
}

/**
 * Minimal structural slice of the Prisma client this module needs — keeps the
 * helper unit-testable against an in-memory fake that enforces the unique
 * constraint, and tolerant of the stub client (@sports/db no-DB fallback).
 */
export interface CheckoutAttemptDb {
  checkoutAttempt: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    findUnique(args: {
      where: { userId_clientIntentId: { userId: string; clientIntentId: string } };
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
 * Same (userId, clientIntentId) presented with a DIFFERENT request
 * fingerprint — the caller must surface HTTP 409 and never reuse the key.
 */
export class CheckoutIntentConflictError extends Error {
  readonly kind = "checkout_intent_conflict" as const;
  constructor(message: string) {
    super(message);
    this.name = "CheckoutIntentConflictError";
  }
}

// Client intent hints are UUIDs (crypto.randomUUID in the browser).
const CLIENT_INTENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server attempt ids are minted app-side as `ca_<uuid>` (see
// mintCheckoutAttemptId) so the id exists even under the stub DB client,
// which ignores create() data and returns a sentinel row.
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

/**
 * Canonical fingerprint binding an attempt to its exact Stripe parameters.
 * Field order is fixed; any change to any component yields a different hash.
 */
export function computeRequestFingerprint(input: {
  userId: string;
  tier: string;
  interval: string;
  priceId: string;
  currency: string;
  termsVersion: string;
}): string {
  const canonical = [
    "v1",
    input.userId,
    input.tier,
    input.interval,
    input.priceId,
    input.currency.toLowerCase(),
    input.termsVersion,
  ].join("|");
  return sha256Hex(canonical, "gse-checkout-attempt");
}

/**
 * Durable Stripe idempotency key for a checkout attempt. Derived from
 * (userId, attemptId) — stable across reloads, devices, and retries, unlike
 * a component-scoped UUID.
 */
export function stripeIdempotencyKeyForAttempt(userId: string, attemptId: string): string {
  return `gse-checkout-${userId}-${attemptId}`;
}

export interface GetOrCreateCheckoutAttemptInput {
  userId: string;
  clientIntentId: string | null;
  customerId: string | null;
  tier: string;
  interval: string;
  priceId: string;
  currency: string;
  requestFingerprint: string;
  /** Injectable clock for tests. */
  now?: Date;
}

export interface GetOrCreateCheckoutAttemptResult {
  attempt: CheckoutAttemptRecord;
  /** True when an existing (non-expired) attempt was retrieved instead of created. */
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

function asAttemptRecord(
  created: unknown,
  fallback: Record<string, unknown>,
): CheckoutAttemptRecord {
  const row = created && typeof created === "object" ? (created as Record<string, unknown>) : {};
  // Real Prisma echoes the full row (including the app-minted id). The stub
  // client returns a sentinel `{ id: "stub" }` — overlay the data we wrote so
  // the flow keeps working in no-DB sandboxes (durability is moot there).
  const merged = { ...fallback, ...row } as Record<string, unknown>;
  if (typeof merged["id"] !== "string" || !isValidCheckoutAttemptId(merged["id"] as string)) {
    merged["id"] = fallback["id"];
  }
  return merged as unknown as CheckoutAttemptRecord;
}

/**
 * Transactionally create-or-retrieve the ONE durable attempt for this
 * request. Race-safe via the (userId, clientIntentId) unique constraint:
 * concurrent creates collide on P2002 and the loser fetches the winner's row.
 *
 * - no clientIntentId        → mint a fresh server attempt (own intent)
 * - live attempt, same fp    → return it (true idempotent retry)
 * - live attempt, diff fp    → CheckoutIntentConflictError (→ 409)
 * - expired / FAILED attempt → release its intent id, mint a fresh attempt
 * - COMPLETED attempt        → returned as-is (caller refuses a new session)
 */
export async function getOrCreateCheckoutAttempt(
  dbc: CheckoutAttemptDb,
  input: GetOrCreateCheckoutAttemptInput,
): Promise<GetOrCreateCheckoutAttemptResult> {
  const now = input.now ?? new Date();

  const buildCreateData = (): Record<string, unknown> => ({
    id: mintCheckoutAttemptId(),
    clientIntentId: input.clientIntentId,
    userId: input.userId,
    customerId: input.customerId,
    tier: input.tier,
    interval: input.interval,
    priceId: input.priceId,
    currency: input.currency.toLowerCase(),
    requestFingerprint: input.requestFingerprint,
    status: "CREATED",
    expiresAt: new Date(now.getTime() + CHECKOUT_ATTEMPT_TTL_MS),
  });

  // Token-less request: each one is its own intent; no constraint to race on.
  if (!input.clientIntentId) {
    const data = buildCreateData();
    const created = await dbc.checkoutAttempt.create({ data });
    return { attempt: asAttemptRecord(created, data), reused: false };
  }

  if (!isValidClientIntentId(input.clientIntentId)) {
    throw new CheckoutAttemptIdError(
      "clientIntentId must be a UUID (as minted by crypto.randomUUID).",
    );
  }

  // Bounded convergence loop: each iteration either creates the row, returns
  // the existing live row, conflicts (throw), or releases a dead row and
  // retries. Two concurrent expired-retries can interleave once; three
  // iterations are ample.
  for (let attemptNo = 0; attemptNo < 3; attemptNo++) {
    const data = buildCreateData();
    try {
      const created = await dbc.checkoutAttempt.create({ data });
      return { attempt: asAttemptRecord(created, data), reused: false };
    } catch (err) {
      if (!isUniqueConstraintViolation(err)) throw err;
    }

    const existingRaw = await dbc.checkoutAttempt.findUnique({
      where: {
        userId_clientIntentId: {
          userId: input.userId,
          clientIntentId: input.clientIntentId,
        },
      },
    });
    if (!existingRaw) {
      // The competing row vanished between our create and fetch (e.g. it was
      // released by another expired-retry) — try to create again.
      continue;
    }
    const existing = existingRaw as CheckoutAttemptRecord;

    const dead =
      existing.status === "EXPIRED" ||
      existing.status === "FAILED" ||
      new Date(existing.expiresAt).getTime() <= now.getTime();
    if (dead) {
      // Release the intent id from the dead attempt (kept for audit under a
      // terminal status) so a FRESH attempt — with a fresh Stripe idempotency
      // key — can claim it. updateMany is idempotent under races.
      await dbc.checkoutAttempt.updateMany({
        where: { id: existing.id, clientIntentId: input.clientIntentId },
        data: {
          clientIntentId: null,
          status: existing.status === "FAILED" ? "FAILED" : "EXPIRED",
        },
      });
      continue;
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
