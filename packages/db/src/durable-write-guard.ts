/**
 * Durable-write capability gate (directive 5.2 / section 14).
 *
 * @sports/db intentionally ships a stub Prisma client for public read-only /
 * demo surfaces: writes no-op while pretending success. That is UNACCEPTABLE
 * for protected writes — above all anything that precedes an EXTERNAL side
 * effect (Stripe customer/session creation, settlement, outbox claims, …),
 * where "the DB pretended to save" means real-world money state with no local
 * record.
 *
 * `requireDurableWriteStore(capability)` is the canonical fail-closed guard:
 * call it BEFORE the external side effect. It throws a typed
 * `DurableWriteStoreUnavailableError` (→ HTTP 503 at the route boundary) when
 *
 *   - the stub Prisma client is active (writes would be silently dropped);
 *   - DATABASE_URL is unset or a sentinel, so the durability of the backing
 *     store is UNKNOWN (even under FORCE_REAL_PRISMA the client cannot
 *     durably write to a sentinel URL);
 *   - the capability name is not registered (programmer error — fail closed,
 *     never silently allow an unregistered protected write).
 *
 * Every denial records an operations incident line (structured, secret-free:
 * the DATABASE_URL VALUE is never logged) so Founder OS/ops tooling can
 * alert on it.
 */

import { isStubDbUrl, isStubMode } from "./index.js";

/**
 * Registered protected-write capabilities. Section 14 of the convergence
 * directive enumerates the target set; entries are added here as each unit
 * adopts the guard.
 */
export const DURABLE_WRITE_CAPABILITIES = [
  "stripe-checkout",
  "stripe-webhook-entitlement",
] as const;

export type DurableWriteCapability = (typeof DURABLE_WRITE_CAPABILITIES)[number];

const KNOWN_CAPABILITIES: ReadonlySet<string> = new Set(DURABLE_WRITE_CAPABILITIES);

export type DurableWriteDenialReason =
  | "unknown_capability"
  | "stub_client_active"
  | "database_url_not_durable";

export interface DurableWriteStoreEvaluationInput {
  /** Capability name being asserted (e.g. "stripe-checkout"). */
  capability: string;
  /** Whether the stub Prisma client is active (isStubMode()). */
  stubModeActive: boolean;
  /** The raw DATABASE_URL (only ever inspected, never logged/echoed). */
  databaseUrl: string | undefined;
}

export type DurableWriteStoreEvaluation =
  | { ok: true; capability: DurableWriteCapability }
  | { ok: false; reason: DurableWriteDenialReason; detail: string };

/**
 * Pure, unit-testable core of the guard. `detail` is a secret-free,
 * operator-facing sentence — it NEVER contains the DATABASE_URL value.
 */
export function evaluateDurableWriteStore(
  input: DurableWriteStoreEvaluationInput,
): DurableWriteStoreEvaluation {
  if (!KNOWN_CAPABILITIES.has(input.capability)) {
    return {
      ok: false,
      reason: "unknown_capability",
      detail:
        `"${input.capability}" is not a registered durable-write capability — ` +
        "register it in DURABLE_WRITE_CAPABILITIES before gating a protected write on it.",
    };
  }
  if (input.stubModeActive) {
    return {
      ok: false,
      reason: "stub_client_active",
      detail:
        "The stub Prisma client is active (DATABASE_URL unset/sentinel): writes would " +
        "no-op while pretending success. Protected writes fail closed.",
    };
  }
  if (isStubDbUrl(input.databaseUrl)) {
    return {
      ok: false,
      reason: "database_url_not_durable",
      detail:
        "DATABASE_URL is unset or a sentinel value, so the durability of the backing " +
        "store is unknown. Protected writes fail closed.",
    };
  }
  return { ok: true, capability: input.capability as DurableWriteCapability };
}

/**
 * Typed denial. Routes map this to HTTP 503 with a machine-readable code and
 * WITHOUT leaking internals to the client.
 */
export class DurableWriteStoreUnavailableError extends Error {
  readonly kind = "durable_write_store_unavailable" as const;
  readonly httpStatus = 503 as const;
  readonly capability: string;
  readonly reason: DurableWriteDenialReason;

  constructor(capability: string, reason: DurableWriteDenialReason, detail: string) {
    super(`Durable write store unavailable for capability "${capability}": ${detail}`);
    this.name = "DurableWriteStoreUnavailableError";
    this.capability = capability;
    this.reason = reason;
  }
}

/**
 * Assert that protected writes for `capability` will actually persist.
 * Call BEFORE any external side effect. Throws
 * `DurableWriteStoreUnavailableError` (fail closed) and records a secret-free
 * operations incident line when durability cannot be positively established.
 */
export function requireDurableWriteStore(capability: DurableWriteCapability): void {
  const evaluation = evaluateDurableWriteStore({
    capability,
    stubModeActive: isStubMode(),
    databaseUrl: process.env["DATABASE_URL"],
  });
  if (evaluation.ok) return;

  // Operations incident record — structured and secret-free (no URLs, no
  // credentials; only the capability, reason, and remediation sentence).
  // eslint-disable-next-line no-console
  console.error(
    `[INCIDENT][durable-write-guard] capability=${capability} reason=${evaluation.reason} ` +
      `action=fail_closed detail=${JSON.stringify(evaluation.detail)}`,
  );
  throw new DurableWriteStoreUnavailableError(capability, evaluation.reason, evaluation.detail);
}
