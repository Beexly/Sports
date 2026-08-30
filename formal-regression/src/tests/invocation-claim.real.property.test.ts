/**
 * Property-based regression tests against the REAL, unmodified
 * `createPgControlStore` from
 * `apps/web (this repo, same worktree)/lib/ai-control-plane/control-store.ts`
 * (branch feat/ai-control-plane-ledger), driving it through the
 * `InMemoryControlSql` test-double SQL adapter. Covers the invariants
 * formalized in W2-02's `InvocationClaim.tla`:
 *   - AtMostOneClaimOwner
 *   - AtMostOneExternalDispatchPerAttempt
 *   - SameIdDifferentFingerprintNeverExecutes
 *   - AmbiguousAttemptStopsFallback (restart/fenced-steal scenario)
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createPgControlStore } from "../../../apps/web/lib/ai-control-plane/control-store";
import { InMemoryControlSql } from "../adapters/in-memory-control-sql";

const NOW = new Date("2026-07-22T00:00:00.000Z");

function baseClaimInput(overrides: Partial<Parameters<ReturnType<typeof createPgControlStore>["claimInvocation"]>[0]> & {
  invocationId: string;
  requestId: string;
  taskClass: string;
  requestFingerprint: string;
  ownerToken: string;
}) {
  return {
    surface: "s",
    entity: "e",
    dataClass: "d",
    costMode: "c",
    envClass: "prod",
    envClassSource: "x",
    policyVersion: "v1",
    actorType: "user",
    actorSubjectId: "u1",
    leaseMs: 30_000,
    now: NOW,
    ...overrides,
  };
}

describe("AtMostOneClaimOwner (real control-store.ts)", () => {
  it("of N concurrent claimInvocation() racers for the SAME (requestId,taskClass,fingerprint), exactly one ACQUIRES", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 12 }), async (n) => {
        const sql = new InMemoryControlSql();
        const store = createPgControlStore(sql);
        const results = await Promise.all(
          Array.from({ length: n }, (_, i) =>
            store.claimInvocation(
              baseClaimInput({
                invocationId: `inv-${i}`, // candidate id only used if THIS caller wins
                requestId: "req-shared",
                taskClass: "task",
                requestFingerprint: "fp-shared",
                ownerToken: `owner-${i}`,
              }),
            ),
          ),
        );
        const acquired = results.filter((r) => r.kind === "ACQUIRED");
        const inProgress = results.filter((r) => r.kind === "IN_PROGRESS");
        expect(acquired.length).toBe(1);
        expect(inProgress.length).toBe(n - 1);
        // All IN_PROGRESS racers point at the SAME invocation id as the winner.
        const winnerId = acquired[0]!.invocationId;
        for (const r of inProgress) expect(r.invocationId).toBe(winnerId);
      }),
      { numRuns: 30 },
    );
  });
});

describe("SameIdDifferentFingerprintNeverExecutes (real control-store.ts)", () => {
  it("a request with the same (requestId,taskClass) but a DIFFERENT fingerprint is rejected, never claims, never dispatches", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s !== "fp-first"),
        async (differentFp) => {
          const sql = new InMemoryControlSql();
          const store = createPgControlStore(sql);
          const first = await store.claimInvocation(
            baseClaimInput({
              invocationId: "inv-first",
              requestId: "req-1",
              taskClass: "task",
              requestFingerprint: "fp-first",
              ownerToken: "owner-first",
            }),
          );
          expect(first.kind).toBe("ACQUIRED");

          const conflict = await store.claimInvocation(
            baseClaimInput({
              invocationId: "inv-second-candidate",
              requestId: "req-1",
              taskClass: "task",
              requestFingerprint: differentFp,
              ownerToken: "owner-second",
            }),
          );
          expect(conflict.kind).toBe("FINGERPRINT_CONFLICT");
          if (conflict.kind === "FINGERPRINT_CONFLICT") {
            expect(conflict.existingFingerprint).toBe("fp-first");
          }
          // The rejected caller never got a lease -> startAttempt for it must fail.
          await expect(
            store.startAttempt({
              attemptId: "att-rejected",
              invocationId: "inv-first",
              ownerToken: "owner-second", // the rejected caller's token, never granted
              ordinal: 0,
              providerRequested: "anthropic",
              modelRequested: "m1",
              requestFingerprint: differentFp,
              policyVersion: "v1",
              attemptNonce: "n1",
              now: NOW,
            }),
          ).rejects.toThrow();
        },
      ),
      { numRuns: 25 },
    );
  });
});

describe("AtMostOneExternalDispatchPerAttempt (real control-store.ts)", () => {
  it("of N concurrent startAttempt() racers using the SAME attempt id, at most one succeeds", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 8 }), async (n) => {
        const sql = new InMemoryControlSql();
        const store = createPgControlStore(sql);
        const claim = await store.claimInvocation(
          baseClaimInput({
            invocationId: "inv-1",
            requestId: "req-1",
            taskClass: "task",
            requestFingerprint: "fp1",
            ownerToken: "owner-1",
          }),
        );
        expect(claim.kind).toBe("ACQUIRED");

        const attempts = await Promise.allSettled(
          Array.from({ length: n }, () =>
            store.startAttempt({
              attemptId: "att-duplicate", // SAME id for every racer
              invocationId: "inv-1",
              ownerToken: "owner-1",
              ordinal: 0,
              providerRequested: "anthropic",
              modelRequested: "m1",
              requestFingerprint: "fp1",
              policyVersion: "v1",
              attemptNonce: "n1",
              now: NOW,
            }),
          ),
        );
        const fulfilled = attempts.filter((a) => a.status === "fulfilled");
        expect(fulfilled.length).toBe(1); // exactly one dispatch ever happens for this attempt id
        expect(sql.attempts.size).toBe(1);
      }),
      { numRuns: 25 },
    );
  });
});

describe("AmbiguousAttemptStopsFallback (real control-store.ts, restart/fenced-steal scenario)", () => {
  it("a crash leaving an AMBIGUOUS/TIMEOUT/DISPATCHED attempt freezes the invocation; a restart claim NEVER re-acquires for dispatch", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("AMBIGUOUS" as const, "TIMEOUT" as const, "DISPATCHED" as const),
        async (unprovenStatus) => {
          const sql = new InMemoryControlSql();
          const store = createPgControlStore(sql);
          const leaseMs = 1_000;
          const t0 = NOW;
          const claim = await store.claimInvocation(
            baseClaimInput({
              invocationId: "inv-1",
              requestId: "req-1",
              taskClass: "task",
              requestFingerprint: "fp1",
              ownerToken: "owner-crashed",
              leaseMs,
              now: t0,
            }),
          );
          expect(claim.kind).toBe("ACQUIRED");

          await store.startAttempt({
            attemptId: "att-1",
            invocationId: "inv-1",
            ownerToken: "owner-crashed",
            ordinal: 0,
            providerRequested: "anthropic",
            modelRequested: "m1",
            requestFingerprint: "fp1",
            policyVersion: "v1",
            attemptNonce: "n1",
            now: t0,
          });

          if (unprovenStatus !== "DISPATCHED") {
            await store.recordAttemptFailure({
              attemptId: "att-1",
              invocationId: "inv-1",
              ownerToken: "owner-crashed",
              status: unprovenStatus,
              providerUsed: "anthropic",
              errorCode: "PROVIDER_TIMEOUT",
              now: t0,
            });
          }
          // else: the "crash" happens with the attempt still DISPATCHED (never finalized) —
          // models a hard process kill mid-transport, before any outcome was recorded.

          // Restart: lease expired, a fresh caller re-claims the SAME (requestId,taskClass).
          const afterLeaseExpiry = new Date(t0.getTime() + leaseMs + 1);
          const restart = await store.claimInvocation(
            baseClaimInput({
              invocationId: "inv-1-restart-candidate",
              requestId: "req-1",
              taskClass: "task",
              requestFingerprint: "fp1",
              ownerToken: "owner-restarted",
              now: afterLeaseExpiry,
            }),
          );

          // Never ACQUIRED for dispatch again — the unproven charge must be
          // held for reconciliation, not silently re-spent by a fresh attempt.
          expect(restart.kind).toBe("REPLAY_TERMINAL");
          if (restart.kind === "REPLAY_TERMINAL") {
            expect(restart.status).toBe("AMBIGUOUS");
          }

          // And a SECOND restart attempt sees the same frozen, non-dispatchable state.
          const secondRestart = await store.claimInvocation(
            baseClaimInput({
              invocationId: "inv-1-restart-candidate-2",
              requestId: "req-1",
              taskClass: "task",
              requestFingerprint: "fp1",
              ownerToken: "owner-restarted-2",
              now: new Date(afterLeaseExpiry.getTime() + 1),
            }),
          );
          expect(secondRestart.kind).toBe("REPLAY_TERMINAL");
        },
      ),
      { numRuns: 15 },
    );
  });
});
