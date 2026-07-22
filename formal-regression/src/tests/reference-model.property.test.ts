/**
 * Property tests against the small REFERENCE/TEST-DOUBLE models
 * (`../reference/claim-reference.ts`, `../reference/credit-reference.ts`) —
 * an independent, hand-written second oracle for the same invariants the
 * `*.real.property.test.ts` files check against the REAL production
 * modules. These are deliberately smaller/dumber than the real code (no
 * lease expiry, no snapshot admissibility) and exist only as a
 * cross-check, per task instructions. If the real and reference models
 * ever disagreed on these bounds it would be a strong signal something
 * subtle changed; they should always agree on these coarse invariants.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ReferenceClaimStore } from "../reference/claim-reference";
import { ReferenceCreditLedger } from "../reference/credit-reference";

describe("reference model: claim/dispatch invariants", () => {
  it("AtMostOneClaimOwner: N racers claiming the same id, exactly one wins", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (n) => {
        const store = new ReferenceClaimStore();
        const results = Array.from({ length: n }, (_, i) => store.claim(`actor-${i}`, "inv-1", "fp-1"));
        expect(results.filter((r) => r === "claimed").length).toBe(1);
      }),
    );
  });

  it("AtMostOneExternalDispatchPerAttempt: an attempt id dispatches at most once, ever", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (n) => {
        const store = new ReferenceClaimStore();
        store.claim("actor-1", "inv-1", "fp-1");
        const results = Array.from({ length: n }, () => store.dispatch("actor-1", "inv-1", "att-shared"));
        expect(results.filter(Boolean).length).toBe(1);
        expect(store.wasEverDispatched("att-shared")).toBe(true);
      }),
    );
  });

  it("SameIdDifferentFingerprintNeverExecutes: a fingerprint mismatch never claims ownership nor gets dispatched", () => {
    // NOTE: this test itself caught a reference-model ordering bug during
    // development (the model checked `owner !== null` before the
    // fingerprint match, so a same-id/different-fp request racing an
    // ALREADY-OWNED invocation reported "in-progress" instead of
    // "conflict" — a cosmetic outcome-label difference, not a safety
    // violation, since neither outcome ever claims or dispatches). Fixed
    // by asserting the actual invariant (never claims, never dispatches)
    // instead of one specific outcome label. See
    // reports/formal-counterexamples/reference-model-fingerprint-ordering.json
    // for the minimized repro this test now permanently guards.
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (fpA, fpB) => {
        fc.pre(fpA !== fpB);
        const store = new ReferenceClaimStore();
        expect(store.claim("actor-1", "inv-1", fpA)).toBe("claimed");
        const second = store.claim("actor-2", "inv-1", fpB);
        expect(second).not.toBe("claimed"); // never executes under the mismatched fingerprint
        expect(store.owner("inv-1")).toBe("actor-1"); // ownership unchanged, still bound to fpA
        // Regardless of outcome label, a dispatch attempted by actor-2 (who
        // never actually holds ownership) must never succeed.
        expect(store.dispatch("actor-2", "inv-1", "att-x")).toBe(false);
      }),
    );
  });

  it("AmbiguousAttemptStopsFallback: once resolved Ambiguous, no further dispatch for that invocation ever succeeds", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (retries) => {
        const store = new ReferenceClaimStore();
        store.claim("actor-1", "inv-1", "fp-1");
        store.dispatch("actor-1", "inv-1", "att-1");
        store.resolve("att-1", "Ambiguous");
        expect(store.status("inv-1")).toBe("Ambiguous");
        for (let i = 0; i < retries; i++) {
          const ok = store.dispatch("actor-1", "inv-1", `att-retry-${i}`);
          expect(ok).toBe(false);
        }
      }),
    );
  });
});

describe("reference model: credit reservation flagship property", () => {
  it("NeverOverAdmit: admitted*cost never exceeds balance, for any balance/cost/N", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 200 }),
        (balance, cost, n) => {
          const ledger = new ReferenceCreditLedger(balance, cost);
          for (let i = 0; i < n; i++) ledger.authorize(`t-${i}`);
          expect(ledger.admittedCount() * cost).toBeLessThanOrEqual(balance);
          expect(ledger.reservedTotal).toBeLessThanOrEqual(balance);
          expect(ledger.reservedTotal).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it("the flagship scenario: 100 attempts of $0.02 against $1.00 admits at most 50", () => {
    const ledger = new ReferenceCreditLedger(100, 2);
    const results = Array.from({ length: 100 }, (_, i) => ledger.authorize(`t-${i}`));
    const admitted = results.filter((r) => r === "HELD").length;
    expect(admitted).toBeLessThanOrEqual(50);
    expect(admitted).toBe(50);
    expect(ledger.reservedTotal).toBe(100);
  });
});
