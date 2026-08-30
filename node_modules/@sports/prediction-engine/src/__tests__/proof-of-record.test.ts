import { describe, expect, it } from "vitest";
import {
  merkleRoot,
  merkleRootFromLeafHashes,
  inclusionProof,
  verifyInclusion,
  canonicalPickPayload,
  hashLeaf,
  type PickRecord,
} from "../proof-of-record.js";

// Deterministic FNV-1a 32-bit hash — adequate to test the Merkle LOGIC.
// Production injects a real SHA-256.
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const records: PickRecord[] = [
  { id: "p1", payload: "home@-110" },
  { id: "p2", payload: "away@+120" },
  { id: "p3", payload: "over@-105" },
  { id: "p4", payload: "under@-115" },
  { id: "p5", payload: "home@+100" }, // odd count → exercises duplication
];

describe("proof-of-record (Merkle commitment)", () => {
  it("produces a stable root and verifies inclusion for every committed pick", () => {
    const root = merkleRoot(records, fnv1a);
    expect(root).toBe(merkleRoot(records, fnv1a)); // deterministic
    records.forEach((_, i) => {
      const proof = inclusionProof(records, i, fnv1a);
      expect(verifyInclusion(proof, root, fnv1a)).toBe(true);
    });
  });

  it("detects tampering — an altered pick no longer verifies against the published root", () => {
    const root = merkleRoot(records, fnv1a);
    const proof = inclusionProof(records, 2, fnv1a);
    // Attacker swaps the leaf for a different pick.
    const forged = { ...proof, leaf: hashLeaf(fnv1a, { id: "p3", payload: "over@+999" }) };
    expect(verifyInclusion(forged, root, fnv1a)).toBe(false);
  });

  it("changing any record changes the root (no silent rewrite)", () => {
    const root = merkleRoot(records, fnv1a);
    const mutated = records.map((r, i) => (i === 1 ? { ...r, payload: "away@-200" } : r));
    expect(merkleRoot(mutated, fnv1a)).not.toBe(root);
  });

  it("handles a single-record commitment", () => {
    const one = [records[0]!];
    const root = merkleRoot(one, fnv1a);
    expect(verifyInclusion(inclusionProof(one, 0, fnv1a), root, fnv1a)).toBe(true);
  });

  it("canonicalPickPayload is order-independent and stable", () => {
    const a = canonicalPickPayload({ gameId: "g1", side: "home", line: -110, modelVersion: "v5" });
    const b = canonicalPickPayload({ modelVersion: "v5", line: -110, side: "home", gameId: "g1" });
    expect(a).toBe(b);
  });

  it("merkleRootFromLeafHashes reproduces merkleRoot from pre-hashed leaves (the /verify/slate re-fold path)", () => {
    // A receipt's contentHash IS its leaf, so a verifier holding only the
    // public fingerprints must reach the same root the full records produce —
    // including the odd-count duplication case (5 records) and the empty set.
    const leaves = records.map((r) => hashLeaf(fnv1a, r));
    expect(merkleRootFromLeafHashes(leaves, fnv1a)).toBe(merkleRoot(records, fnv1a));
    expect(merkleRootFromLeafHashes(leaves.slice(0, 4), fnv1a)).toBe(merkleRoot(records.slice(0, 4), fnv1a));
    expect(merkleRootFromLeafHashes([], fnv1a)).toBe(merkleRoot([], fnv1a));
    // Order matters — a permuted list is a DIFFERENT commitment.
    expect(merkleRootFromLeafHashes([...leaves].reverse(), fnv1a)).not.toBe(merkleRoot(records, fnv1a));
  });
});
