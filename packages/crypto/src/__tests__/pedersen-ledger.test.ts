import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  commit,
  openCommitment,
  addCommitments,
  aggregateCommitments,
  commitLedger,
  verifyLedgerAggregate,
  verifyGroup,
  deriveH,
  encodeFixedPoint,
  PEDERSEN_G,
  PEDERSEN_H,
  CURVE_ORDER,
} from "../pedersen-ledger.js";

// Test blindings from a real CSPRNG (production supplies these at the loader boundary).
function randomBlinding(): bigint {
  let x = 0n;
  for (const b of randomBytes(32)) x = (x << 8n) | BigInt(b);
  return x % CURVE_ORDER;
}

describe("secp256k1 Pedersen — group", () => {
  it("verifyGroup re-derives H byte-for-byte (H != O, H != G)", () => {
    expect(verifyGroup()).toBe(true);
    expect(deriveH().equals(PEDERSEN_H)).toBe(true);
    expect(PEDERSEN_H.equals(PEDERSEN_G)).toBe(false);
  });
});

describe("secp256k1 Pedersen — commit / open / homomorphism", () => {
  it("CORRECTED BUG: commits a value of 0 (a -1 full-stake loss) instead of throwing", () => {
    // encodeFixedPoint(-1) === 0; the external draft's commit() called
    // G.multiply(0n) which throws "invalid scalar: out of range". The zero-safe
    // mul() maps [0]P -> identity, so this is the most common pick outcome, handled.
    expect(encodeFixedPoint(-1)).toBe(0n);
    const c = commit(0n, 123n);
    expect(c).not.toBeNull();
    expect(openCommitment(c!, 0n, 123n)).toBe(true);
    // zero blinding is also fine
    expect(commit(500n, 0n)).not.toBeNull();
  });

  it("opens only to the true (value, blinding)", () => {
    const r = randomBlinding();
    const c = commit(1234n, r)!;
    expect(openCommitment(c, 1234n, r)).toBe(true);
    expect(openCommitment(c, 1235n, r)).toBe(false);
    expect(openCommitment(c, 1234n, randomBlinding())).toBe(false);
  });

  it("is additively homomorphic (exact)", () => {
    const r1 = randomBlinding();
    const r2 = randomBlinding();
    const sum = addCommitments(commit(111n, r1)!, commit(222n, r2)!);
    expect(sum).toBe(commit(333n, (r1 + r2) % CURVE_ORDER));
  });

  it("HIDING: same value, different blinding -> different commitment", () => {
    expect(commit(42n, 1n)).not.toBe(commit(42n, 2n));
  });

  it("refuses invalid input (null, never throws)", () => {
    expect(commit(-1n, 0n)).toBeNull();
    expect(commit(1n, -1n)).toBeNull();
    expect(commit(1n, CURVE_ORDER)).toBeNull();
    expect(addCommitments("not-hex", "also-bad")).toBeNull();
    expect(aggregateCommitments(["bad"])).toBeNull();
  });
});

describe("secp256k1 Pedersen — ledger aggregate (sealed-slate payoff)", () => {
  it("verifies a real ledger aggregate from commitments alone", () => {
    const returns = [0.909, -1, 0.909, 4, -1];
    const values = returns.map((x) => encodeFixedPoint(x)!);
    const blindings = returns.map(() => randomBlinding());
    const res = commitLedger(values, blindings)!;
    expect(res).not.toBeNull();
    expect(res.aggregateValue).toBe(values.reduce((a, b) => a + b, 0n));
    expect(verifyLedgerAggregate(res.commitments, res.aggregateValue, res.aggregateBlinding)).toBe(true);
  });

  it("HOSTILE: rejects doctored total, wrong blinding, and swapped commitment", () => {
    const values = [10n, 20n, 30n];
    const blindings = values.map(() => randomBlinding());
    const res = commitLedger(values, blindings)!;
    expect(verifyLedgerAggregate(res.commitments, res.aggregateValue + 1n, res.aggregateBlinding)).toBe(false);
    expect(verifyLedgerAggregate(res.commitments, res.aggregateValue, res.aggregateBlinding + 1n)).toBe(false);
    const swapped = [res.commitments[0]!, res.commitments[1]!, commit(99n, blindings[2]!)!];
    expect(verifyLedgerAggregate(swapped, res.aggregateValue, res.aggregateBlinding)).toBe(false);
  });

  it("HOSTILE: executes a forgery loop — no false opening (binding under DLOG)", () => {
    // A real (not `expect(()=>fn())`-no-op) loop: 500 random commitments, each
    // attacked by opening to a shifted value + fresh blinding. All must reject.
    let forged = 0;
    for (let i = 0; i < 500; i++) {
      const v = randomBlinding();
      const r = randomBlinding();
      const c = commit(v, r)!;
      if (openCommitment(c, (v + 1n) % CURVE_ORDER, randomBlinding())) forged++;
    }
    expect(forged).toBe(0);
  });

  it("refuses empty / mismatched ledgers", () => {
    expect(commitLedger([1n, 2n], [0n])).toBeNull();
    expect(commitLedger([], [])).toBeNull();
    expect(verifyLedgerAggregate([], 0n, 0n)).toBe(false);
  });
});
