/**
 * Tests for the CONSTELLATION foundation capability lease primitive
 * (LAB-ONLY / DORMANT, see `lib/constellation/capability-lease.ts`).
 *
 * Includes real property-based tests (fast-check) proving a lease can
 * never be double-acquired past its declared capacity, plus explicit
 * unit tests for idempotent replay, release, and the explicit-only
 * reap-with-trace expiry discipline.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CapabilityLeaseNotFoundError,
  InMemoryCapabilityLeaseRegistry,
  InvalidCapabilityLeaseRequestError,
  type CapabilityLeaseOutcome,
} from "@/lib/constellation/capability-lease";

type TestCapability = { readonly pool: string };

function makeRegistry(capacity: number) {
  return new InMemoryCapabilityLeaseRegistry<TestCapability>({
    keyOf: (c) => c.pool,
    capacityOf: () => capacity,
  });
}

describe("InMemoryCapabilityLeaseRegistry — unit behavior", () => {
  it("acquires up to capacity and rejects the request that would exceed it", async () => {
    const registry = makeRegistry(10);
    const first = await registry.acquire({
      requestId: "r1",
      capability: { pool: "p" },
      holderId: "h1",
      quantity: 7,
      now: new Date(0),
      ttlMs: 1000,
    });
    expect(first.kind).toBe("ACQUIRED");

    const second = await registry.acquire({
      requestId: "r2",
      capability: { pool: "p" },
      holderId: "h2",
      quantity: 4,
      now: new Date(0),
      ttlMs: 1000,
    });
    expect(second.kind).toBe("CAPACITY_EXCEEDED");
    if (second.kind === "CAPACITY_EXCEEDED") {
      expect(second.availableQuantity).toBe(3);
    }
  });

  it("returns ALREADY_HELD on a repeated requestId instead of double-granting", async () => {
    const registry = makeRegistry(10);
    const req = {
      requestId: "same",
      capability: { pool: "p" },
      holderId: "h1",
      quantity: 5,
      now: new Date(0),
      ttlMs: 1000,
    };
    const first = await registry.acquire(req);
    const second = await registry.acquire(req);
    expect(first.kind).toBe("ACQUIRED");
    expect(second.kind).toBe("ALREADY_HELD");
    expect(registry.heldQuantityForKey("p")).toBe(5);
  });

  it("release frees exactly the leased quantity", async () => {
    const registry = makeRegistry(10);
    const outcome = await registry.acquire({
      requestId: "r1",
      capability: { pool: "p" },
      holderId: "h1",
      quantity: 6,
      now: new Date(0),
      ttlMs: 1000,
    });
    expect(outcome.kind).toBe("ACQUIRED");
    if (outcome.kind !== "ACQUIRED") throw new Error("unreachable");

    await registry.release(outcome.lease.leaseId, new Date(1));
    expect(registry.heldQuantityForKey("p")).toBe(0);

    const reacquire = await registry.acquire({
      requestId: "r2",
      capability: { pool: "p" },
      holderId: "h1",
      quantity: 10,
      now: new Date(2),
      ttlMs: 1000,
    });
    expect(reacquire.kind).toBe("ACQUIRED");
  });

  it("throws CapabilityLeaseNotFoundError releasing an unknown lease", async () => {
    const registry = makeRegistry(10);
    await expect(registry.release("nope", new Date(0))).rejects.toBeInstanceOf(
      CapabilityLeaseNotFoundError,
    );
  });

  it("never silently drops an expired lease inside acquire or release — only reapExpired reclaims it, with a trace", async () => {
    const registry = makeRegistry(10);
    const acquired = await registry.acquire({
      requestId: "r1",
      capability: { pool: "p" },
      holderId: "h1",
      quantity: 10,
      now: new Date(0),
      ttlMs: 100,
    });
    expect(acquired.kind).toBe("ACQUIRED");

    // Well past expiry, but nothing has called reapExpired yet — capacity
    // must still read as fully held (no silent expiry).
    const blocked = await registry.acquire({
      requestId: "r2",
      capability: { pool: "p" },
      holderId: "h2",
      quantity: 1,
      now: new Date(10_000),
      ttlMs: 100,
    });
    expect(blocked.kind).toBe("CAPACITY_EXCEEDED");
    expect(registry.heldQuantityForKey("p")).toBe(10);

    const reaped = await registry.reapExpired(new Date(10_000));
    expect(reaped).toHaveLength(1);
    expect(reaped[0]?.lease.requestId).toBe("r1");
    expect(reaped[0]?.reapedAt).toEqual(new Date(10_000));
    expect(registry.heldQuantityForKey("p")).toBe(0);

    // Now capacity is genuinely free.
    const afterReap = await registry.acquire({
      requestId: "r3",
      capability: { pool: "p" },
      holderId: "h3",
      quantity: 10,
      now: new Date(10_001),
      ttlMs: 100,
    });
    expect(afterReap.kind).toBe("ACQUIRED");
  });

  it("rejects non-integer or non-positive quantity", async () => {
    const registry = makeRegistry(10);
    await expect(
      registry.acquire({
        requestId: "r1",
        capability: { pool: "p" },
        holderId: "h1",
        quantity: 0,
        now: new Date(0),
        ttlMs: 1000,
      }),
    ).rejects.toBeInstanceOf(InvalidCapabilityLeaseRequestError);

    await expect(
      registry.acquire({
        requestId: "r2",
        capability: { pool: "p" },
        holderId: "h1",
        quantity: 2.5,
        now: new Date(0),
        ttlMs: 1000,
      }),
    ).rejects.toBeInstanceOf(InvalidCapabilityLeaseRequestError);
  });

  it("rejects a non-positive ttlMs", async () => {
    const registry = makeRegistry(10);
    await expect(
      registry.acquire({
        requestId: "r1",
        capability: { pool: "p" },
        holderId: "h1",
        quantity: 1,
        now: new Date(0),
        ttlMs: 0,
      }),
    ).rejects.toBeInstanceOf(InvalidCapabilityLeaseRequestError);
  });

  it("tracks independent pools separately", async () => {
    const registry = makeRegistry(5);
    const a = await registry.acquire({
      requestId: "a",
      capability: { pool: "pool-a" },
      holderId: "h",
      quantity: 5,
      now: new Date(0),
      ttlMs: 1000,
    });
    const b = await registry.acquire({
      requestId: "b",
      capability: { pool: "pool-b" },
      holderId: "h",
      quantity: 5,
      now: new Date(0),
      ttlMs: 1000,
    });
    expect(a.kind).toBe("ACQUIRED");
    expect(b.kind).toBe("ACQUIRED");
  });
});

describe("InMemoryCapabilityLeaseRegistry — property: never double-acquired past capacity", () => {
  it("holds true for many concurrent acquire attempts against a fixed capacity", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }), // capacity
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 40 }), // requested quantities
        (capacity, quantities) => {
          const registry = makeRegistry(capacity);
          const now = new Date(0);

          // Issue every acquire "concurrently" (no awaited I/O inside the
          // in-memory implementation between check and mutate, so this is a
          // genuine concurrency stress of the atomic-in-principle claim, not
          // just a serial loop dressed up as parallel).
          return Promise.all(
            quantities.map((quantity, i) =>
              registry.acquire({
                requestId: `req_${i}`,
                capability: { pool: "p" },
                holderId: `holder_${i}`,
                quantity,
                now,
                ttlMs: 60_000,
              }),
            ),
          ).then((outcomes: CapabilityLeaseOutcome<TestCapability>[]) => {
            const acquiredTotal = outcomes
              .filter((o) => o.kind === "ACQUIRED")
              .reduce((sum, o) => sum + (o.kind === "ACQUIRED" ? o.lease.quantity : 0), 0);

            // The core invariant: total granted quantity never exceeds
            // capacity, no matter how many concurrent requests raced for it.
            expect(acquiredTotal).toBeLessThanOrEqual(capacity);
            // And the registry's own internal ledger must agree with the
            // sum of what it reports as ACQUIRED.
            expect(registry.heldQuantityForKey("p")).toBe(acquiredTotal);
          });
        },
      ),
      { numRuns: 200 },
    );
  });

  it("holds true across acquire/release/reacquire interleavings", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 30 }),
        fc.array(
          fc.record({
            quantity: fc.integer({ min: 1, max: 15 }),
            releaseImmediately: fc.boolean(),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        async (capacity, ops) => {
          const registry = makeRegistry(capacity);
          let expectedHeld = 0;

          for (let i = 0; i < ops.length; i++) {
            const op = ops[i]!;
            const outcome = await registry.acquire({
              requestId: `req_${i}`,
              capability: { pool: "p" },
              holderId: `holder_${i}`,
              quantity: op.quantity,
              now: new Date(i),
              ttlMs: 60_000,
            });

            if (outcome.kind === "ACQUIRED") {
              expectedHeld += op.quantity;
              expect(expectedHeld).toBeLessThanOrEqual(capacity);
              if (op.releaseImmediately) {
                await registry.release(outcome.lease.leaseId, new Date(i));
                expectedHeld -= op.quantity;
              }
            }

            expect(registry.heldQuantityForKey("p")).toBe(expectedHeld);
            expect(expectedHeld).toBeLessThanOrEqual(capacity);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
