import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  commit,
  openCommitment,
  addCommitments,
  aggregateCommitments,
  commitLedger,
  verifyLedgerAggregate,
  verifyGroup,
  encodeFixedPoint,
  DEFAULT_PEDERSEN_GROUP,
  PEDERSEN_P,
  PEDERSEN_Q,
  PEDERSEN_G,
} from "../pedersen-ledger.js";

const { q } = DEFAULT_PEDERSEN_GROUP;

// Deterministic blinding derivation for tests (production uses a CSPRNG at the
// loader boundary; the pure core takes blindings as input).
function blindingFrom(label: string): bigint {
  const hex = createHash("sha256").update(label).digest("hex");
  return BigInt("0x" + hex) % q;
}

describe("Pedersen group — self-certifying constants", () => {
  it("re-verifies the shipped group at runtime (q & 2q+1 prime, g & h order-q)", () => {
    // The constants are NOT trusted from the file: this re-runs Miller-Rabin +
    // subgroup checks. p = 2q+1 by construction.
    expect(verifyGroup()).toBe(true);
    expect(PEDERSEN_P).toBe(2n * PEDERSEN_Q + 1n);
    expect(PEDERSEN_G).toBe(4n);
  });

  it("pins the provenance offset (hostile review caught a recited '951'; the truth is 115095)", () => {
    // q is the smallest safe-prime q at/above 2^255; the ACTUAL offset from 2^255
    // is 115095, not the "951" an earlier doc draft recited. This test makes the
    // provenance claim self-checking so the wrong constant can never silently return.
    expect(PEDERSEN_Q - (1n << 255n)).toBe(115095n);
    expect(PEDERSEN_P >> 256n).toBe(1n); // p is 257-bit (~2^256), as a safe prime with q~2^255 must be
  });

  it("rejects a tampered group (non-prime, non-order-q g, broken p=2q+1)", () => {
    expect(verifyGroup({ ...DEFAULT_PEDERSEN_GROUP, p: PEDERSEN_P + 2n })).toBe(false);
    // 5 and p-1 are verified NON-order-q here (5^q, (p-1)^q !== 1); 2 and 3 ARE
    // order-q (quadratic residues) and would legitimately pass — the check is a
    // real subgroup test, not a hardcoded whitelist.
    expect(verifyGroup({ ...DEFAULT_PEDERSEN_GROUP, g: 5n })).toBe(false);
    expect(verifyGroup({ ...DEFAULT_PEDERSEN_GROUP, g: PEDERSEN_P - 1n })).toBe(false);
    expect(verifyGroup({ ...DEFAULT_PEDERSEN_GROUP, q: PEDERSEN_Q + 2n })).toBe(false);
  });
});

describe("Pedersen commitments — hiding, binding-shape, homomorphism", () => {
  it("HIDING: the same value under different blindings gives different commitments", () => {
    const c1 = commit(42n, blindingFrom("r-a"))!;
    const c2 = commit(42n, blindingFrom("r-b"))!;
    expect(c1).not.toBeNull();
    expect(c1).not.toBe(c2); // no value leak: identical v, different C
  });

  it("opens to the true (value, blinding) and NOT to any other", () => {
    const r = blindingFrom("open-1");
    const c = commit(1234n, r)!;
    expect(openCommitment(c, 1234n, r)).toBe(true);
    expect(openCommitment(c, 1235n, r)).toBe(false); // wrong value
    expect(openCommitment(c, 1234n, blindingFrom("open-2"))).toBe(false); // wrong blinding
  });

  it("HOMOMORPHISM: Commit(v1,r1)·Commit(v2,r2) = Commit(v1+v2, r1+r2)", () => {
    const v1 = 111n;
    const v2 = 222n;
    const r1 = blindingFrom("h1");
    const r2 = blindingFrom("h2");
    const product = addCommitments(commit(v1, r1)!, commit(v2, r2)!);
    const direct = commit(v1 + v2, (r1 + r2) % q)!;
    expect(product).toBe(direct); // EXACT — the whole point
  });

  it("reduces value exponents mod q consistently (commit is well-defined mod q)", () => {
    const r = blindingFrom("modq");
    expect(commit(5n, r)).toBe(commit(5n + q, r)); // g has order q
  });

  it("refuses invalid input (null, never throws)", () => {
    expect(commit(-1n, 0n)).toBeNull();
    expect(commit(1n, -1n)).toBeNull();
    expect(commit(1n, q)).toBeNull(); // blinding must be in [0,q)
    expect(commit(1n, q + 5n)).toBeNull();
  });
});

describe("Pedersen ledger aggregate — verify the total without opening the picks", () => {
  it("verifies a real ledger's aggregate against its per-pick commitments", () => {
    // Encode 6 bounded returns; commit each with an independent blinding; then
    // verify the aggregate from ONLY the commitments + the aggregate opener.
    const returns = [0.909, -1, 0.909, 4, -1, 0.909];
    const values = returns.map((x, i) => encodeFixedPoint(x)!);
    const blindings = returns.map((_, i) => blindingFrom(`pick-${i}`));
    const res = commitLedger(values, blindings)!;
    expect(res).not.toBeNull();
    expect(res.commitments).toHaveLength(6);

    // The aggregate opener verifies against the published commitments alone.
    expect(
      verifyLedgerAggregate(res.commitments, res.aggregateValue, res.aggregateBlinding),
    ).toBe(true);

    // aggregateValue is the true sum of the encoded values (sanity).
    expect(res.aggregateValue).toBe(values.reduce((a, b) => a + b, 0n));
  });

  it("HOSTILE: a doctored aggregate (off by one, or wrong blinding) fails", () => {
    const values = [10n, 20n, 30n];
    const blindings = [blindingFrom("d0"), blindingFrom("d1"), blindingFrom("d2")];
    const res = commitLedger(values, blindings)!;
    // Claim a total of 61 instead of 60 → must fail.
    expect(verifyLedgerAggregate(res.commitments, res.aggregateValue + 1n, res.aggregateBlinding)).toBe(false);
    // Correct total, wrong blinding → must fail.
    expect(verifyLedgerAggregate(res.commitments, res.aggregateValue, res.aggregateBlinding + 1n)).toBe(false);
    // Correct opener → passes.
    expect(verifyLedgerAggregate(res.commitments, res.aggregateValue, res.aggregateBlinding)).toBe(true);
  });

  it("HOSTILE: swapping in a commitment to a DIFFERENT value breaks the aggregate", () => {
    const values = [5n, 5n, 5n];
    const blindings = [blindingFrom("s0"), blindingFrom("s1"), blindingFrom("s2")];
    const res = commitLedger(values, blindings)!;
    // Attacker replaces the last commitment with a commitment to 9 (same blinding).
    const forged = [...res.commitments.slice(0, 2), commit(9n, blindings[2]!)!];
    // The published aggregate opener (for sum=15) no longer matches the product.
    expect(verifyLedgerAggregate(forged, res.aggregateValue, res.aggregateBlinding)).toBe(false);
  });

  it("is deterministic and order-consistent for the aggregate product", () => {
    const values = [1n, 2n, 3n, 4n];
    const blindings = values.map((_, i) => blindingFrom(`o-${i}`));
    const cs = values.map((v, i) => commit(v, blindings[i]!)!);
    // Product is commutative → aggregate is order-independent (unlike a Merkle root).
    const forward = aggregateCommitments(cs);
    const reversed = aggregateCommitments([...cs].reverse());
    expect(forward).toBe(reversed);
  });

  it("refuses mismatched or empty ledgers", () => {
    expect(commitLedger([1n, 2n], [0n])).toBeNull();
    expect(commitLedger([], [])).toBeNull();
    expect(verifyLedgerAggregate([], 0n, 0n)).toBe(false);
  });
});

describe("encodeFixedPoint", () => {
  it("maps bounded reals to non-negative field integers and refuses out-of-range", () => {
    expect(encodeFixedPoint(-1)).toBe(0n); // the floor maps to 0
    expect(encodeFixedPoint(0)).toBe(1_000_000n); // (0 - (-1)) * 1e6
    expect(encodeFixedPoint(0.909)).toBe(1_909_000n);
    expect(encodeFixedPoint(-2)).toBeNull(); // below min
    expect(encodeFixedPoint(21)).toBeNull(); // above max
    expect(encodeFixedPoint(Number.NaN)).toBeNull();
  });
});
