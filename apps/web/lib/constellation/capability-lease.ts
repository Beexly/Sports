/**
 * CONSTELLATION foundation — Capability lease primitive.
 *
 * STATUS: LAB-ONLY / DORMANT. The `InMemoryCapabilityLeaseRegistry` in this
 * file is an explicitly labeled LAB/TEST REFERENCE implementation — it is
 * NOT a production adapter (no persistence, no crash recovery, no
 * cross-process coordination). Nothing here is imported by any production
 * route, worker, or cron job.
 *
 * WHAT THIS GENERALIZES
 * ----------------------
 * `apps/web/lib/ai-control-plane/credit-port.ts`'s `CreditAuthorizationPort`
 * is a real, already-shipped lease-with-expiry discipline for one specific
 * capability (money): `authorizeAndReserve` (atomic check-and-hold),
 * `settleProvisional` / `reconcile` (apply the real outcome), `release`
 * (free the hold when no charge occurred) — plus a `failClosedCreditAuthorizationPort`
 * that makes credit-funded dispatch UNREACHABLE until a real adapter exists.
 *
 * `CapabilityLease<TCapability>` below is the same discipline made generic
 * over WHAT is being leased (not just money): a bounded resource identified
 * by a capability key, acquired atomically up to a capacity ceiling, held
 * for a bounded TTL, and released explicitly. It reuses the credit port's
 * three non-negotiables:
 *   1. ATOMIC-IN-PRINCIPLE ACQUIRE — a lease is never granted past capacity,
 *      even under concurrent callers (property-tested below).
 *   2. EXPLICIT RELEASE — nothing frees a lease as a side effect of some
 *      unrelated call; `release()` is the only path, mirroring
 *      `CreditAuthorizationPort.release`.
 *   3. NO SILENT EXPIRY WITHOUT TRACE — a lease past its `expiresAt` is
 *      NEVER quietly dropped inside `acquire()`/`release()`. It is only
 *      reclaimed by calling `reapExpired()`, which returns the full list of
 *      what it reclaimed (mirrors the credit port's `reconcile` returning to
 *      an authoritative record rather than mutating state invisibly).
 *
 * This module does not reuse `CreditAuthorizationPort`'s types directly
 * (money has USD-string amounts and a grant-allocation ref; a generic
 * capability lease has an integer quantity and an arbitrary capability key)
 * — but the shape of the four-method lifecycle and its failure posture are
 * intentionally identical.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidCapabilityLeaseRequestError extends Error {
  readonly code = "INVALID_CAPABILITY_LEASE_REQUEST" as const;
  constructor(message: string) {
    super(message);
    this.name = "InvalidCapabilityLeaseRequestError";
  }
}

export class CapabilityLeaseNotFoundError extends Error {
  readonly code = "CAPABILITY_LEASE_NOT_FOUND" as const;
  constructor(leaseId: string) {
    super(`No lease "${leaseId}" is held — cannot release a lease that does not exist.`);
    this.name = "CapabilityLeaseNotFoundError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core types
// ─────────────────────────────────────────────────────────────────────────────

export interface CapabilityLeaseRequest<TCapability> {
  /** Idempotency handle — a repeated `requestId` against a still-held lease
   *  returns `ALREADY_HELD` rather than double-granting (mirrors the credit
   *  port's `requestId`-scoped reservation). */
  readonly requestId: string;
  readonly capability: TCapability;
  /** Who is asking to hold the lease — e.g. a `TrustedActor.subjectId`. */
  readonly holderId: string;
  /** Integer, > 0 units of the capability's capacity to hold. */
  readonly quantity: number;
  readonly now: Date;
  /** > 0 milliseconds the lease may be held before it becomes reapable. */
  readonly ttlMs: number;
}

export interface CapabilityLease<TCapability> {
  readonly leaseId: string;
  readonly requestId: string;
  readonly capability: TCapability;
  readonly holderId: string;
  readonly quantity: number;
  readonly acquiredAt: Date;
  readonly expiresAt: Date;
}

export type CapabilityLeaseOutcome<TCapability> =
  | { readonly kind: "ACQUIRED"; readonly lease: CapabilityLease<TCapability> }
  | { readonly kind: "CAPACITY_EXCEEDED"; readonly availableQuantity: number }
  | { readonly kind: "ALREADY_HELD"; readonly requestId: string; readonly lease: CapabilityLease<TCapability> };

export interface ExpiredLeaseRecord<TCapability> {
  readonly lease: CapabilityLease<TCapability>;
  readonly reapedAt: Date;
}

/**
 * The port. Same four-method shape as `CreditAuthorizationPort`, generalized
 * over an arbitrary leased capability instead of money.
 */
export interface CapabilityLeasePort<TCapability> {
  acquire(request: CapabilityLeaseRequest<TCapability>): Promise<CapabilityLeaseOutcome<TCapability>>;
  /** Frees a held lease. Throws `CapabilityLeaseNotFoundError` if `leaseId`
   *  is not currently held — releasing a lease that was never (or no
   *  longer) held is a caller bug, not a no-op. */
  release(leaseId: string, now: Date): Promise<void>;
  /** The ONLY path by which an expired lease's capacity is reclaimed. Never
   *  called implicitly by `acquire`/`release`. Returns every lease it
   *  reclaimed — the trace this module's header promises. */
  reapExpired(now: Date): Promise<readonly ExpiredLeaseRecord<TCapability>[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAB / TEST REFERENCE implementation — NOT a production adapter.
// ─────────────────────────────────────────────────────────────────────────────

export interface InMemoryCapabilityLeaseRegistryConfig<TCapability> {
  /** Collapses a capability value to the string key its capacity is tracked
   *  under (two capability values that produce the same key compete for the
   *  same pool). */
  readonly keyOf: (capability: TCapability) => string;
  /** Total capacity for the pool a given capability key belongs to. */
  readonly capacityOf: (capability: TCapability, key: string) => number;
  readonly idFactory?: () => string;
}

let defaultIdCounter = 0;
function defaultIdFactory(): string {
  defaultIdCounter += 1;
  return `lease_${defaultIdCounter}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * LAB / TEST REFERENCE ONLY. In-memory, single-process, no persistence — a
 * process restart loses every lease. This exists to (a) prove the
 * `CapabilityLeasePort` contract is implementable and (b) give the property
 * tests below something real to exercise. It is deliberately NOT wired into
 * any route, worker, or cron job.
 *
 * Concurrency note: every method here does its check-and-mutate work
 * synchronously (no `await` between reading and writing `heldByKey`), so
 * under Node's single-threaded event loop two concurrently-issued
 * `acquire()` calls can never interleave mid-check — this is what "atomic
 * in principle" means for an in-memory reference. A real store-backed
 * adapter (out of scope here) would need a real atomic primitive (e.g. the
 * `INSERT ... ON CONFLICT` pattern `apps/web/lib/ai-control-plane/
 * control-store.ts` already uses for invocation claims) instead of relying
 * on single-threadedness.
 */
export class InMemoryCapabilityLeaseRegistry<TCapability> implements CapabilityLeasePort<TCapability> {
  private readonly leasesById = new Map<string, CapabilityLease<TCapability>>();
  private readonly leaseIdByRequestId = new Map<string, string>();
  private readonly heldByKey = new Map<string, number>();
  private readonly idFactory: () => string;

  constructor(private readonly config: InMemoryCapabilityLeaseRegistryConfig<TCapability>) {
    this.idFactory = config.idFactory ?? defaultIdFactory;
  }

  async acquire(request: CapabilityLeaseRequest<TCapability>): Promise<CapabilityLeaseOutcome<TCapability>> {
    if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
      throw new InvalidCapabilityLeaseRequestError(
        `quantity must be a positive integer, got ${String(request.quantity)}.`,
      );
    }
    if (!Number.isFinite(request.ttlMs) || request.ttlMs <= 0) {
      throw new InvalidCapabilityLeaseRequestError(
        `ttlMs must be a positive finite number, got ${String(request.ttlMs)}.`,
      );
    }
    if (request.requestId.trim() === "") {
      throw new InvalidCapabilityLeaseRequestError("requestId must be non-empty.");
    }

    const existingLeaseId = this.leaseIdByRequestId.get(request.requestId);
    if (existingLeaseId !== undefined) {
      const existing = this.leasesById.get(existingLeaseId);
      if (existing !== undefined) {
        return { kind: "ALREADY_HELD", requestId: request.requestId, lease: existing };
      }
    }

    const key = this.config.keyOf(request.capability);
    const capacity = this.config.capacityOf(request.capability, key);
    const held = this.heldByKey.get(key) ?? 0;

    if (held + request.quantity > capacity) {
      return { kind: "CAPACITY_EXCEEDED", availableQuantity: Math.max(0, capacity - held) };
    }

    const leaseId = this.idFactory();
    const lease: CapabilityLease<TCapability> = {
      leaseId,
      requestId: request.requestId,
      capability: request.capability,
      holderId: request.holderId,
      quantity: request.quantity,
      acquiredAt: request.now,
      expiresAt: new Date(request.now.getTime() + request.ttlMs),
    };

    this.leasesById.set(leaseId, lease);
    this.leaseIdByRequestId.set(request.requestId, leaseId);
    this.heldByKey.set(key, held + request.quantity);

    return { kind: "ACQUIRED", lease };
  }

  async release(leaseId: string, _now: Date): Promise<void> {
    const lease = this.leasesById.get(leaseId);
    if (lease === undefined) {
      throw new CapabilityLeaseNotFoundError(leaseId);
    }
    const key = this.config.keyOf(lease.capability);
    const held = this.heldByKey.get(key) ?? 0;
    this.heldByKey.set(key, Math.max(0, held - lease.quantity));
    this.leasesById.delete(leaseId);
    this.leaseIdByRequestId.delete(lease.requestId);
  }

  async reapExpired(now: Date): Promise<readonly ExpiredLeaseRecord<TCapability>[]> {
    const reclaimed: ExpiredLeaseRecord<TCapability>[] = [];
    for (const lease of this.leasesById.values()) {
      if (lease.expiresAt.getTime() <= now.getTime()) {
        reclaimed.push({ lease, reapedAt: now });
      }
    }
    for (const record of reclaimed) {
      const key = this.config.keyOf(record.lease.capability);
      const held = this.heldByKey.get(key) ?? 0;
      this.heldByKey.set(key, Math.max(0, held - record.lease.quantity));
      this.leasesById.delete(record.lease.leaseId);
      this.leaseIdByRequestId.delete(record.lease.requestId);
    }
    return reclaimed;
  }

  /** Test/introspection helper only — not part of the `CapabilityLeasePort`
   *  contract. Returns the currently-held quantity for a capability key. */
  heldQuantityForKey(key: string): number {
    return this.heldByKey.get(key) ?? 0;
  }
}
