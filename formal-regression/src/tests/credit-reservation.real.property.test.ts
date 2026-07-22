/**
 * Property-based regression tests against the REAL, unmodified
 * `createPgCreditAuthorizationPort` from
 * `/workspace/wt/prd/apps/web/lib/ai-control-plane/credit-admission.ts`
 * (branch feat/ai-control-plane-credit-admission), driving it through the
 * `InMemoryCreditLedgerDb` test-double SQL adapter and a fixture
 * `CreditSnapshotStore` modeled on S1's own conformance fixture.
 *
 * Covers W2-02's flagship property from `CreditReservation.tla`:
 *   "a verified balance cannot admit a second paid request beyond the
 *    verified balance" (NeverOverAdmit / LedgerNeverExceedsBalance).
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createPgCreditAuthorizationPort } from "../../../../../wt/prd/apps/web/lib/ai-control-plane/credit-admission";
import { InMemoryCreditLedgerDb } from "../adapters/in-memory-credit-ledger";
import { FixtureCreditSnapshotStore, FIXTURE_SCOPE } from "../adapters/fixture-credit-snapshot-store";

const NOW = new Date("2026-07-22T00:00:00.000Z");

describe("flagship no-double-spend property (real credit-admission.ts)", () => {
  it("100 concurrent $0.02 authorize() attempts against a $1.00 balance: at most 50 admitted, never negative, never over balance", async () => {
    const BALANCE_MINOR_UNITS = 100; // $1.00 in cents
    const REQUEST_COST_MINOR_UNITS = 2; // $0.02 in cents
    const N = 100;

    const ledger = new InMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(ledger);
    const store = new FixtureCreditSnapshotStore("grant-flagship", BALANCE_MINOR_UNITS, NOW);

    const decisions = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        port.authorize({
          store,
          scope: FIXTURE_SCOPE,
          worstCaseMinorUnits: REQUEST_COST_MINOR_UNITS,
          worstCaseCurrency: "USD",
          now: NOW,
          expiresAt: new Date(NOW.getTime() + 60_000),
          idFactory: () => `resv-${i}`,
        }),
      ),
    );

    const admitted = decisions.filter((d) => d.admitted);
    const refused = decisions.filter((d) => !d.admitted);

    // Flagship bound: 100 minor units / 2 minor units per request = 50 max.
    expect(admitted.length).toBeLessThanOrEqual(50);
    expect(admitted.length + refused.length).toBe(N); // nothing silently dropped
    expect(admitted.length).toBe(50); // headroom is exactly divisible: exactly 50 should fit

    // Ledger never goes negative, never exceeds the verified balance.
    const ledgerRow = ledger.ledger.get("grant-flagship");
    expect(ledgerRow).toBeDefined();
    expect(ledgerRow!.reservedMinorUnits).toBeGreaterThanOrEqual(0);
    expect(ledgerRow!.reservedMinorUnits).toBeLessThanOrEqual(BALANCE_MINOR_UNITS);
    expect(ledgerRow!.reservedMinorUnits).toBe(admitted.length * REQUEST_COST_MINOR_UNITS);

    // Every refusal is explicit and reasoned (insufficient-headroom) — never
    // a silently swallowed/undefined outcome.
    for (const r of refused) {
      expect(r.admitted).toBe(false);
      expect(r.reason).toBe("insufficient-headroom");
    }
  });

  it("property: for ANY balance/cost/concurrency, admitted*cost never exceeds balance and admitted+refused == N", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 200 }), // balance minor units
        fc.integer({ min: 1, max: 20 }), // request cost minor units
        fc.integer({ min: 1, max: 60 }), // concurrency
        async (balance, cost, n) => {
          const ledger = new InMemoryCreditLedgerDb();
          const port = createPgCreditAuthorizationPort(ledger);
          const grantId = `grant-${balance}-${cost}-${n}`;
          const store = new FixtureCreditSnapshotStore(grantId, balance, NOW);

          const decisions = await Promise.all(
            Array.from({ length: n }, (_, i) =>
              port.authorize({
                store,
                scope: FIXTURE_SCOPE,
                worstCaseMinorUnits: cost,
                worstCaseCurrency: "USD",
                now: NOW,
                expiresAt: new Date(NOW.getTime() + 60_000),
                idFactory: () => `resv-${grantId}-${i}`,
              }),
            ),
          );
          const admitted = decisions.filter((d) => d.admitted).length;
          const maxAdmissible = Math.floor(balance / cost);

          expect(admitted).toBeLessThanOrEqual(maxAdmissible);
          expect(admitted).toBeLessThanOrEqual(n);
          expect(decisions.length).toBe(n);
          // No ledger row is created at all if EVERY attempt was refused at the
          // admission layer before ever touching the ledger (e.g. cost > balance
          // outright) — that is itself a "never over-admits" witness, not a bug.
          const reservedMinorUnits = ledger.ledger.get(grantId)?.reservedMinorUnits ?? 0;
          expect(reservedMinorUnits).toBeGreaterThanOrEqual(0);
          expect(reservedMinorUnits).toBeLessThanOrEqual(balance);
        },
      ),
      { numRuns: 60 },
    );
  });

  it("release() frees headroom for a LATER attempt (settle keeps it consumed)", async () => {
    const now = NOW;
    const ledger = new InMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(ledger);
    const store = new FixtureCreditSnapshotStore("grant-release", 2, now); // room for exactly one $0.02 hold

    const first = await port.authorize({
      store,
      scope: FIXTURE_SCOPE,
      worstCaseMinorUnits: 2,
      worstCaseCurrency: "USD",
      now,
      expiresAt: new Date(now.getTime() + 60_000),
      idFactory: () => "resv-A",
    });
    expect(first.admitted).toBe(true);

    const second = await port.authorize({
      store,
      scope: FIXTURE_SCOPE,
      worstCaseMinorUnits: 2,
      worstCaseCurrency: "USD",
      now,
      expiresAt: new Date(now.getTime() + 60_000),
      idFactory: () => "resv-B",
    });
    expect(second.admitted).toBe(false); // no headroom left

    if (first.admitted) await port.release(first.handle);

    const third = await port.authorize({
      store,
      scope: FIXTURE_SCOPE,
      worstCaseMinorUnits: 2,
      worstCaseCurrency: "USD",
      now,
      expiresAt: new Date(now.getTime() + 60_000),
      idFactory: () => "resv-C",
    });
    expect(third.admitted).toBe(true); // released headroom is available again
  });

  it("a store fault mid-authorize (chaos: DB/network failure during re-read) is HELD as an error, never silently admitted or silently dropped", async () => {
    const now = NOW;
    const ledger = new InMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(ledger);
    const store = new FixtureCreditSnapshotStore("grant-fault", 100, now);
    store.faultOnce = new Error("simulated network partition during snapshot re-read");

    await expect(
      port.authorize({
        store,
        scope: FIXTURE_SCOPE,
        worstCaseMinorUnits: 2,
        worstCaseCurrency: "USD",
        now,
        expiresAt: new Date(now.getTime() + 60_000),
        idFactory: () => "resv-fault",
      }),
    ).resolves.toMatchObject({ admitted: false, reason: "store-error" });

    // No reservation was ever taken for the faulted attempt.
    expect(ledger.reservations.size).toBe(0);
    expect(ledger.ledger.get("grant-fault")).toBeUndefined();
  });
});
