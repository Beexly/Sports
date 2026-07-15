import { describe, it, expect } from "vitest";
import { sha256Hex, verifyReceiptHash } from "@/lib/performance/proof-hash";
import {
  buildPickProofReceipt,
  verifyPickProofReceipt,
  buildSlateCommitment,
  provePickInSlate,
  verifyPickInSlate,
  type PickProofInput,
} from "@sports/prediction-engine";

function input(i: number): PickProofInput {
  return {
    pickId: `pick_${i}`,
    gameId: `game_${i}`,
    sport: "NFL",
    selection: `Team ${i} -3.5`,
    pickType: "SPREAD",
    line: -3.5,
    entryOdds: -110,
    marketFairProb: 0.524,
    confidence: 60 + i,
    edgeScore: 12,
    modelVersion: "v5.0.0",
    asOf: "2026-06-22T17:00:00.000Z",
  };
}

describe("production sha256 proof hash", () => {
  it("is a deterministic 64-char lowercase hex digest", () => {
    const a = sha256Hex("galaxy");
    const b = sha256Hex("galaxy");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    // Known SHA-256 of the empty string — confirms it's real SHA-256, not a stub.
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("is collision-sensitive — different input, different hash", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });

  it("drives a real tamper-evident receipt end to end", () => {
    const r = buildPickProofReceipt(input(1), sha256Hex);
    expect(r.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyPickProofReceipt(r, sha256Hex)).toBe(true);
    const tampered = { ...r, fields: { ...r.fields, confidence: 99 } };
    expect(verifyPickProofReceipt(tampered, sha256Hex)).toBe(false);
  });

  it("re-verifies a stored receipt from its pickId + payload + hash", () => {
    const r = buildPickProofReceipt(input(7), sha256Hex);
    // The DB stores payload + contentHash; verification recomputes the leaf.
    expect(verifyReceiptHash(r.pickId, r.payload, r.contentHash)).toBe(true);
    // Any edit to the stored payload or hash fails the check.
    expect(verifyReceiptHash(r.pickId, r.payload + " ", r.contentHash)).toBe(false);
    expect(verifyReceiptHash(r.pickId, r.payload, "deadbeef")).toBe(false);
    expect(verifyReceiptHash("other_pick", r.payload, r.contentHash)).toBe(false);
  });

  it("drives a real commit-reveal slate end to end", () => {
    const receipts = [input(1), input(2), input(3)].map((i) => buildPickProofReceipt(i, sha256Hex));
    const { root } = buildSlateCommitment("2026-06-22", "2026-06-22T16:00:00.000Z", receipts, sha256Hex);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
    const proof = provePickInSlate(receipts, 1, sha256Hex);
    expect(verifyPickInSlate(receipts[1]!, proof, root, sha256Hex).included).toBe(true);
  });
});
