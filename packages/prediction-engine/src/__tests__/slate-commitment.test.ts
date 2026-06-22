import { describe, it, expect } from "vitest";
import {
  buildSlateCommitment,
  provePickInSlate,
  verifyPickInSlate,
} from "../slate-commitment.js";
import { buildPickProofReceipt, type PickProofInput } from "../pick-proof-receipt.js";

function testHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function input(i: number): PickProofInput {
  return {
    pickId: `pick_${i}`,
    gameId: `game_${i}`,
    selection: `Team ${i} -3.5`,
    pickType: "SPREAD",
    line: -3.5,
    entryOdds: -110,
    marketFairProb: 0.524,
    confidence: 60 + (i % 30),
    edgeScore: 10 + (i % 20),
    modelVersion: "v5.0.0",
    asOf: "2026-06-22T17:00:00.000Z",
  };
}

function slate(n: number) {
  return Array.from({ length: n }, (_, i) => buildPickProofReceipt(input(i), testHash));
}

describe("slate commitment (commit-reveal)", () => {
  it("commits to the full population and its size", () => {
    const receipts = slate(5);
    const c = buildSlateCommitment("2026-06-22", "2026-06-22T16:00:00.000Z", receipts, testHash);
    expect(c.count).toBe(5);
    expect(c.root).toBeTruthy();
  });

  it("refuses to commit an empty slate", () => {
    expect(() => buildSlateCommitment("x", "t", [], testHash)).toThrow(/empty slate/);
  });

  it("verifies a pick that was in the committed slate", () => {
    const receipts = slate(6);
    const root = buildSlateCommitment("s", "t", receipts, testHash).root;
    const proof = provePickInSlate(receipts, 3, testHash);
    const v = verifyPickInSlate(receipts[3]!, proof, root, testHash);
    expect(v.included).toBe(true);
    expect(v.receiptIntact && v.leafMatches && v.foldsToRoot).toBe(true);
  });

  it("rejects a pick that was NOT in the committed slate (anti-cherry-pick)", () => {
    const committed = slate(6);
    const root = buildSlateCommitment("s", "t", committed, testHash).root;
    // A pick invented after the fact ("we also called this winner") with a valid-looking
    // receipt but no place in the committed set (index 50 is not in the 0..5 slate).
    const sneaked = buildPickProofReceipt(input(50), testHash);
    const biggerSlate = [...committed, sneaked];
    const proof = provePickInSlate(biggerSlate, 6, testHash); // proof against a DIFFERENT root
    const v = verifyPickInSlate(sneaked, proof, root, testHash);
    expect(v.included).toBe(false);
    expect(v.foldsToRoot).toBe(false);
  });

  it("rejects a receipt whose fields were edited after commit", () => {
    const receipts = slate(4);
    const root = buildSlateCommitment("s", "t", receipts, testHash).root;
    const proof = provePickInSlate(receipts, 1, testHash);
    const tampered = { ...receipts[1]!, fields: { ...receipts[1]!.fields, modelProb: 0.99 } };
    const v = verifyPickInSlate(tampered, proof, root, testHash);
    expect(v.included).toBe(false);
    expect(v.receiptIntact).toBe(false);
  });

  it("changes the root if the slate composition changes (can't drop a loser)", () => {
    const full = slate(6);
    const rootFull = buildSlateCommitment("s", "t", full, testHash).root;
    const dropped = full.slice(0, 5); // quietly remove one pick after the fact
    const rootDropped = buildSlateCommitment("s", "t", dropped, testHash).root;
    expect(rootDropped).not.toBe(rootFull);
  });

  it("works for a single-pick slate", () => {
    const receipts = slate(1);
    const root = buildSlateCommitment("s", "t", receipts, testHash).root;
    const proof = provePickInSlate(receipts, 0, testHash);
    expect(verifyPickInSlate(receipts[0]!, proof, root, testHash).included).toBe(true);
  });
});
