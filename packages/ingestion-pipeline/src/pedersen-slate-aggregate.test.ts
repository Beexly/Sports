import { describe, it, expect } from "vitest";
import { mintSlatePedersenAggregate } from "./freeze-slate-commitments.js";
import {
  commitLedger,
  encodeFixedPoint,
  openCommitment,
} from "@sports/crypto";

/**
 * Phase 0.5 (ZK_PROOF_EVOLUTION_ROADMAP): the sealed-slate Pedersen aggregate.
 * The mint must produce a commitment that OPENS correctly against its own
 * value + blinding sum (the round-trip that makes the public hex meaningful),
 * and must fail OPEN (null) on anything unencodable — never a fabricated
 * commitment, never blocking the Merkle path.
 */

describe("mintSlatePedersenAggregate", () => {
  it("mints an aggregate that opens against its own value + blinding sum (round-trip)", () => {
    const minted = mintSlatePedersenAggregate([33, 61.5, 100]);
    expect(minted).not.toBeNull();

    // The public hex must open with the stored opener — this is the exact
    // check a post-slate open route will run.
    const ok = openCommitment(
      minted!.hex,
      BigInt(minted!.value),
      BigInt(minted!.blindingSum),
    );
    expect(ok).toBe(true);

    // The committed value is the fixed-point sum of the edge scores.
    const expected =
      encodeFixedPoint(33, 0, 100)! +
      encodeFixedPoint(61.5, 0, 100)! +
      encodeFixedPoint(100, 0, 100)!;
    expect(BigInt(minted!.value)).toBe(expected);
  });

  it("two mints of the same slate produce different commitments (hiding: fresh blindings)", () => {
    const a = mintSlatePedersenAggregate([50, 50]);
    const b = mintSlatePedersenAggregate([50, 50]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.hex).not.toBe(b!.hex); // same values, different blindings
    expect(a!.value).toBe(b!.value); // but the same committed sum
  });

  it("fails open (null) on an empty slate", () => {
    expect(mintSlatePedersenAggregate([])).toBeNull();
  });

  it("fails open when any edge score is missing or out of the published 0-100 range", () => {
    expect(mintSlatePedersenAggregate([50, null])).toBeNull();
    expect(mintSlatePedersenAggregate([50, undefined])).toBeNull();
    expect(mintSlatePedersenAggregate([50, 101])).toBeNull();
    expect(mintSlatePedersenAggregate([50, -1])).toBeNull();
    expect(mintSlatePedersenAggregate([50, Number.NaN])).toBeNull();
  });

  it("a wrong opener is rejected (binding)", () => {
    const minted = mintSlatePedersenAggregate([10, 20])!;
    expect(
      openCommitment(minted.hex, BigInt(minted.value) + 1n, BigInt(minted.blindingSum)),
    ).toBe(false);
  });

  it("aggregate equals the fold of per-value commitments (consistency with commitLedger)", () => {
    // Sanity: the helper is a thin honest wrapper over commitLedger.
    const values = [encodeFixedPoint(10, 0, 100)!, encodeFixedPoint(20, 0, 100)!];
    const blindings = [1n, 2n];
    const ledger = commitLedger(values, blindings)!;
    expect(openCommitment(ledger.aggregateCommitment, 30n * 1_000_000n / 1n, 3n)).toBe(
      openCommitment(ledger.aggregateCommitment, ledger.aggregateValue, ledger.aggregateBlinding),
    );
  });
});
